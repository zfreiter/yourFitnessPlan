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

const mockAuth = { sessionKey: 0, user: { id: "user" }, isLoading: false, isSynced: true };
const mockSync = { workoutRevision: 0, isSyncLoading: false, isProfileSet: true };
const mockPush = jest.fn();
jest.mock("@/context/authContext", () => ({ useAuth: () => mockAuth }));
jest.mock("@/context/AppInitContext", () => ({ useAppInit: () => ({ isAppInitLoading: false }) }));
jest.mock("@/context/SyncContext", () => ({ useSync: () => mockSync }));
jest.mock("@/services/workoutService", () => ({ workoutService: { getAllWorkouts: jest.fn(), getWorkoutById: jest.fn(), insertWorkout: jest.fn(), updateWorkout: jest.fn(), deleteWorkout: jest.fn(), getWorkoutsByMonth: jest.fn() } }));
jest.mock("@/services/exerciseService", () => ({ exerciseService: { getExercises: jest.fn() } }));
jest.mock("@/services/setService", () => ({ setService: {} }));
jest.mock("@/services/database", () => ({}));
jest.mock("react-native", () => ({ Text: "Text", View: "View", Pressable: "Pressable", ScrollView: "ScrollView", StyleSheet: { create: (value: any) => value } }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn(), push: mockPush }), useFocusEffect: jest.fn() }));
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
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; }
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
  mockAuth.sessionKey = 0; mockAuth.user = { id: "user" }; mockSync.workoutRevision = 0; renders = 0;
  jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([]);
  jest.mocked(exerciseService.getExercises).mockResolvedValue([]);
});
afterEach(() => { act(() => trees.splice(0).forEach(tree => tree.unmount())); jest.resetAllMocks(); });

it("locks committed creation after reload failure and recovers using only a local read", async () => {
  const stored = fixture("created");
  jest.mocked(workoutService.insertWorkout).mockResolvedValue({success:true,data:null,reloadError:"Workout saved. Reload failed."});
  const tree = await mount(<Create workout={stored} />);
  const submit = tree.root.findAllByType("Pressable" as any)[0].props.onPress;
  await act(async () => { await submit(); await submit(); });
  expect(workoutService.insertWorkout).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByType("Pressable" as any).find(n=>n.props.children?.props?.children==="Create workout")?.props.disabled).toBe(true);
  expect(api.workouts).toEqual([]);
  expect(api.workoutLoadError).toContain("Workout saved");
  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(workoutService.getWorkoutById).not.toHaveBeenCalled();
  jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([stored]);
  await act(async () => { await tree.root.findByProps({accessibilityLabel:"Retry loading workouts"}).props.onPress(); });
  expect(api.workouts).toEqual([stored]);
  expect(api.workoutLoadError).toBeNull();
  expect(workoutService.insertWorkout).toHaveBeenCalledTimes(1);
});

it("blocks stale-baseline writes after committed editing until read-only recovery, preserving later edits", async () => {
  const stored = fixture();
  jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([stored]);
  const tree = await mount(<Session workout={stored} />);
  const committed = {...stored,name:"Saved",exercises:[{id:"new-exercise",exercise_id:"catalog",workout_id:stored.id,exercise_name:"New",exercise_order:0,validUnits:[],sets:[]}] } as Workout;
  act(()=>{form.setValue("name",committed.name);form.setValue("exercises",committed.exercises);});
  const staleSave = session.saveWorkout;
  jest.mocked(workoutService.updateWorkout).mockResolvedValue({success:true,data:null,reloadError:"Workout saved. Reload failed."});
  await act(async ()=>{expect(await staleSave()).toEqual({success:true});expect(await staleSave()).toEqual({success:true});});
  expect(workoutService.updateWorkout).toHaveBeenCalledTimes(1);
  expect(session.isUpdateNeeded).toBe(false);
  expect(session.saveError).toBeNull();
  expect(api.workouts).toEqual([stored]);
  expect(workoutService.getWorkoutById).not.toHaveBeenCalled();
  act(()=>form.setValue("name","Edited after commit"));
  jest.mocked(workoutService.getWorkoutById).mockResolvedValue(committed);
  await act(async()=>{await tree.root.findByProps({accessibilityLabel:"Reload saved workout"}).props.onPress();});
  expect(api.workouts).toEqual([committed]);
  expect(api.workoutLoadError).toBeNull();
  expect(form.getValues("name")).toBe("Edited after commit");
  expect(session.isUpdateNeeded).toBe(true);
  jest.mocked(workoutService.updateWorkout).mockResolvedValue({success:true,data:{...committed,name:"Edited after commit"}});
  await act(async()=>{await staleSave();await staleSave();});
  expect(workoutService.updateWorkout).toHaveBeenCalledTimes(2);
  expect(jest.mocked(workoutService.updateWorkout).mock.calls[1][2].exercisesToInsert).toEqual([]);
  expect(session.isUpdateNeeded).toBe(false);
});

it.each(["account-change","unmount"])("does not publish or navigate a committed creation after %s", async outcome => {
  const pending=deferred<any>();jest.mocked(workoutService.insertWorkout).mockReturnValue(pending.promise);
  const tree=await mount(<Create workout={fixture()} />);let saving: any;
  act(()=>{saving=tree.root.findAllByType("Pressable" as any)[0].props.onPress();});
  if(outcome==="unmount")act(()=>tree.unmount());
  else {mockAuth.user={id:"other"};mockAuth.sessionKey++;await act(async()=>tree.update(<WorkoutProvider><Probe /><Create workout={fixture()} /></WorkoutProvider> as any));}
  await act(async()=>{pending.resolve({success:true,data:null,reloadError:"Saved; reload failed"});await saving;});
  expect(mockPush).not.toHaveBeenCalled();expect(api.workouts).toEqual([]);expect(api.workoutLoadError).toBeNull();
});

it("keeps the committed-write barrier across session remounts and failed read-only retries", async () => {
  const stored=fixture();jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([stored]);
  const tree=await mount(<Session workout={stored} />);
  act(()=>{form.setValue("name","Committed");form.setValue("exercises",[{id:"committed-child",exercise_id:"catalog",workout_id:stored.id,exercise_name:"New",exercise_order:0,validUnits:[],sets:[]}]);});
  const committed=JSON.parse(JSON.stringify(form.getValues())) as Workout;
  jest.mocked(workoutService.updateWorkout).mockResolvedValue({success:true,data:null,reloadError:"Saved; reload failed"});
  await act(async()=>{await session.saveWorkout();});
  expect(api.pendingCommittedReloads).toEqual([stored.id]);
  await act(async()=>tree.update(<WorkoutProvider><Probe /><Session key="reopened" workout={stored} /></WorkoutProvider> as any));
  expect(form.getValues("exercises.0.id")).toBe("committed-child");
  jest.mocked(workoutService.getWorkoutById).mockRejectedValueOnce(new Error("Read still unavailable"));
  await act(async()=>{await tree.root.findByProps({accessibilityLabel:"Reload saved workout"}).props.onPress();await session.saveWorkout();});
  expect(workoutService.updateWorkout).toHaveBeenCalledTimes(1);
  act(()=>form.setValue("name","Next edit"));
  jest.mocked(workoutService.getWorkoutById).mockResolvedValue(committed);
  await act(async()=>{await tree.root.findByProps({accessibilityLabel:"Reload saved workout"}).props.onPress();});
  expect(form.getValues("name")).toBe("Next edit");
  expect(form.getValues("exercises.0.id")).toBe("committed-child");
  expect(api.pendingCommittedReloads).toEqual([]);
  jest.mocked(workoutService.updateWorkout).mockResolvedValue({success:true,data:{...committed,name:"Next edit"}});
  await act(async()=>{await session.saveWorkout();});
  expect(jest.mocked(workoutService.updateWorkout).mock.calls[1][2].exercisesToInsert).toEqual([]);
});

it("allows a genuine failed creation to be retried, then locks its committed identity", async()=>{
  jest.mocked(workoutService.insertWorkout).mockResolvedValueOnce({success:false,error:"Rolled back"}).mockResolvedValueOnce({success:true,data:fixture()});
  const tree=await mount(<Create workout={fixture()} />),submit=tree.root.findAllByType("Pressable" as any)[0].props.onPress;
  await act(async()=>{await submit();});
  expect(tree.root.findAllByType("Pressable" as any)[0].props.disabled).toBe(false);
  await act(async()=>{await submit();await submit();});
  expect(workoutService.insertWorkout).toHaveBeenCalledTimes(2);
  expect(mockPush).toHaveBeenCalledTimes(1);
});

it.each(["account-change","unmount"])("ignores read-only committed recovery after %s", async outcome=>{
  const stored=fixture();jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([stored]);
  const tree=await mount(<Session workout={stored} />);
  act(()=>form.setValue("name","Committed"));
  jest.mocked(workoutService.updateWorkout).mockResolvedValue({success:true,data:null,reloadError:"Saved; reload failed"});
  await act(async()=>{await session.saveWorkout();});
  const pending=deferred<Workout|null>();jest.mocked(workoutService.getWorkoutById).mockReturnValue(pending.promise);
  let reading:any;act(()=>{reading=tree.root.findByProps({accessibilityLabel:"Reload saved workout"}).props.onPress();});
  if(outcome==="unmount")await act(async()=>tree.update(<WorkoutProvider><Probe /></WorkoutProvider> as any));
  else {mockAuth.user={id:"other"};mockAuth.sessionKey++;jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([]);await act(async()=>tree.update(<WorkoutProvider><Probe /><Session workout={{...stored,user_id:"other"}} /></WorkoutProvider> as any));}
  await act(async()=>{pending.resolve({...stored,name:"Old committed record"});await reading;});
  expect(api.workouts).toEqual(outcome==="unmount"?[stored]:[]);
  expect(workoutService.updateWorkout).toHaveBeenCalledTimes(1);
});

it("preserves the valid snapshot on failed reload and offers a local retry", async () => {
  const stored = fixture();
  jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([stored]);
  const tree = await mount();
  jest.mocked(workoutService.getAllWorkouts).mockRejectedValueOnce(new Error("SQLite failure"));
  await act(async () => { await api.reloadWorkouts(); });
  expect(api.workouts).toEqual([stored]);
  expect(api.workoutLoadError).toContain("Unable to load workouts");
  const refreshed = { ...stored, name: "Reloaded" };
  jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([refreshed]);
  await act(async () => { await tree.root.findByProps({ accessibilityLabel: "Retry loading workouts" }).props.onPress(); });
  expect(api.workouts).toEqual([refreshed]);
  expect(api.workoutLoadError).toBeNull();
});

it("preserves a record on failed targeted hydration", async () => {
  const stored = fixture();
  jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([stored]);
  await mount();
  jest.mocked(workoutService.getWorkoutById).mockRejectedValue(new Error("Child query failed"));
  await act(async () => { await api.reloadWorkout(stored.id); });
  expect(api.workouts).toEqual([stored]);
  expect(api.workoutLoadError).not.toBeNull();
});

it("ignores a failed startup read after a post-sync load succeeds", async () => {
  const startup = deferred<Workout[]>(), refreshed = fixture("refreshed");
  jest.mocked(workoutService.getAllWorkouts).mockReturnValueOnce(startup.promise).mockResolvedValue([refreshed]);
  const tree = await mount();
  mockSync.workoutRevision++;
  await act(async () => { tree.update(<WorkoutProvider><Probe /></WorkoutProvider> as any); });
  await act(async () => { startup.reject(new Error("Old load failed")); });
  expect(api.workouts).toEqual([refreshed]);
  expect(api.workoutLoadError).toBeNull();
});

it("does not expose a previous account's failed load", async () => {
  const old = deferred<Workout[]>();
  jest.mocked(workoutService.getAllWorkouts).mockReturnValueOnce(old.promise).mockResolvedValue([]);
  const tree = await mount();
  mockAuth.user = { id: "other" }; mockAuth.sessionKey++;
  await act(async () => { tree.update(<WorkoutProvider><Probe /></WorkoutProvider> as any); old.reject(new Error("Previous session")); });
  expect(api.workouts).toEqual([]);
  expect(api.workoutLoadError).toBeNull();
});

it.each(["success", "failure"])("does not publish %s after unmount", async outcome => {
  const old = deferred<Workout[]>();
  jest.mocked(workoutService.getAllWorkouts).mockReturnValueOnce(old.promise);
  const tree = await mount(), count = renders;
  act(() => tree.unmount());
  await act(async () => { if (outcome === "success") old.resolve([fixture()]); else old.reject(new Error("Unmounted read")); });
  expect(renders).toBe(count);
  expect(api.workoutLoadError).toBeNull();
});

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

it("ignores a previous session's completed save without resetting the current form", async () => {
  const stored = fixture();
  jest.mocked(workoutService.getAllWorkouts).mockResolvedValue([stored]);
  const commit = deferred<any>();
  jest.mocked(workoutService.updateWorkout).mockReturnValue(commit.promise);
  const tree = await mount(<Session workout={stored} />);
  act(() => form.setValue("name", "Old session edit"));
  let saving!: Promise<{ success: boolean }>;
  act(() => { saving = session.saveWorkout(); });
  mockAuth.sessionKey++;
  await act(async () => { tree.update(<WorkoutProvider><Probe /><Session workout={stored} /></WorkoutProvider> as any); });
  act(() => form.setValue("name", "New session edit"));
  await act(async () => { commit.resolve({ success: true, data: { ...stored, name: "Old session edit" } }); expect((await saving).success).toBe(false); });
  expect(form.getValues("name")).toBe("New session edit");
  expect(session.isSaving).toBe(false); expect(session.saveError).toBeNull();
});
