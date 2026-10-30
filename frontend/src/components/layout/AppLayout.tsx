import React, { useState } from 'react';
import { Link, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  ScanLine,
  History,
  Bot,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/CommonUI';
import { cn, MANDATORY_DISCLAIMER } from '../../lib/utils';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner label="Verifying secure session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export const Navbar: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-white">PrivacyGuard</span>
            <span className="text-cyan-400 font-bold text-lg ml-1">AI</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
          <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">
            How It Works
          </a>
          <a href="#features" className="hover:text-cyan-400 transition-colors">
            Capabilities
          </a>
          <a href="#architecture" className="hover:text-cyan-400 transition-colors">
            Zero-Trust Architecture
          </a>
          <a href="#faq" className="hover:text-cyan-400 transition-colors">
            FAQ
          </a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors"
            >
              Open Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-900 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors shadow-lg shadow-cyan-500/15"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="md:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-900"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950 px-4 pt-3 pb-5 space-y-3">
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm text-slate-300"
          >
            How It Works
          </a>
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm text-slate-300"
          >
            Capabilities
          </a>
          <a
            href="#architecture"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm text-slate-300"
          >
            Security Architecture
          </a>
          <div className="pt-2 flex flex-col gap-2">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="w-full text-center py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-semibold text-sm"
              >
                Open Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="w-full text-center py-2.5 rounded-xl border border-slate-800 text-slate-200 text-sm font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="w-full text-center py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-semibold text-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export const Footer: React.FC = () => (
  <footer className="border-t border-slate-800/80 bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <span className="font-bold text-slate-100">PrivacyGuard AI</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            Detect Before You Expose
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-2 max-w-2xl leading-relaxed">
          {MANDATORY_DISCLAIMER}
        </p>
      </div>
      <div className="text-xs text-slate-500">
        © {new Date().getFullYear()} PrivacyGuard AI. Privacy-First Digital Trust Protection System.
      </div>
    </div>
  </footer>
);

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/scan', label: 'Upload & Scan', icon: ScanLine },
  { to: '/history', label: 'Scan History', icon: History },
  { to: '/assistant', label: 'Privacy Assistant', icon: Bot },
  { to: '/alerts', label: 'Security Alerts', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-slate-800/80 bg-slate-950 z-30">
      <div className="h-16 px-6 flex items-center gap-2.5 border-b border-slate-800/80">
        <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <span className="font-bold text-base text-white">PrivacyGuard</span>
          <span className="font-bold text-base text-cyan-400 ml-1">AI</span>
        </div>
      </div>

      <div className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Protection Suite
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/70'
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <div className="pt-6 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Account & Trust
        </div>
        <NavLink
          to="/settings/profile"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all',
              isActive ? 'text-cyan-300 bg-slate-900' : 'text-slate-400 hover:text-slate-200'
            )
          }
        >
          <User className="w-3.5 h-3.5" />
          Profile Settings
        </NavLink>
        <NavLink
          to="/settings/privacy"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all',
              isActive ? 'text-cyan-300 bg-slate-900' : 'text-slate-400 hover:text-slate-200'
            )
          }
        >
          <Lock className="w-3.5 h-3.5" />
          Data & Retention Policy
        </NavLink>
      </div>

      <div className="p-4 border-t border-slate-800/80 bg-slate-900/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-sm">
            {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-100 truncate">
              {user?.full_name || 'Privacy User'}
            </p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-red-950/30 hover:border-red-500/30 hover:text-red-300 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export const MobileNavigation: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-72 max-w-xs bg-slate-950 border-r border-slate-800 flex flex-col z-10">
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-white">PrivacyGuard AI</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium',
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-100'
                  )
                }
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            );
          })}
        </div>
        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-400 truncate mb-2">{user?.email}</p>
          <button
            onClick={async () => {
              await logout();
              onClose();
              navigate('/login');
            }}
            className="w-full py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-red-300 font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export const Header: React.FC<{ onOpenMobileNav: () => void }> = ({ onOpenMobileNav }) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-900"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Hybrid Detection Engine Active (Deterministic + Gemini AI)</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to="/scan"
          className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs sm:text-sm transition-colors flex items-center gap-1.5"
        >
          <ScanLine className="w-4 h-4" />
          <span>New Privacy Scan</span>
        </Link>
        <Link
          to="/alerts"
          className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300"
          title="Security Alerts"
        >
          <Bell className="w-4 h-4" />
        </Link>
        <Link
          to="/settings/profile"
          className="hidden sm:flex items-center gap-2 pl-2 text-xs text-slate-300 hover:text-white"
        >
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-300 font-semibold">
            {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
          </div>
        </Link>
      </div>
    </header>
  );
};

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Sidebar />
      <MobileNavigation isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen">
        <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
        <footer className="px-4 sm:px-6 lg:px-8 py-4 border-t border-slate-900 text-[11px] text-slate-500 text-center">
          {MANDATORY_DISCLAIMER}
        </footer>
      </div>
    </div>
  );
};

