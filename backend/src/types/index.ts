import { Request } from 'express';

export type SensitiveCategory =
  | 'personal_identity'
  | 'government_identity'
  | 'financial_information'
  | 'authentication_credentials'
  | 'contact_information'
  | 'location_information'
  | 'medical_information'
  | 'confidential_business_information'
  | 'other_sensitive_information';

export type SeverityLevel = 'low' | 'moderate' | 'high' | 'critical';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type DetectionMethod = 'rule_based' | 'gemini_ai' | 'hybrid';
export type ScanStatus = 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
export type RedactionStatus = 'not_started' | 'in_progress' | 'completed' | 'failed' | 'unsupported';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  accessToken: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  requestId?: string;
}

export interface ProfileRecord {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScanRecord {
  id: string;
  user_id: string;
  original_filename: string;
  stored_filename: string | null;
  file_type: string;
  file_size: number;
  storage_path: string | null;
  scan_type: string;
  description?: string | null;
  sensitivity_preference?: string | null;
  extracted_text?: string | null;
  status: ScanStatus;
  risk_score: number | null;
  risk_level: RiskLevel | null;
  total_findings: number;
  redaction_status: RedactionStatus;
  created_at: string;
  completed_at: string | null;
}

export interface FindingRecord {
  id: string;
  scan_id: string;
  user_id: string;
  category: SensitiveCategory;
  subcategory?: string;
  severity: SeverityLevel;
  confidence: number;
  detection_method: DetectionMethod;
  page_number: number | null;
  start_offset: number | null;
  end_offset: number | null;
  masked_value: string;
  raw_match?: string; // Transient in-memory during scan/redaction, never persisted in findings table
  explanation: string;
  recommended_action: string;
  is_redacted: boolean;
  created_at: string;
}

export interface ScanReportRecord {
  id: string;
  scan_id: string;
  user_id: string;
  summary: string;
  risk_explanation: string;
  sharing_guidance?: string;
  recommendations: Array<{
    priority: SeverityLevel;
    category?: string;
    action: string;
    reason?: string;
    expected_benefit?: string;
  }>;
  risk_breakdown: Record<string, { count: number; maxSeverity: SeverityLevel; weightContribution: number }>;
  created_at: string;
}

export interface RedactionRecord {
  id: string;
  scan_id: string;
  user_id: string;
  output_storage_path: string | null;
  redacted_finding_ids: string[];
  redaction_type: 'selected' | 'all';
  status: 'in_progress' | 'completed' | 'failed';
  verification_passed?: boolean;
  notes?: string;
  created_at: string;
}

export interface SecurityAlertRecord {
  id: string;
  user_id: string;
  scan_id: string | null;
  title: string;
  message: string;
  severity: SeverityLevel;
  is_read: boolean;
  created_at: string;
}

export interface UserSettingsRecord {
  id: string;
  user_id: string;
  auto_delete_original: boolean;
  retain_scan_history: boolean;
  retain_redacted_files: boolean;
  security_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssistantConversationRecord {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface AssistantMessageRecord {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

