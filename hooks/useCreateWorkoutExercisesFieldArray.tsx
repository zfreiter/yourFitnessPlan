import { CreateWorkoutForm } from "@/types/interfaces/types";
import { buildExerciseMovementBlocks, moveExerciseBlock } from "@/utils/exerciseOrdering";
import { useFieldArray, useFormContext, UseFieldArrayAppend, UseFieldArrayRemove } from "react-hook-form";

export function useWorkoutExercisesFieldArray() {
  const { control, getValues, setValue } = useFormContext<CreateWorkoutForm>();

  const fieldArray = useFieldArray({
    control,
    name: "exercises",
  });

  // Keep numeric positions current without replacing rows or RHF rendering keys.
  // Relationship validation belongs to the complete-list persistence boundary;
  // a pair may be appended in two calls by the existing strength modal.
  const normalizePositions = () => {
    (getValues("exercises") ?? []).forEach((exercise, index) => {
      if (exercise.exercise_order !== index) {
        setValue(`exercises.${index}.exercise_order`, index, { shouldDirty: true });
      }
    });
  };
  const append: UseFieldArrayAppend<CreateWorkoutForm, "exercises"> = (value, options) => {
    normalizePositions();
    const start = (getValues("exercises") ?? []).length;
    const additions = (Array.isArray(value) ? value : [value]).map((exercise, index) => ({
      ...exercise, exercise_order: start + index,
    }));
    fieldArray.append(additions, options);
  };
  const remove: UseFieldArrayRemove = index => {
    fieldArray.remove(index);
    normalizePositions();
  };
  const moveBlock = (blockIndex: number, direction: "up" | "down", circuit: boolean) => {
    const current = getValues("exercises") ?? [];
    const blocks = buildExerciseMovementBlocks(current);
    const target = blockIndex + (direction === "up" ? -1 : 1);
    if (!blocks[blockIndex] || !blocks[target] ||
        (blocks[blockIndex].type === "circuit") !== circuit ||
        (blocks[target].type === "circuit") !== circuit) return;
    const desired = moveExerciseBlock(current, blockIndex, direction);
    // Move existing rows rather than replacing values, so RHF keeps its keys and
    // nested set data. Track positions locally across multi-member block moves.
    const ids = current.map(exercise => exercise.id);
    desired.forEach((exercise, index) => {
      const from = ids.indexOf(exercise.id);
      if (from !== index) {
        fieldArray.move(from, index);
        ids.splice(index, 0, ids.splice(from, 1)[0]);
      }
    });
    normalizePositions();
  };
  const moveStrengthBlock = (blockIndex: number, direction: "up" | "down") => moveBlock(blockIndex, direction, false);
  const moveCircuitBlock = (blockIndex: number, direction: "up" | "down") => moveBlock(blockIndex, direction, true);
  return { ...fieldArray, append, remove, moveStrengthBlock, moveCircuitBlock };
}
