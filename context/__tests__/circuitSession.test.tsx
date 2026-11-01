import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { FormProvider, useForm } from "react-hook-form";
import { Workout } from "@/types/interfaces/types";
import { WorkoutSessionProvider, useWorkoutSession, WorkoutSessionContextType } from "../WorkoutSessionContext";
import { DateTimePickerInput } from "@/features/create-workout/components/dateTimePicker";
import { AddCircuitButton } from "@/features/create-workout/components/addCircuitModal/addCircuitButton";
import { CircuitBuilder } from "@/features/create-workout/components/circuitBuilder";
import { workoutService } from "@/services/workoutService";
import { changeScheduledDate, initialScheduledDate, parseScheduledDate, serializeScheduledDate } from "@/utils/scheduledDate";

jest.mock("react-native", () => ({ View: "View", Text: "Text", Pressable: "Pressable", TextInput: "TextInput", StyleSheet: { create: (styles: any) => styles } }));
jest.mock("@react-native-community/datetimepicker", () => "DatePicker");
jest.mock("@/context/colorThemeContext", () => ({ useColorTheme: () => ({ theme: { color: {}, spacing: {} } }) }));
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }], getCalendars: () => [{}] }));
jest.mock("expo-router", () => ({ useLocalSearchParams: () => ({ date: "2099-01-01" }) }));
jest.mock("@expo/vector-icons/AntDesign", () => () => null);
jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("expo-crypto", () => ({ randomUUID: () => "generated-id" }));
jest.mock("@/features/create-workout/components/addCircuitModal", () => ({ AddCircuitModal: () => null }));
jest.mock("@/context/workoutContext", () => ({ useWorkout: () => ({ insertWorkout: jest.fn(), reloadWorkout: jest.fn() }) }));
jest.mock("@/context/authContext", () => ({ useAuth: () => ({ user: { id: "user" } }) }));
jest.mock("@/services/workoutService", () => ({ workoutService: { updateWorkout: jest.fn() } }));

type Host = Parameters<TestRenderer.ReactTestInstance["findByType"]>[0];
const host = (name: string) => name as Host;
const fixture = (): Workout => ({
  id: "workout", user_id: "user", name: "Circuit", workoutType: "circuit", scheduled_datetime: "2030-04-07T17:35:00.000Z", is_completed: 0, completed_at: null,
  exercises: [{ id: "exercise", workout_id: "workout", exercise_id: "catalog", exercise_name: "Reps", exercise_order: 1, validUnits: ["reps"], group_id: "round", group_type: "circuit", circuit_id: "round", round_number: 3,
    sets: [{ id: "set", workout_exercise_id: "exercise", set_order: 1, reps: 12, weight: 0, time: null, distance: null, is_warmup: 0, is_max: 0 } as any] }],
  circuit_rounds: [{ id: "round", workout_id: "workout", round_number: 3, rest_after_round: 60 }], cardio_entries: [],
});
let api!: ReturnType<typeof useForm<Workout>>, session!: WorkoutSessionContextType;
const trees: TestRenderer.ReactTestRenderer[] = [];
function Probe() { session = useWorkoutSession(); return null; }
async function mount(workout = fixture()) {
  function Harness() {
    api = useForm<Workout>({ defaultValues: { ...workout, description: workout.description ?? "", completed_at: workout.completed_at ?? null } });
    return <FormProvider {...api}><WorkoutSessionProvider workout={workout}><DateTimePickerInput /><CircuitBuilder /><Probe /></WorkoutSessionProvider></FormProvider>;
  }
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<Harness /> as Parameters<typeof TestRenderer.create>[0]); });
  trees.push(tree);
  return tree;
}
afterEach(() => { act(() => trees.splice(0).forEach(tree => tree.unmount())); jest.clearAllMocks(); });

it("opens a saved circuit clean without changing its date or inactive persisted set values", async () => {
  const original = fixture();
  await mount(original);
  expect(api.getValues("scheduled_datetime")).toBe(original.scheduled_datetime);
  expect(api.getValues("exercises.0.sets.0")).toEqual(original.exercises[0].sets[0]);
  expect(session.isUpdateNeeded).toBe(false);
  expect(workoutService.updateWorkout).not.toHaveBeenCalled();
});
it("tracks actual set edits, clears successful saves, and reopens clean", async () => {
  const original = fixture();
  const tree = await mount(original);
  const input = tree.root.findAllByType(host("TextInput"))[0];
  await act(async () => { await input.props.onChangeText("15"); });
  expect(session.isUpdateNeeded).toBe(true);
  const saved = api.getValues();
  jest.mocked(workoutService.updateWorkout).mockResolvedValue({ success: true, data: saved });
  await act(async () => { expect(await session.saveWorkout()).toEqual({ success: true }); });
  expect(session.isUpdateNeeded).toBe(false);
  expect(api.getValues("scheduled_datetime")).toBe(original.scheduled_datetime);
  const changes = jest.mocked(workoutService.updateWorkout).mock.calls[0][2];
  expect(changes.workout).toBeUndefined();
  expect(changes.setsToUpdate[0]).toMatchObject({ id: "set", reps: 15 });
  await mount(saved);
  expect(session.isUpdateNeeded).toBe(false);
});
it("retains pending changes after a failed save", async () => {
  await mount();
  act(() => api.setValue("name", "Changed"));
  jest.mocked(workoutService.updateWorkout).mockResolvedValue({ success: false, error: "SQLite write failed" });
  await act(async () => { expect(await session.saveWorkout()).toEqual({ success: false }); });
  expect(session.isUpdateNeeded).toBe(true);
  expect(session.saveError?.message).toBe("SQLite write failed");
  expect(api.getValues("name")).toBe("Changed");
});
it("retains edits made while a successful save is in flight", async () => {
  await mount();
  act(() => api.setValue("name", "First edit"));
  const submitted = api.getValues();
  let finish!: (result: any) => void;
  jest.mocked(workoutService.updateWorkout).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  let saving!: Promise<{ success: boolean }>;
  act(() => { saving = session.saveWorkout(); });
  act(() => api.setValue("name", "Second edit"));
  await act(async () => { finish({ success: true, data: submitted }); await saving; });
  expect(api.getValues("name")).toBe("Second edit");
  expect(session.isUpdateNeeded).toBe(true);
});
it("preserves the existing clock when selecting a new date and ignores dismissed events", async () => {
  const tree = await mount();
  act(() => tree.root.findAllByType(host("Pressable"))[0].props.onPress());
  const picker = () => tree.root.findByType(host("DatePicker"));
  act(() => picker().props.onChange({ type: "dismissed" }, new Date()));
  expect(api.getValues("scheduled_datetime")).toBe(fixture().scheduled_datetime);
  act(() => tree.root.findAllByType(host("Pressable"))[0].props.onPress());
  const selected = new Date(picker().props.value); selected.setDate(selected.getDate() + 2);
  const previous = new Date(api.getValues("scheduled_datetime"));
  act(() => picker().props.onChange({ type: "set" }, selected));
  const updated = new Date(api.getValues("scheduled_datetime"));
  expect(updated.getHours()).toBe(previous.getHours());
  expect(updated.getMinutes()).toBe(previous.getMinutes());
  expect(updated.getDate()).toBe(selected.getDate());
  act(() => picker().props.onChange({ type: "set" }, selected));
  expect(session.isUpdateNeeded).toBe(true);
});
it.each(["", "invalid", "2030-02-30T12:00", "2030-01-01T25:00"])("does not replace invalid saved date %s with today", async scheduled_datetime => {
  await mount({ ...fixture(), scheduled_datetime });
  expect(api.getValues("scheduled_datetime")).toBe(scheduled_datetime);
  expect(session.isUpdateNeeded).toBe(false);
  expect(() => serializeScheduledDate(scheduled_datetime)).toThrow("Scheduled date");
});
it("initializes only new workouts and retains canonical timestamp formatting", () => {
  const value = initialScheduledDate("2030-02-03");
  const parsed = parseScheduledDate(value)!;
  expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), parsed.getHours()]).toEqual([2030,1,3,12]);
  expect(serializeScheduledDate("2030-02-03 14:25")).toBe("2030-02-03T14:25");
  const selected = new Date(2030,1,5,11,45);
  expect(changeScheduledDate("2030-02-03T14:25", selected, "date")).toBe(new Date(2030, 1, 5, 14, 25).toISOString());
});

it("adds circuit notes and explicit round relationships without touching the scheduled date", async () => {
  let form!: ReturnType<typeof useForm<Workout>>;
  const draft = {
    rounds: 3, restAfterRound: 45, notes: "Keep steady", exercises: fixture().exercises,
  };
  function Harness() {
    form = useForm<Workout>({ defaultValues: { ...fixture(), exercises: [], circuit_rounds: [] } });
    return <FormProvider {...form}><AddCircuitButton workoutId="workout"
      setModalVisible={jest.fn()} reset={jest.fn()}
      getValues={((key: keyof typeof draft) => draft[key]) as any}
      appendExercise={((exercise: any) => form.setValue("exercises", [...form.getValues("exercises"), exercise])) as any}
    /></FormProvider>;
  }
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<Harness /> as Parameters<typeof TestRenderer.create>[0]); });
  trees.push(tree);
  act(() => tree.root.findByType(host("Pressable")).props.onPress());
  expect(form.getValues("scheduled_datetime")).toBe(fixture().scheduled_datetime);
  expect(form.getValues("circuit_rounds.0")).toMatchObject({ id: "generated-id", notes: "Keep steady", round_number: 3, rest_after_round: 45 });
  expect(form.getValues("exercises.0")).toMatchObject({ circuit_id: "generated-id", group_id: "generated-id", round_number: 3 });
});
