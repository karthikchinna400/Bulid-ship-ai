import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { forgotPasswordSchema, ForgotPasswordValues } from '../schemas';
import { authService } from '../services/auth';
import { extractApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/common/CommonUI';

export const ForgotPasswordForm: React.FC = () => {
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setErrorMsg(null);
    try {
      const msg = await authService.resetPassword(values.email);
      setSubmittedMessage(msg);
    } catch (err) {
      setErrorMsg(extractApiError(err));
    }
  };

  if (submittedMessage) {
    return (
      <div className="text-center space-y-4 py-4">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
        <p className="text-sm text-slate-200 leading-relaxed">{submittedMessage}</p>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          Registered Email Address
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            {...register('email')}
            placeholder="you@organization.com"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        {errors.email && (
          <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
      >
        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Send Password Reset Link
      </button>
    </form>
  );
};

export const ForgotPasswordPage: React.FC = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
      <Link to="/" className="inline-flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-cyan-400" />
        </div>
        <span className="text-xl font-bold text-white">
          PrivacyGuard <span className="text-cyan-400">AI</span>
        </span>
      </Link>
      <h1 className="mt-5 text-2xl font-extrabold text-white">Reset your password</h1>
      <p className="mt-1.5 text-xs text-slate-400">
        Enter your email address to receive a password recovery link
      </p>
    </div>

    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-2xl">
        <ForgotPasswordForm />
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  </div>
);

export const AuthCallbackPage: React.FC = () => {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    refreshProfile().finally(() => {
      navigate('/dashboard', { replace: true });
    });
  }, [refreshProfile, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <LoadingSpinner label="Completing authentication handshake..." />
    </div>
  );
};

