import { z } from 'zod';

export const sensitiveCategoryEnum = z.enum([
  'personal_identity',
  'government_identity',
  'financial_information',
  'authentication_credentials',
  'contact_information',
  'location_information',
  'medical_information',
  'confidential_business_information',
  'other_sensitive_information',
]);

export const severityEnum = z.enum(['low', 'moderate', 'high', 'critical']);
export const riskLevelEnum = z.enum(['low', 'moderate', 'high', 'critical']);
export const detectionMethodEnum = z.enum(['rule_based', 'gemini_ai', 'hybrid']);

// 16.1 Authentication & Profile Validation
export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
    email: z.string().trim().email('Valid email address is required'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    confirmPassword: z.string().min(8),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms and privacy notice' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
  rememberSession: z.boolean().optional().default(true),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  avatar_url: z.string().url('Avatar must be a valid URL').nullable().optional(),
});

// 16.2 File Upload Validation
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.txt', '.docx'] as const;

export const scanTypeEnum = z.enum([
  'standard',
  'financial',
  'identity',
  'business',
  'credential',
]);

export const uploadScanBodySchema = z.object({
  scanType: scanTypeEnum.optional().default('standard'),
  description: z.string().trim().max(500).optional(),
  sensitivityPreference: z.enum(['strict', 'balanced', 'permissive']).optional().default('balanced'),
});

// 16.3 Scan Validation
export const scanIdParamSchema = z.object({
  scanId: z.string().uuid('Invalid scan ID format'),
});

export const scansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  riskLevel: riskLevelEnum.optional(),
  status: z.enum(['pending', 'processing', 'completed', 'partial', 'failed']).optional(),
  fileType: z.string().optional(),
  search: z.string().trim().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// 16.4 Finding Validation
export const findingUpdateSchema = z.object({
  is_redacted: z.boolean().optional(),
  severity: severityEnum.optional(),
  recommended_action: z.string().trim().min(1).max(500).optional(),
});

// 16.5 Risk Validation (Required exact schema from Section 16.5)
export const riskSchema = z.object({
  score: z.number().int().min(0).max(100),
  level: z.enum(['low', 'moderate', 'high', 'critical']),
  explanation: z.string().min(1),
});

// 15.1 & 16.6 AI Detection Response Validation
export const aiDetectionFindingSchema = z.object({
  category: sensitiveCategoryEnum,
  masked_excerpt: z.string().min(1).max(300),
  explanation: z.string().min(1).max(1000),
  confidence: z.number().min(0).max(100),
  severity: severityEnum,
  recommended_action: z.string().min(1).max(500),
  page_number: z.number().int().min(1).nullable().optional().default(1),
});

export const aiDetectionResponseSchema = z.object({
  findings: z.array(aiDetectionFindingSchema),
  analysis_summary: z.string().min(1),
});

// 15.2 AI Privacy Risk Explanation Validation
export const aiRiskExplanationResponseSchema = z.object({
  summary: z.string().min(1),
  major_risks: z.array(
    z.object({
      risk: z.string().min(1),
      explanation: z.string().min(1),
    })
  ),
  recommendations: z.array(
    z.object({
      priority: severityEnum,
      action: z.string().min(1),
    })
  ),
  sharing_guidance: z.string().min(1),
});

// 15.3 AI Recommendation Generation Validation
export const aiRecommendationResponseSchema = z.object({
  recommendations: z.array(
    z.object({
      priority: severityEnum,
      category: z.string().min(1),
      action: z.string().min(1),
      reason: z.string().min(1),
      expected_benefit: z.string().min(1),
    })
  ),
});

// 15.4 & 15.5 Privacy Assistant Validation
export const assistantChatRequestSchema = z.object({
  message: z.string().trim().min(2, 'Question cannot be empty').max(2000, 'Question is too long'),
  conversationId: z.string().uuid().optional().nullable(),
  saveHistory: z.boolean().optional().default(true),
});

export const assistantAiResponseSchema = z.object({
  reply: z.string().min(1),
  suggestedFollowUps: z.array(z.string()).optional().default([]),
});

// Redaction Request Validation
export const redactRequestSchema = z.object({
  redactionType: z.enum(['selected', 'all']),
  findingIds: z.array(z.string().uuid()).optional().default([]),
});

// Settings Update Validation
export const userSettingsUpdateSchema = z.object({
  auto_delete_original: z.boolean().optional(),
  retain_scan_history: z.boolean().optional(),
  retain_redacted_files: z.boolean().optional(),
  security_notifications: z.boolean().optional(),
});

