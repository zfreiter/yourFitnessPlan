import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/context/authContext";

// Capture this predicate before an await. It becomes false on session changes
// (including a same-account re-login), or provider unmount.
export function useSessionLifetime() {
  const { sessionKey, user } = useAuth();
  const lifetime = useMemo(() => ({}), [sessionKey, user?.id]);
  const active = useRef<object | null>(lifetime);
  active.current = lifetime;
  useEffect(() => {
    active.current = lifetime;
    return () => { if (active.current === lifetime) active.current = null; };
  }, [lifetime]);
  return useCallback(() => active.current === lifetime, [lifetime]);
}
