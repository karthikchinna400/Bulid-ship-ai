import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'SUPABASE_PUBLISHABLE_KEY is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().min(1).default('gemini-2.5-flash'),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().max(50).default(10),
  UPLOAD_TEMP_DIR: z.string().default('./temp/uploads'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  SIGNED_URL_EXPIRY_SECONDS: z.coerce.number().int().positive().default(300),
  AUTO_DELETE_TEMP_FILES: z
    .string()
    .transform((v) => v.toLowerCase() === 'true')
    .default('true'),
  DEFAULT_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment configuration:', parsedEnv.error.flatten().fieldErrors);
  throw new Error('Failed to validate environment variables. Check your .env file.');
}

export const env = {
  ...parsedEnv.data,
  corsOriginsList: parsedEnv.data.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
  maxFileSizeBytes: parsedEnv.data.MAX_FILE_SIZE_MB * 1024 * 1024,
  isPlaceholderSupabase:
    parsedEnv.data.SUPABASE_URL.includes('placeholder-project.supabase.co') ||
    parsedEnv.data.SUPABASE_SERVICE_ROLE_KEY === 'your_supabase_service_role_key',
  isPlaceholderGemini:
    parsedEnv.data.GEMINI_API_KEY === 'your_google_gemini_api_key' ||
    parsedEnv.data.GEMINI_API_KEY.startsWith('placeholder'),
};

