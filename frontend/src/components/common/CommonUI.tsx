import React from 'react';
import {
  Loader2,
  AlertOctagon,
  FolderOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const LoadingSpinner: React.FC<{ label?: string; className?: string }> = ({
  label = 'Loading...',
  className,
}) => (
  <div className={cn('flex flex-col items-center justify-center py-12 gap-3', className)}>
    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
    {label && <p className="text-sm text-slate-400 font-medium">{label}</p>}
  </div>
);

export const SkeletonLoader: React.FC<{ rows?: number; className?: string }> = ({
  rows = 3,
  className,
}) => (
  <div className={cn('space-y-3', className)}>
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="h-20 w-full rounded-xl bg-slate-900/80 border border-slate-800/80 animate-pulse"
      />
    ))}
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}> = ({ title, description, actionLabel, onAction, icon }) => (
  <div className="flex flex-col items-center justify-center text-center p-10 rounded-2xl border border-slate-800/80 bg-slate-900/40">
    <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-cyan-400 mb-4">
      {icon || <FolderOpen className="w-6 h-6" />}
    </div>
    <h3 className="text-base font-semibold text-slate-100">{title}</h3>
    <p className="text-sm text-slate-400 max-w-md mt-1.5">{description}</p>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="mt-5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Unable to load data', message, onRetry }) => (
  <div className="flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-red-500/30 bg-red-950/15">
    <AlertOctagon className="w-10 h-10 text-red-400 mb-3" />
    <h3 className="text-base font-semibold text-red-200">{title}</h3>
    <p className="text-sm text-red-300/80 max-w-md mt-1">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-4 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-sm font-medium transition-colors cursor-pointer"
      >
        Try Again
      </button>
    )}
  </div>
);

export const ConfirmationDialog: React.FC<{
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">{description}</p>
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer',
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
            )}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const SearchInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Search files...', className }) => (
  <div className={cn('relative', className)}>
    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
    />
  </div>
);

export const FilterDropdown: React.FC<{
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (val: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div className="flex items-center gap-2">
    <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/60 cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export const Pagination: React.FC<{
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}> = ({ page, limit, total, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 text-sm text-slate-400">
      <span>
        Page <strong className="text-slate-200">{page}</strong> of{' '}
        <strong className="text-slate-200">{totalPages}</strong> ({total} total records)
      </span>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 cursor-pointer"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-200 cursor-pointer"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

