# PrivacyGuard AI – Frontend Application

Modern, responsive cybersecurity SaaS frontend built with **React 19**, **Vite 6**, **TypeScript**, **Tailwind CSS v4**, **React Router v7**, **TanStack Query**, **React Hook Form**, **Zod**, **Recharts**, and **Supabase Auth**.

## Features
- **Public & Authentication Pages**: Landing Page (`/`), Login (`/login`), Registration (`/register`), Password Reset (`/forgot-password`), and OAuth/Email Callback (`/auth/callback`).
- **Real-Time Security Dashboard (`/dashboard`)**: Live statistics cards, Risk Overview Bar Chart, Top Sensitive Data Categories, Recent Scans, and Security Alerts derived from backend database records.
- **Intelligent Upload & Scan (`/scan`)**: Drag-and-drop file upload with client-side MIME/extension/size checks, scan profile selector, upload progress bar, cancellation control, and instant sample KYC document loader.
- **Scan Results (`/scan/:scanId`)**: Circular risk score gauge (`0–100`), risk classification badge, explainable AI risk justification, confidence indicators, and actionable protection recommendations.
- **Smart Redaction Workspace (`/redact/:scanId`)**: Side-by-side extracted text and redacted output preview, individual finding selection checkboxes, "Select All", "Redact Selected", "Redact All", and verified protected file download.
- **Detailed Privacy Report (`/reports/:scanId`)**: Comprehensive audit breakdown and one-click official PDF Report export.
- **Scan History (`/history`)**: Search by filename, filter by Risk Level, File Format, and Scan Status, pagination, and secure deletion.
- **Privacy AI Assistant (`/assistant`)**: Interactive privacy consultation chat with suggested questions and saved conversation history.
- **Security Alerts (`/alerts`) & User Settings (`/settings`, `/settings/profile`, `/settings/privacy`)**: Manage retention policies (`auto_delete_original`, `retain_scan_history`, `retain_redacted_files`, `security_notifications`), purge scan history, or permanently delete your account.

## Environment Variables (`frontend/.env`)
Copy `.env.example` to `.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
VITE_APP_NAME=PrivacyGuard AI
VITE_APP_ENV=development
```
> **Security Note**: Never place `GEMINI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in `frontend/.env`.

## Available Scripts
```bash
npm install
npm run dev        # Starts Vite dev server at http://localhost:5173
npm run typecheck  # Runs TypeScript compiler check
npm test           # Runs Vitest unit & validation suite
npm run build      # Builds production bundle into dist/
npm run preview    # Previews production build locally
```

