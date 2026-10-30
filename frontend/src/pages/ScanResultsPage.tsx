import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  FileDown,
  FileText,
  ArrowLeft,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { apiClient, extractApiError } from '../services/api';
import { FindingItem, ScanItem, ScanReport } from '../types';
import {
  FindingList,
  RecommendationCard,
  RiskScoreCard,
  ScanSummary,
} from '../components/findings/ResultsComponents';
import { ErrorState, LoadingSpinner } from '../components/common/CommonUI';
import { formatBytes, formatDateTime } from '../lib/utils';
import { useToast } from '../context/ToastContext';

export const ScanResultsPage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const scanQuery = useQuery({
    queryKey: ['scan-detail', scanId],
    queryFn: async () => {
      const res = await apiClient.get(`/scans/${scanId}`);
      return res.data.data as {
        scan: ScanItem;
        findings: FindingItem[];
        report: ScanReport | null;
      };
    },
    enabled: Boolean(scanId),
  });

  const handleExportPdf = async () => {
    if (!scanId) return;
    setIsExporting(true);
    try {
      const res = await apiClient.get(`/scans/${scanId}/report/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PrivacyGuard_Report_${scanId.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast({
        type: 'success',
        title: 'PDF Privacy Report Downloaded',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Failed to export PDF report',
        message: extractApiError(err),
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (scanQuery.isLoading) {
    return <LoadingSpinner label="Loading scan analysis and risk breakdown..." />;
  }

  if (scanQuery.isError || !scanQuery.data) {
    return (
      <ErrorState
        message={extractApiError(scanQuery.error)}
        onRetry={() => scanQuery.refetch()}
      />
    );
  }

  const { scan, findings, report } = scanQuery.data;

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-cyan-400 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Scan History
          </Link>
          <h1 className="text-2xl font-extrabold text-white break-all">
            {scan.original_filename}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Scanned {formatDateTime(scan.created_at)} • {formatBytes(scan.file_size)} • Profile:{' '}
            <span className="capitalize text-slate-200">{scan.scan_type}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/redact/${scan.id}`}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-colors"
          >
            <EyeOff className="w-4 h-4" />
            <span>Open Smart Redaction</span>
          </Link>
          <Link
            to={`/reports/${scan.id}`}
            className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm flex items-center gap-2 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Full Privacy Report</span>
          </Link>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportPdf}
            className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Risk Score Card */}
      <RiskScoreCard
        score={scan.risk_score}
        level={scan.risk_level}
        totalFindings={findings.length}
        redactionStatus={scan.redaction_status}
      />

      {/* Summary & Recommendations */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ScanSummary
            summary={report.summary}
            riskExplanation={report.risk_explanation}
            sharingGuidance={report.sharing_guidance}
          />
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Actionable Protection Recommendations ({report.recommendations?.length || 0})
            </h3>
            {(report.recommendations || []).map((rec, idx) => (
              <RecommendationCard key={idx} recommendation={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Findings List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span>Detected Sensitive Information ({findings.length})</span>
          </h2>
          {findings.length > 0 && (
            <Link
              to={`/redact/${scan.id}`}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Redact Findings →
            </Link>
          )}
        </div>
        <FindingList findings={findings} />
      </div>
    </div>
  );
};

