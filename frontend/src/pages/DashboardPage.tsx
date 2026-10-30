import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  Tag,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient, extractApiError } from '../services/api';
import {
  DashboardStats,
  RiskDistributionData,
  ScanItem,
  SecurityAlert,
} from '../types';
import {
  QuickScanCard,
  RecentScans,
  RiskOverviewChart,
  SecurityAlerts,
  StatsCard,
} from '../components/dashboard/DashboardComponents';
import { ErrorState, SkeletonLoader } from '../components/common/CommonUI';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/stats');
      return res.data.data as DashboardStats;
    },
  });

  const recentScansQuery = useQuery({
    queryKey: ['dashboard-recent-scans'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/recent-scans?limit=6');
      return res.data.data.scans as ScanItem[];
    },
  });

  const distributionQuery = useQuery({
    queryKey: ['dashboard-risk-distribution'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/risk-distribution');
      return res.data.data as RiskDistributionData;
    },
  });

  const alertsQuery = useQuery({
    queryKey: ['security-alerts'],
    queryFn: async () => {
      const res = await apiClient.get('/alerts');
      return res.data.data.alerts as SecurityAlert[];
    },
  });

  if (statsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader rows={4} />
      </div>
    );
  }

  if (statsQuery.isError) {
    return (
      <ErrorState
        message={extractApiError(statsQuery.error)}
        onRetry={() => statsQuery.refetch()}
      />
    );
  }

  const stats = statsQuery.data!;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            Welcome back, {user?.full_name || user?.email?.split('@')[0] || 'Analyst'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time personal data exposure metrics and digital trust status derived from your
            database records.
          </p>
        </div>
      </div>

      {/* Quick Scan Action Banner */}
      <QuickScanCard />

      {/* 4 Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Scanned Files"
          value={stats.totalScans}
          subtitle="Documents & images analyzed"
          icon={<FileText className="w-5 h-5" />}
          accent="cyan"
        />
        <StatsCard
          title="Sensitive Items Detected"
          value={stats.totalSensitiveItems}
          subtitle="Hybrid regex + Gemini AI matches"
          icon={<ShieldAlert className="w-5 h-5" />}
          accent="amber"
        />
        <StatsCard
          title="Files Successfully Protected"
          value={stats.protectedFiles}
          subtitle="Verified redacted documents"
          icon={<ShieldCheck className="w-5 h-5" />}
          accent="emerald"
        />
        <StatsCard
          title="High & Critical Risk Scans"
          value={stats.highAndCriticalScans}
          subtitle={`${stats.criticalRiskScans} critical • Avg score: ${stats.averageRiskScore}/100`}
          icon={<AlertOctagon className="w-5 h-5" />}
          accent="red"
        />
      </div>

      {/* Charts & Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RiskOverviewChart distribution={distributionQuery.data} />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Tag className="w-4 h-4 text-cyan-400" />
              <h3 className="text-base font-bold text-slate-100">
                Frequently Detected Categories
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Most common sensitive data classes across your scans
            </p>

            {stats.topCategories.length === 0 ? (
              <p className="text-xs text-slate-500 py-10 text-center">
                No sensitive data categories detected yet.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.topCategories.slice(0, 6).map((cat) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800"
                  >
                    <span className="text-xs font-medium text-slate-200 capitalize">
                      {cat.label}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      {cat.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Scans & Security Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentScans scans={recentScansQuery.data || []} />
        </div>
        <div>
          <SecurityAlerts alerts={alertsQuery.data || []} />
        </div>
      </div>
    </div>
  );
};

