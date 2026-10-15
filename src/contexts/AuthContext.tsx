import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthValue {
  session: Session | null;
  nickname: string;
  loading: boolean;
}

const AuthContext = createContext<AuthValue>({ session: null, nickname: '', loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const nickname =
    (session?.user.user_metadata?.nickname as string | undefined) ?? session?.user.email?.split('@')[0] ?? '';

  return <AuthContext.Provider value={{ session, nickname, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
