import { Response, NextFunction } from 'express';
import path from 'path';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorMiddleware';
import {
  findingUpdateSchema,
  redactRequestSchema,
  scanIdParamSchema,
  scansQuerySchema,
  uploadScanBodySchema,
} from '../validators/schemas';
import { scanOrchestrator } from '../services/scanning/scanOrchestrator';
import { db } from '../services/storage/databaseService';
import { fileStorage } from '../services/storage/fileStorageService';
import { smartRedactionEngine } from '../services/redaction/redactionEngine';
import { generatePrivacyReportPdf } from '../services/reports/pdfReportGenerator';
import { geminiPrivacyService } from '../services/ai/geminiService';

export const createAndRunScan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      throw new AppError('Please attach a valid file to scan', 400, 'FILE_REQUIRED');
    }

    const bodyParams = uploadScanBodySchema.parse(req.body || {});
    const result = await scanOrchestrator.processUploadAndAnalyze({
      userId: req.user!.id,
      fileBuffer: file.buffer,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      scanType: bodyParams.scanType,
      description: bodyParams.description,
      sensitivityPreference: bodyParams.sensitivityPreference,
    });

    const sanitizedScan = { ...result.scan };
    res.status(201).json({
      success: true,
      message: 'Scan completed successfully',
      data: {
        scan: sanitizedScan,
        findings: result.findings,
        report: result.report,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const listScans = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = scansQuerySchema.parse(req.query);
    const result = await db.listScans(req.user!.id, query);
    res.status(200).json({
      success: true,
      message: 'Scans retrieved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getScanById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { scanId } = scanIdParamSchema.parse(req.params);
    const userId = req.user!.id;

    const scan = await db.getScanById(userId, scanId);
    if (!scan) {
      throw new AppError('Scan not found', 404, 'SCAN_NOT_FOUND');
    }

    const findings = await db.getFindingsByScan(userId, scanId);
    const report = await db.getScanReport(userId, scanId);
    const redactionHistory = await db.getRedactionRecordsByScan(userId, scanId);

    // Mask extracted text preview so raw credentials aren't sent unmasked
    const { redactedText: safePreview } = smartRedactionEngine.applyTextRedaction(
      scan.extracted_text || '',
      findings.filter((f) => f.is_redacted)
    );

    res.status(200).json({
      success: true,
      message: 'Scan details retrieved successfully',
      data: {
        scan: {
          ...scan,
          extracted_text_preview: safePreview.slice(0, 5000),
        },
        findings,
        report,
        redactionHistory,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const analyzeExistingScan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { scanId } = scanIdParamSchema.parse(req.params);
    const result = await scanOrchestrator.reAnalyzeScan(req.user!.id, scanId);

    res.status(200).json({
      success: true,
      message: 'Scan re-analyzed successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteScan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { scanId } = scanIdParamSchema.parse(req.params);
    const userId = req.user!.id;

    const scan = await db.getScanById(userId, scanId);
    if (!scan) {
      throw new AppError('Scan not found', 404, 'SCAN_NOT_FOUND');
    }

    if (scan.storage_path) {
      try {
        await fileStorage.deleteFile('privacy-uploads', userId, scan.storage_path);
      } catch {
        // Ignore if already removed
      }
    }

    await db.deleteScan(userId, scanId);
    res.status(200).json({
      success: true,
      message: 'Scan and associated records deleted successfully',
      data: { deletedScanId: scanId },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAllScanHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const count = await db.deleteAllScansForUser(req.user!.id);
    res.status(200).json({
      success: true,
      message: `Deleted ${count} scan record(s) from history`,
      data: { deletedCount: count },
    });
  } catch (err) {
    next(err);
  }
};

export const getScanFindings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { scanId } = scanIdParamSchema.parse(req.params);
    const scan = await db.getScanById(req.user!.id, scanId);
    if (!scan) {
      throw new AppError('Scan not found', 404, 'SCAN_NOT_FOUND');
    }
    const findings = await db.getFindingsByScan(req.user!.id, scanId);
    res.status(200).json({
      success: true,
      message: 'Findings retrieved successfully',
      data: { findings },
    });
  } catch (err) {
    next(err);
  }
};

export const updateFindingById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const findingId = String(req.params.findingId || '');
    if (!findingId) {
      throw new AppError('Finding ID is required', 400, 'INVALID_FINDING_ID');
    }
    const updates = findingUpdateSchema.parse(req.body);
    const updated = await db.updateFinding(req.user!.id, findingId, updates);
    if (!updated) {
      throw new AppError('Finding not found or unauthorized', 404, 'FINDING_NOT_FOUND');
    }
    res.status(200).json({
      success: true,
      message: 'Finding updated successfully',
      data: { finding: updated },
    });
  } catch (err) {
    next(err);
  }
};

export const getScanRiskAssessment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { scanId } = scanIdParamSchema.parse(req.params);
    const userId = req.user!.id;
    const scan = await db.getScanById(userId, scanId);
    if (!scan) {
      throw new AppError('Scan not found', 404, 'SCAN_NOT_FOUND');
    }
    const report = await db.getScanReport(userId, scanId);

    res.status(200).json({
      success: true,
      message: 'Risk assessment retrieved successfully',
      data: {
        score: scan.risk_score ?? 0,
        level: scan.risk_level ?? 'low',
        totalFindings: scan.total_findings,
        explanation: report?.risk_explanation || 'Risk calculated deterministically by backend engine.',
        breakdown: report?.risk_breakdown || {},
      },
    });
  } catch (err) {
    next(err);
  }
};

export const generateScanRecommendations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { scanId } = scanIdParamSchema.parse(req.params);
    const userId = req.user!.id;
    const scan = await db.getScanById(userId, scanId);
    if (!scan) {
      throw new AppError('Scan not found', 404, 'SCAN_NOT_FOUND');
    }

    const findings = await db.getFindingsByScan(userId, scanId);
    const recommendations = await geminiPrivacyService.generateDetailedRecommendations(
      findings.map((f) => ({
        category: f.category,
        severity: f.severity,
        masked_value: f.masked_value,
        explanation: f.explanation,
      }))
    );

    res.status(200).json({
      success: true,
      message: 'Privacy recommendations generated successfully',
      data: { recommendations },
    });
  } catch (err) {
    next(err);
  }
};

export const redactScanDocument = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { scanId } = scanIdParamSchema.parse(req.params);
    const userId = req.user!.id;
    const { redactionType, findingIds } = redactRequestSchema.parse(req.body);

    const scan = await db.getScanById(userId, scanId);
    if (!scan) {
      throw new AppError('Scan not found', 404, 'SCAN_NOT_FOUND');
    }

    const allFindings = await db.getFindingsByScan(userId, scanId);
    if (allFindings.length === 0) {
      throw new AppError('This scan has no sensitive findings to redact', 400, 'NO_FINDINGS');
    }

    const selectedFindings =
      redactionType === 'all'
        ? allFindings
        : allFindings.filter((f) => findingIds.includes(f.id));

    if (selectedFindings.length === 0) {
      throw new AppError('Please select at least one finding to redact', 400, 'NO_FINDINGS_SELECTED');
    }

    await db.updateScan(userId, scanId, { redaction_status: 'in_progress' });

    let originalBuffer: Buffer | null = null;
    if (scan.storage_path) {
      try {
        originalBuffer = await fileStorage.downloadBuffer(
          'privacy-uploads',
          userId,
          scan.storage_path
        );
      } catch {
        originalBuffer = null;
      }
    }

    try {
      const redactionOutput = await smartRedactionEngine.redactDocument(
        originalBuffer,
        scan.extracted_text || '',
        scan.file_type,
        selectedFindings
      );

      const baseName = path.basename(
        scan.original_filename,
        path.extname(scan.original_filename)
      );
      const outputFilename = `${baseName}_protected${redactionOutput.extension}`;
      const outputStoragePath = fileStorage.buildStoragePath(userId, scanId, outputFilename);

      await fileStorage.uploadBuffer(
        'privacy-redacted',
        outputStoragePath,
        redactionOutput.redactedBuffer,
        redactionOutput.contentType
      );

      const redactedIds = selectedFindings.map((f) => f.id);
      await db.markFindingsRedacted(userId, scanId, redactedIds);

      const redactionRecord = await db.createRedactionRecord({
        scan_id: scanId,
        user_id: userId,
        output_storage_path: outputStoragePath,
        redacted_finding_ids: redactedIds,
        redaction_type: redactionType,
        status: 'completed',
        verification_passed: redactionOutput.verificationPassed,
        notes: redactionOutput.notes,
      });

      const updatedScan = await db.updateScan(userId, scanId, {
        redaction_status: 'completed',
      });

      // Honor user setting `auto_delete_original` after successful redaction
      const settings = await db.getOrCreateSettings(userId);
      if (settings.auto_delete_original && scan.storage_path) {
        try {
          await fileStorage.deleteFile('privacy-uploads', userId, scan.storage_path);
        } catch {
          // Non-fatal
        }
      }

      const updatedFindings = await db.getFindingsByScan(userId, scanId);

      res.status(200).json({
        success: true,
        message: 'Document redacted and independently verified successfully',
        data: {
          scan: updatedScan,
          redactionRecord,
          findings: updatedFindings,
          redactedPreviewText: redactionOutput.redactedTextPreview,
          verificationPassed: redactionOutput.verificationPassed,
          notes: redactionOutput.notes,
        },
      });
    } catch (redactErr) {
      await db.updateScan(userId, scanId, { redaction_status: 'failed' });
      await db.createSecurityAlert({
        user_id: userId,
        scan_id: scanId,
        title: `Redaction Operation Failed for "${scan.original_filename}"`,
        message:
          redactErr instanceof Error
            ? redactErr.message
            : 'Document redaction could not be verified safely.',
        severity: 'high',
      });
      throw redactErr;
    }
  } catch (err) {
    next(err);
  }
};

export const downloadRedactedFile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { scanId } = scanIdParamSchema.parse(req.params);
    const userId = req.user!.id;

    const scan = await db.getScanById(userId, scanId);
    if (!scan) {
      throw new AppError('Scan not found', 404, 'SCAN_NOT_FOUND');
    }

    const records = await db.getRedactionRecordsByScan(userId, scanId);
    const latestCompleted = records.find((r) => r.status === 'completed' && r.output_storage_path);

    if (!latestCompleted || !latestCompleted.output_storage_path) {
      throw new AppError(
        'No redacted file is available for this scan yet. Run Smart Redaction first.',
        404,
        'REDACTED_FILE_NOT_FOUND'
      );
    }

    const fileBuffer = await fileStorage.downloadBuffer(
      'privacy-redacted',
      userId,
      latestCompleted.output_storage_path
    );
    const filename = path.basename(latestCompleted.output_storage_path);
    const ext = path.extname(filename).toLowerCase();

    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.txt': 'text/plain; charset=utf-8',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
    };

    res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    res.status(200).send(fileBuffer);
  } catch (err) {
    next(err);
  }
};

export const getRedactionHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { scanId } = scanIdParamSchema.parse(req.params);
    const userId = req.user!.id;
    const scan = await db.getScanById(userId, scanId);
    if (!scan) {
      throw new AppError('Scan not found', 404, 'SCAN_NOT_FOUND');
    }

    const records = await db.getRedactionRecordsByScan(userId, scanId);
    res.status(200).json({
      success: true,
      message: 'Redaction history retrieved successfully',
      data: { redactionHistory: records },
    });
  } catch (err) {
    next(err);
  }
};

export const getScanReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { scanId } = scanIdParamSchema.parse(req.params);
    const userId = req.user!.id;

    const scan = await db.getScanById(userId, scanId);
    if (!scan) {
      throw new AppError('Scan not found', 404, 'SCAN_NOT_FOUND');
    }

    const report = await db.getScanReport(userId, scanId);
    const findings = await db.getFindingsByScan(userId, scanId);
    const redactionHistory = await db.getRedactionRecordsByScan(userId, scanId);

    if (!report) {
      throw new AppError('Report not found for this scan', 404, 'REPORT_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      message: 'Privacy report retrieved successfully',
      data: {
        scan,
        report,
        findings,
        redactionHistory,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const downloadScanReportPdf = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { scanId } = scanIdParamSchema.parse(req.params);
    const userId = req.user!.id;

    const scan = await db.getScanById(userId, scanId);
    if (!scan) {
      throw new AppError('Scan not found', 404, 'SCAN_NOT_FOUND');
    }

    const report = await db.getScanReport(userId, scanId);
    if (!report) {
      throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
    }
    const findings = await db.getFindingsByScan(userId, scanId);

    const pdfBuffer = await generatePrivacyReportPdf(scan, report, findings);
    const safeName = path
      .basename(scan.original_filename, path.extname(scan.original_filename))
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="PrivacyGuard_Report_${safeName}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200).send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

