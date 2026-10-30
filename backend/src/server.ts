import fs from 'fs';
import path from 'path';
import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const tempDir = path.resolve(process.cwd(), env.UPLOAD_TEMP_DIR);
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      environment: env.NODE_ENV,
      geminiModel: env.GEMINI_MODEL,
      maxFileSizeMb: env.MAX_FILE_SIZE_MB,
    },
    `PrivacyGuard AI Backend listening on http://localhost:${env.PORT}`
  );
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutting down PrivacyGuard AI server gracefully');
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

