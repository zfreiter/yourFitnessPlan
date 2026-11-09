import type { WorkoutExercise } from "@/types/interfaces/types";

export interface ExerciseMovementBlock {
  type: "standalone" | "superset" | "compound_set" | "circuit";
  /** Persisted instance ID for a standalone exercise, relationship ID otherwise. */
  id: string;
  exercises: readonly WorkoutExercise[];
}

const validId = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

/**
 * Input must contain domain values (getValues/useWatch), never RHF fields whose
 * generated `id` keys shadow persisted IDs. Array position defines display order;
 * stale exercise_order values are intentionally not used to sort the input.
 * Circuits require explicit, matching circuit_id/group_id and a shared positive
 * round count. Legacy incomplete relationships must be resolved by the caller.
 */
export function buildExerciseMovementBlocks(
  exercises: readonly WorkoutExercise[],
): ExerciseMovementBlock[] {
  const ids = new Set<string>();
  const groups = new Map<string, ExerciseMovementBlock>();
  const blocks: ExerciseMovementBlock[] = [];
  let workoutId: string | undefined;

  for (const exercise of exercises) {
    if (!validId(exercise.id) || ids.has(exercise.id)) {
      throw new Error(`Invalid or duplicate exercise instance ID: ${exercise.id}`);
    }
    ids.add(exercise.id);
    if (!validId(exercise.workout_id) ||
        (workoutId !== undefined && workoutId !== exercise.workout_id)) {
      throw new Error("Exercises must belong to the same workout");
    }
    workoutId = exercise.workout_id;

    const type = exercise.group_type ?? "standalone";
    if (type === "standalone") {
      if (exercise.group_id != null || exercise.circuit_id != null || exercise.round_number != null) {
        throw new Error(`Unexpected relationship on standalone exercise: ${exercise.id}`);
      }
      blocks.push({ type, id: exercise.id, exercises: [exercise] });
      continue;
    }
    if (type !== "superset" && type !== "compound_set" && type !== "circuit") {
      throw new Error(`Invalid group type: ${type}`);
    }
    if (!validId(exercise.group_id)) {
      throw new Error(`Missing group ID: ${exercise.id}`);
    }
    if (type === "circuit") {
      if (!validId(exercise.circuit_id) || exercise.circuit_id !== exercise.group_id ||
          !Number.isInteger(exercise.round_number) || (exercise.round_number ?? 0) < 1) {
        throw new Error(`Inconsistent circuit relationship: ${exercise.id}`);
      }
    } else if (exercise.circuit_id != null || exercise.round_number != null) {
      throw new Error(`Unexpected circuit relationship: ${exercise.id}`);
    }

    const existing = groups.get(exercise.group_id);
    if (existing) {
      if (existing.type !== type) throw new Error(`Inconsistent group type: ${exercise.group_id}`);
      if (blocks[blocks.length - 1] !== existing) {
        throw new Error(`Noncontiguous group: ${exercise.group_id}`);
      }
      if (type === "circuit" && existing.exercises[0].round_number !== exercise.round_number) {
        throw new Error(`Inconsistent circuit round count: ${exercise.group_id}`);
      }
      // This array belongs to the new block, never to the caller.
      existing.exercises = [...existing.exercises, exercise];
    } else {
      const block: ExerciseMovementBlock = { type, id: exercise.group_id, exercises: [exercise] };
      groups.set(exercise.group_id, block);
      blocks.push(block);
    }
  }
  for (const block of blocks) {
    if ((block.type === "superset" || block.type === "compound_set") && block.exercises.length !== 2) {
      throw new Error(`Paired group must contain exactly two exercises: ${block.id}`);
    }
  }
  return blocks;
}

/** Validate relationships and return shallow copies with contiguous zero-based order. */
export function normalizeExerciseOrder(
  exercises: readonly WorkoutExercise[],
): WorkoutExercise[] {
  buildExerciseMovementBlocks(exercises);
  return exercises.map((exercise, exercise_order) => ({ ...exercise, exercise_order }));
}

/**
 * Move by block index, not exercise index. Boundary moves are no-ops except for
 * order normalization. Sets and other nested data retain their original references.
 */
export function moveExerciseBlock(
  exercises: readonly WorkoutExercise[],
  blockIndex: number,
  direction: "up" | "down",
): WorkoutExercise[] {
  const blocks = buildExerciseMovementBlocks(exercises);
  if (!Number.isInteger(blockIndex) || blockIndex < 0 || blockIndex >= blocks.length) {
    throw new Error(`Invalid block index: ${blockIndex}`);
  }
  if (direction !== "up" && direction !== "down") throw new Error("Invalid movement direction");
  const target = blockIndex + (direction === "up" ? -1 : 1);
  if (target >= 0 && target < blocks.length) {
    [blocks[blockIndex], blocks[target]] = [blocks[target], blocks[blockIndex]];
  }
  return blocks.flatMap(block => block.exercises).map((exercise, exercise_order) => ({
    ...exercise,
    exercise_order,
  }));
}
