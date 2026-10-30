import React from 'react';
import {
  ShieldCheck,
  Download,
  CheckSquare,
  Square,
  Loader2,
  Eye,
  Lock,
} from 'lucide-react';
import { FindingItem } from '../../types';
import { formatCategoryLabel } from '../../lib/utils';
import { RiskLevelBadge } from '../findings/ResultsComponents';

export const DocumentPreview: React.FC<{
  title: string;
  content: string;
  isRedactedView?: boolean;
}> = ({ title, content, isRedactedView = false }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden flex flex-col h-full">
    <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
        {isRedactedView ? (
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
        )}
        <span>{title}</span>
      </div>
      {isRedactedView && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          Verified Sanitized Output
        </span>
      )}
    </div>
    <pre className="p-4 text-xs font-mono text-slate-300 whitespace-pre-wrap break-words overflow-y-auto max-h-96 leading-relaxed flex-1">
      {content || 'No extractable text preview available for this document.'}
    </pre>
  </div>
);

export const FindingSelector: React.FC<{
  findings: FindingItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}> = ({ findings, selectedIds, onToggle, onSelectAll, onClearAll }) => {
  const allSelected = findings.length > 0 && selectedIds.length === findings.length;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-100">
            Select Sensitive Findings to Redact ({selectedIds.length} of {findings.length})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Selected items will be permanently stripped from the underlying document stream or image pixels.
          </p>
        </div>
        <button
          type="button"
          onClick={allSelected ? onClearAll : onSelectAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
        >
          {allSelected ? (
            <>
              <Square className="w-3.5 h-3.5 text-slate-400" />
              Deselect All
            </>
          ) : (
            <>
              <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
              Select All ({findings.length})
            </>
          )}
        </button>
      </div>

      <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
        {findings.map((f) => {
          const isChecked = selectedIds.includes(f.id);
          return (
            <label
              key={f.id}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                isChecked
                  ? 'border-cyan-500/50 bg-cyan-950/20'
                  : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggle(f.id)}
                className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-100">
                    {formatCategoryLabel(f.category)}
                  </span>
                  <RiskLevelBadge level={f.severity} size="sm" />
                  {f.is_redacted && (
                    <span className="text-[11px] text-emerald-400 font-medium">
                      • Already Redacted
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-cyan-300 mt-1">{f.masked_value}</p>
                <p className="text-[11px] text-slate-400 mt-1">{f.explanation}</p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export const RedactionControls: React.FC<{
  selectedCount: number;
  totalCount: number;
  isRedacting: boolean;
  onRedactSelected: () => void;
  onRedactAll: () => void;
}> = ({ selectedCount, totalCount, isRedacting, onRedactSelected, onRedactAll }) => (
  <div className="flex flex-wrap items-center gap-3">
    <button
      type="button"
      disabled={isRedacting || selectedCount === 0}
      onClick={onRedactSelected}
      className="px-4 py-2.5 rounded-xl border border-cyan-500/50 bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-40 text-cyan-200 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
    >
      {isRedacting && <Loader2 className="w-4 h-4 animate-spin" />}
      Redact Selected ({selectedCount})
    </button>

    <button
      type="button"
      disabled={isRedacting || totalCount === 0}
      onClick={onRedactAll}
      className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-sm font-bold transition-colors flex items-center gap-2 shadow-lg shadow-cyan-500/15 cursor-pointer"
    >
      {isRedacting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <ShieldCheck className="w-4 h-4" />
      )}
      Redact All Sensitive Data ({totalCount})
    </button>
  </div>
);

export const RedactionPreview: React.FC<{
  originalPreview: string;
  redactedPreview: string;
}> = ({ originalPreview, redactedPreview }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <DocumentPreview title="Current Extracted Content Preview" content={originalPreview} />
    <DocumentPreview
      title="Protected & Redacted Output Preview"
      content={redactedPreview}
      isRedactedView
    />
  </div>
);

export const DownloadProtectedFile: React.FC<{
  isReady: boolean;
  isDownloading: boolean;
  onDownload: () => void;
  notes?: string;
}> = ({ isReady, isDownloading, onDownload, notes }) => {
  if (!isReady) return null;

  return (
    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/15 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Protected Document Verified & Ready for Export</span>
        </div>
        <p className="text-xs text-slate-300 mt-1">
          {notes ||
            'Underlying text streams and image pixels have been permanently modified and independently verified.'}
        </p>
      </div>
      <button
        type="button"
        disabled={isDownloading}
        onClick={onDownload}
        className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 shrink-0 transition-colors cursor-pointer"
      >
        {isDownloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Download Protected File
      </button>
    </div>
  );
};

