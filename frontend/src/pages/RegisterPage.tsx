import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, User, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { registerFormSchema, RegisterFormValues } from '../schemas';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { extractApiError } from '../services/api';

export const RegisterForm: React.FC = () => {
  const { register: registerUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await registerUser(values.fullName, values.email, values.password);
      showToast({
        type: 'success',
        title: 'Account created successfully',
        message: 'Your isolated privacy workspace is ready.',
      });
      navigate('/dashboard');
    } catch (err) {
      setServerError(extractApiError(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError && (
        <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 font-medium">
          {serverError}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
        <div className="relative">
          <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            {...register('fullName')}
            placeholder="Aarav Mehta"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        {errors.fullName && (
          <p className="text-xs text-red-400 mt-1">{errors.fullName.message}</p>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          Email Address
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Password (min 8 chars)
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              {...register('password')}
              placeholder="••••••••"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          {errors.password && (
            <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              {...register('confirmPassword')}
              placeholder="••••••••"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            {...register('acceptTerms')}
            className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
          />
          <span className="leading-relaxed">
            I accept the Terms of Service and acknowledge that automated privacy detection is an
            advisory aid and all documents should be reviewed before external sharing.
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="text-xs text-red-400 mt-1">{errors.acceptTerms.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <span>Create Protected Account</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};

export const RegisterPage: React.FC = () => (
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
      <h1 className="mt-5 text-2xl font-extrabold text-white">Create your account</h1>
      <p className="mt-1.5 text-xs text-slate-400">
        Start scanning documents and redacting sensitive information with Row-Level Security
      </p>
    </div>

    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-2xl">
        <RegisterForm />
        <p className="mt-6 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  </div>
);

