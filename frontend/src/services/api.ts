import axios from 'axios';
import { supabase, isPlaceholderSupabaseConfig } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const LOCAL_TOKEN_STORAGE_KEY = 'privacyguard_auth_token';
export const LOCAL_USER_STORAGE_KEY = 'privacyguard_auth_user';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
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

