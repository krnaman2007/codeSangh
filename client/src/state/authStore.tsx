import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { authApi, type LoginInput, type RegisterInput } from '../api/auth.api';
import {
  refreshSessionToken,
  setAccessToken,
  setUnauthorizedHandler,
} from '../api/client';
import type { ApiUser } from '../api/types';
import { queryClient } from '../lib/queryClient';

export type AuthStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: ApiUser | null;
  sessionExpired: boolean;
  login: (input: LoginInput) => Promise<ApiUser>;
  register: (input: RegisterInput) => Promise<ApiUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<ApiUser | null>;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || 'DS';
}

export function sanitizeReturnUrl(raw: string | null | undefined): string {
  if (!raw) return '/dashboard';
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return '/dashboard';
  }
  if (trimmed === '/login' || trimmed === '/register') {
    return '/dashboard';
  }
  return trimmed;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('bootstrapping');
  const [user, setUser] = useState<ApiUser | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const handleSessionExpiry = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('unauthenticated');
    setSessionExpired(true);
    queryClient.clear();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleSessionExpiry);
    return () => setUnauthorizedHandler(null);
  }, [handleSessionExpiry]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function bootstrap() {
      const refreshed = await refreshSessionToken();
      if (cancelled) return;

      if (!refreshed?.accessToken) {
        setUser(null);
        setStatus('unauthenticated');
        return;
      }

      try {
        const meRes = await authApi.me(controller.signal);
        if (cancelled) return;
        setUser(meRes.user);
        setStatus('authenticated');
      } catch {
        if (cancelled) return;
        setUser(refreshed.user ?? null);
        setStatus(refreshed.user ? 'authenticated' : 'unauthenticated');
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const res = await authApi.login(input);
    setAccessToken(res.accessToken);
    setUser(res.user);
    setSessionExpired(false);
    setStatus('authenticated');
    return res.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await authApi.register(input);
    setAccessToken(res.accessToken);
    setUser(res.user);
    setSessionExpired(false);
    setStatus('authenticated');
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Clear local session state even if network logout fails
    } finally {
      setAccessToken(null);
      setUser(null);
      setSessionExpired(false);
      setStatus('unauthenticated');
      queryClient.clear();
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(res.user);
      setStatus('authenticated');
      return res.user;
    } catch {
      return null;
    }
  }, []);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        sessionExpired,
        login,
        register,
        logout,
        refreshUser,
        clearSessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
