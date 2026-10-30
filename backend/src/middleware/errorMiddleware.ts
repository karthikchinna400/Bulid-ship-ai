import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const authReq = req as AuthenticatedRequest;

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        success: false,
        message: `File size exceeds maximum limit of ${env.MAX_FILE_SIZE_MB} MB`,
        error: { code: 'FILE_TOO_LARGE' },
      });
      return;
    }
    res.status(400).json({
      success: false,
      message: 'File upload validation error',
      error: { code: err.code },
    });
    return;
  }

  if (err.message === 'UNSUPPORTED_FILE_TYPE') {
    res.status(415).json({
      success: false,
      message: 'Unsupported file type. Allowed formats: PDF, PNG, JPG/JPEG, WEBP, TXT, DOCX.',
      error: { code: 'UNSUPPORTED_FILE_TYPE' },
    });
    return;
  }

  if (err.message === 'EXECUTABLE_FILE_REJECTED') {
    res.status(415).json({
      success: false,
      message: 'Executable files are strictly prohibited.',
      error: { code: 'EXECUTABLE_FILE_REJECTED' },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: err.issues[0]?.message || 'Validation failed',
      error: {
        code: 'VALIDATION_ERROR',
        details: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: { code: err.code },
    });
    return;
  }

  logger.error(
    {
      err: { message: err.message, name: err.name },
      requestId: authReq.requestId,
      path: req.path,
      method: req.method,
    },
    'Unhandled API error'
  );

  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred while processing your request',
    error: { code: 'INTERNAL_SERVER_ERROR' },
  });
};

