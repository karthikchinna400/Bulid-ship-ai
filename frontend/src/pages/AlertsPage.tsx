import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCircle2,
  Trash2,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { apiClient, extractApiError } from '../services/api';
import { SecurityAlert } from '../types';
import { EmptyState, ErrorState, SkeletonLoader } from '../components/common/CommonUI';
import { RiskLevelBadge } from '../components/findings/ResultsComponents';
import { formatDateTime } from '../lib/utils';
import { useToast } from '../context/ToastContext';

export const AlertsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const alertsQuery = useQuery({
    queryKey: ['security-alerts'],
    queryFn: async () => {
      const res = await apiClient.get('/alerts');
      return res.data.data.alerts as SecurityAlert[];
    },
  });

  const handleMarkRead = async (alertId: string) => {
    try {
      await apiClient.patch(`/alerts/${alertId}/read`);
      await queryClient.invalidateQueries({ queryKey: ['security-alerts'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Failed to update alert',
        message: extractApiError(err),
      });
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await apiClient.delete(`/alerts/${alertId}`);
      await queryClient.invalidateQueries({ queryKey: ['security-alerts'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      showToast({
        type: 'success',
        title: 'Security alert dismissed',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Failed to delete alert',
        message: extractApiError(err),
      });
    }
  };

  if (alertsQuery.isLoading) {
    return <SkeletonLoader rows={4} />;
  }

  if (alertsQuery.isError) {
    return (
      <ErrorState
        message={extractApiError(alertsQuery.error)}
        onRetry={() => alertsQuery.refetch()}
      />
    );
  }

  const alerts = alertsQuery.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
          <Bell className="w-6 h-6 text-amber-400" />
          <span>Security & Data Exposure Alerts</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Automated notifications triggered by critical sensitive findings, exposed credentials,
          multi-category exposures, or redaction events.
        </p>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          title="No Security Alerts"
          description="Your workspace has no active high-risk or credential exposure alerts."
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-400" />}
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                alert.is_read
                  ? 'border-slate-800/80 bg-slate-900/30 opacity-80'
                  : 'border-red-500/40 bg-red-950/10'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-100">{alert.title}</h3>
                    <RiskLevelBadge level={alert.severity} size="sm" />
                    {!alert.is_read && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500 text-slate-950">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{alert.message}</p>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Triggered {formatDateTime(alert.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {alert.scan_id && (
                  <Link
                    to={`/scan/${alert.scan_id}`}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-cyan-300 flex items-center gap-1"
                  >
                    <span>Inspect Scan</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
                {!alert.is_read && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(alert.id)}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 cursor-pointer"
                  >
                    Mark Read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteAlert(alert.id)}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                  aria-label="Delete alert"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

