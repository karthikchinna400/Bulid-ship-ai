# Supabase Configuration & Migrations – PrivacyGuard AI

This directory contains the production PostgreSQL schema, Row Level Security (RLS) policies, triggers, indexes, and private Storage Bucket definitions for **PrivacyGuard AI**.

## Migration Files

- `migrations/001_initial_schema.sql`: Complete schema setup including:
  - `profiles` – Application user profiles linked to `auth.users`
  - `scans` – Document and image scan metadata, risk scores, and status
  - `findings` – Individual sensitive data detections (hybrid regex + Gemini AI)
  - `scan_reports` – Comprehensive privacy analysis reports and risk breakdowns
  - `redaction_records` – Audit log and verification records of redacted documents
  - `security_alerts` – Real-time high/critical exposure alerts
  - `user_settings` – Per-user retention and notification preferences
  - `assistant_conversations` & `assistant_messages` – Privacy AI Assistant chat history
  - Automatic user profile & settings provisioning trigger (`on_auth_user_created`)
  - Strict Row Level Security (RLS) policies on all tables
  - Private Supabase Storage buckets (`privacy-uploads` and `privacy-redacted`) and folder-scoped Storage RLS policies (`{user_id}/{scan_id}/{filename}`)

## How to Apply the Migration

### Option A: Supabase Dashboard SQL Editor (Recommended for Quick Setup)
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Create a new project or open your existing project.
3. Navigate to **SQL Editor** in the left sidebar.
4. Click **New Query**.
5. Copy the entire contents of `supabase/migrations/001_initial_schema.sql` and paste it into the editor.
6. Click **Run** to execute the migration.

### Option B: Supabase CLI
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_ID
npx supabase db push
```

## Verifying Setup
1. Check **Table Editor** in Supabase Dashboard to verify all 9 tables exist with RLS enabled.
2. Check **Storage** in Supabase Dashboard to confirm `privacy-uploads` and `privacy-redacted` buckets exist and are marked **Private**.
3. Check **Authentication > Providers** and ensure **Email** provider is enabled.

