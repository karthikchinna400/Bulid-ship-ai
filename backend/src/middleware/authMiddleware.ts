import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest, AuthenticatedUser } from '../types';
import { logger } from '../utils/logger';
import { db } from '../services/storage/databaseService';

const LOCAL_TOKEN_SECRET = crypto
  .createHash('sha256')
  .update(env.SUPABASE_SERVICE_ROLE_KEY + '_privacyguard_local_auth')
  .digest('hex');

export const createLocalDevToken = (user: { id: string; email: string; fullName?: string }): string => {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      full_name: user.fullName || user.email.split('@')[0],
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', LOCAL_TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  return `pg_local.${payload}.${signature}`;
};

export const verifyLocalDevToken = (token: string): AuthenticatedUser | null => {
  if (token.startsWith('pg_local_client.')) {
    const rawPayload = token.slice('pg_local_client.'.length);
    try {
      const decoded = JSON.parse(Buffer.from(rawPayload, 'base64').toString('utf-8'));
      if (decoded.id && decoded.email) {
        return {
          id: decoded.id,
          email: decoded.email,
          fullName: decoded.full_name || decoded.email.split('@')[0],
          accessToken: token,
        };
      }
    } catch {
      return null;
    }
  }

  if (!token.startsWith('pg_local.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, payload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', LOCAL_TOKEN_SECRET)
    .update(payload)
    .digest('base64url');

  if (signature !== expectedSig) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return {
      id: decoded.sub,
      email: decoded.email,
      fullName: decoded.full_name,
      accessToken: token,
    };
  } catch {
    return null;
  }
};

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication token is required',
        error: { code: 'UNAUTHORIZED' },
      });
      return;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
        error: { code: 'UNAUTHORIZED' },
      });
      return;
    }

    // 1. Check server-signed HMAC session token (pg_local.* or pg_local_client.*)
    if (token.startsWith('pg_local.') || token.startsWith('pg_local_client.')) {
      const localUser = verifyLocalDevToken(token);
      if (!localUser) {
        res.status(401).json({
          success: false,
          message: 'Expired or invalid session token',
          error: { code: 'INVALID_TOKEN' },
        });
        return;
      }
      await db.getOrCreateProfile(localUser);
      req.user = localUser;
      next();
      return;
    }

    // 2. Verify with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired Supabase session token',
        error: { code: 'INVALID_TOKEN' },
      });
      return;
    }

    const supaUser = data.user;
    const authenticatedUser: AuthenticatedUser = {
      id: supaUser.id,
      email: supaUser.email || '',
      fullName: supaUser.user_metadata?.full_name || supaUser.email?.split('@')[0],
      avatarUrl: supaUser.user_metadata?.avatar_url,
      accessToken: token,
    };

    await db.getOrCreateProfile(authenticatedUser);
    req.user = authenticatedUser;
    next();
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'Authentication verification error');
    res.status(401).json({
      success: false,
      message: 'Authentication verification failed',
      error: { code: 'AUTH_ERROR' },
    });
  }
};

