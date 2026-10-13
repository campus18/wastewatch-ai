import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, setToken, getToken, setUnauthorizedHandler } from './api';
import type { User } from './types';

interface AuthCtx {
  user: User | null; 
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
}
const Ctx = createContext<AuthCtx | null>(null);
export const useAuth = () => { const c = useContext(Ctx); if (!c) throw new Error('useAuth outside provider'); return c; };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!getToken());

  const logout = useCallback(() => { setToken(null); setUser(null); }, []);
  useEffect(() => { setUnauthorizedHandler(logout); return () => setUnauthorizedHandler(null); }, [logout]);
  useEffect(() => {
    if (!getToken()) return;
    api<{ user: User }>('/auth/me').then((r) => setUser(r.user)).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    user, loading, logout,
    login: async (email, password) => { 
      const r = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { email, password } }); 
      setToken(r.token); 
      setUser(r.user); 
    },
    register: async (name, email, password, role = 'citizen') => { 
      const r = await api<{ token: string; user: User }>('/auth/register', { method: 'POST', body: { name, email, password, role } }); 
      setToken(r.token); 
      setUser(r.user); 
    },
  }), [user, loading, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}