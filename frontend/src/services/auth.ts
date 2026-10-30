import { supabase, isPlaceholderSupabaseConfig } from '../lib/supabase';
import {
  apiClient,
  LOCAL_TOKEN_STORAGE_KEY,
  LOCAL_USER_STORAGE_KEY,
} from './api';
import { UserProfile } from '../types';

export interface AuthSessionResult {
  user: UserProfile;
  accessToken: string;
}

export const authService = {
  async register(params: {
    fullName: string;
    email: string;
    password: string;
  }): Promise<AuthSessionResult> {
    const res = await apiClient.post('/auth/register', {
      fullName: params.fullName,
      email: params.email,
      password: params.password,
    });
    const { accessToken, user } = res.data.data;
    localStorage.setItem(LOCAL_TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(user));
    return { user, accessToken };
  },

  async login(params: {
    email: string;
    password: string;
    rememberSession?: boolean;
  }): Promise<AuthSessionResult> {
    const res = await apiClient.post('/auth/login', {
      email: params.email,
      password: params.password,
      rememberSession: params.rememberSession,
    });
    const { accessToken, user } = res.data.data;
    localStorage.setItem(LOCAL_TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(user));
    return { user, accessToken };
  },

  async resetPassword(email: string): Promise<string> {
    if (!isPlaceholderSupabaseConfig) {
      try {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback`,
        });
      } catch {
        // Ignore if SMTP not configured
      }
    }
    return `If an account exists for ${email}, password recovery instructions have been dispatched.`;
  },

  async logout(): Promise<void> {
    localStorage.removeItem(LOCAL_TOKEN_STORAGE_KEY);
    localStorage.removeItem(LOCAL_USER_STORAGE_KEY);
    if (!isPlaceholderSupabaseConfig) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore
      }
    }
  },

  async fetchCurrentUser(): Promise<UserProfile | null> {
    const localToken = localStorage.getItem(LOCAL_TOKEN_STORAGE_KEY);
    if (!localToken) {
      if (!isPlaceholderSupabaseConfig) {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.access_token) return null;
      } else {
        return null;
      }
    }

    try {
      const res = await apiClient.get('/auth/me');
      return res.data.data.user as UserProfile;
    } catch {
      localStorage.removeItem(LOCAL_TOKEN_STORAGE_KEY);
      localStorage.removeItem(LOCAL_USER_STORAGE_KEY);
      return null;
    }
  },
};
