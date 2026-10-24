/**
 * Authentication state machine for MONSSIF MONEY OS.
 *
 * Modes
 *  - `unconfigured`  : no Supabase env vars → a setup screen is shown. The app
 *                      NEVER pretends authentication works here. The only
 *                      alternative is an explicitly entered **local demo mode**
 *                      (browser-only storage, no account, no sync).
 *  - `anonymous`     : Supabase configured, no session → login / register /
 *                      forgot-password screens.
 *  - `authenticated` : Supabase session present → protected app.
 *  - `local-demo`    : the user explicitly chose browser-only demo storage.
 *
 * Passwords are never stored or hashed by this app — they are passed straight
 * to Supabase Auth (`signInWithPassword` / `signUp` / `updateUser`), which
 * handles hashing, salting and token storage.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../data/supabaseClient';
import { isSupabaseConfigured } from '../data/repository';

export type AuthStatus =
  | 'loading'
  | 'unconfigured'
  | 'local-demo'
  | 'anonymous'
  | 'authenticated';

export interface AuthUser {
  id: string;
  email: string;
}

export interface SignUpResult {
  /** True when the project requires email confirmation before first sign-in. */
  needsEmailConfirmation: boolean;
}

export interface AuthContextValue {
  status: AuthStatus;
  supabaseConfigured: boolean;
  user: AuthUser | null;
  /** A password-recovery link was opened — show the "choose new password" form. */
  pendingPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  enterLocalDemo: () => void;
  exitLocalDemo: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LOCAL_DEMO_KEY = 'monssif-money-os:local-demo';

function toAuthUser(user: User): AuthUser {
  return { id: user.id, email: user.email ?? '' };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pendingPasswordRecovery, setPendingPasswordRecovery] = useState(false);
  const recoverySeen = useRef(false);

  // ── Initial session resolution ────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      const demo =
        typeof localStorage !== 'undefined' && localStorage.getItem(LOCAL_DEMO_KEY) === '1';
      setStatus(demo ? 'local-demo' : 'unconfigured');
      return;
    }

    const supabase = getSupabaseClient();
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session?.user) {
        setUser(toAuthUser(data.session.user));
        setStatus('authenticated');
      } else {
        setStatus('anonymous');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session: Session | null) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY') {
        recoverySeen.current = true;
        setPendingPasswordRecovery(true);
      }
      if (session?.user) {
        setUser(toAuthUser(session.user));
        setStatus('authenticated');
      } else {
        setUser(null);
        setStatus((s) => (s === 'local-demo' ? s : 'anonymous'));
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // A recovery link can also land without the event firing first — detect the
  // fragment before Supabase cleans it up.
  useEffect(() => {
    const check = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash ?? '';
      if (hash.includes('type=recovery') && !recoverySeen.current) {
        recoverySeen.current = true;
        setPendingPasswordRecovery(true);
      }
    };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(humanizeAuthError(error.message));
    if (data.user) {
      setUser(toAuthUser(data.user));
      setStatus('authenticated');
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<SignUpResult> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(humanizeAuthError(error.message));
    if (data.session?.user) {
      setUser(toAuthUser(data.session.user));
      setStatus('authenticated');
      return { needsEmailConfirmation: false };
    }
    return { needsEmailConfirmation: true };
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(humanizeAuthError(error.message));
    }
    setUser(null);
    setPendingPasswordRecovery(false);
    setStatus(isSupabaseConfigured() ? 'anonymous' : 'unconfigured');
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const supabase = getSupabaseClient();
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw new Error(humanizeAuthError(error.message));
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(humanizeAuthError(error.message));
    setPendingPasswordRecovery(false);
  }, []);

  const enterLocalDemo = useCallback(() => {
    if (isSupabaseConfigured()) return; // never fall back to local while cloud is configured
    localStorage.setItem(LOCAL_DEMO_KEY, '1');
    setStatus('local-demo');
  }, []);

  const exitLocalDemo = useCallback(() => {
    localStorage.removeItem(LOCAL_DEMO_KEY);
    setStatus(isSupabaseConfigured() ? 'anonymous' : 'unconfigured');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      supabaseConfigured: isSupabaseConfigured(),
      user,
      pendingPasswordRecovery,
      clearPasswordRecovery: () => setPendingPasswordRecovery(false),
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      enterLocalDemo,
      exitLocalDemo,
    }),
    [status, user, pendingPasswordRecovery, signIn, signUp, signOut, resetPassword, updatePassword, enterLocalDemo, exitLocalDemo],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Map raw Supabase auth errors to short, human language. */
export function humanizeAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Wrong email or password. Try again.';
  if (m.includes('email not confirmed')) return 'Confirm your email first — check your inbox.';
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'An account with this email already exists. Sign in instead.';
  if (m.includes('password should be at least'))
    return 'Password is too short — use at least 8 characters.';
  if (m.includes('rate limit') || m.includes('too many requests'))
    return 'Too many attempts. Wait a moment and try again.';
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Network problem — check your connection and try again.';
  return message;
}
