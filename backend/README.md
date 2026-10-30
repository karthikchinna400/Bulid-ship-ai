# PrivacyGuard AI – Backend API Server

Secure, modular REST API backend built with **Node.js**, **Express.js**, **TypeScript**, **Supabase PostgreSQL & Storage**, **Google Gemini AI (`@google/genai`)**, **Zod**, **Multer**, **PDF-Lib**, **Sharp**, **Mammoth**, **Tesseract.js**, **Helmet**, and **Pino**.

## Core Architecture
- `src/config/`: Environment validation (`env.ts`), Supabase Admin & User-scoped clients (`supabase.ts`), and server-side Google Gemini SDK initialization (`gemini.ts`).
- `src/middleware/`: Bearer token verification (`authMiddleware.ts`), Multer upload limits + magic-byte signature verification (`uploadMiddleware.ts`), and centralized error handling (`errorMiddleware.ts`).
- `src/services/scanning/`: Format-specific text & OCR extraction (`textExtractor.ts`) and end-to-end scan pipeline orchestration (`scanOrchestrator.ts`).
- `src/services/detection/`: Layer 1 deterministic Regex + Luhn checksum rules (`ruleEngine.ts`) and Layer 3 hybrid deduplication combiner (`detectionCombiner.ts`).
- `src/services/ai/`: Layer 2 contextual analysis, pre-AI credential/card masking, risk explanations, recommendations, and Privacy AI Assistant (`geminiService.ts`).
- `src/services/risk/`: Transparent, deterministic `0–100` risk scoring algorithm (`riskEngine.ts`).
- `src/services/redaction/`: Genuine document redaction (`redactionEngine.ts`) that reconstructs clean PDFs without original text streams, modifies DOCX XML archives, overwrites image pixels + strips EXIF metadata, and independently verifies output before marking redaction as completed.
- `src/services/reports/`: Official PDF privacy assessment report generator (`pdfReportGenerator.ts`).

## Environment Variables (`backend/.env`)
Copy `.env.example` to `.env`:
```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
MAX_FILE_SIZE_MB=10
UPLOAD_TEMP_DIR=./temp/uploads
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SIGNED_URL_EXPIRY_SECONDS=300
AUTO_DELETE_TEMP_FILES=true
DEFAULT_RETENTION_DAYS=30
LOG_LEVEL=info
```

## Available Scripts
```bash
npm install
npm run dev        # Starts development server with hot-reload on port 5000
npm run typecheck  # Verifies TypeScript types
npm test           # Executes Vitest unit & Supertest API integration suite
npm run build      # Compiles TypeScript to dist/
npm start          # Runs compiled production server (node dist/server.js)
```

