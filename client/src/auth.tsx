import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, ApiError, setToken, getToken, setUnauthorizedHandler } from './api';
import type { User } from './types';

interface AuthCtx {
  user: User | null; 
  loading: boolean;
  restoreError: string | null;
  retrySession: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
}
const Ctx = createContext<AuthCtx | null>(null);
export const useAuth = () => { const c = useContext(Ctx); if (!c) throw new Error('useAuth outside provider'); return c; };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!getToken());
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const logout = useCallback(() => { setToken(null); setUser(null); setRestoreError(null); }, []);
  useEffect(() => { setUnauthorizedHandler(logout); return () => setUnauthorizedHandler(null); }, [logout]);
  const restoreSession = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setRestoreError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setRestoreError(null);
    try {
      const r = await api<{ user: User }>('/auth/me');
      setUser(r.user);
    } catch (err) {
      // Only discard a session when the API confirms it is invalid. A timeout,
      // cold start, or server error should not silently sign the user out.
      if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
        setToken(null);
        setUser(null);
      } else {
        setUser(null);
        setRestoreError('Your saved session could not be checked because the server is temporarily unavailable. Try again in a moment.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void restoreSession(); }, [restoreSession]);

  const value = useMemo<AuthCtx>(() => ({
    user, loading, restoreError, retrySession: restoreSession, logout,
    login: async (email, password) => { 
      const r = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { email, password } }); 
      setToken(r.token); 
      setUser(r.user); 
      setRestoreError(null);
    },
    register: async (name, email, password, role = 'citizen') => { 
      const r = await api<{ token: string; user: User }>('/auth/register', { method: 'POST', body: { name, email, password, role } }); 
      setToken(r.token); 
      setUser(r.user); 
      setRestoreError(null);
    },
  }), [user, loading, restoreError, restoreSession, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
