import type { WorkoutExercise } from "@/types/interfaces/types";
import { buildExerciseMovementBlocks, moveExerciseBlock, normalizeExerciseOrder } from "../exerciseOrdering";

const exercise = (id: string, overrides: Partial<WorkoutExercise> = {}): WorkoutExercise => ({
  id, workout_id: "workout", exercise_id: "same-catalog-id", exercise_name: id,
  validUnits: ["reps", "weight"], exercise_order: 99,
  group_id: null, group_type: null, circuit_id: null, round_number: null,
  sets: [{ id: `set-${id}`, workout_exercise_id: id, reps: 8, weight: 20,
    is_warmup: 0, is_max: 0, set_order: 1 }],
  ...overrides,
});
const pair = (type: "superset" | "compound_set") =>
  ["a", "b"].map(id => exercise(id, { group_id: "pair", group_type: type }));
const circuit = (id: string, size: number) => Array.from({ length: size }, (_, i) =>
  exercise(`${id}-${i}`, { group_id: id, group_type: "circuit", circuit_id: id, round_number: 3 }));
const ids = (values: readonly WorkoutExercise[]) => values.map(value => value.id);

describe("exercise ordering", () => {
  it("moves standalone instances in both directions despite duplicate catalog IDs", () => {
    const input = [exercise("a"), exercise("b"), exercise("c")];
    const moved = moveExerciseBlock(input, 0, "down");
    expect(ids(moved)).toEqual(["b", "a", "c"]);
    expect(ids(moveExerciseBlock(moved, 1, "up"))).toEqual(ids(input));
    expect(moved.map(value => value.exercise_order)).toEqual([0, 1, 2]);
  });

  it.each(["superset", "compound_set"] as const)("moves a %s intact", type => {
    const input = [...pair(type), exercise("c")];
    expect(buildExerciseMovementBlocks(input).map(block => block.exercises.length)).toEqual([2, 1]);
    expect(ids(moveExerciseBlock(input, 0, "down"))).toEqual(["c", "a", "b"]);
    expect(ids(moveExerciseBlock(input, 1, "up"))).toEqual(["c", "a", "b"]);
  });

  it("moves differently sized circuits without changing internal order", () => {
    const input = [...circuit("one", 2), ...circuit("two", 3), ...circuit("three", 1)];
    expect(ids(moveExerciseBlock(input, 1, "up"))).toEqual([
      "two-0", "two-1", "two-2", "one-0", "one-1", "three-0",
    ]);
    expect(ids(moveExerciseBlock(input, 0, "down"))).toEqual(ids(moveExerciseBlock(input, 1, "up")));
  });

  it("normalizes boundary moves without changing position", () => {
    const input = [exercise("a", { exercise_order: -8 }), exercise("b", { exercise_order: 40 })];
    for (const [index, direction] of [[0, "up"], [1, "down"]] as const) {
      const result = moveExerciseBlock(input, index, direction);
      expect(ids(result)).toEqual(["a", "b"]);
      expect(result.map(value => value.exercise_order)).toEqual([0, 1]);
    }
    expect(normalizeExerciseOrder([])).toEqual([]);
    expect(ids(moveExerciseBlock([exercise("a")], 0, "down"))).toEqual(["a"]);
  });

  it("preserves every field except order and does not mutate frozen input", () => {
    const input = [...pair("superset"), ...circuit("circuit", 2), exercise("single")];
    const before = JSON.parse(JSON.stringify(input));
    input.forEach(value => {
      value.sets.forEach(Object.freeze);
      Object.freeze(value.sets);
      Object.freeze(value);
    });
    Object.freeze(input);
    buildExerciseMovementBlocks(input);
    for (const result of [moveExerciseBlock(input, 1, "up"), normalizeExerciseOrder(input)]) {
      result.forEach(value => {
        const original = input.find(item => item.id === value.id)!;
        expect(value).toEqual({ ...original, exercise_order: result.indexOf(value) });
        expect(value).not.toBe(original);
        expect(value.sets).toBe(original.sets);
      });
    }
    expect(input).toEqual(before);
  });

  it.each([
    [exercise("a"), exercise("a")],
    [exercise("")],
    [exercise("a", { workout_id: "" })],
    [exercise("a"), exercise("b", { workout_id: "other" })],
    [exercise("a", { group_type: "superset" })],
    [exercise("a", { group_id: "orphan" })],
    [exercise("a", { group_id: " " , group_type: "superset" })],
    [pair("superset")[0]],
    [...pair("superset"), exercise("c", { group_id: "pair", group_type: "superset" })],
    [pair("superset")[0], exercise("gap"), pair("superset")[1]],
    [pair("superset")[0], pair("compound_set")[1]],
    [exercise("a", { circuit_id: "orphan" })],
    [exercise("a", { round_number: 3 })],
    [...pair("superset").map(value => ({ ...value, circuit_id: "pair" }))],
    [exercise("a", { group_type: "circuit", group_id: "c" })],
    [exercise("a", { group_type: "circuit", circuit_id: "c", round_number: 3 })],
    [exercise("a", { group_type: "circuit", group_id: "c", circuit_id: "other", round_number: 3 })],
    [circuit("c", 1)[0], { ...circuit("c", 2)[1], round_number: 2 }],
    [{ ...circuit("c", 1)[0], round_number: 0 }],
    [{ ...circuit("c", 1)[0], round_number: 1.5 }],
    [circuit("c", 2)[0], exercise("gap"), circuit("c", 2)[1]],
  ])("rejects malformed relationships or identity (%#)", (...input) => {
    expect(() => buildExerciseMovementBlocks(input)).toThrow();
    expect(() => normalizeExerciseOrder(input)).toThrow();
    expect(() => moveExerciseBlock(input, 0, "down")).toThrow();
  });

  it.each([-1, 1, 0.5, NaN])("rejects invalid block index %s", index => {
    expect(() => moveExerciseBlock([exercise("a")], index, "down")).toThrow("Invalid block index");
  });
  it("rejects movement in an empty workout", () => {
    expect(buildExerciseMovementBlocks([])).toEqual([]);
    expect(() => moveExerciseBlock([], 0, "up")).toThrow("Invalid block index");
  });
});
