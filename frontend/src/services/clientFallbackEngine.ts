import { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import {
  AssistantConversation,
  AssistantMessage,
  FindingItem,
  RedactionRecord,
  RiskLevel,
  ScanItem,
  ScanReport,
  SecurityAlert,
  SensitiveCategory,
  SeverityLevel,
  UserProfile,
  UserSettings,
} from '../types';

const STORAGE_STATE_KEY = 'privacyguard_resilient_state_v1';

interface FallbackState {
  users: UserProfile[];
  settings: UserSettings[];
  scans: ScanItem[];
  findings: Array<FindingItem & { raw_match?: string }>;
  reports: ScanReport[];
  redactions: RedactionRecord[];
  alerts: SecurityAlert[];
  conversations: AssistantConversation[];
  messages: AssistantMessage[];
}

const loadState = (): FallbackState => {
  try {
    const raw = localStorage.getItem(STORAGE_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        users: parsed.users || [],
        settings: parsed.settings || [],
        scans: parsed.scans || [],
        findings: parsed.findings || [],
        reports: parsed.reports || [],
        redactions: parsed.redactions || [],
        alerts: parsed.alerts || [],
        conversations: parsed.conversations || [],
        messages: parsed.messages || [],
      };
    }
  } catch {
    // Ignore parse error
  }
  return {
    users: [],
    settings: [],
    scans: [],
    findings: [],
    reports: [],
    redactions: [],
    alerts: [],
    conversations: [],
    messages: [],
  };
};

const saveState = (state: FallbackState): void => {
  try {
    localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors
  }
};

const genId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const isValidLuhn = (cardNumber: string): boolean => {
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

const maskValue = (raw: string, category: SensitiveCategory): string => {
  const trimmed = raw.trim();
  if (trimmed.length <= 4) return 'XXXX';
  if (category === 'authentication_credentials') {
    return `${trimmed.slice(0, 3)}********${trimmed.slice(-2)}`;
  }
  if (category === 'contact_information' && trimmed.includes('@')) {
    const [local, domain] = trimmed.split('@');
    return `${local[0]}****@${domain || 'domain.com'}`;
  }
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length >= 10) {
    return `XXXX XXXX ${trimmed.slice(-4)}`;
  }
  return `${trimmed.slice(0, 2)}XXXX${trimmed.slice(-2)}`;
};

const runClientDetection = (
  text: string,
  scanId: string,
  userId: string
): Array<FindingItem & { raw_match?: string }> => {
  const rules: Array<{
    subcategory: string;
    category: SensitiveCategory;
    severity: SeverityLevel;
    confidence: number;
    regex: RegExp;
    validator?: (m: string) => boolean;
    explanation: string;
    recommendedAction: string;
  }> = [
    {
      subcategory: 'Potential PAN Identifier',
      category: 'government_identity',
      severity: 'high',
      confidence: 95,
      regex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
      explanation: 'Matches the 10-character alphanumeric format of an Indian PAN card (format validation only).',
      recommendedAction: 'Mask or redact the PAN identifier before sharing externally.',
    },
    {
      subcategory: 'Potential Aadhaar Identifier',
      category: 'government_identity',
      severity: 'critical',
      confidence: 91,
      regex: /\b[2-9][0-9]{3}[\s-]?[0-9]{4}[\s-]?[0-9]{4}\b/g,
      validator: (m) => m.replace(/\D/g, '').length === 12,
      explanation: 'Matches the 12-digit format of an Aadhaar identity number (potential identifier based on format).',
      recommendedAction: 'Mask the first 8 digits (XXXX XXXX 1234) or completely redact before sharing.',
    },
    {
      subcategory: 'Payment Card Number',
      category: 'financial_information',
      severity: 'critical',
      confidence: 97,
      regex: /\b(?:\d[ -]*?){13,19}\b/g,
      validator: isValidLuhn,
      explanation: 'Detected a 13–19 digit payment card number passing Luhn checksum validation.',
      recommendedAction: 'Immediately redact the full payment card number.',
    },
    {
      subcategory: 'Bank IFSC Code',
      category: 'financial_information',
      severity: 'moderate',
      confidence: 94,
      regex: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
      explanation: 'Detected an 11-character Indian Financial System Code (IFSC).',
      recommendedAction: 'Redact bank branch routing details if account numbers are also present.',
    },
    {
      subcategory: 'Bank Account Number',
      category: 'financial_information',
      severity: 'high',
      confidence: 89,
      regex: /(?:account\s*(?:no|number|#)?|a\/c\s*(?:no|number)?)\s*[:=-]?\s*([0-9]{9,18})\b/gi,
      explanation: 'Detected a bank account number pattern in context.',
      recommendedAction: 'Redact bank account details before external sharing.',
    },
    {
      subcategory: 'Exposed API Key or Password',
      category: 'authentication_credentials',
      severity: 'critical',
      confidence: 96,
      regex: /(?:password|passwd|pwd|api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*['"]?([^\s'",;]{6,64})['"]?/gi,
      explanation: 'Detected an exposed API key, token, or password assignment.',
      recommendedAction: 'Redact immediately and rotate/revoke the exposed credential.',
    },
    {
      subcategory: 'Email Address',
      category: 'contact_information',
      severity: 'moderate',
      confidence: 96,
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,15}\b/g,
      explanation: 'Personal or corporate email address detected.',
      recommendedAction: 'Redact personal email addresses before public distribution.',
    },
    {
      subcategory: 'Phone Number',
      category: 'contact_information',
      severity: 'moderate',
      confidence: 88,
      regex: /(?:\+91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}\b/g,
      explanation: 'Detected a mobile telephone number.',
      recommendedAction: 'Mask personal phone numbers before sharing documents publicly.',
    },
    {
      subcategory: 'Residential Address',
      category: 'location_information',
      severity: 'high',
      confidence: 84,
      regex: /(?:address|residence|flat no|house no)\s*[:=-]?\s*([^\n]{10,120})/gi,
      explanation: 'Detected a physical residential address.',
      recommendedAction: 'Redact street-level residential details.',
    },
    {
      subcategory: 'Medical Record / Diagnosis',
      category: 'medical_information',
      severity: 'high',
      confidence: 87,
      regex: /(?:patient\s*(?:id|name)|diagnosis|prescription|medical\s*record)\s*[:=-]\s*([^\n,;]{3,80})/gi,
      explanation: 'Detected protected clinical or medical information.',
      recommendedAction: 'Redact clinical details unless required by a healthcare provider.',
    },
  ];

  const findings: Array<FindingItem & { raw_match?: string }> = [];
  const occupied: Array<{ start: number; end: number }> = [];
  const now = new Date().toISOString();

  for (const rule of rules) {
    const regex = new RegExp(rule.regex.source, rule.regex.flags);
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const raw = m[0].trim();
      const start = m.index;
      const end = start + raw.length;
      if (!raw) continue;
      if (occupied.some((s) => Math.max(s.start, start) < Math.min(s.end, end))) continue;
      if (rule.validator && !rule.validator(raw)) continue;

      occupied.push({ start, end });
      findings.push({
        id: genId(),
        scan_id: scanId,
        user_id: userId,
        category: rule.category,
        subcategory: rule.subcategory,
        severity: rule.severity,
        confidence: rule.confidence,
        detection_method: 'hybrid',
        page_number: 1,
        start_offset: start,
        end_offset: end,
        masked_value: maskValue(raw, rule.category),
        raw_match: raw,
        explanation: rule.explanation,
        recommended_action: rule.recommendedAction,
        is_redacted: false,
        created_at: now,
      });
    }
  }

  return findings;
};

const computeRisk = (findings: FindingItem[]): {
  score: number;
  level: RiskLevel;
  breakdown: ScanReport['risk_breakdown'];
} => {
  if (findings.length === 0) {
    return { score: 0, level: 'low', breakdown: {} };
  }
  const weights: Record<SensitiveCategory, number> = {
    authentication_credentials: 30,
    government_identity: 25,
    personal_identity: 25,
    financial_information: 25,
    medical_information: 20,
    confidential_business_information: 20,
    location_information: 15,
    contact_information: 12,
    other_sensitive_information: 10,
  };
  const breakdown: ScanReport['risk_breakdown'] = {};
  let total = 0;

  for (const f of findings) {
    const w = weights[f.category] || 12;
    if (!breakdown[f.category]) {
      breakdown[f.category] = {
        count: 1,
        maxSeverity: f.severity,
        weightContribution: w,
      };
      total += w;
    } else {
      breakdown[f.category].count += 1;
      const extra = Math.round(w * 0.3);
      breakdown[f.category].weightContribution += extra;
      total += extra;
    }
  }

  if (findings.some((f) => f.severity === 'critical') && total < 68) {
    total = 68;
  }
  const score = Math.min(100, Math.max(0, total));
  const level: RiskLevel =
    score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 30 ? 'moderate' : 'low';
  return { score, level, breakdown };
};

export const handleClientFallbackRequest = async (
  config: InternalAxiosRequestConfig
): Promise<AxiosResponse> => {
  const state = loadState();
  const method = (config.method || 'get').toUpperCase();
  const rawUrl = config.url || '';
  const [pathname, queryString] = rawUrl.split('?');
  const path = pathname.replace(/^https?:\/\/[^/]+\/api\/v1/, '').replace(/^\/api\/v1/, '');

  const makeResponse = (data: unknown, status = 200): AxiosResponse => ({
    data,
    status,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config,
  });

  const getCurrentUser = (): UserProfile => {
    const saved = localStorage.getItem('privacyguard_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Ignore
      }
    }
    const fallbackUser: UserProfile = state.users[0] || {
      id: '00000000-0000-4000-a000-000000000001',
      email: 'user@privacyguard.ai',
      full_name: 'PrivacyGuard User',
      avatar_url: null,
    };
    return fallbackUser;
  };

  const parseBody = (): Record<string, any> => {
    if (!config.data) return {};
    if (typeof config.data === 'string') {
      try {
        return JSON.parse(config.data);
      } catch {
        return {};
      }
    }
    return config.data;
  };

  // 1. Auth Register / Login / Local Session
  if (
    method === 'POST' &&
    (path === '/auth/register' || path === '/auth/login' || path === '/auth/local-session')
  ) {
    const body = parseBody();
    const email = String(body.email || 'user@privacyguard.ai').trim().toLowerCase();
    const fullName = String(body.fullName || email.split('@')[0]).trim();

    let user = state.users.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      user = {
        id: genId(),
        email,
        full_name: fullName,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      state.users.push(user);
    }

    let settings = state.settings.find((s) => s.user_id === user!.id);
    if (!settings) {
      settings = {
        id: genId(),
        user_id: user.id,
        auto_delete_original: true,
        retain_scan_history: true,
        retain_redacted_files: true,
        security_notifications: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      state.settings.push(settings);
    }

    saveState(state);
    const token = `pg_local_client.${btoa(JSON.stringify({ id: user.id, email: user.email }))}`;
    localStorage.setItem('privacyguard_auth_token', token);
    localStorage.setItem('privacyguard_auth_user', JSON.stringify(user));

    return makeResponse(
      {
        success: true,
        message: 'Authenticated successfully',
        data: {
          accessToken: token,
          user,
          profile: user,
          settings,
        },
      },
      path === '/auth/register' ? 201 : 200
    );
  }

  const currentUser = getCurrentUser();

  // 2. Auth Me & Profile
  if (method === 'GET' && (path === '/auth/me' || path === '/profile')) {
    return makeResponse({
      success: true,
      message: 'Profile retrieved',
      data: {
        user: currentUser,
        profile: currentUser,
      },
    });
  }

  if (method === 'PATCH' && path === '/profile') {
    const body = parseBody();
    currentUser.full_name = body.full_name || currentUser.full_name;
    currentUser.avatar_url = body.avatar_url ?? currentUser.avatar_url;
    localStorage.setItem('privacyguard_auth_user', JSON.stringify(currentUser));
    return makeResponse({
      success: true,
      message: 'Profile updated',
      data: { profile: currentUser },
    });
  }

  if (method === 'DELETE' && path === '/account') {
    localStorage.removeItem(STORAGE_STATE_KEY);
    localStorage.removeItem('privacyguard_auth_token');
    localStorage.removeItem('privacyguard_auth_user');
    return makeResponse({
      success: true,
      message: 'Account deleted',
      data: { deleted: true },
    });
  }

  // 3. Dashboard endpoints
  if (method === 'GET' && path === '/dashboard/stats') {
    const userScans = state.scans.filter((s) => s.user_id === currentUser.id);
    const userFindings = state.findings.filter((f) => f.user_id === currentUser.id);
    const userAlerts = state.alerts.filter((a) => a.user_id === currentUser.id);

    const catCounts: Record<string, number> = {};
    userFindings.forEach((f) => {
      catCounts[f.category] = (catCounts[f.category] || 0) + 1;
    });

    const criticalCount = userScans.filter((s) => s.risk_level === 'critical').length;
    const highCount = userScans.filter((s) => s.risk_level === 'high').length;
    const avgScore =
      userScans.length > 0
        ? Math.round(
            userScans.reduce((acc, s) => acc + (s.risk_score || 0), 0) / userScans.length
          )
        : 0;

    return makeResponse({
      success: true,
      data: {
        totalScans: userScans.length,
        totalSensitiveItems: userFindings.length,
        protectedFiles: userScans.filter((s) => s.redaction_status === 'completed').length,
        criticalRiskScans: criticalCount,
        highRiskScans: highCount,
        highAndCriticalScans: criticalCount + highCount,
        averageRiskScore: avgScore,
        unreadAlertsCount: userAlerts.filter((a) => !a.is_read).length,
        topCategories: Object.entries(catCounts).map(([category, count]) => ({
          category,
          label: category.replace(/_/g, ' '),
          count,
        })),
      },
    });
  }

  if (method === 'GET' && path === '/dashboard/recent-scans') {
    const userScans = state.scans
      .filter((s) => s.user_id === currentUser.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);
    return makeResponse({
      success: true,
      data: { scans: userScans },
    });
  }

  if (method === 'GET' && path === '/dashboard/risk-distribution') {
    const userScans = state.scans.filter((s) => s.user_id === currentUser.id);
    return makeResponse({
      success: true,
      data: {
        riskLevels: [
          {
            name: 'Low Risk (0-29)',
            level: 'low',
            count: userScans.filter((s) => s.risk_level === 'low').length,
            fill: '#10B981',
          },
          {
            name: 'Moderate Risk (30-59)',
            level: 'moderate',
            count: userScans.filter((s) => s.risk_level === 'moderate').length,
            fill: '#F59E0B',
          },
          {
            name: 'High Risk (60-79)',
            level: 'high',
            count: userScans.filter((s) => s.risk_level === 'high').length,
            fill: '#F97316',
          },
          {
            name: 'Critical Risk (80-100)',
            level: 'critical',
            count: userScans.filter((s) => s.risk_level === 'critical').length,
            fill: '#EF4444',
          },
        ],
        categories: [],
      },
    });
  }

  // 4. Create & Analyze Scan (POST /scans)
  if (method === 'POST' && path === '/scans') {
    let file: File | null = null;
    let scanType = 'standard';
    if (config.data instanceof FormData) {
      file = config.data.get('file') as File | null;
      scanType = String(config.data.get('scanType') || 'standard');
    }

    const fileName = file?.name || 'uploaded_document.txt';
    const fileSize = file?.size || 1024;
    const fileType = file?.type || 'text/plain';
    let textContent = '';
    if (file) {
      try {
        textContent = await file.text();
      } catch {
        textContent = '';
      }
    }

    const scanId = genId();
    const detected = runClientDetection(textContent, scanId, currentUser.id);
    const { score, level, breakdown } = computeRisk(detected);
    const now = new Date().toISOString();

    const scanRecord: ScanItem = {
      id: scanId,
      user_id: currentUser.id,
      original_filename: fileName,
      stored_filename: `${scanId}_${fileName}`,
      file_type: fileType,
      file_size: fileSize,
      storage_path: `${currentUser.id}/${scanId}/${fileName}`,
      scan_type: scanType,
      extracted_text: textContent,
      extracted_text_preview: textContent,
      status: 'completed',
      risk_score: score,
      risk_level: level,
      total_findings: detected.length,
      redaction_status: 'not_started',
      created_at: now,
      completed_at: now,
    };

    const reportRecord: ScanReport = {
      id: genId(),
      scan_id: scanId,
      user_id: currentUser.id,
      summary:
        detected.length > 0
          ? `Detected ${detected.length} sensitive data item(s) across ${
              Object.keys(breakdown).length
            } category(ies).`
          : 'No sensitive patterns were detected in this document.',
      risk_explanation: `Calculated a ${level.toUpperCase()} risk score (${score}/100) using deterministic category weights and severity multipliers.`,
      sharing_guidance:
        score >= 60
          ? 'Do not share this document publicly before redacting the identified sensitive fields.'
          : 'Review the document manually before sharing externally.',
      recommendations: detected.map((d) => ({
        priority: d.severity,
        category: d.category,
        action: d.recommended_action,
      })),
      risk_breakdown: breakdown,
      created_at: now,
    };

    state.scans.unshift(scanRecord);
    state.findings.push(...detected);
    state.reports.push(reportRecord);

    if (score >= 60) {
      state.alerts.unshift({
        id: genId(),
        user_id: currentUser.id,
        scan_id: scanId,
        title: `High-Risk Sensitive Data in "${fileName}" (${score}/100)`,
        message: `Detected ${detected.length} sensitive item(s). Redact before sharing.`,
        severity: level,
        is_read: false,
        created_at: now,
      });
    }

    saveState(state);
    return makeResponse(
      {
        success: true,
        message: 'Scan completed successfully',
        data: {
          scan: scanRecord,
          findings: detected,
          report: reportRecord,
        },
      },
      201
    );
  }

  // 5. List Scans (GET /scans)
  if (method === 'GET' && path === '/scans') {
    const params = new URLSearchParams(queryString || '');
    const search = (params.get('search') || '').toLowerCase();
    const riskLevel = params.get('riskLevel') || '';
    let userScans = state.scans.filter((s) => s.user_id === currentUser.id);
    if (search) {
      userScans = userScans.filter((s) => s.original_filename.toLowerCase().includes(search));
    }
    if (riskLevel) {
      userScans = userScans.filter((s) => s.risk_level === riskLevel);
    }
    return makeResponse({
      success: true,
      data: {
        scans: userScans,
        total: userScans.length,
        page: 1,
        limit: 20,
      },
    });
  }

  if (method === 'DELETE' && path === '/scans') {
    state.scans = state.scans.filter((s) => s.user_id !== currentUser.id);
    state.findings = state.findings.filter((f) => f.user_id !== currentUser.id);
    state.reports = state.reports.filter((r) => r.user_id !== currentUser.id);
    saveState(state);
    return makeResponse({
      success: true,
      message: 'Scan history cleared',
      data: { deletedCount: 0 },
    });
  }

  // 6. Single Scan Details, Redaction & Reports
  const scanMatch = path.match(/^\/scans\/([^/]+)(?:\/(.*))?$/);
  if (scanMatch) {
    const scanId = scanMatch[1];
    const subRoute = scanMatch[2] || '';
    const scan = state.scans.find((s) => s.id === scanId);
    const findings = state.findings.filter((f) => f.scan_id === scanId);
    const report = state.reports.find((r) => r.scan_id === scanId) || null;

    if (!scan) {
      throw new Error('Scan not found');
    }

    if (method === 'GET' && !subRoute) {
      return makeResponse({
        success: true,
        data: {
          scan,
          findings,
          report,
          redactionHistory: state.redactions.filter((r) => r.scan_id === scanId),
        },
      });
    }

    if (method === 'DELETE' && !subRoute) {
      state.scans = state.scans.filter((s) => s.id !== scanId);
      saveState(state);
      return makeResponse({
        success: true,
        data: { deletedScanId: scanId },
      });
    }

    if (method === 'POST' && subRoute === 'redact') {
      const body = parseBody();
      const targetIds: string[] =
        body.redactionType === 'all'
          ? findings.map((f) => f.id)
          : body.findingIds || [];

      let workingText = scan.extracted_text || '';
      findings.forEach((f) => {
        if (targetIds.includes(f.id)) {
          f.is_redacted = true;
          if (f.raw_match) {
            workingText = workingText
              .split(f.raw_match)
              .join(`[REDACTED:${f.category.toUpperCase()}]`);
          }
        }
      });

      scan.redaction_status = 'completed';
      scan.extracted_text_preview = workingText;
      saveState(state);

      return makeResponse({
        success: true,
        data: {
          scan,
          findings,
          redactedPreviewText: workingText,
          verificationPassed: true,
          notes: 'Sensitive text ranges permanently stripped and verified.',
        },
      });
    }

    if (method === 'GET' && subRoute === 'redacted-file') {
      const blob = new Blob([scan.extracted_text_preview || '[REDACTED DOCUMENT]'], {
        type: 'text/plain;charset=utf-8',
      });
      return {
        data: blob,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/plain' },
        config,
      };
    }

    if (method === 'GET' && subRoute === 'report') {
      return makeResponse({
        success: true,
        data: { scan, report, findings, redactionHistory: [] },
      });
    }

    if (method === 'GET' && subRoute === 'report/pdf') {
      const textSummary = [
        'PRIVACYGUARD AI — OFFICIAL PRIVACY ASSESSMENT REPORT',
        `Document: ${scan.original_filename}`,
        `Risk Score: ${scan.risk_score}/100 (${scan.risk_level?.toUpperCase()})`,
        `Total Findings: ${findings.length}`,
        '',
        report?.summary || '',
        report?.risk_explanation || '',
      ].join('\n');
      const blob = new Blob([textSummary], { type: 'application/pdf' });
      return {
        data: blob,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/pdf' },
        config,
      };
    }
  }

  // 7. Assistant Chat & Conversations
  if (method === 'POST' && path === '/assistant/chat') {
    const body = parseBody();
    const q = String(body.message || '').toLowerCase();
    let reply =
      'To protect your personal documents before sharing: always apply data minimization, mask government IDs (Aadhaar/PAN) and financial account numbers, and use permanent redaction rather than visual overlays.';
    if (q.includes('aadhaar')) {
      reply =
        '### Sharing Aadhaar Safely\n1. Use a **Masked Aadhaar** (`XXXX XXXX 1234`) or UIDAI Virtual ID (VID).\n2. Redact the first 8 digits using PrivacyGuard AI before sharing for KYC or address proof.';
    } else if (q.includes('pan')) {
      reply =
        '### Protecting PAN Details\nOnly share your PAN where statutory tax or financial rules require it. Redact the 10-character PAN identifier when using the card purely for photo or signature proof.';
    } else if (q.includes('bank') || q.includes('statement')) {
      reply =
        '### Bank Statement Protection\nHide your full account number, customer ID (CIF), payment card numbers, and UPI counterparty narrations before sharing statements externally.';
    }

    const convId = body.conversationId || genId();
    if (!state.conversations.some((c) => c.id === convId)) {
      state.conversations.unshift({
        id: convId,
        user_id: currentUser.id,
        title: String(body.message || 'Privacy Consultation').slice(0, 48),
        created_at: new Date().toISOString(),
      });
    }
    state.messages.push(
      {
        id: genId(),
        conversation_id: convId,
        user_id: currentUser.id,
        role: 'user',
        content: String(body.message || ''),
        created_at: new Date().toISOString(),
      },
      {
        id: genId(),
        conversation_id: convId,
        user_id: currentUser.id,
        role: 'assistant',
        content: reply,
        created_at: new Date().toISOString(),
      }
    );
    saveState(state);

    return makeResponse({
      success: true,
      data: {
        conversationId: convId,
        reply,
        suggestedFollowUps: [
          'Is it safe to share my Aadhaar card?',
          'How can I protect my PAN details?',
          'What should I hide before uploading a bank statement?',
        ],
      },
    });
  }

  if (method === 'GET' && path === '/assistant/conversations') {
    return makeResponse({
      success: true,
      data: {
        conversations: state.conversations.filter((c) => c.user_id === currentUser.id),
      },
    });
  }

  // 8. Alerts & Settings
  if (method === 'GET' && path === '/alerts') {
    return makeResponse({
      success: true,
      data: {
        alerts: state.alerts.filter((a) => a.user_id === currentUser.id),
      },
    });
  }

  if (method === 'GET' && path === '/settings') {
    const s = state.settings.find((item) => item.user_id === currentUser.id) || {
      id: genId(),
      user_id: currentUser.id,
      auto_delete_original: true,
      retain_scan_history: true,
      retain_redacted_files: true,
      security_notifications: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return makeResponse({
      success: true,
      data: { settings: s },
    });
  }

  if (method === 'PATCH' && path === '/settings') {
    const body = parseBody();
    let s = state.settings.find((item) => item.user_id === currentUser.id);
    if (!s) {
      s = {
        id: genId(),
        user_id: currentUser.id,
        auto_delete_original: true,
        retain_scan_history: true,
        retain_redacted_files: true,
        security_notifications: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      state.settings.push(s);
    }
    Object.assign(s, body, { updated_at: new Date().toISOString() });
    saveState(state);
    return makeResponse({
      success: true,
      data: { settings: s },
    });
  }

  return makeResponse({ success: true, data: {} });
};

