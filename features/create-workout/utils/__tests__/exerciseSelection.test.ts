import {
  Exercise,
  ExerciseGroupType,
  WorkoutExercise,
} from "@/types/interfaces/types";
import { buildExerciseSelection } from "../exerciseSelection";

const makeExercise = (
  id: string,
  validUnits: Exercise["validUnits"] = ["reps", "weight"],
): Exercise => ({
  id,
  name: id,
  description: `${id} description`,
  types: ["strength"],
  validUnits,
  musclesTargeted: [],
  equipment: [],
  difficulty: "beginner",
  noWeight: false,
});

const makeWorkoutExercise = (
  exerciseId: string,
  options: { groupId?: string | null; groupType?: ExerciseGroupType | null } = {},
): WorkoutExercise => ({
  id: `workout-${exerciseId}`,
  workout_id: "workout",
  exercise_id: exerciseId,
  exercise_name: exerciseId,
  description: "old description",
  validUnits: ["reps", "weight"],
  musclesTargeted: [],
  equipment: [],
  exercise_order: 0,
  group_id: options.groupId ?? null,
  group_type: options.groupType ?? null,
  round_number: null,
  sets: [
    {
      id: `set-${exerciseId}`,
      workout_exercise_id: `workout-${exerciseId}`,
      reps: 8,
      weight: 40,
      is_warmup: 0,
      is_max: 0,
      set_order: 1,
    },
  ],
});

function createSelection(
  selected: Exercise[],
  previous: WorkoutExercise[],
  groupType: ExerciseGroupType | null = null,
) {
  let id = 0;
  return buildExerciseSelection({
    selected,
    previous,
    workoutId: "workout",
    exerciseOrderStart: 4,
    groupType,
    createId: () => `new-${++id}`,
  });
}

describe("buildExerciseSelection", () => {
  it("resets sets and changes exercise/set IDs even when valid units match", () => {
    const [replaced] = createSelection(
      [makeExercise("squat")],
      [makeWorkoutExercise("bench")],
    );

    expect(replaced.exercise_id).toBe("squat");
    expect(replaced.validUnits).toEqual(["reps", "weight"]);
    expect(replaced.id).not.toBe("workout-bench");
    expect(replaced.sets).toEqual([]);
  });

  it("uses only the replacement exercise's units, including TIME only", () => {
    const [replaced] = createSelection(
      [makeExercise("plank", ["time"])],
      [makeWorkoutExercise("bench")],
    );

    expect(replaced.validUnits).toEqual(["time"]);
    expect(replaced.sets).toEqual([]);
  });

  it.each(["superset", "compound_set"] as const)(
    "resets both %s members when either member changes",
    (groupType) => {
      const first = makeWorkoutExercise("bench", {
        groupId: "group-1",
        groupType,
      });
      const second = makeWorkoutExercise("row", {
        groupId: "group-1",
        groupType,
      });
      const [replaced, alsoReset] = createSelection(
        [makeExercise("squat"), makeExercise("row")],
        [first, second],
        groupType,
      );

      expect(replaced.sets).toEqual([]);
      expect(replaced.id).not.toBe(first.id);
      expect(alsoReset.id).not.toBe(second.id);
      expect(alsoReset.sets).toEqual([]);
      expect([replaced.group_id, alsoReset.group_id]).toEqual([
        "group-1",
        "group-1",
      ]);
    },
  );

  it("resets both members when replacing the second member", () => {
    const first = makeWorkoutExercise("bench", {
      groupId: "group-2",
      groupType: "superset",
    });
    const second = makeWorkoutExercise("row", {
      groupId: "group-2",
      groupType: "superset",
    });
    const [preserved, replaced] = createSelection(
      [makeExercise("bench"), makeExercise("pulldown")],
      [first, second],
      "superset",
    );

    expect(preserved.id).not.toBe(first.id);
    expect(preserved.sets).toEqual([]);
    expect(replaced.id).not.toBe(second.id);
    expect(replaced.sets).toEqual([]);
    expect(replaced.group_id).toBe("group-2");
  });

  it("preserves both members only when the exact pair is confirmed again", () => {
    const first = makeWorkoutExercise("bench", {
      groupId: "group-3",
      groupType: "superset",
    });
    const second = makeWorkoutExercise("row", {
      groupId: "group-3",
      groupType: "superset",
    });
    const [sameFirst, sameSecond] = createSelection(
      [makeExercise("bench"), makeExercise("row")],
      [first, second],
      "superset",
    );

    expect(sameFirst.id).toBe(first.id);
    expect(sameFirst.sets).toEqual(first.sets);
    expect(sameSecond.id).toBe(second.id);
    expect(sameSecond.sets).toEqual(second.sets);
    expect([sameFirst.group_id, sameSecond.group_id]).toEqual([
      "group-3",
      "group-3",
    ]);
  });

  it("preserves sets when the exercise itself is unchanged", () => {
    const previous = makeWorkoutExercise("bench");
    const [unchanged] = createSelection(
      [makeExercise("bench", ["reps"])],
      [previous],
    );

    expect(unchanged.id).toBe(previous.id);
    expect(unchanged.sets).toEqual(previous.sets);
    expect(unchanged.validUnits).toEqual(["reps"]);
  });
});
