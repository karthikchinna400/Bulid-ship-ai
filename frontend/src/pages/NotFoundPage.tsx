import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => (
  <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
    <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-5">
      <ShieldAlert className="w-8 h-8" />
    </div>
    <h1 className="text-3xl font-extrabold text-white">404 — Page Not Found</h1>
    <p className="text-sm text-slate-400 max-w-md mt-2">
      The requested route does not exist or has been moved.
    </p>
    <div className="mt-6 flex items-center gap-3">
      <Link
        to="/dashboard"
        className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Dashboard
      </Link>
      <Link
        to="/"
        className="px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm"
      >
        Home
      </Link>
    </div>
  </div>
);

