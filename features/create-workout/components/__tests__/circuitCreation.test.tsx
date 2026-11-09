import { Alert } from "react-native";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { FormProvider, useForm, UseFormReturn } from "react-hook-form";
import { CreateWorkoutForm, WorkoutExercise } from "@/types/interfaces/types";
import { CircuitBuilder } from "../circuitBuilder";
import { CircuitExercisePicker } from "../addCircuitModal/circuitExercisePicker";
import { CircuitSettings } from "../addCircuitModal/circuitSettings";
import { ExerciseSetFields } from "../addCircuitModal/exerciseSetFields";
import { AddCircuitButton } from "../addCircuitModal/addCircuitButton";

// Native modals can unmount their contents on close. Keeping hidden children
// mounted here masks missed RHF notifications from hooks inside the modal.
jest.mock("react-native", () => ({ Alert: { alert: jest.fn() }, View: "View", Text: "Text", Pressable: "Pressable", TextInput: "TextInput", FlatList: "FlatList", Modal: ({ children, ...props }: any) => require("react").createElement("Modal", props, props.visible ? children : null), ScrollView: "ScrollView", KeyboardAvoidingView: "KeyboardAvoidingView", Platform: { OS: "ios" }, StyleSheet: { create: (value: unknown) => value } }));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("@expo/vector-icons/MaterialIcons", () => () => null);
jest.mock("expo-crypto", () => { let id = 0; return { randomUUID: () => `new-${++id}` }; });
jest.mock("@/context/colorThemeContext", () => ({ useColorTheme: () => ({ theme: { color: {}, spacing: {} } }) }));
jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("@/context/workoutContext", () => ({ useWorkout: () => ({ exercises: [{ id: "catalog", name: "Squat", validUnits: ["reps"], musclesTargeted: [], equipment: [] }] }) }));
jest.mock("../addCircuitModal/circuitSettings", () => ({ CircuitSettings: () => null }));

jest.mock("../addCircuitModal/notes", () => ({ Notes: () => null }));
jest.mock("../exerciseCard", () => ({ ExerciseCard: ({ groupHeader }: any) => groupHeader ?? null }));

const host = (name: string) => name as Parameters<TestRenderer.ReactTestInstance["findByType"]>[0];
let tree: TestRenderer.ReactTestRenderer;
let form: UseFormReturn<CreateWorkoutForm>;
function mount() {
  function Harness() {
    form = useForm<CreateWorkoutForm>({ defaultValues: { id: "workout", name: "Keep me", exercises: [], circuit_rounds: [] } });
    return <FormProvider {...form}><CircuitBuilder /></FormProvider>;
  }
  act(() => { tree = TestRenderer.create(<Harness /> as Parameters<typeof TestRenderer.create>[0]); });
}
function open() {
  const button = tree.root.findAllByType(host("Pressable")).find(node => node.findAllByType(host("Text")).some(text => text.props.children === "+ Circuit"))!;
  act(() => button.props.onPress());
}
function draft(names: string[]) {
  act(() => tree.root.findByType(CircuitExercisePicker).props.append(names.map(name => ({
    id: `draft-${name}`, workout_id: "workout", exercise_id: name, exercise_name: name,
    exercise_order: 0, validUnits: ["reps"], group_type: "circuit", group_id: null, round_number: 3,
    sets: [{ id: `draft-set-${name}`, workout_exercise_id: `draft-${name}`, reps: 12, set_order: 1, is_warmup: 0, is_max: 0 }],
  }))));
}
function save(twice = false) {
  const onPress = tree.root.findByType(AddCircuitButton).findByType(host("Pressable")).props.onPress;
  act(() => { onPress(); if (twice) onPress(); });
}
function empty() {
  expect(tree.root.findByType(ExerciseSetFields).props.exerciseFields).toEqual([]);
  expect(tree.root.findByType(CircuitExercisePicker).props.exerciseCount).toBe(0);
}
function move(label: string) {
  const button = tree.root.findAllByType(host("Pressable")).find(node => node.props.accessibilityLabel === label)!;
  expect(button).toBeDefined();
  expect(button.props.disabled).toBe(false);
  act(() => button.props.onPress());
}
afterEach(() => { act(() => tree.unmount()); });

it("creates isolated sequential circuits with unique relationships and preserves sets when both are reordered", () => {
  mount(); open(); empty(); draft(["a", "b", "c"]); save();
  expect(tree.root.findAllByType(host("Text")).filter(node => node.props.accessibilityRole === "alert")).toEqual([]);
  const first = JSON.parse(JSON.stringify(form.getValues()));
  open(); empty();
  expect(tree.root.findByType(CircuitSettings).props.control._getWatch("rounds")).toBe(3);
  expect(tree.root.findByType(CircuitSettings).props.control._getWatch("restAfterRound")).toBe(30);
  draft(["d", "e"]); save();
  expect(tree.root.findByType(host("Modal")).props.visible).toBe(false);
  expect(tree.root.findAllByType(AddCircuitButton)).toEqual([]);
  expect(tree.root.findAllByType(host("Text")).filter(node => node.props.accessibilityRole === "alert")).toEqual([]);
  const exercises = form.getValues("exercises")!;
  const circuits = form.getValues("circuit_rounds")!;
  expect(exercises).toHaveLength(5); expect(circuits).toHaveLength(2);
  expect(exercises.slice(0, 3)).toEqual(first.exercises);
  expect(circuits[0]).toEqual(first.circuit_rounds[0]);
  expect(circuits[0].id).not.toBe(circuits[1].id);
  exercises.forEach((exercise, index) => {
    expect(exercise).toMatchObject({ exercise_id: ["a", "b", "c", "d", "e"][index], circuit_id: circuits[index < 3 ? 0 : 1].id, group_id: circuits[index < 3 ? 0 : 1].id, group_type: "circuit", round_number: 3 });
    expect(exercise.sets[0]).toMatchObject({ workout_exercise_id: exercise.id, reps: 12 });
  });
  const ids = exercises.flatMap(exercise => [exercise.id, ...exercise.sets.map(set => set.id)]);
  expect(new Set(ids).size).toBe(ids.length);
  const snapshot = JSON.parse(JSON.stringify(exercises)) as WorkoutExercise[];
  move("Move Circuit 1 down");
  expect(form.getValues("exercises")!.map(exercise => exercise.exercise_id)).toEqual(["d", "e", "a", "b", "c"]);
  move("Move Circuit 1 down");
  expect(form.getValues("exercises")).toEqual(snapshot);
  expect(form.getValues("circuit_rounds")).toEqual(circuits);
  expect(form.getValues("name")).toBe("Keep me");
});

it.each(["cancel", "native close"])("discards drafts on %s and preserves saved circuits and sets", close => {
  mount(); open(); draft(["saved"]); save();
  const saved = JSON.parse(JSON.stringify(form.getValues()));
  open(); draft(["discarded"]);
  expect(tree.root.findByType(AddCircuitButton).findByType(host("Pressable")).props.disabled).toBe(false);
  act(() => {
    if (close === "native close") tree.root.findAllByType(host("Modal")).find(node => node.props.onRequestClose)!.props.onRequestClose();
    else tree.root.findAllByType(host("Pressable")).find(node => node.props.style?.alignSelf === "flex-end")!.props.onPress();
  });
  expect(form.getValues()).toEqual(saved);
  open(); empty(); expect(form.getValues()).toEqual(saved);
  expect(tree.root.findByType(AddCircuitButton).findByType(host("Pressable")).props.disabled).toBe(true);
});

it("ignores repeated submissions and accepts a fresh submission after reopening", () => {
  mount(); open();
  const oldPress = tree.root.findByType(AddCircuitButton).findByType(host("Pressable")).props.onPress;
  act(() => oldPress());
  expect(form.getValues("circuit_rounds")).toEqual([]);
  draft(["a"]); save(true);
  open(); empty(); draft(["b"]);
  expect(form.getValues("exercises")).toHaveLength(1);
  save(true);
  expect(form.getValues("exercises")).toHaveLength(2);
  expect(form.getValues("circuit_rounds")).toHaveLength(2);
});



function chooseSquat() {
  const picker = tree.root.findByType(CircuitExercisePicker);
  act(() => picker.findAllByType(host("Pressable"))[0].props.onPress());
  const list = picker.findByType(host("FlatList"));
  act(() => list.props.renderItem({ item: list.props.data[0] }).props.onPress());
  const buttons = picker.findAllByType(host("Pressable"));
  act(() => buttons[buttons.length - 1].props.onPress());
}
const draftValues = () => tree.root.findByType(AddCircuitButton).props.getValues("exercises") as WorkoutExercise[];

it("edits a draft with duplicate catalog selections, preserving the other instance and its edited sets", async () => {
  mount(); open(); draft(["existing"]); save();
  const saved = JSON.parse(JSON.stringify(form.getValues()));
  open(); chooseSquat(); chooseSquat();
  const before = draftValues();
  expect(before.map(exercise => exercise.exercise_id)).toEqual(["catalog", "catalog"]);
  expect(before[0].id).not.toBe(before[1].id);
  expect(before[0].sets[0].id).not.toBe(before[1].sets[0].id);
  const inputs = tree.root.findByType(ExerciseSetFields).findAllByType(host("TextInput"));
  await act(async () => { await inputs[1].props.onChangeText("27"); });
  const remaining = JSON.parse(JSON.stringify(draftValues()[1]));
  const remove = tree.root.findAllByType(host("Pressable")).find(node => node.props.accessibilityLabel === "Remove Squat, selection 1")!;
  expect(remove.props.accessibilityRole).toBe("button");
  act(() => remove.props.onPress());
  expect(draftValues()).toEqual([remaining]);
  expect(tree.root.findByType(ExerciseSetFields).findByType(host("TextInput")).props.value).toBe("27");
  expect(form.getValues()).toEqual(saved);
  chooseSquat();
  expect(draftValues()).toHaveLength(2);
  expect(draftValues()[0]).toEqual(remaining);
  expect(draftValues()[1].id).not.toBe(remaining.id);
  save(true);
  expect(form.getValues("exercises")).toHaveLength(3);
  expect(form.getValues("exercises.0")).toEqual(saved.exercises[0]);
  expect(form.getValues("exercises.1.sets.0.reps")).toBe(27);
  open(); empty();
});





function confirmDelete(label: string, confirm = true) {
  const button = tree.root.findAllByType(host("Pressable")).find(node => node.props.accessibilityLabel === `Delete ${label}`)!;
  act(() => button.props.onPress());
  const options = jest.mocked(Alert.alert).mock.calls.at(-1)![2]!;
  act(() => options.find(option => option.style === (confirm ? "destructive" : "cancel"))!.onPress?.());
}
it.each([1, 2, 3])("deletes complete circuit %s during creation and reorders survivors", number => {
  mount();
  ["a", "b", "c"].forEach(name => { open(); draft([name]); save(); });
  const original = JSON.parse(JSON.stringify(form.getValues()));
  confirmDelete(`Circuit ${number}`, false);
  expect(form.getValues()).toEqual(original);
  confirmDelete(`Circuit ${number}`);
  expect(form.getValues("circuit_rounds")).toEqual(original.circuit_rounds.filter((_: unknown, index: number) => index !== number - 1));
  const survivors = original.exercises.filter((_: unknown, index: number) => index !== number - 1);
  expect(form.getValues("exercises")).toEqual(survivors.map((exercise: WorkoutExercise, exercise_order: number) => ({ ...exercise, exercise_order })));
  move("Move Circuit 1 down");
  expect(form.getValues("exercises")!.map(exercise => exercise.id)).toEqual(survivors.reverse().map((exercise: WorkoutExercise) => exercise.id));
});

it("keeps the last removed exercise's circuit editable, refills the same identity, and resets canceled drafts", () => {
  mount(); open(); chooseSquat(); save();
  const circuit = JSON.parse(JSON.stringify(form.getValues("circuit_rounds.0")));
  const removeSaved = () => act(() => form.setValue("exercises", []));
  removeSaved();
  expect(form.getValues("circuit_rounds.0")).toEqual(circuit);
  const refill = () => act(() => tree.root.findAllByType(host("Pressable")).find(node => node.props.accessibilityLabel === "Add exercises to Circuit 1")!.props.onPress());
  refill(); empty(); chooseSquat();
  act(() => tree.root.findAllByType(host("Modal")).find(node => node.props.onRequestClose)!.props.onRequestClose());
  refill(); empty(); chooseSquat(); save();
  expect(form.getValues("circuit_rounds")).toEqual([circuit]);
  expect(form.getValues("exercises.0")).toMatchObject({ circuit_id: circuit.id, group_id: circuit.id, round_number: circuit.round_number });
});

it("disables the real modal button after removing its final exercise and after each successful add", () => {
  mount(); open();
  const button = () => tree.root.findByType(AddCircuitButton).findByType(host("Pressable"));
  expect(button().props.disabled).toBe(true);
  chooseSquat(); expect(button().props.disabled).toBe(false);
  act(() => tree.root.findAllByType(host("Pressable")).find(node => node.props.accessibilityLabel === "Remove Squat, selection 1")!.props.onPress());
  expect(button().props.disabled).toBe(true);
  chooseSquat(); expect(button().props.disabled).toBe(false); save(true);
  open(); expect(button().props.disabled).toBe(true);
  chooseSquat(); expect(button().props.disabled).toBe(false); save();
  open(); expect(button().props.disabled).toBe(true);
  expect(form.getValues("exercises")).toHaveLength(2);
});
