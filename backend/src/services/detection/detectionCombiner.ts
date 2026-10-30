import { DetectedItem, maskSensitiveValue } from './ruleEngine';
import { GeminiAnalysisOutput } from '../ai/geminiService';

/**
 * Layer 3: Combines deterministic Rule-Based findings with Gemini AI contextual findings.
 * Deduplicates overlapping detections and preserves the highest confidence & severity.
 */
export const combineDetections = (
  ruleFindings: DetectedItem[],
  aiResult: GeminiAnalysisOutput
): DetectedItem[] => {
  const combined: DetectedItem[] = [...ruleFindings];

  for (const aiFinding of aiResult.findings) {
    const normalizedExcerpt = aiFinding.masked_excerpt.trim().toLowerCase();

    // Check if an existing rule-based finding already covers this category + page + similar excerpt
    const existingIndex = combined.findIndex((existing) => {
      const sameCategory = existing.category === aiFinding.category;
      const samePage = (existing.page_number || 1) === (aiFinding.page_number || 1);
      const existingMasked = existing.masked_value.toLowerCase();
      const excerptOverlap =
        existingMasked === normalizedExcerpt ||
        existingMasked.includes(normalizedExcerpt.slice(-4)) ||
        normalizedExcerpt.includes(existingMasked.slice(-4));
      return sameCategory && samePage && excerptOverlap;
    });

    if (existingIndex !== -1) {
      // Upgrade to 'hybrid' detection method and take max confidence
      combined[existingIndex] = {
        ...combined[existingIndex],
        detection_method: 'hybrid',
        confidence: Math.max(combined[existingIndex].confidence, aiFinding.confidence),
      };
    } else {
      // Contextual AI finding not caught by regex
      combined.push({
        category: aiFinding.category,
        subcategory: 'Contextual AI Detection',
        severity: aiFinding.severity,
        confidence: Math.min(aiFinding.confidence, 92), // Cap pure AI confidence unless hybrid
        detection_method: 'gemini_ai',
        page_number: aiFinding.page_number || 1,
        start_offset: null,
        end_offset: null,
        masked_value: maskSensitiveValue(aiFinding.masked_excerpt, aiFinding.category),
        raw_match: aiFinding.masked_excerpt,
        explanation: aiFinding.explanation,
        recommended_action: aiFinding.recommended_action,
      });
    }
  }

  return combined;
};

