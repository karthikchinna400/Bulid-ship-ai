import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText } from 'lucide-react';
import { apiClient, extractApiError } from '../services/api';
import { FindingItem, ScanItem } from '../types';
import {
  DownloadProtectedFile,
  FindingSelector,
  RedactionControls,
  RedactionPreview,
} from '../components/redaction/RedactionComponents';
import { ErrorState, LoadingSpinner } from '../components/common/CommonUI';
import { useToast } from '../context/ToastContext';

export const RedactionPage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRedacting, setIsRedacting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [redactedPreviewText, setRedactedPreviewText] = useState<string>('');
  const [redactionNotes, setRedactionNotes] = useState<string>('');

  const scanQuery = useQuery({
    queryKey: ['scan-detail', scanId],
    queryFn: async () => {
      const res = await apiClient.get(`/scans/${scanId}`);
      return res.data.data as {
        scan: ScanItem;
        findings: FindingItem[];
      };
    },
    enabled: Boolean(scanId),
  });

  useEffect(() => {
    if (scanQuery.data?.findings) {
      setSelectedIds(scanQuery.data.findings.map((f) => f.id));
    }
    if (scanQuery.data?.scan?.extracted_text_preview) {
      setRedactedPreviewText(scanQuery.data.scan.extracted_text_preview);
    }
  }, [scanQuery.data]);

  const toggleFinding = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const executeRedaction = async (redactionType: 'selected' | 'all') => {
    if (!scanId) return;
    setIsRedacting(true);
    try {
      const res = await apiClient.post(`/scans/${scanId}/redact`, {
        redactionType,
        findingIds: redactionType === 'all' ? [] : selectedIds,
      });

      setRedactedPreviewText(res.data.data.redactedPreviewText || '');
      setRedactionNotes(res.data.data.notes || '');
      await queryClient.invalidateQueries({ queryKey: ['scan-detail', scanId] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

      showToast({
        type: 'success',
        title: 'Smart Redaction Verified & Completed',
        message: 'Sensitive content has been permanently stripped from the exported file.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Redaction Failed',
        message: extractApiError(err),
      });
    } finally {
      setIsRedacting(false);
    }
  };

  const handleDownloadProtected = async () => {
    if (!scanId || !scanQuery.data) return;
    setIsDownloading(true);
    try {
      const res = await apiClient.get(`/scans/${scanId}/redacted-file`, {
        responseType: 'blob',
      });
      const contentType = String(res.headers['content-type'] || 'application/octet-stream');
      const origName = scanQuery.data.scan.original_filename;
      const dotIndex = origName.lastIndexOf('.');
      const baseName = dotIndex !== -1 ? origName.slice(0, dotIndex) : origName;
      const ext = dotIndex !== -1 ? origName.slice(dotIndex) : '.txt';

      const url = window.URL.createObjectURL(new Blob([res.data], { type: contentType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${baseName}_protected${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast({
        type: 'success',
        title: 'Protected Document Downloaded',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Download Failed',
        message: extractApiError(err),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (scanQuery.isLoading) {
    return <LoadingSpinner label="Preparing Smart Redaction workspace..." />;
  }

  if (scanQuery.isError || !scanQuery.data) {
    return (
      <ErrorState
        message={extractApiError(scanQuery.error)}
        onRetry={() => scanQuery.refetch()}
      />
    );
  }

  const { scan, findings } = scanQuery.data;
  const isRedactionCompleted = scan.redaction_status === 'completed';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to={`/scan/${scan.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-cyan-400 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Scan Results
          </Link>
          <h1 className="text-2xl font-extrabold text-white">
            Smart Document Redaction Workspace
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            File: <strong className="text-slate-200">{scan.original_filename}</strong> • Permanent
            underlying text and pixel removal
          </p>
        </div>

        <Link
          to={`/reports/${scan.id}`}
          className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2 self-start"
        >
          <FileText className="w-4 h-4" />
          View Privacy Report
        </Link>
      </div>

      <DownloadProtectedFile
        isReady={isRedactionCompleted}
        isDownloading={isDownloading}
        onDownload={handleDownloadProtected}
        notes={redactionNotes}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
        <div>
          <h2 className="text-sm font-bold text-slate-100">Execute Permanent Redaction</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Redacted values are permanently removed from the exported PDF, DOCX, TXT, or Image.
          </p>
        </div>
        <RedactionControls
          selectedCount={selectedIds.length}
          totalCount={findings.length}
          isRedacting={isRedacting}
          onRedactSelected={() => executeRedaction('selected')}
          onRedactAll={() => executeRedaction('all')}
        />
      </div>

      <FindingSelector
        findings={findings}
        selectedIds={selectedIds}
        onToggle={toggleFinding}
        onSelectAll={() => setSelectedIds(findings.map((f) => f.id))}
        onClearAll={() => setSelectedIds([])}
      />

      <RedactionPreview
        originalPreview={scan.extracted_text || scan.extracted_text_preview || ''}
        redactedPreview={
          redactedPreviewText ||
          'Run "Redact Selected" or "Redact All" above to generate and verify the protected output.'
        }
      />
    </div>
  );
};

