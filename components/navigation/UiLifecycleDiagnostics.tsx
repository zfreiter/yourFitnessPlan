import { useEffect } from "react";
import { useSegments, useRootNavigationState } from "expo-router";
import { useAuth } from "@/context/authContext";
import { useSync } from "@/context/SyncContext";
import { useProfile } from "@/context/profileContext";
import { useWorkout } from "@/context/workoutContext";
import { traceUi } from "@/utils/uiDiagnostics";

function Diagnostics() {
  const { sessionKey, user, isAuthInitialized } = useAuth();
  const { isSyncing } = useSync();
  const { isLoading } = useProfile();
  const { workouts } = useWorkout();
  const segments = useSegments().join("/"); // Route templates, not URL parameters.
  const navigation = useRootNavigationState();
  useEffect(() => {
    traceUi("navigation", "state", { destination: segments, ready: !!navigation?.key, session: sessionKey });
  }, [segments, navigation?.key, navigation?.index, sessionKey]);
  useEffect(() => {
    traceUi("providers", "state", { session: sessionKey, ready: isAuthInitialized && !!user, syncBusy: isSyncing, profileLoading: isLoading, workoutCount: workouts.length });
  }, [sessionKey, user?.id, isAuthInitialized, isSyncing, isLoading, workouts.length]);
  useEffect(() => {
    traceUi("session-tree", "mounted", { session: sessionKey });
    const frame = requestAnimationFrame(() => traceUi("session-tree", "js-frame", { session: sessionKey }));
    return () => { cancelAnimationFrame(frame); traceUi("session-tree", "unmounted", { session: sessionKey }); };
  }, []);
  return null;
}
export function UiLifecycleDiagnostics() {
  return process.env.NODE_ENV !== "production" ? <Diagnostics /> : null;
}
