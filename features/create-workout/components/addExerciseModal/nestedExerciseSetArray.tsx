import { ReactNode } from "react";
import { useFieldArray, UseFieldArrayReturn } from "react-hook-form";
import { AddExerciseForm } from "@/types/interfaces/types";

export type ExerciseSetFieldArray = UseFieldArrayReturn<
  AddExerciseForm,
  "exercises.0.sets"
>;

export function NestedExerciseSetArray({
  exerciseIndex,
  children,
}: {
  exerciseIndex: 0 | 1;
  children: (fieldArray: ExerciseSetFieldArray) => ReactNode;
}) {
  const fieldArray = useFieldArray<AddExerciseForm, "exercises.0.sets">({
    // Both exercise set arrays have the same shape; the second is mounted only
    // when a second grouped exercise exists.
    name: `exercises.${exerciseIndex}.sets` as "exercises.0.sets",
  });
  return <>{children(fieldArray)}</>;
}
