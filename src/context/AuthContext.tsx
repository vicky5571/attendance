'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginIntern, loginAdmin, fetchCurrentUser, logoutUser } from '@/lib/client-auth';
import type { AuthResponseUser, UserRole } from '@/types';

interface AuthContextType {
  user: AuthResponseUser | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginAsIntern: (internId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  loginAsAdmin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthResponseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const current = await fetchCurrentUser();
      setUser(current);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const loginAsIntern = async (internId: string, pin: string) => {
    try {
      const res = await loginIntern(internId, pin);
      setUser(res.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Login gagal' };
    }
  };

  const loginAsAdmin = async (email: string, password: string) => {
    try {
      const res = await loginAdmin(email, password);
      setUser(res.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Login gagal' };
    }
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const role = user?.role ?? null;
  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        isAuthenticated,
        loginAsIntern,
        loginAsAdmin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      role: null,
      isLoading: false,
      isAuthenticated: false,
      loginAsIntern: async () => ({ success: false, error: 'AuthProvider not initialized' }),
      loginAsAdmin: async () => ({ success: false, error: 'AuthProvider not initialized' }),
      logout: async () => {},
      refreshUser: async () => {},
    };
  }
  return context;
}
