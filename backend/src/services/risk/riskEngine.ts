import { RiskLevel, SensitiveCategory, SeverityLevel } from '../../types';
import { riskSchema } from '../../validators/schemas';

/**
 * Section 4.5 Base Weights by Category
 */
export const CATEGORY_BASE_WEIGHTS: Record<SensitiveCategory, number> = {
  authentication_credentials: 30,
  government_identity: 25,
  personal_identity: 25,
  financial_information: 25,
  medical_information: 20,
  confidential_business_information: 20,
  location_information: 15,
  contact_information: 12,
  other_sensitive_information: 10,
};

const SEVERITY_MULTIPLIERS: Record<SeverityLevel, number> = {
  low: 0.6,
  moderate: 0.85,
  high: 1.15,
  critical: 1.4,
};

export interface RiskCalculationInput {
  category: SensitiveCategory;
  severity: SeverityLevel;
  confidence: number;
  masked_value: string;
}

export interface RiskAssessmentResult {
  score: number;
  level: RiskLevel;
  explanation: string;
  breakdown: Record<
    string,
    {
      count: number;
      maxSeverity: SeverityLevel;
      weightContribution: number;
    }
  >;
}

/**
 * Deterministic backend risk scoring engine (Section 4.5).
 * Normalizes score to 0–100 and prevents duplicate detections from artificially inflating it.
 */
export const calculatePrivacyRiskScore = (
  findings: RiskCalculationInput[]
): RiskAssessmentResult => {
  if (!findings || findings.length === 0) {
    const validated = riskSchema.parse({
      score: 0,
      level: 'low',
      explanation: 'No sensitive data patterns or contextual exposures were detected in the scanned content.',
    });
    return {
      ...validated,
      breakdown: {},
    };
  }

  // Group findings by category and deduplicate identical masked values within the same category
  const byCategory = new Map<
    SensitiveCategory,
    Array<{ severity: SeverityLevel; confidence: number; masked_value: string }>
  >();

  for (const f of findings) {
    const list = byCategory.get(f.category) || [];
    const isDuplicate = list.some(
      (item) => item.masked_value.toLowerCase() === f.masked_value.toLowerCase()
    );
    if (!isDuplicate) {
      list.push({
        severity: f.severity,
        confidence: Math.max(0, Math.min(100, f.confidence)),
        masked_value: f.masked_value,
      });
      byCategory.set(f.category, list);
    }
  }

  let rawScore = 0;
  const breakdown: Record<
    string,
    { count: number; maxSeverity: SeverityLevel; weightContribution: number }
  > = {};

  const severityOrder: SeverityLevel[] = ['low', 'moderate', 'high', 'critical'];

  for (const [category, items] of byCategory.entries()) {
    const baseWeight = CATEGORY_BASE_WEIGHTS[category] || 10;

    // Sort items in this category by highest impact first
    items.sort(
      (a, b) =>
        SEVERITY_MULTIPLIERS[b.severity] * b.confidence -
        SEVERITY_MULTIPLIERS[a.severity] * a.confidence
    );

    let categoryContribution = 0;
    let maxSev: SeverityLevel = 'low';

    items.forEach((item, index) => {
      if (severityOrder.indexOf(item.severity) > severityOrder.indexOf(maxSev)) {
        maxSev = item.severity;
      }
      const confidenceFactor = Math.max(0.5, item.confidence / 100);
      const severityFactor = SEVERITY_MULTIPLIERS[item.severity];
      // Diminishing returns for additional unique items in the same category: 1st = 100%, 2nd = 35%, 3rd = 20%, etc.
      const diminishingFactor = index === 0 ? 1.0 : 1 / (index + 1.8);
      categoryContribution += baseWeight * severityFactor * confidenceFactor * diminishingFactor;
    });

    // Cap single category contribution to at most 2.1x its base weight
    categoryContribution = Math.min(categoryContribution, baseWeight * 2.1);
    const roundedContribution = Math.round(categoryContribution);

    rawScore += roundedContribution;
    breakdown[category] = {
      count: items.length,
      maxSeverity: maxSev,
      weightContribution: roundedContribution,
    };
  }

  // Multi-category correlation bonus when >= 3 distinct sensitive categories appear together
  const distinctCategories = byCategory.size;
  if (distinctCategories >= 3) {
    rawScore += (distinctCategories - 2) * 6;
  }

  // Ensure critical credentials or verified card/government IDs reach appropriate minimum threshold
  const hasCriticalFinding = findings.some((f) => f.severity === 'critical');
  if (hasCriticalFinding && rawScore < 65) {
    rawScore = 65;
  }

  const normalizedScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  let level: RiskLevel = 'low';
  if (normalizedScore >= 80) {
    level = 'critical';
  } else if (normalizedScore >= 60) {
    level = 'high';
  } else if (normalizedScore >= 30) {
    level = 'moderate';
  } else {
    level = 'low';
  }

  const categoryLabels = Array.from(byCategory.keys()).map((c) => c.replace(/_/g, ' '));
  const explanation = `Calculated a ${level.toUpperCase()} privacy risk score (${normalizedScore}/100) based on ${
    findings.length
  } finding(s) across ${distinctCategories} category(ies) (${categoryLabels.join(
    ', '
  )}). Deterministic category base weights, severity multipliers, confidence weighting, and multi-category correlation factors were applied.`;

  const validated = riskSchema.parse({
    score: normalizedScore,
    level,
    explanation,
  });

  return {
    ...validated,
    breakdown,
  };
};

