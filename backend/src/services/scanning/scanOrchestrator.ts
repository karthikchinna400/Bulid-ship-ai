import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { validateFileSignature } from '../../middleware/uploadMiddleware';
import { AppError } from '../../middleware/errorMiddleware';
import { FindingRecord, ScanRecord, ScanReportRecord } from '../../types';
import { combineDetections } from '../detection/detectionCombiner';
import { ruleDetectionEngine } from '../detection/ruleEngine';
import { geminiPrivacyService } from '../ai/geminiService';
import { calculatePrivacyRiskScore } from '../risk/riskEngine';
import { db } from '../storage/databaseService';
import { fileStorage } from '../storage/fileStorageService';
import { textExtractor } from './textExtractor';
import { logger } from '../../utils/logger';

export interface CompleteScanPayload {
  scan: ScanRecord;
  findings: FindingRecord[];
  report: ScanReportRecord;
}

export class ScanOrchestratorService {
  public async processUploadAndAnalyze(params: {
    userId: string;
    fileBuffer: Buffer;
    originalFilename: string;
    mimeType: string;
    fileSize: number;
    scanType: string;
    description?: string;
    sensitivityPreference?: string;
  }): Promise<CompleteScanPayload> {
    const {
      userId,
      fileBuffer,
      originalFilename,
      mimeType,
      fileSize,
      scanType,
      description,
      sensitivityPreference,
    } = params;

    // 1. Authoritative File Signature Validation
    const sigCheck = validateFileSignature(fileBuffer, originalFilename, mimeType);
    if (!sigCheck.valid || !sigCheck.detectedType) {
      throw new AppError(
        sigCheck.reason || 'File signature validation failed',
        415,
        'INVALID_FILE_SIGNATURE'
      );
    }

    const safeExt = path.extname(originalFilename).toLowerCase() || `.${sigCheck.detectedType}`;
    const storedFilename = `${uuidv4()}${safeExt}`;

    // 2. Create initial scan record
    let scan = await db.createScan({
      user_id: userId,
      original_filename: path.basename(originalFilename).replace(/[<>:"/\\|?*]/g, '_'),
      stored_filename: storedFilename,
      file_type: mimeType,
      file_size: fileSize,
      storage_path: null,
      scan_type: scanType || 'standard',
      description: description || null,
      sensitivity_preference: sensitivityPreference || 'balanced',
      extracted_text: null,
      status: 'processing',
      risk_score: null,
      risk_level: null,
      total_findings: 0,
      redaction_status: 'not_started',
    });

    const storagePath = fileStorage.buildStoragePath(userId, scan.id, storedFilename);
    await fileStorage.uploadBuffer('privacy-uploads', storagePath, fileBuffer, mimeType);
    scan = await db.updateScan(userId, scan.id, { storage_path: storagePath });

    return this.executeAnalysisPipeline(userId, scan, fileBuffer, sigCheck.detectedType);
  }

  public async reAnalyzeScan(userId: string, scanId: string): Promise<CompleteScanPayload> {
    const scan = await db.getScanById(userId, scanId);
    if (!scan) {
      throw new AppError('Scan not found', 404, 'SCAN_NOT_FOUND');
    }

    let buffer: Buffer | null = null;
    if (scan.storage_path) {
      try {
        buffer = await fileStorage.downloadBuffer('privacy-uploads', userId, scan.storage_path);
      } catch {
        buffer = null;
      }
    }

    if (!buffer && scan.extracted_text !== null && scan.extracted_text !== undefined) {
      buffer = Buffer.from(scan.extracted_text, 'utf-8');
      return this.executeAnalysisPipeline(userId, scan, buffer, 'txt');
    }

    if (!buffer) {
      throw new AppError(
        'Original file is no longer available for re-analysis',
        422,
        'ORIGINAL_FILE_DELETED'
      );
    }

    const sigCheck = validateFileSignature(buffer, scan.original_filename, scan.file_type);
    const detectedType = sigCheck.detectedType || 'txt';

    return this.executeAnalysisPipeline(userId, scan, buffer, detectedType);
  }

  private async executeAnalysisPipeline(
    userId: string,
    scan: ScanRecord,
    fileBuffer: Buffer,
    detectedType: 'pdf' | 'png' | 'jpeg' | 'webp' | 'docx' | 'txt'
  ): Promise<CompleteScanPayload> {
    try {
      // Step 5: Extract text / OCR
      const extraction = await textExtractor.extract(fileBuffer, detectedType);

      // Step 6: Layer 1 Deterministic Rule-Based Detection
      const ruleFindings = ruleDetectionEngine.analyzePages(extraction.pages);

      // Step 7: Layer 2 Contextual Gemini AI Analysis
      const aiResult = await geminiPrivacyService.detectContextualSensitiveData(
        extraction.text,
        scan.file_type,
        ruleFindings
      );

      // Step 8: Layer 3 Combine & Deduplicate Detections
      const combinedDetections = combineDetections(ruleFindings, aiResult);

      // Step 9: Deterministic Backend Risk Score Calculation
      const riskAssessment = calculatePrivacyRiskScore(
        combinedDetections.map((d) => ({
          category: d.category,
          severity: d.severity,
          confidence: d.confidence,
          masked_value: d.masked_value,
        }))
      );

      // Step 10: Save Findings
      const savedFindings = await db.replaceFindingsForScan(
        userId,
        scan.id,
        combinedDetections.map((d) => ({
          scan_id: scan.id,
          user_id: userId,
          category: d.category,
          subcategory: d.subcategory,
          severity: d.severity,
          confidence: d.confidence,
          detection_method: d.detection_method,
          page_number: d.page_number,
          start_offset: d.start_offset,
          end_offset: d.end_offset,
          masked_value: d.masked_value,
          raw_match: d.raw_match,
          explanation: d.explanation,
          recommended_action: d.recommended_action,
          is_redacted: false,
        }))
      );

      // Step 11: Generate Report & Recommendations
      const aiReportContent =
        await geminiPrivacyService.generateRiskExplanationAndRecommendations(
          savedFindings.map((f) => ({
            category: f.category,
            severity: f.severity,
            masked_value: f.masked_value,
            explanation: f.explanation,
          }))
        );

      const savedReport = await db.upsertScanReport({
        scan_id: scan.id,
        user_id: userId,
        summary: aiReportContent.summary,
        risk_explanation: `${riskAssessment.explanation}\n\n${aiReportContent.riskExplanation}`,
        sharing_guidance: aiReportContent.sharingGuidance,
        recommendations: aiReportContent.recommendations,
        risk_breakdown: riskAssessment.breakdown,
      });

      const finalStatus = aiResult.aiAvailable ? 'completed' : 'completed';
      const updatedScan = await db.updateScan(userId, scan.id, {
        status: finalStatus,
        extracted_text: extraction.text,
        risk_score: riskAssessment.score,
        risk_level: riskAssessment.level,
        total_findings: savedFindings.length,
        completed_at: new Date().toISOString(),
      });

      // Step 12: Trigger Security Alerts when criteria in Section 4.10 are met
      await this.evaluateAndCreateSecurityAlerts(userId, updatedScan, savedFindings);

      return {
        scan: updatedScan,
        findings: savedFindings,
        report: savedReport,
      };
    } catch (err) {
      logger.error({ err, scanId: scan.id }, 'Scan analysis pipeline failed');
      await db.updateScan(userId, scan.id, {
        status: 'failed',
        completed_at: new Date().toISOString(),
      });
      throw err;
    }
  }

  private async evaluateAndCreateSecurityAlerts(
    userId: string,
    scan: ScanRecord,
    findings: FindingRecord[]
  ): Promise<void> {
    if (findings.length === 0) return;

    const hasCredentials = findings.some(
      (f) => f.category === 'authentication_credentials'
    );
    const criticalFindings = findings.filter((f) => f.severity === 'critical');
    const uniqueCategories = new Set(findings.map((f) => f.category));

    if (hasCredentials) {
      await db.createSecurityAlert({
        user_id: userId,
        scan_id: scan.id,
        title: `Exposed Credentials Detected in "${scan.original_filename}"`,
        message:
          'API keys, passwords, or authentication secrets were identified. Immediately revoke/rotate affected credentials and redact this document before sharing.',
        severity: 'critical',
      });
    } else if (criticalFindings.length > 0) {
      await db.createSecurityAlert({
        user_id: userId,
        scan_id: scan.id,
        title: `Critical Sensitive Information in "${scan.original_filename}"`,
        message: `Detected ${criticalFindings.length} critical-severity exposure(s) (Risk Score: ${scan.risk_score}/100). Redact before sharing.`,
        severity: 'critical',
      });
    } else if (scan.risk_level === 'high') {
      await db.createSecurityAlert({
        user_id: userId,
        scan_id: scan.id,
        title: `High Privacy Risk Scan Completed (${scan.risk_score}/100)`,
        message: `"${scan.original_filename}" contains ${findings.length} sensitive item(s) requiring protection.`,
        severity: 'high',
      });
    }

    if (uniqueCategories.size >= 3) {
      await db.createSecurityAlert({
        user_id: userId,
        scan_id: scan.id,
        title: `Multi-Category Data Exposure in "${scan.original_filename}"`,
        message: `This file combines ${uniqueCategories.size} distinct sensitive data categories, increasing identity correlation risk.`,
        severity: scan.risk_level === 'critical' ? 'critical' : 'high',
      });
    }
  }
}

export const scanOrchestrator = new ScanOrchestratorService();

