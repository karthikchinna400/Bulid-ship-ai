import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RiskLevel, SensitiveCategory, SeverityLevel } from '../types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function formatCategoryLabel(category: SensitiveCategory | string): string {
  const map: Record<string, string> = {
    personal_identity: 'Personal Identity',
    government_identity: 'Government Identity',
    financial_information: 'Financial Information',
    authentication_credentials: 'Auth Credentials & Secrets',
    contact_information: 'Contact Information',
    location_information: 'Location & Residence',
    medical_information: 'Medical & Health Records',
    confidential_business_information: 'Business Confidential',
    other_sensitive_information: 'Other Sensitive Data',
  };
  return map[category] || category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function getRiskBadgeStyles(level?: RiskLevel | SeverityLevel | null): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (level) {
    case 'critical':
      return {
        bg: 'bg-red-500/15',
        text: 'text-red-400',
        border: 'border-red-500/30',
        label: 'Critical Risk',
      };
    case 'high':
      return {
        bg: 'bg-orange-500/15',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
        label: 'High Risk',
      };
    case 'moderate':
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-300',
        border: 'border-amber-500/30',
        label: 'Moderate Risk',
      };
    case 'low':
    default:
      return {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        label: 'Low Risk',
      };
  }
}

export const MANDATORY_DISCLAIMER =
  'PrivacyGuard AI helps identify potential sensitive information and reduce accidental data exposure. Automated detection may not identify every risk. Always review documents before sharing.';

