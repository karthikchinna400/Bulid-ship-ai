import React from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import {
  ArrowRight,
  Bell,
  FileText,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { RiskDistributionData, ScanItem, SecurityAlert } from '../../types';
import { cn, formatBytes, formatDateTime } from '../../lib/utils';
import { RiskLevelBadge } from '../findings/ResultsComponents';

export const StatsCard: React.FC<{
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  accent?: 'cyan' | 'emerald' | 'amber' | 'red';
}> = ({ title, value, subtitle, icon, accent = 'cyan' }) => {
  const accentMap = {
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    red: 'text-red-400 bg-red-500/10 border-red-500/30',
  };

  return (
    <div className="rounded-2xl border border-slate-800/90 bg-slate-900/50 p-5 flex items-start justify-between gap-4 hover:border-slate-700/80 transition-colors">
      <div>
        <p className="text-xs font-medium text-slate-400">{title}</p>
        <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5">{value}</p>
        <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>
      </div>
      <div className={cn('p-3 rounded-xl border shrink-0', accentMap[accent])}>{icon}</div>
    </div>
  );
};

export const RiskOverviewChart: React.FC<{
  distribution?: RiskDistributionData;
}> = ({ distribution }) => {
  const data = distribution?.riskLevels || [
    { name: 'Low', level: 'low', count: 0, fill: '#10B981' },
    { name: 'Moderate', level: 'moderate', count: 0, fill: '#F59E0B' },
    { name: 'High', level: 'high', count: 0, fill: '#F97316' },
    { name: 'Critical', level: 'critical', count: 0, fill: '#EF4444' },
  ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-100">Privacy Risk Distribution</h3>
        <p className="text-xs text-slate-400">
          Breakdown of scanned documents by deterministic risk classification
        </p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(15, 23, 42, 0.5)' }}
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#1e293b',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#f8fafc',
              }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {data.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const RecentScans: React.FC<{ scans: ScanItem[] }> = ({ scans }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-base font-bold text-slate-100">Recent Scanning Activity</h3>
        <p className="text-xs text-slate-400">Latest documents analyzed for data exposure</p>
      </div>
      <Link
        to="/history"
        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
      >
        View All <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>

    {scans.length === 0 ? (
      <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl">
        <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-300">No scans recorded yet</p>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Upload a PDF, image, DOCX, or TXT document to detect sensitive personal data.
        </p>
        <Link
          to="/scan"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs"
        >
          <ScanLine className="w-3.5 h-3.5" /> Start First Privacy Scan
        </Link>
      </div>
    ) : (
      <div className="space-y-2.5">
        {scans.map((scan) => (
          <div
            key={scan.id}
            className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/50 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  to={`/scan/${scan.id}`}
                  className="text-sm font-semibold text-slate-100 hover:text-cyan-400 truncate"
                >
                  {scan.original_filename}
                </Link>
                {scan.redaction_status === 'completed' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    Protected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatDateTime(scan.created_at)} • {formatBytes(scan.file_size)} •{' '}
                <strong>{scan.total_findings}</strong> finding(s)
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <RiskLevelBadge level={scan.risk_level} size="sm" />
              <Link
                to={`/scan/${scan.id}`}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
              >
                Inspect
              </Link>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export const SecurityAlerts: React.FC<{ alerts: SecurityAlert[] }> = ({ alerts }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-amber-400" />
        <h3 className="text-base font-bold text-slate-100">Security & Exposure Alerts</h3>
      </div>
      <Link to="/alerts" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300">
        Manage Alerts
      </Link>
    </div>

    {alerts.length === 0 ? (
      <div className="p-6 text-center rounded-xl border border-slate-800/60 bg-slate-950/40">
        <ShieldCheck className="w-7 h-7 text-emerald-400 mx-auto mb-1.5" />
        <p className="text-xs text-slate-300 font-medium">No active critical alerts</p>
      </div>
    ) : (
      <div className="space-y-2.5">
        {alerts.slice(0, 4).map((alert) => (
          <div
            key={alert.id}
            className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-start gap-3"
          >
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-100 truncate">{alert.title}</p>
                <RiskLevelBadge level={alert.severity} size="sm" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{alert.message}</p>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export const QuickScanCard: React.FC = () => (
  <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-900 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
    <div>
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
        Preventive Privacy Shield
      </span>
      <h2 className="text-lg font-bold text-white mt-2">
        Inspect Documents Before Sharing Externally
      </h2>
      <p className="text-xs text-slate-300 mt-1 max-w-xl">
        Automatically detect Aadhaar, PAN, payment cards, bank details, API secrets, and personal
        records—then permanently redact them in seconds.
      </p>
    </div>
    <Link
      to="/scan"
      className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2 shrink-0 shadow-lg shadow-cyan-500/20 transition-colors"
    >
      <ScanLine className="w-4 h-4" />
      Start New Privacy Scan
    </Link>
  </div>
);

