import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { env } from './config/env';
import { apiRouter } from './routes/apiRoutes';
import { errorHandler } from './middleware/errorMiddleware';
import { AuthenticatedRequest } from './types';
import { logger } from './utils/logger';

export const app = express();

// 1. Security Headers via Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        env.NODE_ENV === 'test' ||
        env.corsOriginsList.includes(origin) ||
        env.corsOriginsList.includes('*') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })
);

// 3. Request ID & Structured Logging Middleware
app.use((req, res, next) => {
  const authReq = req as AuthenticatedRequest;
  const reqId = (req.headers['x-request-id'] as string) || uuidv4();
  authReq.requestId = reqId;
  res.setHeader('X-Request-ID', reqId);

  const start = Date.now();
  res.on('finish', () => {
    logger.info(
      {
        requestId: reqId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      },
      'HTTP Request completed'
    );
  });
  next();
});

// 4. Rate Limiting
if (env.NODE_ENV !== 'test') {
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      error: { code: 'RATE_LIMIT_EXCEEDED' },
    },
  });
  app.use('/api', limiter);
}

// 5. Body Parsers with strict size limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 6. Root & Health Endpoints
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'PrivacyGuard AI Server is running',
    data: {
      status: 'ok',
      apiBasePath: '/api/v1',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'PrivacyGuard AI Server is running',
    data: {
      status: 'ok',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
});

// 7. API Routes (support /api/v1, /api, and root-level API calls if VITE_API_BASE_URL omits /api/v1)
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);
app.use('/', apiRouter);

// 8. 404 Handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Requested API endpoint does not exist',
    error: { code: 'NOT_FOUND' },
  });
});

// 9. Global Error Handler
app.use(errorHandler);

