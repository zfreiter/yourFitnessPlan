import React from "react";
import { Alert } from "react-native";
import TestRenderer, { act } from "react-test-renderer";
import { FormProvider, useForm, UseFormReturn } from "react-hook-form";
import { Workout } from "@/types/interfaces/types";
import { CreateWorkoutButton } from "../createWorkoutButton";
import UpdateManagerFabButton from "@/features/workout-session/components/updateManagerFabButton";
import { WorkoutSessionProvider, useWorkoutSession, WorkoutSessionContextType } from "@/context/WorkoutSessionContext";
import { workoutService } from "@/services/workoutService";

jest.mock("react-native", () => ({ Alert: { alert: jest.fn() }, View: "View", Text: "Text", Pressable: "Pressable", ActivityIndicator: "ActivityIndicator", StyleSheet: { create: (value: unknown) => value } }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
jest.mock("@expo/vector-icons/MaterialIcons", () => "MaterialIcons");
jest.mock("@/context/colorThemeContext", () => ({ useColorTheme: () => ({ theme: { color: { danger: "red", disabled: "gray", accent: "blue", accentActive: "green" }, spacing: {} } }) }));
jest.mock("@/context/authContext", () => ({ useAuth: () => ({ user: { id: "user" }, sessionKey: "session" }) }));
jest.mock("@/context/workoutContext", () => ({ useWorkout: () => ({ insertWorkout: jest.fn(), reloadWorkout: jest.fn() }) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/services/workoutService", () => ({ workoutService: { insertWorkout: jest.fn(), updateWorkout: jest.fn() } }));

const host = (name: string) => name as Parameters<TestRenderer.ReactTestInstance["findByType"]>[0];
function fixture(type: Workout["workoutType"] = "circuit"): Workout {
  return { id: "workout", user_id: "user", name: "Workout", workoutType: type,
    scheduled_datetime: "2030-04-07T17:35:00.000Z", is_completed: 0, cardio_entries: [],
    circuit_rounds: type === "circuit" ? [{ id: "circuit", workout_id: "workout", round_number: 3, rest_after_round: 30 }] : [],
    exercises: type === "circuit" ? [{ id: "instance", workout_id: "workout", exercise_id: "catalog", exercise_name: "Squat", exercise_order: 0,
      circuit_id: "circuit", group_id: "circuit", group_type: "circuit", round_number: 3, validUnits: ["reps"], sets: [] }] : [] };
}
const trees: TestRenderer.ReactTestRenderer[] = [];
function mount(saved: boolean, workout = fixture()) {
  let form!: UseFormReturn<Workout>;
  let session!: WorkoutSessionContextType;
  function Probe() { session = useWorkoutSession(); return <UpdateManagerFabButton />; }
  function Harness() {
    form = useForm<Workout>({ defaultValues: workout });
    return <FormProvider {...form}>{saved ? <WorkoutSessionProvider workout={workout}><Probe /></WorkoutSessionProvider> : <CreateWorkoutButton />}</FormProvider>;
  }
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => { tree = TestRenderer.create(<Harness /> as Parameters<typeof TestRenderer.create>[0]); });
  trees.push(tree);
  if (saved) act(() => form.setValue("name", "Edited workout"));
  return { tree, get form() { return form; }, get session() { return session; } };
}
const button = (tree: TestRenderer.ReactTestRenderer) => tree.root.findByType(host("Pressable"));
const messages = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAllByType(host("Text")).filter(node => node.props.accessibilityRole === "alert").map(node => node.props.children);
const message = (number: number) => `Circuit ${number} has no exercises. Add an exercise or delete the circuit to save your workout.`;
afterEach(() => { act(() => trees.splice(0).forEach(tree => tree.unmount())); jest.clearAllMocks(); });

describe.each([false, true])("save validation (saved workout: %s)", saved => {
  it("disables an empty circuit reactively and enables after refilling or deleting metadata", () => {
    const { tree, form } = mount(saved);
    const exercises = form.getValues("exercises");
    expect(button(tree).props.disabled).toBe(false);
    act(() => form.setValue("exercises", []));
    expect(button(tree).props.disabled).toBe(true);
    expect(button(tree).props.accessibilityState.disabled).toBe(true);
    expect(messages(tree)).toEqual([message(1)]);
    if (!saved) expect(button(tree).props.style({ pressed: false }).at(-1).backgroundColor).toBe("gray");
    else expect(button(tree).findByType(host("MaterialIcons")).props.color).toBe("gray");
    act(() => form.setValue("exercises", exercises));
    expect(button(tree).props.disabled).toBe(false); expect(messages(tree)).toEqual([]);
    act(() => form.setValue("exercises", []));
    act(() => form.setValue("circuit_rounds", []));
    expect(button(tree).props.disabled).toBe(false); expect(messages(tree)).toEqual([]);
  });

  it("disables metadata-only empty circuits and identifies the empty circuit among multiple circuits", () => {
    const { tree, form } = mount(saved);
    act(() => form.setValue("circuit_rounds", [...form.getValues("circuit_rounds"), { id: "second", workout_id: "workout", round_number: 5, rest_after_round: 60 }]));
    expect(button(tree).props.disabled).toBe(true); expect(messages(tree)).toEqual([message(2)]);
    act(() => form.setValue("exercises", [...form.getValues("exercises"), { ...fixture().exercises[0], id: "second-instance", circuit_id: "second", group_id: "second", round_number: 5, exercise_order: 1 }]));
    expect(button(tree).props.disabled).toBe(false);
    act(() => form.setValue("exercises", []));
    expect(messages(tree)).toEqual([message(1), message(2)]);
  });

  it.each(["strength", "cardio"] as const)("keeps valid %s workouts enabled", type => {
    const { tree } = mount(saved, fixture(type));
    expect(button(tree).props.disabled).toBe(false); expect(messages(tree)).toEqual([]);
  });

  it("disables during submission and enables again after a failed save", async () => {
    const mounted = mount(saved);
    let resolve!: (value: { success: boolean; error: string }) => void;
    const service = saved ? jest.mocked(workoutService.updateWorkout) : jest.mocked(workoutService.insertWorkout);
    service.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    let saving!: Promise<unknown>;
    act(() => { saving = button(mounted.tree).props.onPress(); });
    expect(button(mounted.tree).props.disabled).toBe(true);
    expect(button(mounted.tree).props.accessibilityState.busy).toBe(true);
    await act(async () => { resolve({ success: false, error: "Disk full" }); await saving; });
    expect(button(mounted.tree).props.disabled).toBe(false);
    expect(button(mounted.tree).props.accessibilityState.busy).toBe(false);
  });

  it("retains handler validation when a previously enabled handler is invoked with an empty circuit", async () => {
    const mounted = mount(saved);
    const onPress = button(mounted.tree).props.onPress;
    act(() => mounted.form.setValue("exercises", []));
    await act(async () => { await onPress(); });
    expect(workoutService.insertWorkout).not.toHaveBeenCalled();
    expect(workoutService.updateWorkout).not.toHaveBeenCalled();
    if (saved) expect(mounted.session.saveError?.message).toContain("empty circuit");
    else expect(Alert.alert).toHaveBeenCalledWith("Empty circuit", expect.stringContaining("empty circuit"));
  });
});

it("keeps the creation name requirement and the saved workout no-change requirement", () => {
  const created = mount(false);
  act(() => created.form.setValue("name", " "));
  expect(button(created.tree).props.disabled).toBe(true);
  const saved = mount(true);
  act(() => saved.form.setValue("name", "Workout"));
  expect(button(saved.tree).props.disabled).toBe(true);
});
