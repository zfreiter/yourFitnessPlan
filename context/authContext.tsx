import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import Toast from "react-native-toast-message";
import { supabase } from "@/lib/supabaseClient";
import { syncService } from "@/services/syncService";
import { ProfileInterface } from "@/types/interfaces/types";
import { traceAuth } from "@/utils/authDiagnostics";

export interface AuthContextType {
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  isLoading: boolean;
  user: ProfileInterface | null;
  isSynced: boolean;
  isAuthInitialized: boolean;
  error: string | null;
  sessionKey: number;
}
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function useAuth(): AuthContextType {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be wrapped in a <AuthProvider />");
  return value;
}

function SessionScope({ children, userId, sessionKey }: { children: ReactNode; userId: string | null; sessionKey: number }) {
  useEffect(() => {
    traceAuth("user-providers-initialize", { userId });
    return () => traceAuth("user-providers-cleanup", { userId });
  }, [sessionKey]);
  return <>{children}</>;
}

// Session effects reset user data in place. Never key the navigator or gesture
// root: remounting them can leave native screens attached to stale navigation.
export function AuthSessionScope({ children }: { children: ReactNode }) {
  const { sessionKey, user } = useAuth();
  return <SessionScope sessionKey={sessionKey} userId={user?.id ?? null}>{children}</SessionScope>;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<ProfileInterface | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState(0);
  const owner = useRef<string | null>(null);
  const revision = useRef(0);
  const loginAttempt = useRef(0);
  const mounted = useRef(true);

  // This must stay synchronous: Supabase invokes subscribers while holding its
  // auth lock. Profile hydration belongs to the user-scoped providers below.
  const publishSession = (session: Session | null) => {
    const nextOwner = session?.user.id ?? null;
    syncService.setAuthenticatedUser(nextOwner);
    if (owner.current !== nextOwner) {
      if (owner.current) syncService.invalidateUserSync(owner.current);
      if (nextOwner === null) loginAttempt.current++;
      owner.current = nextOwner;
      revision.current++;
      setScope(value => value + 1);
      traceAuth("user-changed", { userId: nextOwner });
    }
    const authUser = session?.user;
    setUser(authUser ? {
      id: authUser.id,
      full_name: authUser.user_metadata?.full_name ?? "",
      created_at: authUser.created_at,
      updated_at: authUser.updated_at ?? authUser.created_at,
    } : null);
    setIsAuthInitialized(true);
    setIsLoading(false);
    setError(null);
  };

  useEffect(() => {
    mounted.current = true;
    traceAuth("provider-initialize");
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted.current) return;
      traceAuth("state-change", { decision: event, userId: session?.user.id ?? null });
      publishSession(session);
    });
    return () => {
      mounted.current = false;
      syncService.setAuthenticatedUser(null);
      revision.current++;
      loginAttempt.current++;
      if (owner.current) syncService.invalidateUserSync(owner.current);
      subscription.unsubscribe();
      traceAuth("provider-cleanup");
    };
  }, []);

  useEffect(() => {
    traceAuth("loading", { loading: isLoading, initialized: isAuthInitialized, userId: user?.id ?? null });
  }, [isLoading, isAuthInitialized, user?.id]);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    const requestRevision = revision.current;
    const attempt = ++loginAttempt.current;
    traceAuth("login-started");
    setError(null);
    setIsLoading(true);
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      if (!data.session) throw new Error("Sign in did not return a session");
      // SIGNED_IN normally publishes before this resolves. Do not republish a
      // response superseded by a later sign-out or another account's sign-in.
      if (!mounted.current || loginAttempt.current !== attempt) return false;
      if (revision.current === requestRevision) publishSession(data.session);
      const success = owner.current === data.session.user.id;
      traceAuth(success ? "login-completed" : "login-cancelled", { userId: owner.current });
      return success;
    } catch (err) {
      if (mounted.current && loginAttempt.current === attempt && revision.current === requestRevision) {
        setError(err instanceof Error ? err.message : "Unable to sign in");
      }
      traceAuth("login-failed");
      return false;
    } finally {
      if (mounted.current && loginAttempt.current === attempt) setIsLoading(false);
    }
  };

  const signOut = async () => {
    traceAuth("logout-started", { userId: owner.current });
    try {
      const requestRevision = revision.current;
      const { error: logoutError } = await supabase.auth.signOut();
      if (logoutError) throw logoutError;
      if (mounted.current && revision.current === requestRevision) publishSession(null);
      traceAuth("logout-completed");
    } catch (err) {
      Toast.show({ type: "error", text1: "Sign Out Failed", text2: err instanceof Error ? err.message : "Unable to sign out" });
      traceAuth("logout-failed");
    }
  };

  return <AuthContext.Provider value={{ signIn, signOut, user, isLoading, isAuthInitialized, isSynced: false, error, sessionKey: scope }}>
    {/* AuthSessionScope resets user data below the persistent app theme. */}
    {children}
  </AuthContext.Provider>;
};
