import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Trash2,
  Eye,
  EyeOff,
  ScanLine,
} from 'lucide-react';
import { apiClient, extractApiError } from '../services/api';
import { ScanItem } from '../types';
import {
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  FilterDropdown,
  Pagination,
  SearchInput,
  SkeletonLoader,
} from '../components/common/CommonUI';
import { RiskLevelBadge } from '../components/findings/ResultsComponents';
import { formatBytes, formatDateTime } from '../lib/utils';
import { useToast } from '../context/ToastContext';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [status, setStatus] = useState('');
  const [fileType, setFileType] = useState('');
  const [scanToDelete, setScanToDelete] = useState<ScanItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const historyQuery = useQuery({
    queryKey: ['scans-history', page, search, riskLevel, status, fileType],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (search.trim()) params.set('search', search.trim());
      if (riskLevel) params.set('riskLevel', riskLevel);
      if (status) params.set('status', status);
      if (fileType) params.set('fileType', fileType);

      const res = await apiClient.get(`/scans?${params.toString()}`);
      return res.data.data as {
        scans: ScanItem[];
        total: number;
        page: number;
        limit: number;
      };
    },
  });

  const handleConfirmDelete = async () => {
    if (!scanToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/scans/${scanToDelete.id}`);
      await queryClient.invalidateQueries({ queryKey: ['scans-history'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      showToast({
        type: 'success',
        title: 'Scan record deleted',
        message: `"${scanToDelete.original_filename}" has been permanently removed.`,
      });
      setScanToDelete(null);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Unable to delete scan',
        message: extractApiError(err),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Scan History & Audit Log</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Filter, inspect reports, redact sensitive fields, or purge past scans.
          </p>
        </div>

        <Link
          to="/scan"
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2 self-start"
        >
          <ScanLine className="w-4 h-4" />
          <span>New Privacy Scan</span>
        </Link>
      </div>

      {/* Filters Toolbar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search by filename..."
          className="flex-1"
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <FilterDropdown
            label="Risk Level"
            value={riskLevel}
            onChange={(v) => {
              setRiskLevel(v);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Risk Levels' },
              { value: 'critical', label: 'Critical Risk (80-100)' },
              { value: 'high', label: 'High Risk (60-79)' },
              { value: 'moderate', label: 'Moderate Risk (30-59)' },
              { value: 'low', label: 'Low Risk (0-29)' },
            ]}
          />

          <FilterDropdown
            label="File Type"
            value={fileType}
            onChange={(v) => {
              setFileType(v);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All File Formats' },
              { value: 'pdf', label: 'PDF Documents' },
              { value: 'image', label: 'Images (PNG/JPG/WEBP)' },
              { value: 'word', label: 'Word (DOCX)' },
              { value: 'text', label: 'Plain Text (TXT)' },
            ]}
          />

          <FilterDropdown
            label="Scan Status"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'completed', label: 'Completed' },
              { value: 'processing', label: 'Processing' },
              { value: 'failed', label: 'Failed' },
            ]}
          />
        </div>
      </div>

      {historyQuery.isLoading ? (
        <SkeletonLoader rows={5} />
      ) : historyQuery.isError ? (
        <ErrorState
          message={extractApiError(historyQuery.error)}
          onRetry={() => historyQuery.refetch()}
        />
      ) : !historyQuery.data || historyQuery.data.scans.length === 0 ? (
        <EmptyState
          title="No Matching Scans Found"
          description="Upload a document or adjust your search and filter criteria."
          actionLabel="Upload & Scan File"
          onAction={() => navigate('/scan')}
        />
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase">
                  <th className="py-3.5 px-4">File Name</th>
                  <th className="py-3.5 px-4">Upload Date</th>
                  <th className="py-3.5 px-4">Findings</th>
                  <th className="py-3.5 px-4">Risk Score</th>
                  <th className="py-3.5 px-4">Risk Category</th>
                  <th className="py-3.5 px-4">Redaction Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {historyQuery.data.scans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-slate-900/90 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <Link
                            to={`/scan/${scan.id}`}
                            className="font-semibold text-slate-100 hover:text-cyan-400"
                          >
                            {scan.original_filename}
                          </Link>
                          <p className="text-[11px] text-slate-500">
                            {formatBytes(scan.file_size)} • {scan.scan_type}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {formatDateTime(scan.created_at)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-200">
                      {scan.total_findings}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {scan.risk_score ?? 0} / 100
                    </td>
                    <td className="py-3.5 px-4">
                      <RiskLevelBadge level={scan.risk_level} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${
                          scan.redaction_status === 'completed'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {scan.redaction_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to={`/reports/${scan.id}`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                          title="View Privacy Report"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/redact/${scan.id}`}
                          className="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30"
                          title="Redact Document"
                        >
                          <EyeOff className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setScanToDelete(scan)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/20 cursor-pointer"
                          title="Delete Scan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4">
            <Pagination
              page={historyQuery.data.page}
              limit={historyQuery.data.limit}
              total={historyQuery.data.total}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={Boolean(scanToDelete)}
        title="Delete Scan Record"
        description={`Are you sure you want to permanently delete "${scanToDelete?.original_filename}" and all associated findings and reports?`}
        confirmLabel="Delete Permanently"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setScanToDelete(null)}
      />
    </div>
  );
};

