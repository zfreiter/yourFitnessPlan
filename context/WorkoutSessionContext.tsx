import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";

import { Workout } from "@/types/interfaces/types";
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

  const { isDirty } = useFormState({
    control,
  });

  const oldWorkoutRef = useRef<Workout>(workout);

  // Watch the entire form
  const currentWorkout = useWatch({
    control,
  }) as Workout;

  const changes = useMemo(
    () => buildWorkoutChanges(oldWorkoutRef.current, currentWorkout),
    [currentWorkout],
  );

  const isUpdateNeeded = hasWorkoutChanges(changes);
  console.log("isUpdateNeeded:", isUpdateNeeded);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  const saveWorkout = useCallback(async () => {
    const currentWorkout = getValues();

    const changes = buildWorkoutChanges(oldWorkoutRef.current, currentWorkout);

    console.log("Workout changes:", changes);
    console.log("Workout changes:", JSON.stringify(changes, null, 2));
    if (!hasWorkoutChanges(changes)) {
      return { success: true };
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await workoutService.updateWorkout(
        currentWorkout.user_id,
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
      const savedWorkout = result.data ?? currentWorkout;

      oldWorkoutRef.current = savedWorkout;

      reset(savedWorkout);

      return { success: true };
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error("Failed to update workout");

      setSaveError(normalizedError);

      return { success: false };
    } finally {
      setIsSaving(false);
    }
  }, [getValues, reset]);

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
