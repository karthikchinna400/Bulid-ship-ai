import axios from 'axios';
import { supabase, isPlaceholderSupabaseConfig } from '../lib/supabase';
import { handleClientFallbackRequest } from './clientFallbackEngine';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

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

// Automatically fall back to client-side PrivacyGuard AI engine if the backend server is unreachable
// (e.g. when testing a Vercel deployment before Render backend URL is linked, or during Render cold start)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (
      axios.isAxiosError(error) &&
      (!error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') &&
      error.config
    ) {
      return handleClientFallbackRequest(error.config);
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
