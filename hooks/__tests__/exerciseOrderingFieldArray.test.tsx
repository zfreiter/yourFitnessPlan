import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { FormProvider, useForm, UseFormReturn } from "react-hook-form";
import { CreateWorkoutForm, WorkoutExercise } from "@/types/interfaces/types";
import { useWorkoutExercisesFieldArray } from "../useCreateWorkoutExercisesFieldArray";

const exercise = (id: string): WorkoutExercise => ({
  id, workout_id: "workout", exercise_id: "catalog", exercise_name: id,
  exercise_order: 50, validUnits: ["reps"],
  sets: [{ id: `set-${id}`, workout_exercise_id: id, reps: 8, is_warmup: 0, is_max: 0, set_order: 1 }],
});

it("moves whole strength blocks with RHF move while retaining every field-array key", () => {
  let form!: UseFormReturn<CreateWorkoutForm>;
  let array!: ReturnType<typeof useWorkoutExercisesFieldArray>;
  const initial = [exercise("a"), exercise("b"), exercise("c"), exercise("d"), exercise("e")]
    .map((value, index) => ({ ...value, exercise_order: index,
      group_id: index < 2 ? "pair-one" : index < 4 ? "pair-two" : null,
      group_type: index < 2 ? "superset" as const : index < 4 ? "compound_set" as const : null }));
  function Fields() { array = useWorkoutExercisesFieldArray(); return null; }
  function Harness() {
    form = useForm<CreateWorkoutForm>({ defaultValues: { id: "workout", exercises: initial } });
    return <FormProvider {...form}><Fields /></FormProvider>;
  }
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => { tree = TestRenderer.create(<Harness /> as Parameters<typeof TestRenderer.create>[0]); });
  try {
    const keys = array.fields.map(field => field.id);
    act(() => array.moveStrengthBlock(0, "down"));
    expect(array.fields.map(field => field.id)).toEqual([keys[2], keys[3], keys[0], keys[1], keys[4]]);
    act(() => array.moveStrengthBlock(2, "up"));
    expect(array.fields.map(field => field.id)).toEqual([keys[2], keys[3], keys[4], keys[0], keys[1]]);
    expect((form.getValues("exercises") ?? []).map(value => [value.id, value.exercise_order]))
      .toEqual([["c", 0], ["d", 1], ["e", 2], ["a", 3], ["b", 4]]);
    for (const value of form.getValues("exercises") ?? []) {
      expect(value).toEqual({ ...initial.find(original => original.id === value.id), exercise_order: value.exercise_order });
    }
  } finally { act(() => tree.unmount()); }
});

it("retains RHF keys when circuits of different sizes exchange positions", () => {
  let form!: UseFormReturn<CreateWorkoutForm>;
  let array!: ReturnType<typeof useWorkoutExercisesFieldArray>;
  const initial = [exercise("a"), exercise("b"), exercise("c"), exercise("d"), exercise("e")]
    .map((value, index) => ({ ...value, exercise_order: index,
      group_id: index < 2 ? "circuit-one" : "circuit-two",
      circuit_id: index < 2 ? "circuit-one" : "circuit-two", group_type: "circuit" as const, round_number: 3 }));
  function Fields() { array = useWorkoutExercisesFieldArray(); return null; }
  function Harness() {
    form = useForm<CreateWorkoutForm>({ defaultValues: { id: "workout", exercises: initial } });
    return <FormProvider {...form}><Fields /></FormProvider>;
  }
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => { tree = TestRenderer.create(<Harness /> as Parameters<typeof TestRenderer.create>[0]); });
  try {
    const keys = array.fields.map(field => field.id);
    act(() => array.moveCircuitBlock(1, "up"));
    expect(array.fields.map(field => field.id)).toEqual([keys[2], keys[3], keys[4], keys[0], keys[1]]);
    expect((form.getValues("exercises") ?? []).map(value => [value.id, value.exercise_order]))
      .toEqual([["c", 0], ["d", 1], ["e", 2], ["a", 3], ["b", 4]]);
    act(() => array.moveCircuitBlock(0, "down"));
    expect(array.fields.map(field => field.id)).toEqual(keys);
    expect(form.getValues("exercises")).toEqual(initial);
  } finally { act(() => tree.unmount()); }
});

it("normalizes additions and deletions using domain values without replacing RHF keys or sets", () => {
  let form!: UseFormReturn<CreateWorkoutForm>;
  let array!: ReturnType<typeof useWorkoutExercisesFieldArray>;
  function Fields() { array = useWorkoutExercisesFieldArray(); return null; }
  function Harness() {
    form = useForm<CreateWorkoutForm>({ defaultValues: { id: "workout", exercises: [exercise("a"), exercise("b"), exercise("c")] } });
    return <FormProvider {...form}><Fields /></FormProvider>;
  }
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => { tree = TestRenderer.create(<Harness /> as Parameters<typeof TestRenderer.create>[0]); });
  try {
    const initialKeys = array.fields.map(field => field.id);
    expect(initialKeys[0]).not.toBe("a");
    const originalSets = form.getValues("exercises.2.sets");
    act(() => array.remove(1));
    expect(array.fields.map(field => field.id)).toEqual([initialKeys[0], initialKeys[2]]);
    act(() => array.append(exercise("d")));
    expect((form.getValues("exercises") ?? []).map(value => [value.id, value.exercise_order])).toEqual([["a", 0], ["c", 1], ["d", 2]]);
    expect(form.getValues("exercises.1.sets")).toEqual(originalSets);
    act(() => array.append([exercise("e"), exercise("f")]));
    expect((form.getValues("exercises") ?? []).map(value => value.exercise_order)).toEqual([0, 1, 2, 3, 4]);
    expect(array.fields.slice(0, 2).map(field => field.id)).toEqual([initialKeys[0], initialKeys[2]]);
  } finally { act(() => tree.unmount()); }
});
