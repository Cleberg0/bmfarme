/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import api from '../api/client';

type AuthUser = {
  id: number | string;
  name: string;
  email: string;
  role: string;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): AuthUser | null {
  const rawUser = localStorage.getItem('bmfarm.user');
  if (!rawUser) {
    return null;
  }
  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    localStorage.removeItem('bmfarm.user');
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('bmfarm.token'));
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    const nextToken = data.token;
    const nextUser = data.user;
    localStorage.setItem('bmfarm.token', nextToken);
    localStorage.setItem('bmfarm.user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, role: string) => {
    await api.post('/auth/register', { email, password, name, role });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('bmfarm.token');
    localStorage.removeItem('bmfarm.user');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    token,
    user,
    isAuthenticated: Boolean(token),
    login,
    register,
    logout,
  }), [login, logout, token, user, register]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}