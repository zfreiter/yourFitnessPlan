import {
  Exercise,
  ExerciseGroupType,
  WorkoutExercise,
} from "@/types/interfaces/types";

type ExerciseSelectionOptions = {
  selected: Exercise[];
  previous: WorkoutExercise[];
  workoutId: string;
  exerciseOrderStart: number;
  groupType: ExerciseGroupType | null;
  createId: () => string;
};

/**
 * Retain set data for an unchanged regular exercise or an unchanged pair.
 * A grouped selection is confirmed as one unit, so changing either member
 * creates fresh exercise instances and clears both members' sets.
 */
export function buildExerciseSelection({
  selected,
  previous,
  workoutId,
  exerciseOrderStart,
  groupType,
  createId,
}: ExerciseSelectionOptions): WorkoutExercise[] {
  const isUnchangedGroupPair =
    groupType !== null &&
    selected.length === 2 &&
    previous.length === 2 &&
    previous.every((exercise) => exercise.group_type === groupType) &&
    previous[0].exercise_id === selected[0]?.id &&
    previous[1].exercise_id === selected[1]?.id;
  const previousGroupId = previous[0]?.group_id;
  const canKeepGroupId =
    groupType !== null &&
    previous.length === 2 &&
    selected.length === 2 &&
    previousGroupId != null &&
    previous.every(
      (exercise) =>
        exercise.group_type === groupType &&
        exercise.group_id === previousGroupId,
    );
  const groupId = groupType
    ? canKeepGroupId
      ? previousGroupId
      : createId()
    : null;

  return selected.map((exercise, index) => {
    const unchanged = groupType
      ? isUnchangedGroupPair
        ? previous[index]
        : undefined
      : previous.find((candidate) => candidate.exercise_id === exercise.id);
    const exerciseId = unchanged?.id ?? createId();

    return {
      id: exerciseId,
      workout_id: workoutId,
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      description: exercise.description,
      validUnits: [...(exercise.validUnits ?? [])],
      musclesTargeted: [...(exercise.musclesTargeted ?? [])],
      equipment: [...(exercise.equipment ?? [])],
      exercise_order: exerciseOrderStart + index,
      group_id: groupId,
      group_type: groupType,
      round_number: null,
      // The set builder initializes fresh set rows for newly selected exercises.
      sets: unchanged?.sets ?? [],
    };
  });
}
