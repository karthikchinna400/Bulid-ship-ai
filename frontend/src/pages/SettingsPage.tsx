import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Lock,
  Trash2,
  Save,
  Loader2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiClient, extractApiError } from '../services/api';
import { UserSettings } from '../types';
import { ConfirmationDialog, LoadingSpinner } from '../components/common/CommonUI';

export const SettingsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, refreshProfile, logout } = useAuth();
  const { showToast } = useToast();

  const activeTab = location.pathname.includes('/privacy') ? 'privacy' : 'profile';

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [autoDeleteOriginal, setAutoDeleteOriginal] = useState(true);
  const [retainScanHistory, setRetainScanHistory] = useState(true);
  const [retainRedactedFiles, setRetainRedactedFiles] = useState(true);
  const [securityNotifications, setSecurityNotifications] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);

  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const res = await apiClient.get('/settings');
      return res.data.data.settings as UserSettings;
    },
  });

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user]);

  useEffect(() => {
    if (settingsQuery.data) {
      setAutoDeleteOriginal(settingsQuery.data.auto_delete_original);
      setRetainScanHistory(settingsQuery.data.retain_scan_history);
      setRetainRedactedFiles(settingsQuery.data.retain_redacted_files);
      setSecurityNotifications(settingsQuery.data.security_notifications);
    }
  }, [settingsQuery.data]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Full name must be at least 2 characters.',
      });
      return;
    }

    setIsSavingProfile(true);
    try {
      await apiClient.patch('/profile', {
        full_name: fullName.trim(),
        avatar_url: avatarUrl.trim() ? avatarUrl.trim() : null,
      });
      await refreshProfile();
      showToast({
        type: 'success',
        title: 'Profile updated successfully',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: extractApiError(err),
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePrivacySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await apiClient.patch('/settings', {
        auto_delete_original: autoDeleteOriginal,
        retain_scan_history: retainScanHistory,
        retain_redacted_files: retainRedactedFiles,
        security_notifications: securityNotifications,
      });
      await queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      showToast({
        type: 'success',
        title: 'Privacy & retention preferences saved',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Failed to save settings',
        message: extractApiError(err),
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handlePurgeScanHistory = async () => {
    setIsClearingHistory(true);
    try {
      const res = await apiClient.delete('/scans');
      await queryClient.invalidateQueries({ queryKey: ['scans-history'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-recent-scans'] });
      showToast({
        type: 'success',
        title: 'Scan history purged',
        message: res.data.message,
      });
      setConfirmClearHistory(false);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Failed to clear history',
        message: extractApiError(err),
      });
    } finally {
      setIsClearingHistory(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await apiClient.delete('/account');
      await logout();
      showToast({
        type: 'info',
        title: 'Account deleted permanently',
      });
      navigate('/');
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Account deletion failed',
        message: extractApiError(err),
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (settingsQuery.isLoading) {
    return <LoadingSpinner label="Loading user preferences..." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">
          Account & Privacy Retention Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your profile, configure automatic file deletion, and control data retention.
        </p>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <NavLink
          to="/settings/profile"
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'profile'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile & Account</span>
        </NavLink>

        <NavLink
          to="/settings/privacy"
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === 'privacy'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Data Retention & Privacy Controls</span>
        </NavLink>
      </div>

      {activeTab === 'profile' ? (
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-5"
        >
          <h2 className="text-base font-bold text-white">Profile Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Verified Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-sm text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Avatar URL (Optional)
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center gap-2 cursor-pointer"
            >
              {isSavingProfile ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Profile Changes
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={handleSavePrivacySettings}
          className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-5"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">
              Zero-Trust Data Retention & Notification Preferences
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                checked: autoDeleteOriginal,
                onChange: setAutoDeleteOriginal,
                title: 'Automatically delete original files after redaction',
                desc: 'Immediately removes the original unredacted file from the private storage bucket once a protected output is generated.',
              },
              {
                checked: retainScanHistory,
                onChange: setRetainScanHistory,
                title: 'Retain scan metadata & masked findings history',
                desc: 'Keeps scan risk scores, timestamps, and masked excerpts in your dashboard for historical auditing.',
              },
              {
                checked: retainRedactedFiles,
                onChange: setRetainRedactedFiles,
                title: 'Retain protected redacted outputs for re-download',
                desc: 'Stores sanitized output files in your private `privacy-redacted` bucket so you can download them later.',
              },
              {
                checked: securityNotifications,
                onChange: setSecurityNotifications,
                title: 'Enable real-time security & credential exposure alerts',
                desc: 'Generates in-app security alerts whenever critical PII, API keys, or multi-category exposures are detected.',
              },
            ].map((item) => (
              <label
                key={item.title}
                className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-950/60 cursor-pointer"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => item.onChange(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
                />
              </label>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center gap-2 cursor-pointer"
            >
              {isSavingSettings ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Privacy Preferences
            </button>
          </div>
        </form>
      )}

      {/* Danger Zone: Purge Scan History & Delete Account */}
      <div className="rounded-2xl border border-red-500/30 bg-red-950/10 p-6 space-y-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <h2 className="text-base font-bold">Data Purge & Account Deletion</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-red-500/20">
          <div>
            <p className="text-sm font-semibold text-slate-100">Delete Entire Scan History</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Permanently deletes all scan records, findings, and reports while keeping your
              account active.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmClearHistory(true)}
            className="px-4 py-2 rounded-xl border border-red-500/40 bg-red-500/15 hover:bg-red-500/25 text-red-200 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Delete Scan History
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-red-500/20">
          <div>
            <p className="text-sm font-semibold text-slate-100">Delete Account Permanently</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Erases your user profile, settings, scans, reports, assistant conversations, and
              storage files immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmDeleteAccount(true)}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Delete My Account
          </button>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={confirmClearHistory}
        title="Purge All Scan History?"
        description="This action will permanently remove all scan records, detected findings, and generated reports for your account. This cannot be undone."
        confirmLabel="Purge All History"
        isLoading={isClearingHistory}
        onConfirm={handlePurgeScanHistory}
        onCancel={() => setConfirmClearHistory(false)}
      />

      <ConfirmationDialog
        isOpen={confirmDeleteAccount}
        title="Permanently Delete Your Account?"
        description="All of your profile records, scan history, redacted files, and settings will be permanently wiped. This action is irreversible."
        confirmLabel="Delete Account Forever"
        isLoading={isDeletingAccount}
        onConfirm={handleDeleteAccount}
        onCancel={() => setConfirmDeleteAccount(false)}
      />
    </div>
  );
};

