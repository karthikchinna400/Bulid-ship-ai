import multer from 'multer';
import path from 'path';
import { env } from '../config/env';
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES } from '../validators/schemas';

const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: env.maxFileSizeBytes,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    const isAllowedExt = (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
    const isAllowedMime = (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);

    // Block executable extensions explicitly
    const blockedExts = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.dll', '.so', '.msi', '.js', '.vbs', '.scr'];
    if (blockedExts.includes(ext)) {
      return cb(new Error('EXECUTABLE_FILE_REJECTED'));
    }

    if (!isAllowedExt || !isAllowedMime) {
      return cb(new Error('UNSUPPORTED_FILE_TYPE'));
    }

    cb(null, true);
  },
});

export interface FileSignatureValidationResult {
  valid: boolean;
  detectedType?: 'pdf' | 'png' | 'jpeg' | 'webp' | 'docx' | 'txt';
  reason?: string;
}

/**
 * Validates file magic bytes / signatures to prevent MIME spoofing or executable uploads.
 */
export const validateFileSignature = (
  buffer: Buffer,
  originalName: string,
  declaredMime: string
): FileSignatureValidationResult => {
  if (!buffer || buffer.length === 0) {
    return { valid: false, reason: 'Uploaded file is empty (0 bytes)' };
  }

  // Reject Windows PE ('MZ') or Linux ELF ('\x7FELF') executables immediately
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { valid: false, reason: 'Executable binary detected and rejected' };
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x7f &&
    buffer[1] === 0x45 &&
    buffer[2] === 0x4c &&
    buffer[3] === 0x46
  ) {
    return { valid: false, reason: 'ELF executable binary detected and rejected' };
  }

  const ext = path.extname(originalName).toLowerCase();

  // PDF signature: %PDF- (25 50 44 46 2D)
  if (ext === '.pdf' || declaredMime === 'application/pdf') {
    const header = buffer.subarray(0, 5).toString('ascii');
    if (header !== '%PDF-') {
      return { valid: false, reason: 'Invalid PDF file signature' };
    }
    return { valid: true, detectedType: 'pdf' };
  }

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (ext === '.png' || declaredMime === 'image/png') {
    const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const matches = pngSig.every((byte, idx) => buffer[idx] === byte);
    if (!matches) {
      return { valid: false, reason: 'Invalid PNG file signature' };
    }
    return { valid: true, detectedType: 'png' };
  }

  // JPEG signature: FF D8 FF
  if (ext === '.jpg' || ext === '.jpeg' || declaredMime === 'image/jpeg') {
    if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return { valid: false, reason: 'Invalid JPEG file signature' };
    }
    return { valid: true, detectedType: 'jpeg' };
  }

  // WEBP signature: RIFF....WEBP
  if (ext === '.webp' || declaredMime === 'image/webp') {
    if (
      buffer.length < 12 ||
      buffer.subarray(0, 4).toString('ascii') !== 'RIFF' ||
      buffer.subarray(8, 12).toString('ascii') !== 'WEBP'
    ) {
      return { valid: false, reason: 'Invalid WEBP file signature' };
    }
    return { valid: true, detectedType: 'webp' };
  }

  // DOCX signature: PK\x03\x04 (ZIP archive)
  if (
    ext === '.docx' ||
    declaredMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    if (
      buffer.length < 4 ||
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      buffer[2] !== 0x03 ||
      buffer[3] !== 0x04
    ) {
      return { valid: false, reason: 'Invalid DOCX archive signature' };
    }
    return { valid: true, detectedType: 'docx' };
  }

  // TXT validation: ensure no null bytes (binary file disguised as .txt)
  if (ext === '.txt' || declaredMime === 'text/plain') {
    const sampleLength = Math.min(buffer.length, 4096);
    for (let i = 0; i < sampleLength; i++) {
      if (buffer[i] === 0x00) {
        return { valid: false, reason: 'Binary content detected in plain text file' };
      }
    }
    return { valid: true, detectedType: 'txt' };
  }

  return { valid: false, reason: 'Unsupported file format' };
};

