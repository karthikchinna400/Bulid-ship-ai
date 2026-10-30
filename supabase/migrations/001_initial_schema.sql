-- =============================================================================
-- PrivacyGuard AI – Intelligent Personal Data Exposure & Digital Trust Protection System
-- Migration: 001_initial_schema.sql
-- Database: Supabase PostgreSQL
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. UTILITY FUNCTIONS & TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. TABLES
-- =============================================================================

-- 10.1 profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10.2 scans
CREATE TABLE IF NOT EXISTS public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  stored_filename TEXT,
  file_type TEXT NOT NULL,
  file_size BIGINT CHECK (file_size >= 0),
  storage_path TEXT,
  scan_type TEXT DEFAULT 'standard',
  description TEXT,
  sensitivity_preference TEXT DEFAULT 'balanced',
  extracted_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'partial', 'failed')),
  risk_score INTEGER CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100)),
  risk_level TEXT CHECK (risk_level IS NULL OR risk_level IN ('low', 'moderate', 'high', 'critical')),
  total_findings INTEGER DEFAULT 0 NOT NULL CHECK (total_findings >= 0),
  redaction_status TEXT DEFAULT 'not_started' NOT NULL CHECK (redaction_status IN ('not_started', 'in_progress', 'completed', 'failed', 'unsupported')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

-- 10.3 findings
CREATE TABLE IF NOT EXISTS public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'personal_identity',
    'government_identity',
    'financial_information',
    'authentication_credentials',
    'contact_information',
    'location_information',
    'medical_information',
    'confidential_business_information',
    'other_sensitive_information'
  )),
  subcategory TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'moderate', 'high', 'critical')),
  confidence NUMERIC(5,2) NOT NULL DEFAULT 85.00 CHECK (confidence >= 0 AND confidence <= 100),
  detection_method TEXT NOT NULL CHECK (detection_method IN ('rule_based', 'gemini_ai', 'hybrid')),
  page_number INTEGER DEFAULT 1 CHECK (page_number IS NULL OR page_number >= 1),
  start_offset INTEGER CHECK (start_offset IS NULL OR start_offset >= 0),
  end_offset INTEGER CHECK (end_offset IS NULL OR end_offset >= 0),
  masked_value TEXT NOT NULL,
  explanation TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  is_redacted BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10.4 scan_reports
CREATE TABLE IF NOT EXISTS public.scan_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID UNIQUE NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  risk_explanation TEXT NOT NULL,
  sharing_guidance TEXT,
  recommendations JSONB DEFAULT '[]'::jsonb NOT NULL,
  risk_breakdown JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10.5 redaction_records
CREATE TABLE IF NOT EXISTS public.redaction_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  output_storage_path TEXT,
  redacted_finding_ids UUID[] DEFAULT '{}'::UUID[],
  redaction_type TEXT NOT NULL CHECK (redaction_type IN ('selected', 'all')),
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
  verification_passed BOOLEAN DEFAULT FALSE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10.6 security_alerts
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'moderate', 'high', 'critical')),
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10.7 user_settings
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_delete_original BOOLEAN DEFAULT TRUE NOT NULL,
  retain_scan_history BOOLEAN DEFAULT TRUE NOT NULL,
  retain_redacted_files BOOLEAN DEFAULT TRUE NOT NULL,
  security_notifications BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10.8 assistant_conversations
CREATE TABLE IF NOT EXISTS public.assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Privacy Consultation',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10.9 assistant_messages
CREATE TABLE IF NOT EXISTS public.assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================================================
-- 3. INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON public.scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_risk_level ON public.scans(risk_level);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON public.scans(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_findings_scan_id ON public.findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_findings_user_id ON public.findings(user_id);
CREATE INDEX IF NOT EXISTS idx_findings_category ON public.findings(category);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON public.findings(severity);
CREATE INDEX IF NOT EXISTS idx_findings_created_at ON public.findings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scan_reports_scan_id ON public.scan_reports(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_reports_user_id ON public.scan_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_reports_created_at ON public.scan_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_redaction_records_scan_id ON public.redaction_records(scan_id);
CREATE INDEX IF NOT EXISTS idx_redaction_records_user_id ON public.redaction_records(user_id);
CREATE INDEX IF NOT EXISTS idx_redaction_records_created_at ON public.redaction_records(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON public.security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_scan_id ON public.security_alerts(scan_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_is_read ON public.security_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON public.security_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_assistant_conversations_user_id ON public.assistant_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_created_at ON public.assistant_conversations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_conversation_id ON public.assistant_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_user_id ON public.assistant_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_created_at ON public.assistant_messages(created_at ASC);

-- =============================================================================
-- 4. TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and user_settings on user sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redaction_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

-- 5.1 profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5.2 scans policies
CREATE POLICY "Users can view their own scans"
  ON public.scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scans"
  ON public.scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scans"
  ON public.scans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scans"
  ON public.scans FOR DELETE
  USING (auth.uid() = user_id);

-- 5.3 findings policies (enforced via user_id and parent scan ownership)
CREATE POLICY "Users can view their own findings"
  ON public.findings FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.scans s
      WHERE s.id = findings.scan_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create findings for their own scans"
  ON public.findings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.scans s
      WHERE s.id = findings.scan_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own findings"
  ON public.findings FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.scans s
      WHERE s.id = findings.scan_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own findings"
  ON public.findings FOR DELETE
  USING (auth.uid() = user_id);

-- 5.4 scan_reports policies
CREATE POLICY "Users can view their own scan reports"
  ON public.scan_reports FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.scans s
      WHERE s.id = scan_reports.scan_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own scan reports"
  ON public.scan_reports FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.scans s
      WHERE s.id = scan_reports.scan_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own scan reports"
  ON public.scan_reports FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scan reports"
  ON public.scan_reports FOR DELETE
  USING (auth.uid() = user_id);

-- 5.5 redaction_records policies
CREATE POLICY "Users can view their own redaction records"
  ON public.redaction_records FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.scans s
      WHERE s.id = redaction_records.scan_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own redaction records"
  ON public.redaction_records FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.scans s
      WHERE s.id = redaction_records.scan_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own redaction records"
  ON public.redaction_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5.6 security_alerts policies
CREATE POLICY "Users can view their own security alerts"
  ON public.security_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own security alerts"
  ON public.security_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own security alerts"
  ON public.security_alerts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own security alerts"
  ON public.security_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- 5.7 user_settings policies
CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5.8 assistant_conversations policies
CREATE POLICY "Users can view their own assistant conversations"
  ON public.assistant_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assistant conversations"
  ON public.assistant_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assistant conversations"
  ON public.assistant_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- 5.9 assistant_messages policies
CREATE POLICY "Users can view their own assistant messages"
  ON public.assistant_messages FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.assistant_conversations c
      WHERE c.id = assistant_messages.conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own assistant messages"
  ON public.assistant_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.assistant_conversations c
      WHERE c.id = assistant_messages.conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own assistant messages"
  ON public.assistant_messages FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 6. STORAGE BUCKETS & STORAGE RLS POLICIES
-- =============================================================================

-- Create private storage buckets for original uploads and redacted outputs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'privacy-uploads',
    'privacy-uploads',
    FALSE,
    10485760,
    ARRAY[
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'privacy-redacted',
    'privacy-redacted',
    FALSE,
    10485760,
    ARRAY[
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  )
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS policies enforcing `{user_id}/{scan_id}/{filename}` path isolation
CREATE POLICY "Users can view their own uploaded files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'privacy-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload to their own folder in privacy-uploads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'privacy-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own uploaded files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'privacy-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own redacted files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'privacy-redacted'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload to their own folder in privacy-redacted"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'privacy-redacted'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own redacted files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'privacy-redacted'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

