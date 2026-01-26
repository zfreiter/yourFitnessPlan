import { WorkoutUpdateFormValues } from "@/features/create-workout/types/type";
import { FieldValues } from "react-hook-form";
import { createContext, useState, ReactNode, useContext } from "react";
import { ExerciseSet } from "@/types/common/workoutInterface";
import { workoutService } from "@/services/workoutService";
import { useDatabase } from "@/context/databaseContext";
import { setService } from "@/services/setService";
import { useWorkout } from "./workoutContext";

export interface WorkoutSessionContextType {
  markDirty: (field: string) => void;
  saveWorkout: (workout: FieldValues) => Promise<void>;
  saveError: Error | null;
  isUpdatedNeeeded: boolean;
  isSaving: boolean;
}

export const WorkoutSessionContext = createContext<
  WorkoutSessionContextType | undefined
>(undefined);

export function useWorkoutSession(): WorkoutSessionContextType {
  const value = useContext(WorkoutSessionContext);
  if (process.env.NODE_ENV !== "production") {
    if (!value) {
      throw new Error("useAuth must be wrapped in a <AuthProvider />");
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const { db } = useDatabase();
  const { updateContextWorkoutFields, updateWorkoutSets } = useWorkout();
  const markDirty = (field: string) => {
    setUpdatedNeeded((prev) => new Set([...prev, field]));
  };

  const saveWorkout = async (workout: FieldValues) => {
    setIsSaving(true);
    setSaveError(null);

    const exercisesSetsMap: Map<number, ExerciseSet[]> = new Map<
      number,
      ExerciseSet[]
    >();
    const sets: ExerciseSet[] = [];
    const details: { name: string; description: string } = {
      name: "",
      description: "",
    };
    updatedNeeded.forEach((field: string) => {
      if (field.startsWith("exercises")) {
        const exerciseIndex = Number(field.split(".")[1]);
        const setIndex = Number(field.split(".")[3]);
        const set = workout.exercises[exerciseIndex].sets[setIndex];
        const exerciseId = workout.exercises[exerciseIndex].id;
        if (set) {
          if (!exercisesSetsMap.has(exerciseId)) {
            exercisesSetsMap.set(exerciseId, [set]);
          } else {
            const oldSets = exercisesSetsMap.get(exerciseId) || [];
            exercisesSetsMap.set(exerciseId, [...oldSets, set]);
          }

          sets.push(set);
        }
      }
      if (field === "name") {
        details.name = workout.name;
      }
      if (field === "description") {
        details.description = workout.description;
      }
    });

    try {
      // Simulate API call to save workout
      if (db) {
        if (details.name || details.description) {
          const response = await workoutService.updateWorkoutDetails(
            db,
            workout.id,
            details
          );
          if (response.success) {
            console.log("Workout details updated successfully");
            updateContextWorkoutFields(workout.id, [
              { fieldName: "name", value: details.name },
              { fieldName: "description", value: details.description },
            ]);
          }
          if (!response.success) {
            throw new Error(
              response.error || "Failed to update workout details"
            );
          }
        }
        if (sets.length > 0) {
          const response = await setService.updateSets(db, sets);
          if (response.success) {
            updateWorkoutSets(workout.id, exercisesSetsMap);
            console.log("Sets updated successfully");
          }
          if (!response.success) {
            throw new Error(response.error || "Failed to update sets");
          }
        }
      }
    } catch (error) {
      setSaveError(error as Error);
    } finally {
      setIsSaving(false);
    }
    // setUpdatedNeeded(new Set());
  };

  const isUpdatedNeeeded: boolean = updatedNeeded.size > 0;

  return (
    <WorkoutSessionContext.Provider
      value={{
        markDirty,
        saveWorkout,
        saveError,
        isUpdatedNeeeded,
        isSaving,
      }}
    >
      {children}
    </WorkoutSessionContext.Provider>
  );
};
