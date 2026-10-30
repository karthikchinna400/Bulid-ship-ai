import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import zlib from 'zlib';
import { AppError } from '../../middleware/errorMiddleware';
import { logger } from '../../utils/logger';

export interface ExtractionResult {
  text: string;
  pageCount: number;
  pages: Array<{ pageNumber: number; text: string }>;
  metadata?: Record<string, unknown>;
}

export class TextExtractorService {
  public async extract(
    buffer: Buffer,
    detectedType: 'pdf' | 'png' | 'jpeg' | 'webp' | 'docx' | 'txt'
  ): Promise<ExtractionResult> {
    switch (detectedType) {
      case 'txt':
        return this.extractTxt(buffer);
      case 'docx':
        return this.extractDocx(buffer);
      case 'pdf':
        return this.extractPdf(buffer);
      case 'png':
      case 'jpeg':
      case 'webp':
        return this.extractImage(buffer);
      default:
        throw new AppError('Unsupported file format for text extraction', 415, 'UNSUPPORTED_FORMAT');
    }
  }

  private extractTxt(buffer: Buffer): ExtractionResult {
    const text = buffer.toString('utf-8').replace(/\r\n/g, '\n');
    return {
      text,
      pageCount: 1,
      pages: [{ pageNumber: 1, text }],
    };
  }

  private async extractDocx(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || '').trim();
      return {
        text,
        pageCount: 1,
        pages: [{ pageNumber: 1, text }],
      };
    } catch (err) {
      logger.warn({ err }, 'DOCX extraction failed');
      throw new AppError(
        'Unable to read DOCX file. The document may be corrupted or password-protected.',
        422,
        'CORRUPTED_OR_ENCRYPTED_DOCX'
      );
    }
  }

  private async extractPdf(buffer: Buffer): Promise<ExtractionResult> {
    let pageCount = 1;
    // Check if encrypted using pdf-lib first
    try {
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: false });
      pageCount = doc.getPageCount() || 1;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('encrypt')) {
        throw new AppError(
          'Encrypted or password-protected PDF detected. Please unlock the PDF before scanning.',
          422,
          'ENCRYPTED_PDF'
        );
      }
      throw new AppError(
        'Unable to parse PDF file. The document appears corrupted or malformed.',
        422,
        'CORRUPTED_PDF'
      );
    }

    try {
      const pages: Array<{ pageNumber: number; text: string }> = [];
      let currentPage = 0;

      const data = await pdfParse(buffer, {
        pagerender: async (pageData: { getTextContent: () => Promise<{ items: Array<{ str?: string }> }> }) => {
          currentPage += 1;
          const textContent = await pageData.getTextContent();
          const pageText = textContent.items
            .map((item) => item.str || '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          pages.push({ pageNumber: currentPage, text: pageText });
          return pageText;
        },
      });

      const fullText = (data.text || '').trim();
      if (pages.length === 0) {
        pages.push({ pageNumber: 1, text: fullText });
      }

      return {
        text: fullText,
        pageCount: data.numpages || pages.length || pageCount,
        pages,
        metadata: data.info || {},
      };
    } catch (err) {
      if (err instanceof AppError) throw err;

      // Fallback stream & FlateDecode decompression extraction for PDF 1.5+ object streams
      const rawLatin = buffer.toString('latin1');
      if (rawLatin.includes('/Encrypt')) {
        throw new AppError('Encrypted PDF cannot be processed.', 422, 'ENCRYPTED_PDF');
      }

      const extractedChunks: string[] = [];

      // 1. Direct uncompressed text operators
      for (const m of rawLatin.matchAll(/\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g)) {
        if (m[1]) extractedChunks.push(m[1]);
      }
      for (const m of rawLatin.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
        if (m[1]) {
          extractedChunks.push(Buffer.from(m[1], 'hex').toString('latin1'));
        }
      }

      // 2. Decompress FlateDecode streams
      const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
      let streamMatch: RegExpExecArray | null;
      while ((streamMatch = streamRegex.exec(rawLatin)) !== null) {
        try {
          const streamBytes = Buffer.from(streamMatch[1], 'latin1');
          const decompressed = zlib.unzipSync(streamBytes).toString('latin1');
          for (const tm of decompressed.matchAll(/\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g)) {
            if (tm[1]) extractedChunks.push(tm[1]);
          }
          for (const hm of decompressed.matchAll(/<([0-9A-Fa-f]{4,})>\s*Tj/g)) {
            if (hm[1]) {
              extractedChunks.push(Buffer.from(hm[1], 'hex').toString('latin1'));
            }
          }
        } catch {
          // Not a zlib stream or non-text stream
        }
      }

      const fallbackText = extractedChunks.join(' ').replace(/\s+/g, ' ').trim();
      return {
        text: fallbackText,
        pageCount,
        pages: [{ pageNumber: 1, text: fallbackText }],
      };
    }
  }

  private async extractImage(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const metadata = await sharp(buffer).metadata();
      if (!metadata.width || !metadata.height) {
        throw new AppError('Malformed or corrupted image file', 422, 'CORRUPTED_IMAGE');
      }

      let embeddedText = '';
      const asciiStrings = buffer.toString('utf-8').match(/[A-Za-z0-9@._+:/\-\s]{8,}/g);
      if (asciiStrings) {
        const filtered = asciiStrings
          .map((s) => s.trim())
          .filter(
            (s) =>
              s.includes('@') ||
              /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(s) ||
              /\b[A-Z]{5}\d{4}[A-Z]\b/.test(s) ||
              /(?:password|api[_-]?key|secret|token|account|ifsc)/i.test(s)
          );
        if (filtered.length > 0) {
          embeddedText = filtered.join('\n');
        }
      }

      let ocrText = '';
      try {
        const ocrPromise = Tesseract.recognize(buffer, 'eng');
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000));
        const result = await Promise.race([ocrPromise, timeoutPromise]);
        if (result && result.data && result.data.text) {
          ocrText = result.data.text.trim();
        }
      } catch (ocrErr) {
        logger.warn({ ocrErr }, 'OCR recognition warning on image; using metadata/embedded fallback');
      }

      const combinedText = [ocrText, embeddedText].filter(Boolean).join('\n').trim();

      return {
        text: combinedText,
        pageCount: 1,
        pages: [{ pageNumber: 1, text: combinedText }],
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          hasExif: Boolean(metadata.exif),
        },
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError('Unable to process image file. It may be corrupted.', 422, 'CORRUPTED_IMAGE');
    }
  }
}

export const textExtractor = new TextExtractorService();
