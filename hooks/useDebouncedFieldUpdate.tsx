import { debounce } from "@/utils/debounce";
import { workoutService } from "@/services/workoutService";
import { useDatabase } from "@/context/databaseContext";
import { useWorkout } from "@/context/workoutContext";
import { useRef } from "react";

interface Props {
  fieldName: string;
  workoutId: number;
  onSuccess?: (
    workoutId: number,
    field: string | number,
    value: string
  ) => void;
  onError?: (field: string, error: string) => void;
}

export function useDebouncedFieldUpdate({
  fieldName,
  workoutId,
  onSuccess,
  onError,
}: Props): ReturnType<typeof debounce> {
  const { db } = useDatabase();
  const { workouts, setWorkouts } = useWorkout();
  const debouncedUpdateRef = useRef<ReturnType<typeof debounce> | null>(null);

  if (!debouncedUpdateRef.current) {
    debouncedUpdateRef.current = debounce(async (value: string) => {
      if (!db) {
        onError?.(fieldName, "Database not available");
        return;
      }

      try {
        const result = await workoutService.updateWorkoutField(
          db,
          workoutId,
          fieldName,
          value
        );
        console.log("result", result);
        if (result.success) {
          onSuccess?.(workoutId, fieldName, value);
        } else {
          onError?.(fieldName, result.error || "Update failed");
        }
      } catch (error) {
        onError?.(fieldName, "Database error occurred");
      }
    }, 3000);
  }

  return debouncedUpdateRef.current;
}
