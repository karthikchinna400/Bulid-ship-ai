import React from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Cpu,
  Code2,
  Sparkles,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';
import { FindingItem, RecommendationItem, RiskLevel, SeverityLevel } from '../../types';
import { cn, formatCategoryLabel, getRiskBadgeStyles } from '../../lib/utils';

export const RiskLevelBadge: React.FC<{
  level?: RiskLevel | SeverityLevel | null;
  size?: 'sm' | 'md';
}> = ({ level, size = 'md' }) => {
  const styles = getRiskBadgeStyles(level);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold rounded-full border',
        styles.bg,
        styles.text,
        styles.border,
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs'
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {styles.label}
    </span>
  );
};

export const ConfidenceIndicator: React.FC<{ confidence: number; method: string }> = ({
  confidence,
  method,
}) => {
  const pct = Math.round(confidence);
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300">
        {method === 'rule_based' && <Code2 className="w-3 h-3 text-cyan-400" />}
        {method === 'gemini_ai' && <Sparkles className="w-3 h-3 text-purple-400" />}
        {method === 'hybrid' && <Cpu className="w-3 h-3 text-emerald-400" />}
        <span className="capitalize">{method.replace('_', ' ')}</span>
      </div>
      <span className="font-medium text-slate-300">{pct}% confidence</span>
    </div>
  );
};

export const RiskScoreCard: React.FC<{
  score: number | null;
  level: RiskLevel | null;
  totalFindings: number;
  redactionStatus?: string;
}> = ({ score, level, totalFindings, redactionStatus }) => {
  const numScore = score ?? 0;
  const styles = getRiskBadgeStyles(level);

  const ringColor =
    level === 'critical'
      ? 'text-red-500'
      : level === 'high'
      ? 'text-orange-500'
      : level === 'moderate'
      ? 'text-amber-400'
      : 'text-emerald-400';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="42"
            className="stroke-slate-800"
            strokeWidth="10"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            className={cn('transition-all duration-700', ringColor)}
            stroke="currentColor"
            strokeWidth="10"
            strokeDasharray={264}
            strokeDashoffset={264 - (264 * numScore) / 100}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-white">{numScore}</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-400">/ 100</span>
        </div>
      </div>

      <div className="flex-1 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-2">
          <h3 className="text-lg font-bold text-slate-100">Privacy Exposure Risk Score</h3>
          <RiskLevelBadge level={level} />
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          Calculated deterministically across{' '}
          <strong className="text-slate-200">{totalFindings}</strong> unique sensitive finding(s)
          using category severity weights, confidence validation, and multi-field correlation.
        </p>
        {redactionStatus === 'completed' && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
            <FileCheck className="w-3.5 h-3.5" />
            Protected Output Verified & Ready for Download
          </div>
        )}
      </div>

      <div
        className={cn(
          'hidden xl:flex flex-col items-end justify-center px-4 py-3 rounded-xl border',
          styles.bg,
          styles.border
        )}
      >
        <span className="text-xs text-slate-400">Detected Items</span>
        <span className={cn('text-2xl font-bold', styles.text)}>{totalFindings}</span>
      </div>
    </div>
  );
};

export const FindingCard: React.FC<{
  finding: FindingItem;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}> = ({ finding, selectable = false, selected = false, onToggleSelect }) => {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all',
        finding.is_redacted
          ? 'border-emerald-500/30 bg-emerald-950/10'
          : selected
          ? 'border-cyan-500/60 bg-cyan-950/15'
          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect?.(finding.id)}
              className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
              aria-label={`Select finding ${finding.masked_value}`}
            />
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-100">
                {formatCategoryLabel(finding.category)}
              </span>
              {finding.subcategory && (
                <span className="text-xs text-slate-400">({finding.subcategory})</span>
              )}
              <RiskLevelBadge level={finding.severity} size="sm" />
              {finding.is_redacted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Redacted
                </span>
              )}
            </div>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300">
              <span>Excerpt:</span>
              <strong>{finding.masked_value}</strong>
              {finding.page_number && (
                <span className="text-slate-500 ml-2">Page {finding.page_number}</span>
              )}
            </div>
          </div>
        </div>
        <ConfidenceIndicator
          confidence={finding.confidence}
          method={finding.detection_method}
        />
      </div>

      <p className="text-xs text-slate-300 mt-3 leading-relaxed">{finding.explanation}</p>
      <div className="mt-2.5 pt-2.5 border-t border-slate-800/70 flex items-center gap-2 text-xs text-amber-300/90">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
        <span>
          <strong>Recommended Action:</strong> {finding.recommended_action}
        </span>
      </div>
    </div>
  );
};

export const FindingList: React.FC<{
  findings: FindingItem[];
  selectable?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
}> = ({ findings, selectable, selectedIds = [], onToggleSelect }) => {
  if (findings.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-8 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
        <h4 className="text-base font-semibold text-emerald-200">
          No Sensitive Data Patterns Detected
        </h4>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Rule-based and Gemini contextual checks did not detect personal identifiers, financial
          numbers, or exposed secrets. Always review visual elements before sharing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {findings.map((finding) => (
        <FindingCard
          key={finding.id}
          finding={finding}
          selectable={selectable}
          selected={selectedIds.includes(finding.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
};

export const RecommendationCard: React.FC<{ recommendation: RecommendationItem }> = ({
  recommendation,
}) => {
  const styles = getRiskBadgeStyles(recommendation.priority);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex items-start gap-3.5">
      <div className={cn('p-2 rounded-lg border shrink-0 mt-0.5', styles.bg, styles.border)}>
        <AlertTriangle className={cn('w-4 h-4', styles.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <RiskLevelBadge level={recommendation.priority} size="sm" />
          {recommendation.category && (
            <span className="text-xs font-medium text-slate-400">
              {formatCategoryLabel(recommendation.category)}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-100">{recommendation.action}</p>
        {recommendation.reason && (
          <p className="text-xs text-slate-400 mt-1">{recommendation.reason}</p>
        )}
        {recommendation.expected_benefit && (
          <p className="text-xs text-emerald-400/90 mt-1">
            Benefit: {recommendation.expected_benefit}
          </p>
        )}
      </div>
    </div>
  );
};

export const ScanSummary: React.FC<{
  summary: string;
  riskExplanation: string;
  sharingGuidance?: string;
}> = ({ summary, riskExplanation, sharingGuidance }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
        Explainable AI Privacy Assessment
      </h3>
      <p className="text-sm text-slate-200 mt-1.5 leading-relaxed">{summary}</p>
    </div>
    <div className="pt-3 border-t border-slate-800/80">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
        Why This Score Was Assigned
      </h4>
      <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
        {riskExplanation}
      </p>
    </div>
    {sharingGuidance && (
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
        <strong>Sharing Guidance:</strong> {sharingGuidance}
      </div>
    )}
  </div>
);

