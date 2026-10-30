import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { app } from '../src/app';
import { db } from '../src/services/storage/databaseService';
import { isValidLuhn, ruleDetectionEngine } from '../src/services/detection/ruleEngine';
import { calculatePrivacyRiskScore } from '../src/services/risk/riskEngine';
import { validateFileSignature } from '../src/middleware/uploadMiddleware';

describe('PrivacyGuard AI Backend — Comprehensive Unit & Integration Suite', () => {
  let userAToken = '';
  let userBToken = '';

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    db.resetTestState();

    const resA = await request(app)
      .post('/api/v1/auth/local-session')
      .send({ email: 'alice@privacyguard.ai', fullName: 'Alice Security' });
    userAToken = resA.body.data.accessToken;

    const resB = await request(app)
      .post('/api/v1/auth/local-session')
      .send({ email: 'bob@privacyguard.ai', fullName: 'Bob Auditor' });
    userBToken = resB.body.data.accessToken;
  });

  it('1. Health endpoints respond with 200 OK', async () => {
    const res1 = await request(app).get('/health');
    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);

    const res2 = await request(app).get('/api/v1/health');
    expect(res2.status).toBe(200);
    expect(res2.body.data.status).toBe('ok');
  });

  it('2. Rejects unauthenticated requests to protected routes', async () => {
    const res = await request(app).get('/api/v1/dashboard/stats');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('3. Validates Luhn credit card checksums and rule-based detections', () => {
    expect(isValidLuhn('4532015112830366')).toBe(true);
    expect(isValidLuhn('4532015112830367')).toBe(false);

    const sampleText = `
      Applicant Name: Rajesh Sharma
      PAN: ABCDE1234F
      Aadhaar: 2345 6789 0123
      Credit Card: 4532 0151 1283 0366
      IFSC: SBIN0001234
      Email: rajesh.sharma@example.com
      Phone: +91 98765 43210
      API_KEY=sk-live9876543210abcdefghijklmnop
    `;

    const findings = ruleDetectionEngine.analyzePages([{ pageNumber: 1, text: sampleText }]);
    expect(findings.length).toBeGreaterThanOrEqual(6);

    const categories = findings.map((f) => f.category);
    expect(categories).toContain('government_identity');
    expect(categories).toContain('financial_information');
    expect(categories).toContain('authentication_credentials');
    expect(categories).toContain('contact_information');

    // Verify masking works and raw sensitive numbers are not exposed in masked_value
    findings.forEach((f) => {
      expect(f.masked_value).not.toContain('4532 0151 1283 0366');
      expect(f.masked_value).not.toContain('2345 6789 0123');
    });
  });

  it('4. Calculates deterministic risk scores normalized to 0-100', () => {
    const zeroRisk = calculatePrivacyRiskScore([]);
    expect(zeroRisk.score).toBe(0);
    expect(zeroRisk.level).toBe('low');

    const criticalRisk = calculatePrivacyRiskScore([
      {
        category: 'authentication_credentials',
        severity: 'critical',
        confidence: 98,
        masked_value: 'sk-********op',
      },
      {
        category: 'government_identity',
        severity: 'critical',
        confidence: 95,
        masked_value: 'XXXX XXXX 0123',
      },
      {
        category: 'financial_information',
        severity: 'critical',
        confidence: 97,
        masked_value: 'XXXX XXXX 0366',
      },
    ]);

    expect(criticalRisk.score).toBeGreaterThanOrEqual(80);
    expect(criticalRisk.score).toBeLessThanOrEqual(100);
    expect(criticalRisk.level).toBe('critical');
  });

  it('5. Rejects executable files and spoofed file signatures', async () => {
    // Windows MZ executable header disguised as .txt
    const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
    const sigCheck = validateFileSignature(exeBuffer, 'innocent.txt', 'text/plain');
    expect(sigCheck.valid).toBe(false);

    const res = await request(app)
      .post('/api/v1/scans')
      .set('Authorization', `Bearer ${userAToken}`)
      .attach('file', exeBuffer, { filename: 'spoofed.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(415);
    expect(res.body.success).toBe(false);
  });

  it('6. Uploads, scans, scores, generates alerts, and genuinely redacts a TXT document', async () => {
    const confidentialContent = [
      'STRICTLY CONFIDENTIAL EMPLOYEE RECORD',
      'Employee Email: alice.sec@company.org',
      'Mobile: +91 9876543210',
      'PAN Card: ABCDE1234F',
      'Aadhaar No: 3456 7890 1234',
      'Salary Account No: 123456789012 (IFSC: HDFC0001234)',
      'Production Secret: password=SuperSecretProd99!',
    ].join('\n');

    const uploadRes = await request(app)
      .post('/api/v1/scans')
      .set('Authorization', `Bearer ${userAToken}`)
      .field('scanType', 'standard')
      .attach('file', Buffer.from(confidentialContent, 'utf-8'), {
        filename: 'employee_onboarding.txt',
        contentType: 'text/plain',
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);
    const scanId = uploadRes.body.data.scan.id;
    expect(uploadRes.body.data.scan.risk_score).toBeGreaterThanOrEqual(75);
    expect(uploadRes.body.data.findings.length).toBeGreaterThanOrEqual(5);

    // Check Dashboard Stats reflect actual database records
    const statsRes = await request(app)
      .get('/api/v1/dashboard/stats')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.totalScans).toBe(1);
    expect(statsRes.body.data.totalSensitiveItems).toBe(uploadRes.body.data.findings.length);

    // Check Security Alerts were triggered
    const alertsRes = await request(app)
      .get('/api/v1/alerts')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(alertsRes.status).toBe(200);
    expect(alertsRes.body.data.alerts.length).toBeGreaterThanOrEqual(1);

    // Execute Smart Redaction ('all')
    const redactRes = await request(app)
      .post(`/api/v1/scans/${scanId}/redact`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ redactionType: 'all', findingIds: [] });

    expect(redactRes.status).toBe(200);
    expect(redactRes.body.data.verificationPassed).toBe(true);
    expect(redactRes.body.data.scan.redaction_status).toBe('completed');

    // Download the redacted file and verify sensitive values are permanently removed
    const downloadRes = await request(app)
      .get(`/api/v1/scans/${scanId}/redacted-file`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(downloadRes.status).toBe(200);
    const exportedText = downloadRes.text;
    expect(exportedText).not.toContain('SuperSecretProd99!');
    expect(exportedText).not.toContain('ABCDE1234F');
    expect(exportedText).not.toContain('3456 7890 1234');
    expect(exportedText).toContain('[REDACTED:');

    // Export PDF Privacy Report
    const pdfReportRes = await request(app)
      .get(`/api/v1/scans/${scanId}/report/pdf`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(pdfReportRes.status).toBe(200);
    expect(pdfReportRes.headers['content-type']).toContain('application/pdf');
  });

  it('7. Enforces Row-Level Data Isolation between User A and User B', async () => {
    const uploadRes = await request(app)
      .post('/api/v1/scans')
      .set('Authorization', `Bearer ${userAToken}`)
      .attach('file', Buffer.from('PAN: ABCDE1234F', 'utf-8'), {
        filename: 'userA_private.txt',
        contentType: 'text/plain',
      });

    const scanId = uploadRes.body.data.scan.id;

    // User B attempts to read User A's scan
    const forbiddenGet = await request(app)
      .get(`/api/v1/scans/${scanId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(forbiddenGet.status).toBe(404);

    // User B attempts to read User A's findings
    const forbiddenFindings = await request(app)
      .get(`/api/v1/scans/${scanId}/findings`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(forbiddenFindings.status).toBe(404);

    // User B attempts to delete User A's scan
    const forbiddenDelete = await request(app)
      .delete(`/api/v1/scans/${scanId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(forbiddenDelete.status).toBe(404);
  });

  it('8. Scans and genuinely redacts a PDF document removing underlying text streams', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([500, 400]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText('Confidential PAN: ABCDE1234F and Email: ceo@enterprise.com', {
      x: 50,
      y: 300,
      size: 12,
      font,
    });
    const pdfBytes = Buffer.from(await pdfDoc.save());

    const scanRes = await request(app)
      .post('/api/v1/scans')
      .set('Authorization', `Bearer ${userAToken}`)
      .attach('file', pdfBytes, {
        filename: 'board_memo.pdf',
        contentType: 'application/pdf',
      });

    expect(scanRes.status).toBe(201);
    const scanId = scanRes.body.data.scan.id;
    expect(scanRes.body.data.findings.length).toBeGreaterThanOrEqual(2);

    const redactRes = await request(app)
      .post(`/api/v1/scans/${scanId}/redact`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ redactionType: 'all' });

    expect(redactRes.status).toBe(200);
    expect(redactRes.body.data.verificationPassed).toBe(true);

    const dlRes = await request(app)
      .get(`/api/v1/scans/${scanId}/redacted-file`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(dlRes.status).toBe(200);
    const rawExportedPdfAscii = Buffer.from(dlRes.body).toString('latin1');
    expect(rawExportedPdfAscii).not.toContain('ABCDE1234F');
    expect(rawExportedPdfAscii).not.toContain('ceo@enterprise.com');
  });

  it('9. Privacy AI Assistant chat and conversation history work properly', async () => {
    const chatRes = await request(app)
      .post('/api/v1/assistant/chat')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        message: 'Is it safe to share my Aadhaar card?',
        saveHistory: true,
      });

    expect(chatRes.status).toBe(200);
    expect(chatRes.body.data.reply).toContain('Aadhaar');
    expect(chatRes.body.data.conversationId).toBeTruthy();

    const listRes = await request(app)
      .get('/api/v1/assistant/conversations')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.conversations.length).toBe(1);
  });
});
