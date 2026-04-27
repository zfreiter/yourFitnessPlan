import { WorkoutUpdateFormValues } from "@/features/create-workout/types/type";
import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useEffect,
} from "react";
import {
  Exercise,
  ExerciseSet,
  Workout,
} from "@/types/common/workoutInterface";
import { useWorkout } from "./workoutContext";
import { useFormContext } from "react-hook-form";

export interface WorkoutSessionContextType {
  markDirty: (field: string) => void;
  saveWorkout: () => Promise<{ success: boolean }>;
  saveError: Error | null;
  isUpdateNeeded: boolean;
  isSaving: boolean;
  trackWorkoutUpdate: (fields: Partial<Workout>) => void;
  trackExerciseUpdate: (exercise: Partial<Exercise>) => void;
  trackSetUpdate: (set: ExerciseSet) => void;
  clearAllUpdates: () => void;
}

export const WorkoutSessionContext = createContext<
  WorkoutSessionContextType | undefined
>(undefined);

export function useWorkoutSession(): WorkoutSessionContextType {
  const value = useContext(WorkoutSessionContext);
  if (process.env.NODE_ENV !== "production") {
    if (!value) {
      throw new Error(
        "useWorkoutSession must be wrapped in a <WorkoutSessionProvider />",
      );
    }
    return value;
  }
  return value as WorkoutSessionContextType;
}

export const WorkoutSessionProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [updatedNeeded, setUpdatedNeeded] = useState<Set<string>>(new Set());
  const [workoutUpdates, setWorkoutUpdates] = useState<Partial<Workout> | null>(
    null,
  );
  const [exerciseUpdates, setExerciseUpdates] = useState<
    Partial<Exercise>[] | null
  >(null);
  const [setUpdates, setSetUpdates] = useState<ExerciseSet[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  // only form and tracking concerns here — no db, no service calls
  const { saveWorkoutToDb } = useWorkout();
  const { reset, getValues } = useFormContext();

  const markDirty = (field: string) => {
    setUpdatedNeeded((prev) => new Set([...prev, field]));
  };

  const saveWorkout = async (): Promise<{ success: boolean }> => {
    if (!isUpdateNeeded) return { success: true };

    const id = getValues("id");
    const userId = getValues("user_id");

    setIsSaving(true);
    setSaveError(null);

    try {
      //   // delegate all db + context updates to workoutContext
      // if there are base level workout fields we will pass all
      const baseWorkoutValues = { name: "", description: "", duration: 0 };
      if (workoutUpdates) {
        baseWorkoutValues.name = getValues("name").trim();
        baseWorkoutValues.description = getValues("description").trim();
        baseWorkoutValues.duration = getValues("duration");
      }

      const result = await saveWorkoutToDb(
        userId,
        workoutUpdates ? baseWorkoutValues : undefined,
        setUpdates ?? [],
        id,
      );

      if (!result.success) {
        throw new Error(result.error ?? "Failed to save workout");
      }

      //   // reset form baseline so nothing looks dirty
      reset(getValues());
      clearAllUpdates();

      return { success: true };
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Failed to save workout");
      setSaveError(err);
      return { success: false };
    } finally {
      setIsSaving(false);
    }
  };

  function trackWorkoutUpdate(fields: Partial<Workout>) {
    setWorkoutUpdates((prev) => {
      if (!prev) return fields;
      return { ...prev, ...fields };
    });
  }

  function trackExerciseUpdate(exercise: Partial<Exercise>) {
    setExerciseUpdates((prev) => {
      if (!prev) return [exercise];
      const exists = prev.some((e) => e.id === exercise.id);
      if (exists) {
        return prev.map((e) =>
          e.id === exercise.id ? { ...e, ...exercise } : e,
        );
      }
      return [...prev, exercise];
    });
  }

  function trackSetUpdate(set: ExerciseSet) {
    setSetUpdates((prev) => {
      if (!prev) return [set];
      const exists = prev.some((s) => s.id === set.id);
      if (exists) {
        return prev.map((s) => (s.id === set.id ? { ...s, ...set } : s));
      }
      return [...prev, set];
    });
  }

  function clearAllUpdates() {
    setWorkoutUpdates(null);
    setExerciseUpdates(null);
    setSetUpdates(null);
    setUpdatedNeeded(new Set());
  }

  const isUpdateNeeded: boolean =
    workoutUpdates !== null || exerciseUpdates !== null || setUpdates !== null;

  return (
    <WorkoutSessionContext.Provider
      value={{
        markDirty,
        saveWorkout,
        saveError,
        isUpdateNeeded,
        isSaving,
        trackWorkoutUpdate,
        trackExerciseUpdate,
        trackSetUpdate,
        clearAllUpdates,
      }}
    >
      {children}
    </WorkoutSessionContext.Provider>
  );
};
