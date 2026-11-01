import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { FormProvider, useForm } from "react-hook-form";
import { WorkoutProvider, useWorkout } from "../workoutContext";
import { WorkoutSessionProvider, useWorkoutSession, WorkoutSessionContextType } from "../WorkoutSessionContext";
import { workoutService } from "@/services/workoutService";
import { exerciseService } from "@/services/exerciseService";
import { Workout, CreateWorkoutForm } from "@/types/interfaces/types";
import { CreateWorkoutButton } from "@/features/create-workout/components/createWorkoutButton";
import TodaysWorkout from "@/features/home/TodaysWorkout/TodaysWorkout";
import CalendarIndex from "@/features/calendar/components/calendar";

const mockAuth = { user: { id: "user" }, isLoading: false, isSynced: true };
const mockSync = { workoutRevision: 0, isSyncLoading: false, isProfileSet: true };
jest.mock("@/context/authContext", () => ({ useAuth: () => mockAuth }));
jest.mock("@/context/AppInitContext", () => ({ useAppInit: () => ({ isAppInitLoading: false }) }));
jest.mock("@/context/SyncContext", () => ({ useSync: () => mockSync }));
jest.mock("@/services/workoutService", () => ({ workoutService: { getAllWorkouts: jest.fn(), getWorkoutById: jest.fn(), insertWorkout: jest.fn(), updateWorkout: jest.fn(), deleteWorkout: jest.fn(), getWorkoutsByMonth: jest.fn() } }));
jest.mock("@/services/exerciseService", () => ({ exerciseService: { getExercises: jest.fn() } }));
jest.mock("@/services/setService", () => ({ setService: {} }));
jest.mock("@/services/database", () => ({}));
jest.mock("react-native", () => ({ Text: "Text", View: "View", Pressable: "Pressable", ScrollView: "ScrollView", StyleSheet: { create: (value: any) => value } }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }), useFocusEffect: jest.fn() }));
jest.mock("react-native-calendars", () => ({ Calendar: "Calendar" }));
jest.mock("@/components/fabButton", () => () => null);
jest.mock("@/context/colorThemeContext", () => ({ useColorTheme: () => ({ theme: { color: {}, spacing: {}, fonts: {} } }) }));
jest.mock("@/features/home/TodaysWorkout/WorkoutCard", () => ({ __esModule: true, default: ({ workout }: { workout: Workout }) => {
  const React = require("react"); return React.createElement("Text", null, `${workout.id}:${workout.name}:${workout.scheduled_datetime}`);
} }));
const date = new Date(); date.setHours(12,0,0,0);
const fixture = (id = "workout", workoutType: Workout["workoutType"] = "strength"): Workout => ({
  id, user_id: "user", name: id, workoutType, scheduled_datetime: date.toISOString(), is_completed: 0, completed_at: null,
  exercises: [], cardio_entries: [], circuit_rounds: [],
});
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
let api!: ReturnType<typeof useWorkout>, session!: WorkoutSessionContextType, form!: ReturnType<typeof useForm<Workout>>;
let renders = 0;
const trees: TestRenderer.ReactTestRenderer[] = [];
function Probe() { api = useWorkout(); renders++; return null; }
function Session({ workout }: { workout: Workout }) {
  form = useForm<Workout>({ defaultValues: workout });
  return <FormProvider {...form}><WorkoutSessionProvider workout={workout}><SessionProbe /></WorkoutSessionProvider></FormProvider>;
}
function SessionProbe() { session = useWorkoutSession(); return null; }
function Create({ workout }: { workout: Workout }) {
  const methods = useForm<CreateWorkoutForm>({ defaultValues: workout });
  return <FormProvider {...methods}><CreateWorkoutButton /></FormProvider>;
}
async function mount(children: React.ReactNode = null) {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(<WorkoutProvider><Probe />{children}</WorkoutProvider> as Parameters<typeof TestRenderer.create>[0]); });
  trees.push(tree); return tree;
}
function texts(tree: TestRenderer.ReactTestRenderer) { return tree.root.findAllByType("Text" as any).map(node => node.props.children); }
beforeEach(() => {
  mockAuth.user = { id: "user" }; mockSync.workoutRevision = 0; renders = 0;
  jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([]);
  jest.mocked(exerciseService.getExercises).mockResolvedValue([]);
});
afterEach(() => { act(() => trees.splice(0).forEach(tree => tree.unmount())); jest.resetAllMocks(); });

it.each(["strength", "cardio", "circuit"] as const)("publishes committed %s creation to Home and Calendar without a remote request", async type => {
  const entered = fixture("new", type), saved = { ...entered, description: "hydrated", duration: 42 };
  const commit = deferred<any>();
  jest.mocked(workoutService.insertWorkout).mockReturnValue(commit.promise);
  const tree = await mount(<><TodaysWorkout /><CalendarIndex /><Create workout={entered} /></>);
  const create = tree.root.findAllByType("Pressable" as any).find(node => node.findAllByType("Text" as any).some(text => text.props.children === "Create workout"))!;
  let saving: any;
  act(() => { saving = create.props.onPress(); });
  expect(api.workouts).toEqual([]);
  await act(async () => { commit.resolve({ success: true, data: saved }); await saving; });
  expect(api.workouts).toEqual([saved]);
  expect(api.workouts[0]).not.toBe(saved);
  expect(texts(tree).filter(text => typeof text === "string" && text.startsWith("new:new:"))).toHaveLength(2);
  act(() => api.insertWorkout(saved));
  expect(api.workouts).toHaveLength(1);
});
it("does not publish failed creation", async () => {
  jest.mocked(workoutService.insertWorkout).mockResolvedValue({ success: false, error: "SQLite failed" });
  const tree = await mount(<Create workout={fixture()} />);
  const button = tree.root.findAllByType("Pressable" as any)[0];
  await act(async () => { await button.props.onPress(); });
  expect(api.workouts).toEqual([]);
});
it.each(["strength", "cardio", "circuit"] as const)("session saves replace the hydrated %s record and notify subscribers", async type => {
  const stored = fixture("workout", type);
  jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([stored]);
  await mount(<Session workout={stored} />);
  const before = api.workouts, rowBefore = before[0], count = renders;
  act(() => form.setValue("name", "Edited"));
  const saved = { ...stored, name: "Edited", exercises: [{ id: "exercise", workout_id: stored.id, exercise_name: "Movement", exercise_order: 1, validUnits: ["reps"], sets: [{ id: "set", workout_exercise_id: "exercise", reps: 15, set_order: 1, is_warmup: 0, is_max: 0 }] }] } as Workout;
  jest.mocked(workoutService.updateWorkout).mockResolvedValue({ success: true, data: saved });
  await act(async () => { expect((await session.saveWorkout()).success).toBe(true); });
  expect(api.workouts[0]).toEqual(saved);
  expect(api.workouts).not.toBe(before); expect(api.workouts[0]).not.toBe(rowBefore); expect(renders).toBeGreaterThan(count);
  expect(session.isUpdateNeeded).toBe(false);
  expect(workoutService.getAllWorkouts).toHaveBeenCalledTimes(1);
});
it("keeps committed context and pending form edits when SQLite save fails", async () => {
  const stored = fixture(); jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([stored]);
  await mount(<Session workout={stored} />);
  act(() => form.setValue("name", "Unsaved"));
  jest.mocked(workoutService.updateWorkout).mockResolvedValue({ success: false, error: "Transaction rolled back" });
  await act(async () => { await session.saveWorkout(); });
  expect(api.workouts[0].name).toBe(stored.name); expect(session.isUpdateNeeded).toBe(true);
});
it("moves a changed schedule between Home and Calendar immediately", async () => {
  const stored = fixture(); jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([stored]);
  const tree = await mount(<><TodaysWorkout /><CalendarIndex /></>);
  const nextDate = new Date(date); nextDate.setDate(nextDate.getDate()+1);
  act(() => api.insertWorkout({ ...stored, scheduled_datetime: nextDate.toISOString() }));
  expect(api.currentWorkouts).toHaveLength(0);
  expect(texts(tree).some(text => typeof text === "string" && text.startsWith("workout:workout:"))).toBe(false);
  act(() => tree.root.findByType("Calendar" as any).props.onDayPress({ dateString: `${nextDate.getFullYear()}-${String(nextDate.getMonth()+1).padStart(2,"0")}-${String(nextDate.getDate()).padStart(2,"0")}` }));
  expect(texts(tree)).toContain(`workout:workout:${nextDate.toISOString()}`);
});
it("removes a workout only after successful deletion and propagates failures", async () => {
  const stored = fixture(); jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([stored]); await mount();
  jest.mocked(workoutService.deleteWorkout).mockResolvedValueOnce({ success: false, error: "Delete failed" });
  await act(async () => { expect((await api.deleteWorkout("user", stored.id)).success).toBe(false); });
  expect(api.workouts).toHaveLength(1);
  jest.mocked(workoutService.deleteWorkout).mockResolvedValueOnce({ success: true });
  await act(async () => { expect((await api.deleteWorkout("user", stored.id)).success).toBe(true); });
  expect(api.workouts).toEqual([]);
});
it("retries an older full load instead of overwriting a committed creation", async () => {
  const old = deferred<Workout[]>(), stored = fixture();
  jest.mocked(workoutService.getAllWorkouts).mockReturnValueOnce(old.promise).mockResolvedValue([stored]);
  await mount(); act(() => api.insertWorkout(stored));
  await act(async () => { old.resolve([]); });
  expect(api.workouts).toEqual([stored]);
  expect(workoutService.getAllWorkouts).toHaveBeenCalledTimes(2);
});
it("ignores a superseded load and prevents deleted records returning from an older snapshot", async () => {
  const stored = fixture(), old = deferred<Workout[]>();
  jest.mocked(workoutService.getAllWorkouts).mockResolvedValueOnce([stored]).mockReturnValueOnce(old.promise).mockResolvedValue([]);
  await mount(); let loading: Promise<void>;
  act(() => { loading = api.reloadWorkouts(); });
  jest.mocked(workoutService.deleteWorkout).mockResolvedValue({ success: true });
  await act(async () => { await api.deleteWorkout("user", stored.id); old.resolve([stored]); await loading!; });
  expect(api.workouts).toEqual([]);
});
it("prevents an older targeted read from overwriting a newer record", async () => {
  const stored = fixture(), old = deferred<Workout | null>(); await mount();
  jest.mocked(workoutService.getWorkoutById).mockReturnValue(old.promise);
  let loading!: Promise<void>;
  act(() => { loading = api.reloadWorkout(stored.id); api.insertWorkout({ ...stored, name: "Newest" }); });
  await act(async () => { old.resolve(stored); await loading; });
  expect(api.workouts[0].name).toBe("Newest");
});
it("reloads committed refresh data and ignores a previous account's load", async () => {
  const old = deferred<Workout[]>(); jest.mocked(workoutService.getAllWorkouts).mockReturnValueOnce(old.promise).mockResolvedValue([]);
  const tree = await mount();
  mockAuth.user = { id: "other" }; mockSync.workoutRevision++;
  await act(async () => tree.update(<WorkoutProvider><Probe /></WorkoutProvider> as any));
  await act(async () => { old.resolve([fixture()]); });
  expect(api.workouts).toEqual([]);
  const fetched = { ...fixture(), user_id: "other", name: "Refreshed" };
  jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([fetched]); mockSync.workoutRevision++;
  await act(async () => tree.update(<WorkoutProvider><Probe /></WorkoutProvider> as any));
  expect(api.workouts).toEqual([fetched]);
});

it("ignores a superseded full load when a later reload finishes first", async () => {
  const old = deferred<Workout[]>(), newer = fixture("newer");
  jest.mocked(workoutService.getAllWorkouts).mockReturnValueOnce(old.promise).mockResolvedValueOnce([newer]);
  await mount();
  await act(async () => { await api.reloadWorkouts(); });
  await act(async () => { old.resolve([fixture("older")]); });
  expect(api.workouts).toEqual([newer]);
});
it("does not let a targeted read overwrite an accepted full refresh", async () => {
  const old = deferred<Workout | null>(), latest = { ...fixture(), name: "Latest refresh" };
  await mount();
  jest.mocked(workoutService.getWorkoutById).mockReturnValue(old.promise);
  let reading!: Promise<void>;
  act(() => { reading = api.reloadWorkout("workout"); });
  jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([latest]);
  await act(async () => { await api.reloadWorkouts(); old.resolve(fixture()); await reading; });
  expect(api.workouts).toEqual([latest]);
});
it("adopts external committed session changes while preserving unsaved edits", async () => {
  const stored = fixture(); jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([stored]);
  function LiveSession() {
    const { workouts } = useWorkout();
    return workouts[0] ? <Session workout={workouts[0]} /> : null;
  }
  await mount(<LiveSession />);
  await act(async () => api.insertWorkout({ ...stored, name: "External saved edit" }));
  expect(form.getValues("name")).toBe("External saved edit"); expect(session.isUpdateNeeded).toBe(false);
  act(() => form.setValue("name", "Unsaved session edit"));
  await act(async () => api.insertWorkout({ ...stored, name: "Another committed edit" }));
  expect(form.getValues("name")).toBe("Unsaved session edit"); expect(session.isUpdateNeeded).toBe(true);
});
it("uses the atomic workout update for legacy base-field and set saves", async () => {
  const stored = fixture(), saved = { ...stored, name: "Committed" };
  jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([stored]);
  jest.mocked(workoutService.getWorkoutById).mockResolvedValue(stored);
  jest.mocked(workoutService.updateWorkout).mockResolvedValue({ success: false, error: "Rolled back" });
  await mount();
  await act(async () => { expect((await api.saveWorkoutToDb("user", { name: "Committed" }, [], stored.id)).success).toBe(false); });
  expect(api.workouts).toEqual([stored]);
  jest.mocked(workoutService.updateWorkout).mockResolvedValue({ success: true, data: saved });
  await act(async () => { expect((await api.saveWorkoutToDb("user", { name: "Committed" }, [], stored.id)).success).toBe(true); });
  expect(api.workouts).toEqual([saved]);
});

it("hydrates a successful session save that did not return its saved record", async () => {
  const stored = fixture(), hydrated = { ...stored, name: "Committed", description: "SQLite defaults" };
  jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([stored]);
  await mount(<Session workout={stored} />);
  act(() => form.setValue("name", "Committed"));
  jest.mocked(workoutService.updateWorkout).mockResolvedValue({ success: true, data: null });
  jest.mocked(workoutService.getWorkoutById).mockResolvedValue(hydrated);
  await act(async () => { await session.saveWorkout(); });
  expect(api.workouts).toEqual([hydrated]);
  expect(form.getValues("description")).toBe("SQLite defaults");
  expect(session.isUpdateNeeded).toBe(false);
});

it("retains invalid legacy schedules without crashing the Home selection", async () => {
  const invalid = { ...fixture(), scheduled_datetime: "invalid" };
  jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([invalid]);
  await mount();
  expect(api.workouts).toEqual([invalid]); expect(api.currentWorkouts).toEqual([]);
});

it("prevents a late month-cache read from resurrecting a deleted workout", async () => {
  const stored = fixture(), month = deferred<Workout[]>();
  jest.mocked(workoutService.getAllWorkouts).mockResolvedValueOnce([stored]).mockResolvedValue([]);
  jest.mocked(workoutService.getWorkoutsByMonth).mockReturnValue(month.promise);
  jest.mocked(workoutService.deleteWorkout).mockResolvedValue({ success: true });
  await mount(); let reading: any;
  act(() => { reading = api.updateCachedMonths("user", { month: "01", year: "2100" }); });
  await act(async () => { await api.deleteWorkout("user", stored.id); month.resolve([stored]); await reading; });
  expect(api.workouts).toEqual([]);
});
