import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile } from '../types';
import { authService } from '../services/auth';
import { supabase, isPlaceholderSupabaseConfig } from '../lib/supabase';

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberSession?: boolean) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    try {
      const current = await authService.fetchCurrentUser();
      setUser(current);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();

    if (!isPlaceholderSupabaseConfig) {
      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          refreshProfile();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      });
      return () => {
        listener.subscription.unsubscribe();
      };
    }
  }, [refreshProfile]);

  const login = async (email: string, password: string, rememberSession = true) => {
    const res = await authService.login({ email, password, rememberSession });
    setUser(res.user);
  };

  const register = async (fullName: string, email: string, password: string) => {
    const res = await authService.register({ fullName, email, password });
    setUser(res.user);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
};

