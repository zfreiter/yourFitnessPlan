import { debounce } from "@/utils/debounce";
import { workoutService } from "@/services/workoutService";
import { useWorkout } from "@/context/workoutContext";
import { useRef } from "react";
import { useAuth } from "@/context/authContext";

interface Props {
  fieldName: string;
  workoutId: string;
  onSuccess?: (
    workoutId: string,
    field: string | number,
    value: string,
  ) => void;
  onError?: (field: string, error: string) => void;
}

export function useDebouncedFieldUpdate({
  fieldName,
  workoutId,
  onSuccess,
  onError,
}: Props): ReturnType<typeof debounce> {
  const { workouts, setWorkouts } = useWorkout();
  const { user } = useAuth();
  const debouncedUpdateRef = useRef<ReturnType<typeof debounce> | null>(null);

  if (!debouncedUpdateRef.current) {
    debouncedUpdateRef.current = debounce(async (value: string) => {
      try {
        const result = await workoutService.updateWorkoutField(
          user?.id!,
          workoutId,
          fieldName,
          value,
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
