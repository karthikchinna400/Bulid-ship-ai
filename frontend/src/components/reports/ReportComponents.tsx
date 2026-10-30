import React from 'react';
import { FileDown, FileText, ShieldCheck, Calendar, HardDrive, Loader2 } from 'lucide-react';
import { FindingItem, ScanItem, ScanReport } from '../../types';
import { formatBytes, formatCategoryLabel, formatDateTime } from '../../lib/utils';
import { RiskLevelBadge } from '../findings/ResultsComponents';

export const ExportReportButton: React.FC<{
  onExport: () => void;
  isExporting?: boolean;
}> = ({ onExport, isExporting = false }) => (
  <button
    type="button"
    disabled={isExporting}
    onClick={onExport}
    className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer"
  >
    {isExporting ? (
      <Loader2 className="w-4 h-4 animate-spin" />
    ) : (
      <FileDown className="w-4 h-4" />
    )}
    Export Official PDF Report
  </button>
);

export const ReportHeader: React.FC<{
  scan: ScanItem;
  onExportPdf: () => void;
  isExportingPdf: boolean;
}> = ({ scan, onExportPdf, isExportingPdf }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
          Official Privacy Audit Report
        </span>
        <RiskLevelBadge level={scan.risk_level} size="sm" />
      </div>
      <h1 className="text-xl sm:text-2xl font-bold text-white break-all">
        {scan.original_filename}
      </h1>
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          Scanned: {formatDateTime(scan.created_at)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
          Size: {formatBytes(scan.file_size)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          Type: {scan.file_type}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Redaction: <strong className="capitalize text-slate-200">{scan.redaction_status.replace('_', ' ')}</strong>
        </span>
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-3">
      <ExportReportButton onExport={onExportPdf} isExporting={isExportingPdf} />
    </div>
  </div>
);

export const ReportSummary: React.FC<{
  scan: ScanItem;
  report: ScanReport;
}> = ({ scan, report }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
    <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
          Executive Privacy Summary
        </h3>
        <p className="text-sm text-slate-200 mt-1.5 leading-relaxed">{report.summary}</p>
      </div>
      <div className="pt-3 border-t border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Risk Score Justification ({scan.risk_score ?? 0}/100)
        </h4>
        <p className="text-xs text-slate-300 mt-1.5 whitespace-pre-line leading-relaxed">
          {report.risk_explanation}
        </p>
      </div>
    </div>

    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between space-y-4">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Final Sharing Guidance
        </h3>
        <p className="text-sm text-slate-200 mt-2 leading-relaxed">
          {report.sharing_guidance ||
            'Review and redact all identified personal, financial, or credential fields before sharing this document outside trusted boundaries.'}
        </p>
      </div>
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
        <div className="flex justify-between text-slate-400">
          <span>Risk Score:</span>
          <strong className="text-white">{scan.risk_score ?? 0} / 100</strong>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Total Findings:</span>
          <strong className="text-white">{scan.total_findings}</strong>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Protection Status:</span>
          <strong className="text-cyan-400 capitalize">
            {scan.redaction_status.replace('_', ' ')}
          </strong>
        </div>
      </div>
    </div>
  </div>
);

export const RiskBreakdown: React.FC<{
  breakdown: ScanReport['risk_breakdown'];
}> = ({ breakdown }) => {
  const entries = Object.entries(breakdown || {});
  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <h3 className="text-sm font-bold text-slate-100 mb-4">
        Category Risk Weight Breakdown
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {entries.map(([category, info]) => (
          <div
            key={category}
            className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-semibold text-slate-200">
                {formatCategoryLabel(category)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {info.count} item(s) • Max: {info.maxSeverity}
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-cyan-400">
                +{info.weightContribution} pts
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const FindingsTable: React.FC<{ findings: FindingItem[] }> = ({ findings }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-800">
      <h3 className="text-sm font-bold text-slate-100">
        Individual Sensitive Detections ({findings.length})
      </h3>
    </div>
    {findings.length === 0 ? (
      <div className="p-8 text-center text-sm text-slate-400">
        No sensitive items detected in this scan.
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase">
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Masked Excerpt</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Method & Confidence</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Recommended Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {findings.map((f) => (
              <tr key={f.id} className="hover:bg-slate-900/80">
                <td className="py-3 px-4 font-semibold text-slate-200">
                  {formatCategoryLabel(f.category)}
                </td>
                <td className="py-3 px-4 font-mono text-cyan-300">{f.masked_value}</td>
                <td className="py-3 px-4">
                  <RiskLevelBadge level={f.severity} size="sm" />
                </td>
                <td className="py-3 px-4 text-slate-300">
                  {f.detection_method.replace('_', ' ')} ({Math.round(f.confidence)}%)
                </td>
                <td className="py-3 px-4">
                  {f.is_redacted ? (
                    <span className="text-emerald-400 font-semibold">Redacted</span>
                  ) : (
                    <span className="text-amber-400">Unredacted</span>
                  )}
                </td>
                <td className="py-3 px-4 text-slate-300 max-w-xs">{f.recommended_action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

