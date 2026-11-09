import React from "react";
import { Ionicons } from "@expo/vector-icons";

import TestRenderer, { act } from "react-test-renderer";
import { FormProvider, useForm, UseFormReturn } from "react-hook-form";
import { Workout, WorkoutExercise } from "@/types/interfaces/types";
import { StrengthBuilder } from "../strengthBuilder";
import { ExerciseCard } from "../exerciseCard";
import { SetCardEditor } from "../setCardEditor";
import { AddExerciseModal } from "../addExerciseModal";
import { WorkoutSessionProvider, useWorkoutSession, WorkoutSessionContextType } from "@/context/WorkoutSessionContext";
import { workoutService } from "@/services/workoutService";
import { exerciseService } from "@/services/exerciseService";
import { syncService } from "@/services/syncService";

jest.mock("react-native", () => ({ View: "View", Text: "Text", Pressable: "Pressable", TextInput: "TextInput", StyleSheet: { create: (styles: unknown) => styles } }));
jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("expo-crypto", () => { let id = 0; return { randomUUID: () => `new-set-${++id}` }; });
jest.mock("../addExerciseModal", () => ({ AddExerciseModal: () => null }));
jest.mock("@/context/colorThemeContext", () => ({ useColorTheme: () => ({ theme: { color: { danger: "#d00" }, spacing: {} } }) }));
jest.mock("@/context/authContext", () => ({ useAuth: () => ({ user: { id: "user" }, sessionKey: "session" }) }));
jest.mock("@/context/workoutContext", () => ({ useWorkout: () => ({ insertWorkout: jest.fn() }) }));
jest.mock("@/services/workoutService", () => ({ workoutService: {
  updateWorkout: jest.fn(), insertWorkout: jest.fn(), reorderWorkoutExercise: jest.fn(),
} }));
jest.mock("@/services/exerciseService", () => ({ exerciseService: { updateExerciseOrder: jest.fn() } }));
jest.mock("@/services/syncService", () => ({ syncService: { sync: jest.fn(), pushToSupabase: jest.fn(), refreshWorkouts: jest.fn() } }));

function exercise(id: string, count = 1): WorkoutExercise {
  return { id, workout_id: "workout", exercise_id: "shared-catalog", exercise_name: id,
    exercise_order: 0, validUnits: ["reps"], group_id: null, group_type: null, circuit_id: null, round_number: null,
    sets: Array.from({ length: count }, (_, index) => ({ id: `${id}-set-${index}`, workout_exercise_id: id,
      reps: id.charCodeAt(0) + index, set_order: index + 1, is_warmup: 0, is_max: 0 })) };
}
function fixture(exercises = [exercise("a"), exercise("b", 2), exercise("c", 3)]): Workout {
  return { id: "workout", user_id: "user", name: "Strength", workoutType: "strength",
    scheduled_datetime: "2030-04-07T17:35:00.000Z", is_completed: 0,
    exercises: exercises.map((value, exercise_order) => ({ ...value, exercise_order })), cardio_entries: [], circuit_rounds: [] };
}
const host = (name: string) => name as Parameters<TestRenderer.ReactTestInstance["findByType"]>[0];
const trees: TestRenderer.ReactTestRenderer[] = [];
function mount(workout = fixture(), saved = false) {
  let form!: UseFormReturn<Workout>;
  let session!: WorkoutSessionContextType;
  function Probe() { session = useWorkoutSession(); return null; }
  function Harness() {
    form = useForm<Workout>({ defaultValues: workout });
    return <FormProvider {...form}>{saved
      ? <WorkoutSessionProvider workout={workout}><StrengthBuilder /><Probe /></WorkoutSessionProvider>
      : <StrengthBuilder />}</FormProvider>;
  }
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => { tree = TestRenderer.create(<Harness /> as Parameters<typeof TestRenderer.create>[0]); });
  trees.push(tree);
  return { tree, get form() { return form; }, get session() { return session; } };
}
const cards = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAllByType(ExerciseCard);
const card = (tree: TestRenderer.ReactTestRenderer, id: string) => cards(tree).find(node => node.props.exercise.id === id)!;
const moveButtons = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAllByType(host("Pressable"))
  .filter(node => node.props.accessibilityLabel?.startsWith("Move "));
function move(tree: TestRenderer.ReactTestRenderer, label: string) {
  const button = moveButtons(tree).find(node => node.props.accessibilityLabel === label)!;
  expect(button).toBeDefined(); expect(button.props.disabled).toBe(false);
  act(() => button.props.onPress());
}
const ids = (form: UseFormReturn<Workout>) => form.getValues("exercises").map(value => value.id);
function expectNoPersistence() {
  expect(workoutService.updateWorkout).not.toHaveBeenCalled();
  expect(workoutService.insertWorkout).not.toHaveBeenCalled();
}
afterEach(() => {
  act(() => trees.splice(0).forEach(tree => tree.unmount()));
  expect(workoutService.reorderWorkoutExercise).not.toHaveBeenCalled();
  expect(exerciseService.updateExerciseOrder).not.toHaveBeenCalled();
  expect(syncService.sync).not.toHaveBeenCalled();
  expect(syncService.pushToSupabase).not.toHaveBeenCalled();
  expect(syncService.refreshWorkouts).not.toHaveBeenCalled();
  jest.clearAllMocks();
});

it("moves standalone exercises in creation using stable cards and contiguous order, without persistence", () => {
  const original = fixture(); const { tree, form } = mount(original);
  const originalCards = new Map(cards(tree).map(node => [node.props.exercise.id, node]));
  move(tree, "Move a down"); expect(ids(form)).toEqual(["b", "a", "c"]);
  move(tree, "Move c up"); expect(ids(form)).toEqual(["b", "c", "a"]);
  expect(form.getValues("exercises").map(value => value.exercise_order)).toEqual([0, 1, 2]);
  for (const value of form.getValues("exercises")) {
    expect(value).toEqual({ ...original.exercises.find(item => item.id === value.id), exercise_order: value.exercise_order });
    expect(card(tree, value.id)).toBe(originalCards.get(value.id));
  }
  expectNoPersistence();
});

it.each(["superset", "compound_set"] as const)("moves a %s with one control pair and preserves member order", group_type => {
  const pair = [exercise("a"), exercise("b", 3)].map(value => ({ ...value, group_type, group_id: "pair" }));
  const original = fixture([...pair, exercise("c", 2)]); const { tree, form } = mount(original);
  const originalCards = cards(tree);
  expect(moveButtons(tree)).toHaveLength(4);
  expect(card(tree, "b").findAllByType(host("Pressable")).filter(node => node.props.accessibilityLabel?.startsWith("Move "))).toHaveLength(0);
  move(tree, "Move a and b down"); expect(ids(form)).toEqual(["c", "a", "b"]);
  expect(card(tree, "a")).toBe(originalCards[0]); expect(card(tree, "b")).toBe(originalCards[1]);
  expect(card(tree, "a").findAllByType(host("TextInput")).map(node => node.props.value)).toEqual(["97"]);
  expect(card(tree, "b").findAllByType(host("TextInput")).map(node => node.props.value)).toEqual(["98", "99", "100"]);
  move(tree, "Move a and b up"); expect(form.getValues("exercises")).toEqual(original.exercises);
  expectNoPersistence();
});

it("edits, adds and removes sets on moved group members without crossing exercise parents", () => {
  const grouped = [exercise("a", 2), exercise("b", 3)].map(value => ({ ...value, group_type: "superset" as const, group_id: "pair" }));
  const { tree, form } = mount(fixture([exercise("c"), ...grouped]));
  move(tree, "Move a and b up");
  act(() => { card(tree, "a").findAllByType(host("TextInput"))[1].props.onChangeText("234"); });
  const add = card(tree, "b").findAllByType(host("Pressable")).find(button => button.findAllByType(host("Text")).some(text => text.props.children === "+ Add Set"))!;
  act(() => add.props.onPress());
  act(() => { card(tree, "b").findAllByType(host("TextInput"))[3].props.onChangeText("345"); });
  act(() => card(tree, "a").findAllByType(SetCardEditor)[0].findByType(host("Pressable")).props.onPress());
  move(tree, "Move a and b down");
  const [c, a, b] = form.getValues("exercises");
  expect(c.sets).toEqual(exercise("c").sets);
  expect(a.sets).toEqual([expect.objectContaining({ id: "a-set-1", workout_exercise_id: "a", reps: 234 })]);
  expect(b.sets).toHaveLength(4);
  expect(b.sets[3]).toMatchObject({ workout_exercise_id: "b", reps: 345 });
  expect(card(tree, "a").findAllByType(host("TextInput")).map(node => node.props.value)).toEqual(["234"]);
  expect(card(tree, "b").findAllByType(host("TextInput")).map(node => node.props.value)).toEqual(["98", "99", "100", "345"]);
});

it("disables accessible boundary controls and both controls for a single block", () => {
  const { tree } = mount();
  const states = Object.fromEntries(moveButtons(tree).map(button => [button.props.accessibilityLabel, button.props.disabled]));
  expect(states).toMatchObject({ "Move a up": true, "Move a down": false, "Move c up": false, "Move c down": true });
  moveButtons(tree).forEach(button => {
    expect(button.props.accessibilityRole).toBe("button");
    expect(button.props.accessibilityState).toEqual({ disabled: button.props.disabled });
  });
  const single = mount(fixture([exercise("single")]));
  expect(moveButtons(single.tree).every(button => button.props.disabled)).toBe(true);
});

it("keeps chevrons and deletion beside a truncated long name in one header row", () => {
  const name = "A very long exercise name that must leave space for every header action";
  const { tree, form } = mount(fixture([{ ...exercise("a"), exercise_name: name }, exercise("b")]));
  const first = card(tree, "a");
  const remove = first.findAllByType(host("Pressable")).find(button => button.props.accessibilityLabel === `Delete ${name}`)!;
  const actions = remove.parent!;
  const buttons = actions.findAllByType(host("Pressable"));
  expect(buttons.map(button => button.props.accessibilityLabel)).toEqual([
    `Move ${name} up`, `Move ${name} down`, `Delete ${name}`,
  ]);
  expect(actions.props.style).toMatchObject({ flexDirection: "row", flexShrink: 0 });
  const nameText = first.findAllByType(host("Text")).find(text => text.props.children === name)!;
  expect(nameText.props).toMatchObject({ numberOfLines: 1, ellipsizeMode: "tail" });
  expect(nameText.parent!.props.style).toMatchObject({ flex: 1, minWidth: 0 });
  expect(nameText.parent!.parent).toBe(actions.parent);
  expect(actions.parent!.props.style).toMatchObject({ flexDirection: "row" });
  buttons.forEach(button => {
    const style = button.props.style({ pressed: false });
    expect(style.width ?? style.minWidth).toBeGreaterThanOrEqual(44);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
    expect(button.props.accessibilityRole).toBe("button");
  });
  const icons = actions.findAll(node => Object.is(node.type, Ionicons));
  expect(icons.map(icon => icon.props.name)).toEqual(["chevron-up-circle-outline", "chevron-down-circle-outline", "trash-outline"]);
  expect(icons[2].props.color).toBe("#d00");
  act(() => remove.props.onPress());
  expect(ids(form)).toEqual(["b"]);
  expect(form.getValues("exercises.0.sets")).toEqual(exercise("b").sets);
  expectNoPersistence();
});

it("keeps nested set fields bound to their exercise after moves, edits, additions and deletions", () => {
  const { tree, form } = mount();
  // An edit made before moving must travel with its exercise too.
  act(() => { card(tree, "b").findAllByType(host("TextInput"))[1].props.onChangeText("321"); });
  move(tree, "Move a down");
  move(tree, "Move c up");
  expect(card(tree, "b").findAllByType(host("TextInput")).map(node => node.props.value)).toEqual(["98", "321"]);
  expect(card(tree, "c").findAllByType(host("TextInput"))).toHaveLength(3);
  expect(card(tree, "a").findAllByType(host("TextInput"))).toHaveLength(1);
  act(() => { card(tree, "c").findAllByType(host("TextInput"))[2].props.onChangeText("456"); });
  const add = card(tree, "a").findAllByType(host("Pressable")).find(button => button.findAllByType(host("Text")).some(text => text.props.children === "+ Add Set"))!;
  act(() => add.props.onPress());
  expect(card(tree, "a").findAllByType(host("TextInput"))).toHaveLength(2);
  act(() => { card(tree, "a").findAllByType(host("TextInput"))[1].props.onChangeText("789"); });
  const remove = card(tree, "b").findAllByType(SetCardEditor)[0].findByType(host("Pressable"));
  act(() => remove.props.onPress());
  const [b, c, a] = form.getValues("exercises");
  expect(b.sets).toHaveLength(1); expect(b.sets[0]).toMatchObject({ id: "b-set-1", reps: 321, workout_exercise_id: "b" });
  expect(c.sets[2]).toMatchObject({ id: "c-set-2", reps: 456, workout_exercise_id: "c" });
  expect(a.sets[1]).toMatchObject({ reps: 789, workout_exercise_id: "a" });
  expect(a.sets[1].id).toMatch(/^new-set-/);
  move(tree, "Move a up");
  expect(card(tree, "a").findAllByType(host("TextInput")).map(node => node.props.value)).toEqual(["97", "789"]);
  expect(card(tree, "b").findAllByType(host("TextInput")).map(node => node.props.value)).toEqual(["321"]);
  expectNoPersistence();
});

it("marks a saved reorder dirty and retains it through a failed save and explicit retry", async () => {
  const mounted = mount(fixture(), true);
  expect(mounted.session.isUpdateNeeded).toBe(false);
  move(mounted.tree, "Move a down");
  expect(mounted.session.isUpdateNeeded).toBe(true); expectNoPersistence();
  const submitted = JSON.parse(JSON.stringify(mounted.form.getValues()));
  jest.mocked(workoutService.updateWorkout).mockResolvedValueOnce({ success: false, error: "SQLite write failed" });
  await act(async () => { expect(await mounted.session.saveWorkout()).toEqual({ success: false }); });
  expect(ids(mounted.form)).toEqual(["b", "a", "c"]);
  expect(mounted.session.isUpdateNeeded).toBe(true);
  expect(mounted.session.saveError?.message).toBe("SQLite write failed");
  const changes = jest.mocked(workoutService.updateWorkout).mock.calls[0][2];
  expect(changes.exercisesToUpdate.map(value => [value.id, value.exercise_order])).toEqual([["b", 0], ["a", 1]]);
  expect([changes.setsToInsert, changes.setsToUpdate, changes.setIdsToDelete]).toEqual([[], [], []]);
  jest.mocked(workoutService.updateWorkout).mockResolvedValueOnce({ success: true, data: submitted });
  await act(async () => { expect(await mounted.session.saveWorkout()).toEqual({ success: true }); });
  expect(mounted.session.isUpdateNeeded).toBe(false); expect(mounted.session.saveError).toBeNull();
  expect(ids(mounted.form)).toEqual(["b", "a", "c"]);
});

it("returns to a clean saved state when movement is undone before saving", () => {
  const mounted = mount(fixture(), true);
  move(mounted.tree, "Move a down"); expect(mounted.session.isUpdateNeeded).toBe(true);
  move(mounted.tree, "Move a up"); expect(mounted.session.isUpdateNeeded).toBe(false);
  expectNoPersistence();
});

it("preserves add/remove and completion values after movement", () => {
  const mounted = mount({ ...fixture(), is_completed: 1, completed_at: "2030-04-07T18:00:00Z" });
  move(mounted.tree, "Move c up");
  const remove = card(mounted.tree, "a").props.onDelete;
  act(() => remove());
  act(() => mounted.tree.root.findByType(AddExerciseModal).props.appendExercise(exercise("d")));
  expect(ids(mounted.form)).toEqual(["c", "b", "d"]);
  expect(mounted.form.getValues("exercises").map(value => value.exercise_order)).toEqual([0, 1, 2]);
  expect(mounted.form.getValues("is_completed")).toBe(1);
  expect(mounted.form.getValues("completed_at")).toBe("2030-04-07T18:00:00Z");
});

it("keeps malformed groups editable without showing movement controls", () => {
  const { tree } = mount(fixture([{ ...exercise("a"), group_type: "superset", group_id: "orphan" }]));
  expect(cards(tree)).toHaveLength(1); expect(moveButtons(tree)).toEqual([]);
  expect(tree.root.findAllByType(host("Text")).some(text => text.props.accessibilityRole === "alert")).toBe(true);
});

it("does not add circuit controls or allow strength exercises to cross circuits", () => {
  const { tree } = mount(fixture([exercise("a"), { ...exercise("c"), group_type: "circuit", group_id: "circuit", circuit_id: "circuit", round_number: 3 }, exercise("b")]));
  expect(moveButtons(tree)).toHaveLength(4);
  expect(moveButtons(tree).every(button => button.props.disabled)).toBe(true);
});
