import { DetectionMethod, SensitiveCategory, SeverityLevel } from '../../types';

export interface DetectedItem {
  category: SensitiveCategory;
  subcategory: string;
  severity: SeverityLevel;
  confidence: number;
  detection_method: DetectionMethod;
  page_number: number;
  start_offset: number | null;
  end_offset: number | null;
  masked_value: string;
  raw_match: string;
  explanation: string;
  recommended_action: string;
}

/**
 * Luhn checksum validation for credit/debit card numbers.
 */
export const isValidLuhn = (cardNumber: string): boolean => {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

/**
 * Masks sensitive text so complete credentials, cards, or identity numbers are never stored or returned.
 */
export const maskSensitiveValue = (raw: string, category: SensitiveCategory): string => {
  const trimmed = raw.trim();
  if (trimmed.length <= 4) return 'XXXX';

  if (category === 'authentication_credentials') {
    const eqIndex = trimmed.search(/[:=]/);
    if (eqIndex !== -1 && eqIndex < trimmed.length - 2) {
      const prefix = trimmed.slice(0, eqIndex + 1);
      const secretPart = trimmed.slice(eqIndex + 1).trim();
      const visible = secretPart.length > 4 ? secretPart.slice(-2) : '';
      return `${prefix} ********${visible}`;
    }
    return `${trimmed.slice(0, 3)}********${trimmed.slice(-2)}`;
  }

  if (category === 'contact_information' && trimmed.includes('@')) {
    const [local, domain] = trimmed.split('@');
    if (!domain) return '****@****';
    const maskedLocal =
      local.length <= 2 ? '*'.repeat(local.length) : `${local[0]}${'*'.repeat(Math.min(local.length - 2, 5))}${local.slice(-1)}`;
    return `${maskedLocal}@${domain}`;
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length >= 10 && (category === 'government_identity' || category === 'financial_information')) {
    return `XXXX XXXX ${trimmed.slice(-4)}`;
  }

  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}****${trimmed.slice(-2)}`;
  }

  return `${trimmed.slice(0, 2)}${'X'.repeat(Math.min(trimmed.length - 6, 8))}${trimmed.slice(-4)}`;
};

interface RuleDefinition {
  subcategory: string;
  category: SensitiveCategory;
  severity: SeverityLevel;
  confidence: number;
  regex: RegExp;
  validator?: (match: string, fullText: string, index: number) => boolean;
  explanation: string;
  recommendedAction: string;
}

const DETECTION_RULES: RuleDefinition[] = [
  // 1. Government Identity: Potential Indian PAN Number
  {
    subcategory: 'Potential PAN Identifier',
    category: 'government_identity',
    severity: 'high',
    confidence: 95,
    regex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
    explanation:
      'Matches the 10-character alphanumeric format of an Indian Permanent Account Number (PAN). Note: Format match only; not verified against government databases.',
    recommendedAction: 'Mask or redact the PAN identifier before sharing outside authorized tax or financial workflows.',
  },
  // 2. Government Identity: Potential Aadhaar Number (12 digits, starts with 2-9)
  {
    subcategory: 'Potential Aadhaar Identifier',
    category: 'government_identity',
    severity: 'critical',
    confidence: 91,
    regex: /\b[2-9][0-9]{3}[\s-]?[0-9]{4}[\s-]?[0-9]{4}\b/g,
    validator: (match) => {
      const digits = match.replace(/\D/g, '');
      if (digits.length !== 12) return false;
      // If it passes Luhn and has 13+ digits it's a card, here it's strictly 12 digits
      return !/^(\d)\1{11}$/.test(digits);
    },
    explanation:
      'Matches the 12-digit format of an Aadhaar identity number (potential identifier based on format validation; not verified against UIDAI databases).',
    recommendedAction: 'Mask the first 8 digits (VID/masked Aadhaar format: XXXX XXXX 1234) or completely redact before sharing.',
  },
  // 3. Financial: Payment Card Numbers (Credit / Debit Cards with Luhn validation)
  {
    subcategory: 'Payment Card Number',
    category: 'financial_information',
    severity: 'critical',
    confidence: 97,
    regex: /\b(?:\d[ -]*?){13,19}\b/g,
    validator: (match) => {
      const digits = match.replace(/\D/g, '');
      if (digits.length < 13 || digits.length > 19) return false;
      return isValidLuhn(digits);
    },
    explanation: 'Detected a 13–19 digit payment card sequence passing Luhn checksum validation.',
    recommendedAction: 'Immediately redact the full card number. Never share unmasked credit or debit card numbers.',
  },
  // 4. Financial: Indian IFSC Code
  {
    subcategory: 'Bank IFSC Code',
    category: 'financial_information',
    severity: 'moderate',
    confidence: 94,
    regex: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
    explanation: 'Detected an 11-character Indian Financial System Code (IFSC) identifying a specific bank branch.',
    recommendedAction: 'Redact bank branch routing details if bank account numbers are also present in the document.',
  },
  // 5. Financial: Bank Account Number in Context
  {
    subcategory: 'Bank Account Number',
    category: 'financial_information',
    severity: 'high',
    confidence: 89,
    regex: /(?:account\s*(?:no|number|#)?|a\/c\s*(?:no|number)?)\s*[:=-]?\s*([0-9]{9,18})\b/gi,
    explanation: 'Detected a bank account number pattern preceded by an account identifier label.',
    recommendedAction: 'Redact the bank account number to prevent unauthorized financial profiling or fraud.',
  },
  // 6. Authentication Credentials: API Keys & Cloud Tokens
  {
    subcategory: 'API Key / Secret Token',
    category: 'authentication_credentials',
    severity: 'critical',
    confidence: 98,
    regex: /\b(?:AIza[0-9A-Za-z\-_]{35}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|xox[baprs]-[0-9A-Za-z-]{10,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g,
    explanation: 'Detected a live-format API key, cloud access key, or JSON Web Token (JWT) credential.',
    recommendedAction: 'Redact from the document AND immediately revoke/rotate the exposed key in your provider console.',
  },
  // 7. Authentication Credentials: Password / Secret Assignments
  {
    subcategory: 'Exposed Password or Secret',
    category: 'authentication_credentials',
    severity: 'critical',
    confidence: 93,
    regex: /(?:password|passwd|pwd|api[_-]?key|secret[_-]?key|access[_-]?token|client[_-]?secret|auth[_-]?token)\s*[:=]\s*['"]?([^\s'",;]{6,64})['"]?/gi,
    explanation: 'Detected an explicit credential, password, or secret token assignment in text.',
    recommendedAction: 'Remove credentials from the document and rotate the affected password or secret immediately.',
  },
  // 8. Contact Information: Email Addresses
  {
    subcategory: 'Email Address',
    category: 'contact_information',
    severity: 'moderate',
    confidence: 96,
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,15}\b/g,
    explanation: 'Personal or corporate email address that can be targeted for phishing, spam, or identity correlation.',
    recommendedAction: 'Redact personal email addresses before publishing or sharing documents externally.',
  },
  // 9. Contact Information: Phone Numbers (Indian +91 & International)
  {
    subcategory: 'Phone Number',
    category: 'contact_information',
    severity: 'moderate',
    confidence: 88,
    regex: /(?:\+91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}\b|\+\d{1,3}[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{4}\b/g,
    validator: (match, fullText, idx) => {
      // Avoid matching inside a longer 12-digit Aadhaar or 16-digit card number
      const prevChar = idx > 0 ? fullText[idx - 1] : ' ';
      const nextChar = idx + match.length < fullText.length ? fullText[idx + match.length] : ' ';
      if (/\d/.test(prevChar) || /\d/.test(nextChar)) return false;
      return true;
    },
    explanation: 'Detected a mobile or telephone number that may expose personal contact details.',
    recommendedAction: 'Mask or redact personal phone numbers before sharing documents publicly.',
  },
  // 10. Location Information: Residential Address / PIN Code
  {
    subcategory: 'Residential Address',
    category: 'location_information',
    severity: 'high',
    confidence: 84,
    regex: /(?:address|residence|residing at|flat no|house no|plot no)\s*[:=-]?\s*([^\n]{10,120})/gi,
    explanation: 'Detected a physical residential address or street location.',
    recommendedAction: 'Redact physical residential details to protect personal physical privacy and prevent doxxing.',
  },
  // 11. Medical Information: Health / Clinical Identifiers
  {
    subcategory: 'Medical Record / Diagnosis',
    category: 'medical_information',
    severity: 'high',
    confidence: 87,
    regex: /(?:patient\s*(?:id|name)|diagnosis|prescription|rx|mrn|medical\s*record|blood\s*group|uhid)\s*[:=-]\s*([^\n,;]{3,80})/gi,
    explanation: 'Detected protected health or clinical patient information.',
    recommendedAction: 'Redact patient identifiers and clinical notes before sharing medical records.',
  },
  // 12. Confidential Business Information
  {
    subcategory: 'Confidential Business Marker',
    category: 'confidential_business_information',
    severity: 'high',
    confidence: 82,
    regex: /(?:strictly\s+confidential|internal\s+use\s+only|proprietary\s+and\s+confidential|trade\s+secret|employee\s+id\s*[:=-]\s*[A-Z0-9-]+|salary\s*[:=-]\s*(?:INR|Rs\.?|\$)\s*[0-9,]+)/gi,
    explanation: 'Detected internal corporate, payroll, or proprietary classification markers.',
    recommendedAction: 'Verify corporate classification policy and redact internal identifiers before external distribution.',
  },
  // 13. Other Sensitive Information: IPv4 Addresses & Private URLs
  {
    subcategory: 'Network IP / Internal Endpoint',
    category: 'other_sensitive_information',
    severity: 'moderate',
    confidence: 85,
    regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b|https?:\/\/[^\s"'<>]+(?:\?[^\s"'<>]*(?:token|key|sig|auth|password)=[^\s"'<>]+)/gi,
    explanation: 'Detected an IPv4 network address or a URL containing embedded query credentials/tokens.',
    recommendedAction: 'Remove internal network IP addresses and strip query tokens from URLs before sharing.',
  },
];

export class RuleDetectionEngine {
  public analyzePages(pages: Array<{ pageNumber: number; text: string }>): DetectedItem[] {
    const detections: DetectedItem[] = [];
    const occupiedSpansByPage = new Map<number, Array<{ start: number; end: number }>>();

    for (const page of pages) {
      const pageText = page.text || '';
      if (!pageText) continue;

      const occupied = occupiedSpansByPage.get(page.pageNumber) || [];
      occupiedSpansByPage.set(page.pageNumber, occupied);

      for (const rule of DETECTION_RULES) {
        const regex = new RegExp(rule.regex.source, rule.regex.flags);
        let match: RegExpExecArray | null;

        while ((match = regex.exec(pageText)) !== null) {
          const rawMatch = match[0].trim();
          const startOffset = match.index;
          const endOffset = startOffset + rawMatch.length;

          if (!rawMatch) continue;

          // Skip if overlapping with an already matched higher-priority rule on the same page
          const overlaps = occupied.some(
            (span) => Math.max(span.start, startOffset) < Math.min(span.end, endOffset)
          );
          if (overlaps) continue;

          if (rule.validator && !rule.validator(rawMatch, pageText, startOffset)) {
            continue;
          }

          occupied.push({ start: startOffset, end: endOffset });

          detections.push({
            category: rule.category,
            subcategory: rule.subcategory,
            severity: rule.severity,
            confidence: rule.confidence,
            detection_method: 'rule_based',
            page_number: page.pageNumber,
            start_offset: startOffset,
            end_offset: endOffset,
            masked_value: maskSensitiveValue(rawMatch, rule.category),
            raw_match: rawMatch,
            explanation: rule.explanation,
            recommended_action: rule.recommendedAction,
          });
        }
      }
    }

    return detections;
  }
}

export const ruleDetectionEngine = new RuleDetectionEngine();

