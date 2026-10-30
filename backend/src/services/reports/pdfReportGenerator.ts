import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { FindingRecord, ScanRecord, ScanReportRecord } from '../../types';

/**
 * Generates a comprehensive, downloadable PDF Privacy Assessment Report (Section 4.8).
 */
export const generatePrivacyReportPdf = async (
  scan: ScanRecord,
  report: ScanReportRecord,
  findings: FindingRecord[]
): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`PrivacyGuard AI Report - ${scan.original_filename}`);
  pdfDoc.setAuthor('PrivacyGuard AI');
  pdfDoc.setCreator('PrivacyGuard AI Digital Trust Protection System');

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 45;
  const contentWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const ensureSpace = (neededHeight: number) => {
    if (y - neededHeight < margin + 30) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const drawSafeText = (
    text: string,
    x: number,
    yPos: number,
    size: number,
    isBold = false,
    color = rgb(0.12, 0.16, 0.23)
  ) => {
    const clean = (text || '').replace(/[^\x20-\x7E]/g, ' ');
    page.drawText(clean, {
      x,
      y: yPos,
      size,
      font: isBold ? boldFont : font,
      color,
    });
  };

  const drawWrappedParagraph = (
    text: string,
    size = 10,
    isBold = false,
    color = rgb(0.2, 0.25, 0.33),
    indent = 0
  ) => {
    const clean = (text || '').replace(/[^\x20-\x7E\n]/g, ' ');
    const lines = clean.split('\n');
    const maxW = contentWidth - indent;

    for (const rawLine of lines) {
      const words = rawLine.trim().split(/\s+/);
      let current = '';
      for (const w of words) {
        const candidate = current ? `${current} ${w}` : w;
        const usedFont = isBold ? boldFont : font;
        if (usedFont.widthOfTextAtSize(candidate, size) <= maxW) {
          current = candidate;
        } else {
          if (current) {
            ensureSpace(size + 6);
            drawSafeText(current, margin + indent, y, size, isBold, color);
            y -= size + 5;
          }
          current = w;
        }
      }
      if (current) {
        ensureSpace(size + 6);
        drawSafeText(current, margin + indent, y, size, isBold, color);
        y -= size + 5;
      }
    }
  };

  // 1. Report Banner
  page.drawRectangle({
    x: margin,
    y: y - 55,
    width: contentWidth,
    height: 60,
    color: rgb(0.04, 0.08, 0.16),
  });
  drawSafeText(
    'PRIVACYGUARD AI — DETAILED PRIVACY ASSESSMENT REPORT',
    margin + 16,
    y - 24,
    13,
    true,
    rgb(0.13, 0.83, 0.93)
  );
  drawSafeText(
    `Generated: ${new Date().toISOString()} | Scan ID: ${scan.id}`,
    margin + 16,
    y - 42,
    8.5,
    false,
    rgb(0.7, 0.78, 0.88)
  );
  y -= 78;

  // 2. File & Risk Summary Box
  ensureSpace(95);
  page.drawRectangle({
    x: margin,
    y: y - 80,
    width: contentWidth,
    height: 82,
    color: rgb(0.95, 0.97, 0.99),
  });

  drawSafeText(`Document Name: ${scan.original_filename}`, margin + 12, y - 18, 10, true);
  drawSafeText(`File Type: ${scan.file_type} | Size: ${Math.round((scan.file_size || 0) / 1024)} KB`, margin + 12, y - 34, 9.5);
  drawSafeText(`Scan Timestamp: ${scan.created_at}`, margin + 12, y - 50, 9.5);
  drawSafeText(`Redaction Status: ${(scan.redaction_status || 'not_started').toUpperCase()}`, margin + 12, y - 66, 9.5, true);

  const scoreVal = scan.risk_score ?? 0;
  const levelVal = (scan.risk_level || 'low').toUpperCase();
  drawSafeText(`PRIVACY RISK SCORE: ${scoreVal} / 100`, margin + 310, y - 24, 12, true, rgb(0.75, 0.15, 0.15));
  drawSafeText(`RISK CATEGORY: ${levelVal}`, margin + 310, y - 44, 10.5, true);
  drawSafeText(`TOTAL FINDINGS: ${findings.length}`, margin + 310, y - 62, 10, true);
  y -= 102;

  // 3. Executive Summary & Risk Explanation
  drawSafeText('1. EXECUTIVE PRIVACY SUMMARY', margin, y, 11.5, true, rgb(0.05, 0.25, 0.45));
  y -= 16;
  drawWrappedParagraph(report.summary, 9.5);
  y -= 8;

  drawSafeText('2. RISK SCORE EXPLANATION', margin, y, 11.5, true, rgb(0.05, 0.25, 0.45));
  y -= 16;
  drawWrappedParagraph(report.risk_explanation, 9.5);
  y -= 8;

  if (report.sharing_guidance) {
    drawSafeText('3. FINAL SHARING GUIDANCE', margin, y, 11.5, true, rgb(0.05, 0.25, 0.45));
    y -= 16;
    drawWrappedParagraph(report.sharing_guidance, 9.5, true);
    y -= 8;
  }

  // 4. Detected Sensitive Items
  ensureSpace(40);
  drawSafeText(`4. DETECTED SENSITIVE INFORMATION (${findings.length})`, margin, y, 11.5, true, rgb(0.05, 0.25, 0.45));
  y -= 18;

  if (findings.length === 0) {
    drawWrappedParagraph('No sensitive findings were detected in this document.', 9.5);
  } else {
    findings.forEach((f, idx) => {
      ensureSpace(62);
      const headerLine = `${idx + 1}. [${f.severity.toUpperCase()}] ${f.category.replace(/_/g, ' ').toUpperCase()} — Excerpt: ${f.masked_value}`;
      drawWrappedParagraph(headerLine, 9.5, true, rgb(0.1, 0.15, 0.25));
      const metaLine = `Method: ${f.detection_method} | Confidence: ${f.confidence}% | Page: ${f.page_number || 1} | Redacted: ${f.is_redacted ? 'YES' : 'NO'}`;
      drawWrappedParagraph(metaLine, 8.5, false, rgb(0.35, 0.4, 0.48), 10);
      drawWrappedParagraph(`Reason: ${f.explanation}`, 8.5, false, rgb(0.25, 0.3, 0.38), 10);
      drawWrappedParagraph(`Action: ${f.recommended_action}`, 8.5, true, rgb(0.1, 0.35, 0.25), 10);
      y -= 6;
    });
  }

  // 5. Actionable Recommendations
  ensureSpace(45);
  y -= 6;
  drawSafeText('5. RECOMMENDED PROTECTION MEASURES', margin, y, 11.5, true, rgb(0.05, 0.25, 0.45));
  y -= 16;
  for (const rec of report.recommendations || []) {
    ensureSpace(30);
    drawWrappedParagraph(`• [${rec.priority.toUpperCase()}] ${rec.action}`, 9.5, true);
    if (rec.reason) {
      drawWrappedParagraph(`  Why: ${rec.reason}`, 8.5, false, rgb(0.3, 0.35, 0.42), 10);
    }
  }

  // 6. Mandatory Product Disclaimer (Section 18.8)
  ensureSpace(45);
  y -= 14;
  drawWrappedParagraph(
    'Disclaimer: PrivacyGuard AI helps identify potential sensitive information and reduce accidental data exposure. Automated detection may not identify every risk. Always review documents before sharing.',
    8,
    true,
    rgb(0.45, 0.5, 0.58)
  );

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
};

