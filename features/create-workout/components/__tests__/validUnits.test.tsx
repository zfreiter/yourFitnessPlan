import React from "react";
import { Pressable, Text, TextInput } from "react-native";
import TestRenderer, { act } from "react-test-renderer";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import type { UseFieldArrayReplace } from "react-hook-form";
import type { AddExerciseForm, CreateWorkoutForm, Exercise, ValidUnit, WorkoutExercise } from "@/types/interfaces/types";
import { SetCardCreator } from "../setCardCreator";
import { SetCardEditor } from "../setCardEditor";
import { ExerciseCard } from "../exerciseCard";
import { ManualSetField } from "../addExerciseModal/manualSetField";
import { NestedExerciseSetArray } from "../addExerciseModal/nestedExerciseSetArray";
import { AutoFillSetField } from "../addExerciseModal/autoFillSetField";
import { AddExerciseButton } from "../addExerciseModal/addExerciseButton";
import { ExerciseLibraryModal } from "../addExerciseModal/exerciseLibraryModal";
import { CircuitExercisePicker } from "../addCircuitModal/circuitExercisePicker";

jest.mock("react-native", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    Pressable: "Pressable", Text: "Text", TextInput: "TextInput", View: "View",
    ScrollView: "ScrollView", Modal: "Modal", StyleSheet: { create: <T,>(styles: T) => styles },
    FlatList: ({ data, renderItem }: { data: Exercise[]; renderItem: (info: { item: Exercise; index: number }) => React.ReactNode }) =>
      React.createElement("View", null, data.map((item, index) => React.createElement(React.Fragment, { key: item.id }, renderItem({ item, index })))),
  };
});
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("@/context/colorThemeContext", () => ({ useColorTheme: () => ({ theme: { color: {}, spacing: {}, fonts: {} } }) }));
const mockLibrary: Exercise[] = [];
jest.mock("@/context/workoutContext", () => ({ useWorkout: () => ({ exercises: mockLibrary }) }));
jest.mock("expo-crypto", () => { let id = 0; return { randomUUID: () => `unit-${++id}` }; });

const metrics: ValidUnit[] = ["reps", "weight", "time", "distance"];
const cases: { label: string; units: ValidUnit[] | undefined }[] = [
  { label: "reps and weight", units: ["reps", "weight"] },
  { label: "reps", units: ["reps"] },
  { label: "time", units: ["time"] },
  { label: "time and distance", units: ["time", "distance"] },
  { label: "reps, weight and time", units: ["reps", "weight", "time"] },
  { label: "empty units", units: [] },
  { label: "missing units", units: undefined },
];
function libraryExercise(id: string, units: ValidUnit[] | undefined): Exercise {
  const exercise: Exercise = { id, name: id, description: "", types: ["strength"], validUnits: units ?? [], musclesTargeted: [], equipment: [], difficulty: "beginner", noWeight: false };
  // Exercise library data can arrive without units; exercise the runtime fallback.
  if (units === undefined) Reflect.deleteProperty(exercise, "validUnits");
  return exercise;
}
function workoutExercise(id: string, units: ValidUnit[] | undefined): WorkoutExercise {
  const exercise: WorkoutExercise = { id, workout_id: "workout", exercise_id: id, exercise_name: id, exercise_order: 0, validUnits: units ?? [], sets: [] };
  if (units === undefined) Reflect.deleteProperty(exercise, "validUnits");
  return exercise;
}
const supported = (set: WorkoutExercise["sets"][number]) => metrics.filter(unit => set[unit] !== undefined);
const inputs = (tree: TestRenderer.ReactTestRenderer | TestRenderer.ReactTestInstance) =>
  ("root" in tree ? tree.root : tree).findAll(node => Object.is(node.type, TextInput));
function press(tree: TestRenderer.ReactTestRenderer, label: string) {
  const button = tree.root.findAll(node => Object.is(node.type, Pressable)).find(node =>
    node.findAll(child => Object.is(child.type, Text)).some(text => text.props.children === label));
  if (!button) throw new Error(`Missing button: ${label}`);
  act(() => button.props.onPress());
}
let trees: TestRenderer.ReactTestRenderer[] = [];
afterEach(() => { act(() => trees.forEach(tree => tree.unmount())); trees = []; mockLibrary.length = 0; });
function mount(element: Parameters<typeof TestRenderer.create>[0]) {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => { tree = TestRenderer.create(element); });
  trees.push(tree);
  return tree;
}
type AddMethods = ReturnType<typeof useForm<AddExerciseForm>>;
function mountAdd(exercises: WorkoutExercise[], content: (methods: AddMethods, fields: WorkoutExercise[], replace: UseFieldArrayReplace<AddExerciseForm, "exercises">) => React.ReactNode) {
  let api!: AddMethods;
  function Harness() {
    const methods = useForm<AddExerciseForm>({ defaultValues: { logging_style: "straight", exercises } });
    const { fields, replace } = useFieldArray({ control: methods.control, name: "exercises" });
    api = methods;
    return <FormProvider {...methods}>{content(methods, fields, replace)}</FormProvider>;
  }
  const tree = mount(<Harness />);
  return { tree, get api() { return api; } };
}

describe("valid-unit component contracts", () => {
  it.each(cases)("renders only supported creator inputs: $label", ({ units }) => {
    const exercise = workoutExercise("first", units);
    exercise.sets = [{ id: "set", workout_exercise_id: exercise.id, is_warmup: 0, is_max: 0, set_order: 1 }];
    const { tree } = mountAdd([exercise], () => <SetCardCreator exerciseIndex={0} setIndex={0} validUnits={units ?? []} />);
    const labels = tree.root.findAll(node => Object.is(node.type, Text) && metrics.some(unit => unit.toUpperCase() === node.props.children));
    expect(labels.map(node => node.props.children)).toEqual((units ?? []).map(unit => unit.toUpperCase()));
    expect(inputs(tree)).toHaveLength((units ?? []).length);
  });

  it.each(cases)("adds and renders paired manual sets through real nested arrays: $label", ({ units }) => {
    const { tree, api } = mountAdd([workoutExercise("first", units), workoutExercise("second", ["time", "distance"])], (methods, fields) =>
      <ManualSetField control={methods.control} exerciseFields={fields} />);
    press(tree, "Add Set");
    expect(tree.root.findAll(node => Object.is(node.type, NestedExerciseSetArray))).toHaveLength(2);
    const exercises = api.getValues("exercises");
    expect(exercises.map(ex => supported(ex.sets[0]))).toEqual([metrics.filter(unit => units?.includes(unit)), ["time", "distance"]]);
    const cards = tree.root.findAll(node => Object.is(node.type, SetCardCreator));
    expect(cards.map(card => card.props.validUnits)).toEqual([units ?? [], ["time", "distance"]]);
    expect(cards.map(card => inputs(card).length)).toEqual([(units ?? []).length, 2]);
    expect(exercises.map(ex => ex.sets[0].workout_exercise_id)).toEqual(["first", "second"]);
  });

  it("filters stale metrics on save without mutating the source form", () => {
    const exercise = workoutExercise("first", ["time"]);
    exercise.sets = [{ id: "set", workout_exercise_id: "first", set_order: 1, is_max: 0, is_warmup: 0, reps: 8, weight: 100, time: 30 }];
    const append = jest.fn();
    const { tree, api } = mountAdd([exercise], () => <AddExerciseButton setModalVisible={() => {}} appendExercise={append} />);
    press(tree, "Add exercise(s)");
    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0][0].sets[0]).toMatchObject({ reps: undefined, weight: undefined, time: 30 });
    expect(api.getValues("exercises.0.sets.0")).toMatchObject({ reps: 8, weight: 100, time: 30 });
  });

  it("confirms unchanged selected exercises with updated units and filters unsupported saved values", () => {
    mockLibrary.push(libraryExercise("first", ["reps", "time"]), libraryExercise("other", ["time"]));
    const first = workoutExercise("first", ["reps", "weight"]);
    first.group_type = "superset";
    first.group_id = "group";
    first.sets = [{ id: "set", workout_exercise_id: "first", reps: 8, weight: 100, set_order: 1, is_warmup: 0, is_max: 0 }];
    const other = workoutExercise("other", ["time"]);
    other.group_type = "superset";
    other.group_id = "group";
    other.sets = [{ id: "other-set", workout_exercise_id: "other", time: 42, set_order: 1, is_warmup: 0, is_max: 0 }];
    const append = jest.fn();
    const { tree, api } = mountAdd([first, other], (_, fields, replace) => <>
      <ExerciseLibraryModal selectedLoggingStyle="superset" replace={replace} workoutId="workout" exerciseCount={0} />
      <AddExerciseButton setModalVisible={() => {}} appendExercise={append} />
    </>);
    press(tree, "Choose Exercise");
    press(tree, "first");
    press(tree, "other");
    press(tree, "Confirm");
    expect(api.getValues("exercises.0.validUnits")).toEqual(["reps", "time"]);
    expect(api.getValues("exercises.1.sets")).toEqual(other.sets);
    press(tree, "Add exercise(s)");
    expect(append.mock.calls[0][0].sets[0]).toMatchObject({ reps: 8, weight: undefined });
    expect(append.mock.calls[1][0].sets).toEqual(other.sets);
    expect(other.sets[0].time).toBe(42);
  });

  it("auto-fills supported members with distinct IDs and correct parent ownership", () => {
    const { tree, api } = mountAdd([workoutExercise("first", ["reps", "weight"]), workoutExercise("second", ["time"])], (_, fields) =>
      <AutoFillSetField exerciseFields={fields} entryMethodSelector="auto_fill" />);
    press(tree, "Generate Sets");
    const [first, second] = api.getValues("exercises");
    expect(first.sets[0].reps).toBe(10);
    expect(second.sets[0].reps).toBeUndefined();
    expect(second.sets[0].weight).toBeUndefined();
    expect(second.sets[0].workout_exercise_id).toBe("second");
    expect(first.sets[0].id).not.toBe(second.sets[0].id);
  });

  it.each(cases)("creates circuit sets with only supported metrics: $label", ({ units }) => {
    mockLibrary.push(libraryExercise("circuit", units));
    const append = jest.fn();
    const tree = mount(<CircuitExercisePicker append={append} workoutId="workout" roundNumber={1} exerciseCount={0} />);
    press(tree, "Exercise(s)");
    press(tree, "circuit");
    const confirm = tree.root.findAll(node => Object.is(node.type, Pressable)).find(node => typeof node.props.disabled === "boolean");
    expect(confirm?.props.disabled).toBe(false);
    act(() => confirm!.props.onPress());
    expect(append).toHaveBeenCalledTimes(1);
    const result: WorkoutExercise = append.mock.calls[0][0];
    expect(result.validUnits).toEqual(units ?? []);
    expect(supported(result.sets[0])).toEqual(metrics.filter(unit => units?.includes(unit)));
  });

  it("edits only distance/time and clears stale weight when units change", () => {
    let api!: ReturnType<typeof useForm<CreateWorkoutForm>>;
    const exercise = workoutExercise("first", ["weight", "time"]);
    exercise.sets = [{ id: "set", workout_exercise_id: "first", set_order: 1, is_max: 0, is_warmup: 0, weight: 100, time: 30 }];
    function Harness() {
      api = useForm<CreateWorkoutForm>({ defaultValues: { exercises: [exercise] } });
      const [units, setUnits] = React.useState<ValidUnit[]>(exercise.validUnits);
      return <FormProvider {...api}>
        <Pressable onPress={() => { api.setValue("exercises.0.validUnits", ["time", "distance"]); setUnits(["time", "distance"]); }}><Text>Change units</Text></Pressable>
        <ExerciseCard exercise={{ ...exercise, validUnits: units }} exerciseOrder={0} />
      </FormProvider>;
    }
    const tree = mount(<Harness />);
    press(tree, "Change units");
    expect(api.getValues("exercises.0.sets.0.weight")).toBeUndefined();
    expect(api.getValues("exercises.0.sets.0.time")).toBe(30);
    const editor = tree.root.find(node => Object.is(node.type, SetCardEditor));
    expect(inputs(editor)).toHaveLength(2);
    act(() => { inputs(editor)[0].props.onChangeText("4.5"); inputs(editor)[1].props.onChangeText("60"); });
    expect(api.getValues("exercises.0.sets.0")).toMatchObject({ distance: 4.5, time: 60, weight: undefined });
  });
});
