import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, EyeOff } from 'lucide-react';
import { apiClient, extractApiError } from '../services/api';
import { FindingItem, ScanItem, ScanReport } from '../types';
import {
  FindingsTable,
  ReportHeader,
  ReportSummary,
  RiskBreakdown,
} from '../components/reports/ReportComponents';
import { RecommendationCard } from '../components/findings/ResultsComponents';
import { ErrorState, LoadingSpinner } from '../components/common/CommonUI';
import { useToast } from '../context/ToastContext';

export const ReportPage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const reportQuery = useQuery({
    queryKey: ['scan-report', scanId],
    queryFn: async () => {
      const res = await apiClient.get(`/scans/${scanId}/report`);
      return res.data.data as {
        scan: ScanItem;
        report: ScanReport;
        findings: FindingItem[];
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
        title: 'Official PDF Report Exported',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Export Failed',
        message: extractApiError(err),
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (reportQuery.isLoading) {
    return <LoadingSpinner label="Generating comprehensive privacy report..." />;
  }

  if (reportQuery.isError || !reportQuery.data) {
    return (
      <ErrorState
        message={extractApiError(reportQuery.error)}
        onRetry={() => reportQuery.refetch()}
      />
    );
  }

  const { scan, report, findings } = reportQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to={`/scan/${scan.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-cyan-400"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Scan Results
        </Link>

        <Link
          to={`/redact/${scan.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
        >
          <EyeOff className="w-3.5 h-3.5" /> Go to Smart Redaction
        </Link>
      </div>

      <ReportHeader
        scan={scan}
        onExportPdf={handleExportPdf}
        isExportingPdf={isExporting}
      />

      <ReportSummary scan={scan} report={report} />

      <RiskBreakdown breakdown={report.risk_breakdown} />

      <FindingsTable findings={findings} />

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-100">
          Recommended Protection Measures ({report.recommendations?.length || 0})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(report.recommendations || []).map((rec, idx) => (
            <RecommendationCard key={idx} recommendation={rec} />
          ))}
        </div>
      </div>
    </div>
  );
};

