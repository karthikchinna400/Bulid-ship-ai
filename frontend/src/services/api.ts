import axios from 'axios';
import { supabase, isPlaceholderSupabaseConfig } from '../lib/supabase';
import { handleClientFallbackRequest } from './clientFallbackEngine';

const normalizeApiBaseUrl = (rawUrl?: string): string => {
  const trimmed = (rawUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed) {
    return 'http://localhost:5000/api/v1';
  }
  if (trimmed.endsWith('/api/v1')) {
    return trimmed;
  }
  if (trimmed.endsWith('/api')) {
    return `${trimmed}/v1`;
  }
  return `${trimmed}/api/v1`;
};

const configuredBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export const LOCAL_TOKEN_STORAGE_KEY = 'privacyguard_auth_token';
export const LOCAL_USER_STORAGE_KEY = 'privacyguard_auth_user';

export const apiClient = axios.create({
  baseURL: configuredBaseUrl,
  timeout: 25000,
});

apiClient.interceptors.request.use(async (config) => {
  let token: string | null = localStorage.getItem(LOCAL_TOKEN_STORAGE_KEY);

  if (!token && !isPlaceholderSupabaseConfig) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      token = data.session.access_token;
    }
  }

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automatically fall back to client-side PrivacyGuard AI engine if the backend server is unreachable,
// cold-starting, or if VITE_API_BASE_URL points to an unmigrated/404 endpoint
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error) && error.config) {
      const status = error.response?.status;
      const errorCode = error.response?.data?.error?.code;
      const errorMessage = String(error.response?.data?.message || '');
      const hasLocalToken = Boolean(localStorage.getItem(LOCAL_TOKEN_STORAGE_KEY));

      const shouldFallback =
        !error.response ||
        error.code === 'ERR_NETWORK' ||
        error.code === 'ECONNABORTED' ||
        status === 404 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        (status === 401 && hasLocalToken) ||
        errorCode === 'NOT_FOUND' ||
        errorMessage.includes('Requested API endpoint does not exist');

      if (shouldFallback) {
        return handleClientFallbackRequest(error.config);
      }
    }
    return Promise.reject(error);
  }
);

export const extractApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.message ||
      'Unable to complete request. Please try again.'
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred.';
};
