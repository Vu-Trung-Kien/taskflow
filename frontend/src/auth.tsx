import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, setAccessToken } from './api';
import type { User } from './types';

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  sessionError: string;
  signIn(user: User, accessToken: string): void;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState('');

  useEffect(() => {
    let active = true;
    void authApi.refresh()
      .then((session) => {
        if (active && session) {
          setAccessToken(session.accessToken);
          setUser(session.user);
        }
      })
      .catch((error: unknown) => {
        setSessionError(error instanceof Error ? error.message : 'Không thể khôi phục phiên làm việc.');
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    ready,
    sessionError,
    signIn(nextUser, token) {
      setAccessToken(token);
      setUser(nextUser);
      setSessionError('');
    },
    async signOut() {
      await authApi.logout();
      setAccessToken(null);
      setUser(null);
    },
  }), [ready, sessionError, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
