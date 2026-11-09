import { useSessionLifetime } from "@/hooks/useSessionLifetime";
import { assertNoEmptyCircuits } from "@/utils/circuitValidation";
import { useWorkout } from "./workoutContext";
import {
  createContext,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { Workout } from "@/types/interfaces/types";
import { useAuth } from "@/context/authContext";
import { workoutService } from "@/services/workoutService";
import { Pressable, Text, View } from "react-native";
import {
  buildWorkoutChanges,
  hasWorkoutChanges,
} from "@/utils/workoutChangeUtils";

export interface WorkoutSessionContextType {
  saveWorkout: () => Promise<{ success: boolean }>;
  isSaving: boolean;
  isUpdateNeeded: boolean;
  saveError: Error | null;
}

export const WorkoutSessionContext = createContext<
  WorkoutSessionContextType | undefined
>(undefined);

export function useWorkoutSession(): WorkoutSessionContextType {
  const context = useContext(WorkoutSessionContext);

  if (!context) {
    throw new Error(
      "useWorkoutSession must be wrapped in a WorkoutSessionProvider",
    );
  }

  return context;
}

interface WorkoutSessionProviderProps {
  children: ReactNode;
  workout: Workout;
}

export const WorkoutSessionProvider = ({
  children,
  workout,
}: WorkoutSessionProviderProps) => {
  const { control, getValues, reset } = useFormContext<Workout>();
  const { user, sessionKey } = useAuth();
  const isCurrent = useSessionLifetime();
  const { insertWorkout, reportCommittedReloadFailure, pendingCommittedWorkouts } = useWorkout();

  const [baseline, setBaseline] = useState<Workout>(workout);
  const baselineRef = useRef(workout);
  const saving = useRef(false);
  const requiresReload = pendingCommittedWorkouts?.[workout.id];
  const pendingReload = useRef<{ submitted: Workout } | null>(requiresReload ? { submitted: requiresReload } : null);
  const [reloadError, setReloadError] = useState<string | null>(requiresReload ? "Workout saved. Reload before saving further edits." : null);
  const appliedWorkout = useRef(workout);

  // Watch the entire form
  const currentWorkout = useWatch({
    control,
  }) as Workout;

  const changes = useMemo(
    () => buildWorkoutChanges(baseline, currentWorkout),
    [baseline, currentWorkout],
  );

  const isUpdateNeeded = !reloadError && hasWorkoutChanges(changes);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  useEffect(() => {
    setIsSaving(false);
    setSaveError(null);
    saving.current = false;
    pendingReload.current = requiresReload ? { submitted: requiresReload } : null;
    if (requiresReload) reset(requiresReload);
    setReloadError(requiresReload ? "Workout saved. Reload before saving further edits." : null);
  }, [sessionKey, user?.id]);

  const adoptSavedWorkout = useCallback((saved: Workout, submitted: Workout) => {
    const editedDuringSave = hasWorkoutChanges(buildWorkoutChanges(submitted, getValues()));
    baselineRef.current = saved;
    setBaseline(saved);
    reset(saved, editedDuringSave ? { keepValues: true } : undefined);
    pendingReload.current = null;
    setReloadError(null);
  }, [getValues, reset]);

  const retryReload = useCallback(async () => {
    const pending = pendingReload.current;
    if (!isCurrent() || saving.current || !pending || pending.submitted.user_id !== user?.id) return;
    saving.current = true;
    setIsSaving(true);
    try {
      const saved = await workoutService.getWorkoutById(user.id, pending.submitted.id);
      if (!isCurrent() || pendingReload.current !== pending) return;
      if (!saved) throw new Error("Committed workout unavailable");
      adoptSavedWorkout(saved, pending.submitted);
      insertWorkout(saved);
    } catch {
      // Keep the write barrier until a complete, current snapshot is available.
      if (isCurrent()) setReloadError("Workout saved. Reload failed. Reload before saving further edits.");
    } finally {
      if (isCurrent()) { saving.current = false; setIsSaving(false); }
    }
  }, [adoptSavedWorkout, insertWorkout, isCurrent, user?.id]);

  const saveWorkout = useCallback(async () => {
    if (!isCurrent()) return { success: false };
    if (saving.current) return { success: false };
    if (pendingReload.current) return { success: true };
    const currentWorkout = JSON.parse(JSON.stringify(getValues())) as Workout;

    const changes = buildWorkoutChanges(baselineRef.current, currentWorkout);

    if (!hasWorkoutChanges(changes)) {
      return { success: true };
    }

    saving.current = true;
    setIsSaving(true);
    setSaveError(null);

    try {
      assertNoEmptyCircuits(currentWorkout.exercises, currentWorkout.circuit_rounds);
      if (!user?.id || currentWorkout.user_id !== user.id) {
        throw new Error("Workout does not belong to the authenticated user");
      }
      const result = await workoutService.updateWorkout(
        user.id,
        currentWorkout.id,
        changes,
      );

      if (!isCurrent()) return { success: false };
      if (!result.success) {
        throw new Error(result.error ?? "Failed to update workout");
      }

      /*
       * Use the freshly loaded workout as the new source
       * of truth if the service returns it.
       */
      let savedWorkout = result.data;
      // Compatibility for callers returning committed success without a snapshot.
      // A declared reload failure is never retried automatically here.
      if (!savedWorkout && !result.reloadError) {
        try { savedWorkout = await workoutService.getWorkoutById(user.id, currentWorkout.id); } catch { /* Saved; reload remains pending. */ }
      }
      if (!isCurrent()) return { success: false };
      if (savedWorkout) {
        adoptSavedWorkout(savedWorkout, currentWorkout);
        insertWorkout(savedWorkout);
      } else {
        pendingReload.current = { submitted: currentWorkout };
        setReloadError("Workout saved. Reload failed. Reload before saving further edits.");
        reportCommittedReloadFailure?.(currentWorkout);
      }

      return { success: true };
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error("Failed to update workout");

      if (isCurrent()) setSaveError(normalizedError);

      return { success: false };
    } finally {
      if (isCurrent()) { saving.current = false; setIsSaving(false); }
    }
  }, [getValues, user?.id, insertWorkout, isCurrent, adoptSavedWorkout, reportCommittedReloadFailure]);

  useEffect(() => {
    // Adopt committed external changes only while the session has no unsaved edits.
    if (appliedWorkout.current === workout) return;
    if (pendingReload.current && workout.id === pendingReload.current.submitted.id) {
      appliedWorkout.current = workout;
      adoptSavedWorkout(workout, pendingReload.current.submitted);
      return;
    }
    if (workout.id === baseline.id && isUpdateNeeded) return;
    appliedWorkout.current = workout;
    if (workout.id !== baseline.id || hasWorkoutChanges(buildWorkoutChanges(baseline, workout))) {
      setBaseline(workout);
      baselineRef.current = workout;
      reset(workout);
    }
  }, [workout, baseline, isUpdateNeeded, reset, adoptSavedWorkout]);

  const contextValue = useMemo<WorkoutSessionContextType>(
    () => ({
      saveWorkout,
      isSaving,
      isUpdateNeeded,
      saveError,
    }),
    [saveWorkout, isSaving, isUpdateNeeded, saveError],
  );

  return (
    <WorkoutSessionContext.Provider value={contextValue}>
      {reloadError && <View>
        <Text accessibilityRole="alert">{reloadError}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Reload saved workout" disabled={isSaving}
          onPress={retryReload} style={{ minHeight: 44, padding: 12, justifyContent: "center" }}>
          <Text>Reload saved workout</Text>
        </Pressable>
      </View>}
      {children}
    </WorkoutSessionContext.Provider>
  );
};
