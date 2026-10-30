# PrivacyGuard AI – Intelligent Personal Data Exposure & Digital Trust Protection System

> **Project Tagline:** *PrivacyGuard AI – Detect Before You Expose.*

---

## 1. Project Introduction

**PrivacyGuard AI** is a production-oriented, full-stack cybersecurity and data-privacy protection platform designed to help individuals and organizations identify, understand, and prevent accidental exposure of sensitive information before sharing digital files.

## 2. Problem Statement

Individuals and teams routinely share documents, screenshots, images, PDFs, Word documents, and text files containing high-risk personal or organizational data without realizing the exposure risks:
- Government identity numbers (Aadhaar-like identifiers, PAN card details, passports)
- Financial instruments (credit/debit card numbers, bank account numbers, IFSC codes)
- Authentication credentials (passwords, API keys, JWTs, cloud access tokens)
- Personal contact & location data (emails, phone numbers, residential addresses)
- Medical and clinical records
- Confidential business and payroll information

Furthermore, users often attempt to "hide" sensitive text in PDFs by drawing visual black rectangles over text—leaving the underlying text selectable and recoverable.

## 3. Solution Overview

**PrivacyGuard AI** acts as a preventive privacy protection layer:
1. **Validates & Extracts**: Verifies magic-byte file signatures and extracts text from PDFs, DOCX, TXT, and images (PNG, JPG/JPEG, WEBP via OCR).
2. **Hybrid 3-Layer Detection**: Combines deterministic rule-based patterns (Regex, Luhn checksum validation, format checks) with contextual Google Gemini AI analysis (`@google/genai`) while masking credentials and card numbers *before* external AI calls.
3. **Deterministic Risk Scoring**: Calculates an explainable `0–100` privacy risk score (`Low`, `Moderate`, `High`, `Critical`) on the backend using category severity weights, confidence weighting, and multi-category correlation.
4. **Genuine Smart Redaction**: Permanently strips sensitive content from exported files—rebuilding clean PDF documents without original text streams, modifying DOCX XML streams, and permanently burning opaque pixel redaction bands onto images while stripping EXIF metadata—followed by automated verification.
5. **Interactive Privacy Assistant & Audit Reports**: Provides downloadable PDF Privacy Reports, real-time Security Alerts, and an AI Privacy Assistant for educational guidance.

---

## 4. Main Features

- **Authentication & Data Isolation**: Powered by Supabase Authentication and strict PostgreSQL Row Level Security (RLS) across all 9 database tables and 2 private Supabase Storage buckets.
- **Intelligent Multi-Format Scanning**: Supports `.pdf`, `.png`, `.jpg/.jpeg`, `.webp`, `.docx`, and `.txt` with magic-byte signature enforcement and executable rejection.
- **3-Layer Hybrid Detection Engine**:
  - *Layer 1*: Rule-based detection for Aadhaar-like 12-digit patterns, PAN card identifiers, Luhn-validated payment cards, IFSC codes, bank accounts, emails, phone numbers, API keys, passwords, residential addresses, medical notes, and confidential markers.
  - *Layer 2*: Contextual Google Gemini AI (`@google/genai`) detection with strict Zod response validation.
  - *Layer 3*: Deduplication and confidence merging (`rule_based`, `gemini_ai`, `hybrid`).
- **Deterministic Backend Risk Scoring (`0–100`)**:
  - Low Risk (`0–29`), Moderate Risk (`30–59`), High Risk (`60–79`), Critical Risk (`80–100`).
- **Smart Redaction Engine**:
  - Redact selected findings or all findings.
  - Side-by-side preview of original extracted text vs. sanitized output.
  - Independent verification pass confirming sensitive literals are absent from exported files.
- **Detailed Privacy Reports & PDF Export**: Comprehensive breakdown of findings, risk justification, sharing guidance, and one-click PDF report download.
- **Privacy AI Assistant**: Educational Q&A chat on Aadhaar/PAN protection, bank statement safety, API keys, and phishing awareness.
- **Security Alerts & Zero-Trust Retention Settings**: Configurable automatic deletion of original files (`auto_delete_original`), history retention controls, scan history purge, and full account deletion.

---

## 5. Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | React 19, Vite 6, TypeScript, Tailwind CSS v4, React Router v7, TanStack Query v5, React Hook Form, Zod, Recharts, Lucide React, Axios, Supabase JS SDK |
| **Backend** | Node.js, Express.js, TypeScript, `@google/genai` (Official Gemini SDK), Supabase JS SDK, Zod, Multer, `pdf-lib`, `pdf-parse`, `sharp`, `mammoth`, `jszip`, `tesseract.js`, Helmet, CORS, Express Rate Limit, Pino |
| **Database & Storage** | Supabase PostgreSQL, Row Level Security (RLS), Private Supabase Storage Buckets (`privacy-uploads`, `privacy-redacted`) |
| **Testing** | Vitest, Supertest, Testing Library |
| **Deployment** | Vercel (Frontend), Render (Backend), Supabase Cloud (Database & Auth) |

---

## 6. Architecture Overview

```text
[ React + Vite + Tailwind Frontend ]
               │
               │ HTTPS REST API (/api/v1/*) + Bearer JWT
               ▼
[ Node.js + Express + TypeScript Backend ]
   ├── Auth Middleware (Verifies Supabase JWT & Enforces Ownership)
   ├── Upload Middleware (MIME, Size & Magic-Byte Signature Validation)
   ├── Text & OCR Extractor (PDF, DOCX, TXT, PNG/JPG/WEBP)
   ├── Hybrid Detection Engine
   │     ├── Layer 1: Deterministic Regex + Luhn Checksum Validator
   │     ├── Layer 2: Pre-Sanitized Text ──► Google Gemini (@google/genai)
   │     └── Layer 3: Deduplication & Confidence Merger + Zod Validation
   ├── Risk Scoring Engine (Deterministic Backend Algorithm 0–100)
   ├── Smart Redaction Engine (Clean PDF Rebuild, Image Pixel Burn, Verification)
   └── Persistence Layer ──► Supabase PostgreSQL (RLS) & Private Storage Buckets
```

---

## 7. Project Folder Structure

```text
PrivacyGuard-AI/
├── frontend/
│   ├── public/
│   │   └── logo.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # LoadingSpinner, SkeletonLoader, EmptyState, ErrorState, ConfirmationDialog, Pagination, SearchInput, FilterDropdown
│   │   │   ├── layout/         # AppLayout, Sidebar, Navbar, Header, Footer, MobileNavigation, ProtectedRoute
│   │   │   ├── dashboard/      # StatsCard, RiskOverviewChart, RecentScans, SecurityAlerts, QuickScanCard
│   │   │   ├── scanning/       # FileUploader, UploadProgress, ScanProgress, ScanStatus, ScanTypeSelector
│   │   │   ├── findings/       # RiskScoreCard, RiskLevelBadge, FindingList, FindingCard, ConfidenceIndicator, RecommendationCard, ScanSummary
│   │   │   ├── redaction/      # DocumentPreview, FindingSelector, RedactionControls, RedactionPreview, DownloadProtectedFile
│   │   │   ├── reports/        # ReportHeader, ReportSummary, FindingsTable, RiskBreakdown, ExportReportButton
│   │   │   └── assistant/      # ChatWindow, ChatMessage, ChatInput, SuggestedQuestions
│   │   ├── context/            # AuthContext, ToastContext
│   │   ├── lib/                # supabase.ts, utils.ts
│   │   ├── pages/              # Landing, Login, Register, ForgotPassword, Dashboard, Scan, ScanResults, Redaction, Report, History, Assistant, Alerts, Settings, NotFound
│   │   ├── schemas/            # Zod form schemas
│   │   ├── services/           # api.ts, auth.ts
│   │   ├── styles/             # index.css (Tailwind v4)
│   │   ├── test/               # Frontend unit & schema tests
│   │   ├── types/              # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vercel.json
│   ├── vite.config.ts
│   └── README.md
│
├── backend/
│   ├── src/
│   │   ├── config/             # env.ts, supabase.ts, gemini.ts
│   │   ├── controllers/        # authController, dashboardController, scanController, assistantAndSettingsController
│   │   ├── middleware/         # authMiddleware, uploadMiddleware, errorMiddleware
│   │   ├── routes/             # apiRoutes.ts (/api/v1/*)
│   │   ├── services/
│   │   │   ├── scanning/       # textExtractor.ts, scanOrchestrator.ts
│   │   │   ├── detection/      # ruleEngine.ts, detectionCombiner.ts
│   │   │   ├── ai/             # geminiService.ts
│   │   │   ├── risk/           # riskEngine.ts
│   │   │   ├── redaction/      # redactionEngine.ts
│   │   │   ├── reports/        # pdfReportGenerator.ts
│   │   │   └── storage/        # databaseService.ts, fileStorageService.ts
│   │   ├── types/              # Backend TypeScript interfaces
│   │   ├── utils/              # Structured Pino logger
│   │   ├── validators/         # Strict Zod API & AI schemas
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   │   └── privacyguard.test.ts
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── README.md
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## 8. Prerequisites

- **Node.js**: `v20.0.0` or higher (`v22+` / `v24+` supported)
- **npm**: `v10+`
- **Supabase Account**: Free or Pro project at [https://supabase.com](https://supabase.com)
- **Google Gemini API Key**: From [Google AI Studio](https://aistudio.google.com/)

---

## 9. Installation & Setup Instructions

### 9.1 Clone or Open the Repository
```bash
cd "bulid ship ai"
```

### 9.2 Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```

### 9.3 Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env
```

---

## 10. Environment Variable Configuration

### Backend (`backend/.env`)
| Variable | Description | Where to Obtain |
|---|---|---|
| `NODE_ENV` | `development`, `test`, or `production` | Set to `development` locally, `production` on Render |
| `PORT` | Backend HTTP port (default `5000`) | Local config / Render injects automatically |
| `FRONTEND_URL` | Frontend origin (`http://localhost:5173`) | Local Vite URL or deployed Vercel URL |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173,https://your-app.vercel.app` |
| `SUPABASE_URL` | Supabase Project URL | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret Service Role Key (Backend only!) | Supabase Dashboard → Project Settings → API |
| `SUPABASE_PUBLISHABLE_KEY` | Anon / Publishable Public Key | Supabase Dashboard → Project Settings → API |
| `GEMINI_API_KEY` | Google Gemini API Key (Backend only!) | [Google AI Studio](https://aistudio.google.com/) |
| `GEMINI_MODEL` | Gemini model identifier (e.g. `gemini-2.5-flash`) | Google AI Studio model list |
| `MAX_FILE_SIZE_MB` | Maximum upload size in MB (default `10`) | Configurable |

### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL (`http://localhost:5000/api/v1`) |
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Anon/Publishable Key |
| `VITE_APP_NAME` | `PrivacyGuard AI` |
| `VITE_APP_ENV` | `development` or `production` |

---

## 11. Supabase Project, Migration & Storage Setup

1. Create a new project in [Supabase Dashboard](https://supabase.com/dashboard).
2. Open **SQL Editor** → **New Query**.
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql` and click **Run**.
4. This single migration automatically:
   - Creates all 9 tables (`profiles`, `scans`, `findings`, `scan_reports`, `redaction_records`, `security_alerts`, `user_settings`, `assistant_conversations`, `assistant_messages`).
   - Creates all foreign keys, `CHECK` constraints, indexes, and `updated_at` triggers.
   - Creates the `on_auth_user_created` trigger that automatically provisions `profiles` and `user_settings` when a user registers.
   - Enables Row Level Security (RLS) and attaches strict ownership policies to every table.
   - Creates the two private Storage buckets (`privacy-uploads` and `privacy-redacted`) and attaches folder-scoped (`{user_id}/{scan_id}/{filename}`) Storage RLS policies.
5. In **Authentication → URL Configuration**, add `http://localhost:5173/auth/callback` (and your Vercel URL `/auth/callback`) to **Redirect URLs**.

---

## 12. Local Development Commands

Run the backend and frontend in two separate terminals:

**Terminal 1 – Backend API Server (`http://localhost:5000`)**:
```bash
cd backend
npm run dev
```

**Terminal 2 – Frontend Application (`http://localhost:5173`)**:
```bash
cd frontend
npm run dev
```

---

## 13. API Endpoint Documentation (`/api/v1`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` & `/api/v1/health` | Service health check |
| `GET` | `/api/v1/auth/me` | Verify token & return current user profile + settings |
| `GET` | `/api/v1/profile` | Retrieve authenticated user profile |
| `PATCH` | `/api/v1/profile` | Update user profile (`full_name`, `avatar_url`) |
| `DELETE` | `/api/v1/account` | Permanently delete user account & all data |
| `GET` | `/api/v1/dashboard/stats` | Aggregated dashboard statistics from database |
| `GET` | `/api/v1/dashboard/recent-scans` | Recent scan activity list |
| `GET` | `/api/v1/dashboard/risk-distribution` | Risk tier and category distribution |
| `POST` | `/api/v1/scans` | Upload & analyze document/image (`multipart/form-data`) |
| `GET` | `/api/v1/scans` | List scans with pagination, search & filters |
| `GET` | `/api/v1/scans/:scanId` | Retrieve scan details, findings, report & preview |
| `POST` | `/api/v1/scans/:scanId/analyze` | Re-run hybrid analysis on an existing scan |
| `DELETE` | `/api/v1/scans/:scanId` | Delete a specific scan and its storage objects |
| `DELETE` | `/api/v1/scans` | Purge all scan history for the authenticated user |
| `GET` | `/api/v1/scans/:scanId/findings` | Retrieve findings for a scan |
| `PATCH` | `/api/v1/findings/:findingId` | Update finding metadata/status |
| `GET` | `/api/v1/scans/:scanId/risk` | Retrieve deterministic risk score & breakdown |
| `POST` | `/api/v1/scans/:scanId/recommendations` | Generate actionable recommendations |
| `POST` | `/api/v1/scans/:scanId/redact` | Execute & verify permanent document redaction |
| `GET` | `/api/v1/scans/:scanId/redacted-file` | Download protected redacted document |
| `GET` | `/api/v1/scans/:scanId/redaction-history` | Retrieve audit log of redaction operations |
| `GET` | `/api/v1/scans/:scanId/report` | Retrieve structured privacy report |
| `GET` | `/api/v1/scans/:scanId/report/pdf` | Export & download official PDF privacy report |
| `POST` | `/api/v1/assistant/chat` | Send privacy question to PrivacyGuard AI Assistant |
| `GET` | `/api/v1/assistant/conversations` | List saved assistant conversations |
| `GET` | `/api/v1/assistant/conversations/:conversationId` | Get messages in a conversation |
| `DELETE` | `/api/v1/assistant/conversations/:conversationId` | Delete an assistant conversation |
| `GET` | `/api/v1/alerts` | List security & exposure alerts |
| `PATCH` | `/api/v1/alerts/:alertId/read` | Mark a security alert as read |
| `DELETE` | `/api/v1/alerts/:alertId` | Delete a security alert |
| `GET` | `/api/v1/settings` | Retrieve user retention & privacy settings |
| `PATCH` | `/api/v1/settings` | Update user retention & privacy settings |

---

## 14. Testing Instructions

Run automated unit and integration tests for both backend and frontend:

```bash
# Backend Unit & API Integration Tests (Vitest + Supertest)
cd backend
npm test
npm run typecheck

# Frontend Unit & Schema Validation Tests (Vitest)
cd ../frontend
npm test
npm run typecheck
npm run build
```

---

## 15. GitHub Repository Setup & Push Commands

To push this project to your GitHub repository, run the following commands from the project root directory (replace `YOUR_GITHUB_REPOSITORY_URL` with your actual GitHub repository URL):

```bash
git init
git add .
git commit -m "Initial commit - PrivacyGuard AI"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

---

## 16. Deployment Instructions

### 16.1 Backend Deployment to Render

1. Push the project to your GitHub repository.
2. Log in to [Render](https://render.com) and click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Set **Root Directory** to `backend`.
5. Set **Runtime** to `Node`.
6. Set **Build Command** to:
   ```bash
   npm install && npm run build
   ```
7. Set **Start Command** to:
   ```bash
   npm start
   ```
8. Add the following **Environment Variables** in Render:
   - `NODE_ENV` = `production`
   - `PORT` = `5000`
   - `FRONTEND_URL` = `https://your-frontend-domain.vercel.app`
   - `CORS_ORIGINS` = `https://your-frontend-domain.vercel.app`
   - `SUPABASE_URL` = *(your Supabase project URL)*
   - `SUPABASE_SERVICE_ROLE_KEY` = *(your Supabase service-role secret key)*
   - `SUPABASE_PUBLISHABLE_KEY` = *(your Supabase anon/publishable key)*
   - `GEMINI_API_KEY` = *(your Google Gemini API key)*
   - `GEMINI_MODEL` = `gemini-2.5-flash`
   - `MAX_FILE_SIZE_MB` = `10`
9. Deploy the service and verify `https://your-backend-service.onrender.com/health` returns `200 OK`.

### 16.2 Frontend Deployment to Vercel

1. Log in to [Vercel](https://vercel.com) and click **Add New...** → **Project**.
2. Import your GitHub repository.
3. Set **Root Directory** to `frontend`.
4. Set **Framework Preset** to `Vite`.
5. Set **Build Command** to `npm run build` (as defined in `frontend/package.json`).
6. Set **Output Directory** to `dist`.
7. Add the following **Environment Variables** in Vercel:
   - `VITE_API_BASE_URL` = `https://your-backend-service.onrender.com/api/v1`
   - `VITE_SUPABASE_URL` = *(your Supabase project URL)*
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = *(your Supabase anon/publishable key)*
   - `VITE_APP_NAME` = `PrivacyGuard AI`
   - `VITE_APP_ENV` = `production`
8. Click **Deploy**. (`frontend/vercel.json` is pre-configured for SPA client-side routing fallback).
9. Once deployed, copy your Vercel domain and ensure it is listed in Render's `CORS_ORIGINS` and `FRONTEND_URL` environment variables.

---

## 17. Troubleshooting

- **CORS Errors in Production**: Ensure `CORS_ORIGINS` on Render includes your exact Vercel URL without a trailing slash (e.g., `https://privacyguard-ai.vercel.app`).
- **415 Unsupported File Type**: PrivacyGuard AI validates magic-byte file signatures. Ensure the uploaded file is a genuine PDF, PNG, JPG, WEBP, DOCX, or UTF-8 TXT file and not a renamed binary.
- **Gemini Partial Analysis Message**: If `GEMINI_API_KEY` is not set or quota is exceeded, the backend automatically preserves deterministic rule-based detections and returns a clearly marked partial analysis instead of failing.

---

## 18. Security Considerations & Privacy Disclaimer

> **Mandatory Product Disclaimer:**
> *"PrivacyGuard AI helps identify potential sensitive information and reduce accidental data exposure. Automated detection may not identify every risk. Always review documents before sharing."*

---

## 19. Future Enhancements

- Batch multi-document archive scanning
- Custom organization-specific regex rule builder
- Webhook notifications for enterprise DLP pipelines

## 20. License

Released under the [MIT License](./LICENSE).

