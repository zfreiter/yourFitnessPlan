import { CreateWorkoutForm } from "@/types/interfaces/types";
import { useFieldArray, useFormContext } from "react-hook-form";

export function useWorkoutExercisesFieldArray() {
  const { control } = useFormContext<CreateWorkoutForm>();

  return useFieldArray({
    control,
    name: "exercises",
  });
}
