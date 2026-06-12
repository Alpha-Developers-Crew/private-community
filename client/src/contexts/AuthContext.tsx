import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import api, { setAuthToken } from '../lib/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessGranted: boolean;
  checkAccess: () => Promise<boolean>;
  verifyAccess: (code: string) => Promise<boolean>;
  login: (login: string, password: string) => Promise<void>;
  signup: (name: string, username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setAuthToken(session.access_token);
        fetchUser(session.access_token);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        setAuthToken(session.access_token);
        fetchUser(session.access_token);
      } else {
        setAuthToken(null);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUser = async (token?: string) => {
    try {
      const res = await api.get('/auth/me', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setUser(res.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const checkAccess = async (): Promise<boolean> => {
    try {
      const res = await api.get('/access/check');
      if (!res.data.needCode) {
        setAccessGranted(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const verifyAccess = async (code: string): Promise<boolean> => {
    try {
      await api.post('/access/verify', { code });
      setAccessGranted(true);
      return true;
    } catch {
      return false;
    }
  };

  const login = async (login: string, password: string) => {
    let email = login;

    if (!login.includes('@')) {
      const res = await api.get('/users');
      const found = res.data.users?.find((u: any) => u.username === login);
      if (found) email = found.email;
      else throw new Error('User not found');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);

    if (data.session?.access_token) {
      setAuthToken(data.session.access_token);
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      setAccessGranted(true);
    }
  };

  const signup = async (name: string, username: string, email: string, password: string) => {
    const res = await api.post('/auth/signup', { name, username, email, password });

    if (res.data.user?.is_approved) {
      const { data } = await supabase.auth.signInWithPassword({ email, password });
      if (data.session?.access_token) {
        setAuthToken(data.session.access_token);
        setUser(res.data.user);
        setAccessGranted(true);
      }
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    try { await api.post('/auth/logout'); } catch {}
    setAuthToken(null);
    setUser(null);
    setAccessGranted(false);
  };

  const refreshUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAuthToken(session.access_token);
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      }
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, accessGranted,
      checkAccess, verifyAccess, login, signup, logout, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
