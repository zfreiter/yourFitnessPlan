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
  const { user } = useAuth();
  const { insertWorkout } = useWorkout();

  const [baseline, setBaseline] = useState<Workout>(workout);
  const appliedWorkout = useRef(workout);

  // Watch the entire form
  const currentWorkout = useWatch({
    control,
  }) as Workout;

  const changes = useMemo(
    () => buildWorkoutChanges(baseline, currentWorkout),
    [baseline, currentWorkout],
  );

  const isUpdateNeeded = hasWorkoutChanges(changes);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  const saveWorkout = useCallback(async () => {
    const currentWorkout = JSON.parse(JSON.stringify(getValues())) as Workout;

    const changes = buildWorkoutChanges(baseline, currentWorkout);

    if (!hasWorkoutChanges(changes)) {
      return { success: true };
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      if (!user?.id || currentWorkout.user_id !== user.id) {
        throw new Error("Workout does not belong to the authenticated user");
      }
      const result = await workoutService.updateWorkout(
        user.id,
        currentWorkout.id,
        changes,
      );

      if (!result.success) {
        throw new Error(result.error ?? "Failed to update workout");
      }

      /*
       * Use the freshly loaded workout as the new source
       * of truth if the service returns it.
       */
      const savedWorkout = result.data ?? await workoutService.getWorkoutById(user.id, currentWorkout.id);
      if (!savedWorkout) throw new Error("Workout saved but could not be reloaded from SQLite");
      insertWorkout(savedWorkout);

      const editedDuringSave = hasWorkoutChanges(buildWorkoutChanges(currentWorkout, getValues()));
      setBaseline(savedWorkout);
      reset(savedWorkout, editedDuringSave ? { keepValues: true } : undefined);

      return { success: true };
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error("Failed to update workout");

      setSaveError(normalizedError);

      return { success: false };
    } finally {
      setIsSaving(false);
    }
  }, [baseline, getValues, reset, user?.id, insertWorkout]);

  useEffect(() => {
    // Adopt committed external changes only while the session has no unsaved edits.
    if (appliedWorkout.current === workout) return;
    if (workout.id === baseline.id && isUpdateNeeded) return;
    appliedWorkout.current = workout;
    if (workout.id !== baseline.id || hasWorkoutChanges(buildWorkoutChanges(baseline, workout))) {
      setBaseline(workout);
      reset(workout);
    }
  }, [workout, baseline, isUpdateNeeded, reset]);

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
      {children}
    </WorkoutSessionContext.Provider>
  );
};
