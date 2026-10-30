import fs from 'fs';
import path from 'path';
import { env } from '../../config/env';
import { supabaseAdmin } from '../../config/supabase';
import { logger } from '../../utils/logger';

const LOCAL_STORAGE_ROOT = path.resolve(process.cwd(), 'temp', 'buckets');

export type StorageBucketName = 'privacy-uploads' | 'privacy-redacted';

export class FileStorageService {
  private supabaseStorageUnavailable = false;

  private get useSupabaseStorage(): boolean {
    return !env.isPlaceholderSupabase && env.NODE_ENV !== 'test' && !this.supabaseStorageUnavailable;
  }

  /**
   * Builds a strict user-isolated storage path: `{userId}/{scanId}/{safeFilename}`
   * Prevents any path traversal.
   */
  public buildStoragePath(userId: string, scanId: string, filename: string): string {
    const safeUser = path.basename(userId).replace(/[^a-zA-Z0-9_-]/g, '');
    const safeScan = path.basename(scanId).replace(/[^a-zA-Z0-9_-]/g, '');
    const safeFile = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');

    if (!safeUser || !safeScan || !safeFile) {
      throw new Error('Invalid storage path segments');
    }
    return `${safeUser}/${safeScan}/${safeFile}`;
  }

  public verifyOwnershipPath(userId: string, storagePath: string): boolean {
    const normalized = storagePath.replace(/\\/g, '/');
    if (normalized.includes('..')) return false;
    const parts = normalized.split('/');
    return parts.length >= 3 && parts[0] === userId;
  }

  public async uploadBuffer(
    bucket: StorageBucketName,
    storagePath: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    if (storagePath.includes('..')) {
      throw new Error('Path traversal attempt blocked');
    }

    if (this.useSupabaseStorage) {
      const { error } = await supabaseAdmin.storage.from(bucket).upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });
      if (!error) {
        return storagePath;
      }
      logger.warn(
        { error, bucket, storagePath },
        'Supabase Storage bucket not yet migrated; falling back to local isolated bucket storage'
      );
      this.supabaseStorageUnavailable = true;
    }

    const fullLocalPath = path.join(LOCAL_STORAGE_ROOT, bucket, storagePath);
    const dir = path.dirname(fullLocalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullLocalPath, buffer);
    return storagePath;
  }

  public async downloadBuffer(
    bucket: StorageBucketName,
    userId: string,
    storagePath: string
  ): Promise<Buffer> {
    if (!this.verifyOwnershipPath(userId, storagePath)) {
      throw new Error('Unauthorized storage path access');
    }

    if (this.useSupabaseStorage) {
      const { data, error } = await supabaseAdmin.storage.from(bucket).download(storagePath);
      if (error || !data) {
        throw new Error(`Unable to download file from storage: ${error?.message || 'Not found'}`);
      }
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    const fullLocalPath = path.join(LOCAL_STORAGE_ROOT, bucket, storagePath);
    if (!fs.existsSync(fullLocalPath)) {
      throw new Error('Requested file does not exist in storage');
    }
    return fs.readFileSync(fullLocalPath);
  }

  public async createSignedUrl(
    bucket: StorageBucketName,
    userId: string,
    storagePath: string
  ): Promise<string | null> {
    if (!this.verifyOwnershipPath(userId, storagePath)) {
      throw new Error('Unauthorized storage path access');
    }

    if (this.useSupabaseStorage) {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(storagePath, env.SIGNED_URL_EXPIRY_SECONDS);
      if (error) {
        logger.warn({ error, bucket, storagePath }, 'Could not generate signed URL');
        return null;
      }
      return data.signedUrl;
    }

    return null;
  }

  public async deleteFile(bucket: StorageBucketName, userId: string, storagePath: string): Promise<void> {
    if (!this.verifyOwnershipPath(userId, storagePath)) {
      throw new Error('Unauthorized storage deletion attempt');
    }

    if (this.useSupabaseStorage) {
      await supabaseAdmin.storage.from(bucket).remove([storagePath]);
      return;
    }

    const fullLocalPath = path.join(LOCAL_STORAGE_ROOT, bucket, storagePath);
    if (fs.existsSync(fullLocalPath)) {
      try {
        fs.unlinkSync(fullLocalPath);
      } catch (err) {
        logger.warn({ err, fullLocalPath }, 'Failed to delete local storage file');
      }
    }
  }
}

export const fileStorage = new FileStorageService();

