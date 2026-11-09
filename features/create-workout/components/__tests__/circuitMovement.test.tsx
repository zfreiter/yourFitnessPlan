import { Alert } from "react-native";
import React from "react";
import { useColorTheme } from "@/context/colorThemeContext";
import { tokens } from "@/utils/colorTheme";
import { circuitColor } from "@/utils/circuitColors";
import { Ionicons } from "@expo/vector-icons";
import TestRenderer, { act } from "react-test-renderer";
import { FormProvider, useForm, UseFormReturn } from "react-hook-form";
import { Workout } from "@/types/interfaces/types";
import { CircuitBuilder } from "../circuitBuilder";
import { ExerciseCard } from "../exerciseCard";
import { SetCardEditor } from "../setCardEditor";
import { WorkoutSessionProvider, useWorkoutSession, WorkoutSessionContextType } from "@/context/WorkoutSessionContext";
import { workoutService } from "@/services/workoutService";
import { exerciseService } from "@/services/exerciseService";
import { syncService } from "@/services/syncService";

jest.mock("react-native", () => ({ Alert: { alert: jest.fn() }, View: "View", Text: "Text", Pressable: "Pressable", TextInput: "TextInput", StyleSheet: { create: (styles: unknown) => styles } }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("expo-crypto", () => ({ randomUUID: () => "unused-new-set" }));
jest.mock("../addCircuitModal", () => ({ AddCircuitModal: () => null }));
jest.mock("@/context/colorThemeContext", () => ({ useColorTheme: jest.fn(() => ({ theme: { color: { danger: "#d00" }, spacing: {} } })) }));
jest.mock("@/context/authContext", () => ({ useAuth: () => ({ user: { id: "user" }, sessionKey: "session" }) }));
jest.mock("@/context/workoutContext", () => ({ useWorkout: () => ({ insertWorkout: jest.fn() }) }));
jest.mock("@/services/workoutService", () => ({ workoutService: {
  updateWorkout: jest.fn(), insertWorkout: jest.fn(), reorderWorkoutExercise: jest.fn(),
} }));
jest.mock("@/services/exerciseService", () => ({ exerciseService: { updateExerciseOrder: jest.fn() } }));
jest.mock("@/services/syncService", () => ({ syncService: { sync: jest.fn(), pushToSupabase: jest.fn(), refreshWorkouts: jest.fn() } }));

function fixture(sizes = [2, 1, 3]): Workout {
  let order = 0;
  return { id: "workout", user_id: "user", name: "Circuits", workoutType: "circuit",
    scheduled_datetime: "2030-04-07T17:35:00.000Z", is_completed: 0, cardio_entries: [],
    circuit_rounds: sizes.map((_, index) => ({ id: `circuit-${index}`, workout_id: "workout",
      round_number: index + 2, rest_after_round: 30 + index * 15, notes: `Notes ${index}` })),
    exercises: sizes.flatMap((size, circuit) => Array.from({ length: size }, (_, member) => {
      const id = `exercise-${circuit}-${member}`;
      return { id, workout_id: "workout", exercise_id: "same-catalog", exercise_name: id,
        exercise_order: order++, validUnits: ["reps" as const], group_id: `circuit-${circuit}`,
        circuit_id: `circuit-${circuit}`, group_type: "circuit" as const, round_number: circuit + 2,
        sets: Array.from({ length: member + 1 }, (_, set) => ({ id: `${id}-set-${set}`,
          workout_exercise_id: id, reps: circuit * 10 + member + set, set_order: set + 1, is_warmup: 0, is_max: 0 })) };
    })) };
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
      ? <WorkoutSessionProvider workout={workout}><CircuitBuilder /><Probe /></WorkoutSessionProvider>
      : <CircuitBuilder />}</FormProvider>;
  }
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => { tree = TestRenderer.create(<Harness /> as Parameters<typeof TestRenderer.create>[0]); });
  trees.push(tree);
  return { tree, get form() { return form; }, get session() { return session; } };
}
const cards = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAllByType(ExerciseCard);
const buttons = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAllByType(host("Pressable"))
  .filter(node => node.props.accessibilityLabel?.startsWith("Move Circuit"));
function move(tree: TestRenderer.ReactTestRenderer, label: string) {
  const button = buttons(tree).find(node => node.props.accessibilityLabel === label)!;
  expect(button).toBeDefined(); expect(button.props.disabled).toBe(false);
  act(() => button.props.onPress());
}
const memberIds = (form: UseFormReturn<Workout>) => form.getValues("exercises").map(exercise => exercise.id);
afterEach(() => {
  act(() => trees.splice(0).forEach(tree => tree.unmount()));
  expect(workoutService.reorderWorkoutExercise).not.toHaveBeenCalled();
  expect(exerciseService.updateExerciseOrder).not.toHaveBeenCalled();
  expect(syncService.sync).not.toHaveBeenCalled(); expect(syncService.pushToSupabase).not.toHaveBeenCalled();
  expect(syncService.refreshWorkouts).not.toHaveBeenCalled();
  jest.clearAllMocks();
});

it("moves differently sized circuits up and down in creation without changing IDs, settings or card identity", () => {
  const original = fixture(); const { tree, form } = mount(original);
  const instances = new Map(cards(tree).map(node => [node.props.exercise.id, node]));
  move(tree, "Move Circuit 3 up");
  expect(memberIds(form)).toEqual(["exercise-0-0", "exercise-0-1", "exercise-2-0", "exercise-2-1", "exercise-2-2", "exercise-1-0"]);
  move(tree, "Move Circuit 1 down");
  expect(memberIds(form)).toEqual(["exercise-2-0", "exercise-2-1", "exercise-2-2", "exercise-0-0", "exercise-0-1", "exercise-1-0"]);
  const moved = form.getValues("exercises");
  expect(moved.map(exercise => exercise.exercise_order)).toEqual([0, 1, 2, 3, 4, 5]);
  moved.forEach(exercise => {
    expect(exercise).toEqual({ ...original.exercises.find(value => value.id === exercise.id), exercise_order: exercise.exercise_order });
    expect(cards(tree).find(node => node.props.exercise.id === exercise.id)).toBe(instances.get(exercise.id));
  });
  expect(form.getValues("circuit_rounds")).toEqual(original.circuit_rounds);
  expect(workoutService.updateWorkout).not.toHaveBeenCalled(); expect(workoutService.insertWorkout).not.toHaveBeenCalled();
});

it("renders exactly one accessible chevron pair per circuit on its heading row with disabled boundaries", () => {
  const { tree } = mount();
  expect(buttons(tree)).toHaveLength(6);
  const states = Object.fromEntries(buttons(tree).map(button => [button.props.accessibilityLabel, button.props.disabled]));
  expect(states).toEqual({ "Move Circuit 1 up": true, "Move Circuit 1 down": false,
    "Move Circuit 2 up": false, "Move Circuit 2 down": false, "Move Circuit 3 up": false, "Move Circuit 3 down": true });
  buttons(tree).forEach(button => {
    expect(button.props.accessibilityState).toEqual({ disabled: button.props.disabled });
    expect(button.props.accessibilityRole).toBe("button");
    expect(button.props.style({ pressed: false })[0]).toMatchObject({ width: 44, height: 44 });
    const heading = button.parent!.parent!;
    expect(heading.props.style).toMatchObject({ flexDirection: "row" });
    expect(heading.findAllByType(host("Text")).some(text => text.props.accessibilityRole === "header")).toBe(true);
    expect(button.findAll(node => Object.is(node.type, Ionicons))[0].props.name)
      .toBe(button.props.accessibilityLabel.endsWith(" up") ? "chevron-up-circle-outline" : "chevron-down-circle-outline");
  });
  expect(buttons(mount(fixture([2])).tree).every(button => button.props.disabled)).toBe(true);
});

it("preserves nested set editing and individual exercise deletion after moving a circuit", () => {
  const original = fixture(); const { tree, form } = mount(original);
  move(tree, "Move Circuit 3 up");
  const movedCard = cards(tree).find(node => node.props.exercise.id === "exercise-2-2")!;
  expect(movedCard.findAllByType(host("TextInput")).map(node => node.props.value)).toEqual(["22", "23", "24"]);
  act(() => { movedCard.findAllByType(host("TextInput"))[2].props.onChangeText("123"); });
  act(() => movedCard.findAllByType(SetCardEditor)[0].findByType(host("Pressable")).props.onPress());
  const removeExercise = cards(tree).find(node => node.props.exercise.id === "exercise-2-0")!
    .findAllByType(host("Pressable")).find(node => node.props.accessibilityLabel === "Delete exercise-2-0")!;
  expect(removeExercise.findAll(node => Object.is(node.type, Ionicons))[0].props).toMatchObject({ name: "trash-outline", color: "#d00" });
  act(() => removeExercise.props.onPress());
  expect(buttons(tree)).toHaveLength(6);
  const exercise = form.getValues("exercises").find(value => value.id === "exercise-2-2")!;
  expect(exercise.sets).toEqual([
    expect.objectContaining({ id: "exercise-2-2-set-1", workout_exercise_id: exercise.id, reps: 23 }),
    expect.objectContaining({ id: "exercise-2-2-set-2", workout_exercise_id: exercise.id, reps: 123 }),
  ]);
  expect(form.getValues("circuit_rounds")).toEqual(original.circuit_rounds);
  expect(memberIds(form)).not.toContain("exercise-2-0");
  expect(form.getValues("exercises").map(value => value.exercise_order)).toEqual([0, 1, 2, 3, 4]);
});

it("marks saved circuit movement dirty and persists only through explicit save, reopening with the saved grouping", async () => {
  const original = fixture(); const mounted = mount(original, true);
  expect(mounted.session.isUpdateNeeded).toBe(false);
  move(mounted.tree, "Move Circuit 1 down");
  expect(mounted.session.isUpdateNeeded).toBe(true); expect(workoutService.updateWorkout).not.toHaveBeenCalled();
  const saved = JSON.parse(JSON.stringify(mounted.form.getValues())) as Workout;
  jest.mocked(workoutService.updateWorkout).mockResolvedValueOnce({ success: true, data: saved });
  await act(async () => { expect(await mounted.session.saveWorkout()).toEqual({ success: true }); });
  expect(mounted.session.isUpdateNeeded).toBe(false);
  const changes = jest.mocked(workoutService.updateWorkout).mock.calls[0][2];
  expect(changes.exercisesToUpdate.map(exercise => [exercise.id, exercise.exercise_order]))
    .toEqual([["exercise-1-0", 0], ["exercise-0-0", 1], ["exercise-0-1", 2]]);
  expect([changes.setsToInsert, changes.setsToUpdate, changes.setIdsToDelete,
    changes.circuitRoundsToInsert, changes.circuitRoundsToUpdate, changes.circuitRoundIdsToDelete]).toEqual([[], [], [], [], [], []]);
  const reopened = mount(saved, true);
  expect(reopened.session.isUpdateNeeded).toBe(false);
  expect(memberIds(reopened.form)).toEqual(memberIds(mounted.form));
  expect(buttons(reopened.tree)).toHaveLength(6);
  expect(reopened.form.getValues("circuit_rounds")).toEqual(original.circuit_rounds);
  // Reordering remains available after the explicit save and reopen, with no
  // additional persistence call and the same exercise identities and sets.
  move(reopened.tree, "Move Circuit 1 down");
  expect(memberIds(reopened.form)).toEqual(memberIds(mount(original).form));
  reopened.form.getValues("exercises").forEach(exercise => {
    expect(exercise).toEqual({ ...original.exercises.find(value => value.id === exercise.id), exercise_order: exercise.exercise_order });
  });
  expect(reopened.form.getValues("circuit_rounds")).toEqual(original.circuit_rounds);
  expect(workoutService.updateWorkout).toHaveBeenCalledTimes(1);
});

it("clears reorder dirty state when a circuit move is undone", () => {
  const mounted = mount(fixture(), true);
  move(mounted.tree, "Move Circuit 1 down"); expect(mounted.session.isUpdateNeeded).toBe(true);
  move(mounted.tree, "Move Circuit 2 up"); expect(mounted.session.isUpdateNeeded).toBe(false);
  expect(workoutService.updateWorkout).not.toHaveBeenCalled();
});

it("disables movement for malformed relationships while keeping exercises and deletion available", () => {
  const original = fixture(); original.exercises[0].circuit_id = "wrong";
  const { tree } = mount(original);
  expect(buttons(tree)).toEqual([]); expect(cards(tree)).toHaveLength(6);
  expect(tree.root.findAllByType(host("Text")).some(text => text.props.accessibilityRole === "alert")).toBe(true);
  expect(cards(tree)[0].props.onDelete).toBeDefined();
});

it("disables movement when circuit metadata does not match member round counts", () => {
  const original = fixture(); original.circuit_rounds[0].round_number = 99;
  expect(buttons(mount(original).tree)).toEqual([]);
});

it("reports malformed settings as a relationship problem, without suggesting a save", () => {
  const original = fixture(); original.circuit_rounds = [];
  const { tree } = mount(original);
  expect(buttons(tree)).toEqual([]);
  const warning = tree.root.findAllByType(host("Text")).find(node => node.props.accessibilityRole === "alert")!;
  expect(warning.props.children.join("")).toBe("Circuit movement is unavailable: Circuit exercises do not match their circuit settings");
  expect(warning.props.children.join("")).not.toMatch(/save/i);
});


it.each(["light", "dark"] as const)("renders consistent, contrasting circuit colors in %s and keeps them after movement", scheme => {
  const originalTheme = useColorTheme();
  jest.mocked(useColorTheme).mockReturnValue({ theme: { color: tokens[scheme], spacing: tokens.spacing, fonts: tokens.fonts } } as ReturnType<typeof useColorTheme>);
  const { tree, form } = mount(fixture([2, 2]));
  const original = JSON.parse(JSON.stringify(form.getValues()));
  const colors = new Map<string, string>();
  function checkColors() {
    cards(tree).forEach(card => {
      const exercise = card.props.exercise;
      const color = card.findAllByType(host("View"))[0].props.style[1].borderColor;
      expect(color).toBe(circuitColor(exercise.circuit_id, tokens[scheme].surface));
      if (colors.has(exercise.circuit_id)) expect(color).toBe(colors.get(exercise.circuit_id));
      else colors.set(exercise.circuit_id, color);
      const heading = card.findAllByType(host("Text")).find(node => node.props.accessibilityRole === "header");
      if (heading) {
        expect(heading.props.style[1].color).toBe(color);
        expect(heading.props.children).toMatch(/^Circuit \d+$/);
      }
    });
  }
  checkColors(); expect(new Set(colors.values()).size).toBe(2);
  move(tree, "Move Circuit 1 down"); checkColors();
  expect(form.getValues("circuit_rounds")).toEqual(original.circuit_rounds);
  form.getValues("exercises").forEach(exercise => expect(exercise).toEqual({
    ...original.exercises.find((value: Workout["exercises"][number]) => value.id === exercise.id),
    exercise_order: exercise.exercise_order,
  }));
  expect(workoutService.updateWorkout).not.toHaveBeenCalled();
  expect(workoutService.insertWorkout).not.toHaveBeenCalled();
  jest.mocked(useColorTheme).mockReturnValue(originalTheme);
});


function deleteCircuit(tree: TestRenderer.ReactTestRenderer, label: string, confirm = true) {
  const button = tree.root.findAllByType(host("Pressable")).find(node => node.props.accessibilityLabel === `Delete ${label}`)!;
  expect(button.props.style({ pressed: false })[0]).toMatchObject({ width: 44, height: 44 });
  expect(button.findAll(node => Object.is(node.type, Ionicons))[0].props).toMatchObject({ name: "trash-outline", color: "#d00" });
  act(() => button.props.onPress());
  const options = jest.mocked(Alert.alert).mock.calls.at(-1)![2]!;
  act(() => options.find(option => option.style === (confirm ? "destructive" : "cancel"))!.onPress?.());
}
it("deletes a saved circuit only on explicit save, preserving other circuits, colors and sets", async () => {
  const original = fixture(); const mounted = mount(original, true);
  const colors = new Map(cards(mounted.tree).map(card => [card.props.exercise.id, card.findAllByType(host("View"))[0].props.style[1].borderColor]));
  deleteCircuit(mounted.tree, "Circuit 2", false);
  expect(mounted.session.isUpdateNeeded).toBe(false);
  deleteCircuit(mounted.tree, "Circuit 2");
  expect(mounted.session.isUpdateNeeded).toBe(true);
  expect(workoutService.updateWorkout).not.toHaveBeenCalled();
  cards(mounted.tree).forEach(card => expect(card.findAllByType(host("View"))[0].props.style[1].borderColor).toBe(colors.get(card.props.exercise.id)));
  const saved = JSON.parse(JSON.stringify(mounted.form.getValues()));
  jest.mocked(workoutService.updateWorkout).mockResolvedValueOnce({ success: false, error: "Disk full" });
  await act(async () => { expect(await mounted.session.saveWorkout()).toEqual({ success: false }); });
  expect(mounted.session.isUpdateNeeded).toBe(true); expect(mounted.form.getValues()).toEqual(saved);
  jest.mocked(workoutService.updateWorkout).mockResolvedValueOnce({ success: true, data: saved });
  await act(async () => { expect(await mounted.session.saveWorkout()).toEqual({ success: true }); });
  const changes = jest.mocked(workoutService.updateWorkout).mock.calls.at(-1)![2];
  expect(changes.circuitRoundIdsToDelete).toEqual(["circuit-1"]);
  expect(changes.exerciseIdsToDelete).toEqual(["exercise-1-0"]);
  expect(changes.setIdsToDelete).toEqual(["exercise-1-0-set-0"]);
  expect(mounted.session.isUpdateNeeded).toBe(false);
});
it("retains metadata when the last member is individually removed and blocks explicit save", async () => {
  const original = fixture([1]); const mounted = mount(original, true);
  act(() => cards(mounted.tree)[0].props.onDelete());
  expect(mounted.form.getValues("exercises")).toEqual([]);
  expect(mounted.form.getValues("circuit_rounds")).toEqual(original.circuit_rounds);
  expect(mounted.tree.root.findAllByType(host("Text")).some(node => String(node.props.children).includes("(empty)"))).toBe(true);
  await act(async () => { expect(await mounted.session.saveWorkout()).toEqual({ success: false }); });
  expect(mounted.session.saveError?.message).toContain("empty circuit");
  expect(workoutService.updateWorkout).not.toHaveBeenCalled();
  deleteCircuit(mounted.tree, "Circuit 1");
  expect(mounted.form.getValues("circuit_rounds")).toEqual([]);
});
