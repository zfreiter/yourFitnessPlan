import NetInfo from "@react-native-community/netinfo";
import React, { useEffect } from "react";
import TestRenderer, { act } from "react-test-renderer";
import { SyncProvider, useSync } from "../SyncContext";
import { WorkoutProvider, useWorkout } from "../workoutContext";
import { syncService } from "@/services/syncService";
import { workoutService } from "@/services/workoutService";
import { Workout } from "@/types/interfaces/types";

let mockNetworkListener: (state: any) => void;
jest.mock("@react-native-community/netinfo", () => ({ addEventListener: jest.fn((listener) => { mockNetworkListener = listener; return jest.fn(); }) }));
const mockUser = { id: "user" };
jest.mock("@/context/authContext", () => ({ useAuth: () => ({ user: mockUser, isLoading: false }) }));
jest.mock("@/context/AppInitContext", () => ({ useAppInit: () => ({ isDbReady: true, isAppInitLoading: false }) }));
jest.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
jest.mock("@/services/database", () => ({}));
jest.mock("@/services/profileService", () => ({ profileService: { getProfile: jest.fn().mockResolvedValue({ id: "user" }) } }));
jest.mock("@/services/syncService", () => ({ syncService: { sync: jest.fn(), refreshWorkouts: jest.fn(), isSyncActive: () => false, subscribeSyncActivity: () => () => {} } }));
jest.mock("@/services/workoutService", () => ({ workoutService: { getAllWorkouts: jest.fn() } }));
jest.mock("@/services/exerciseService", () => ({ exerciseService: { getExercises: jest.fn().mockResolvedValue([]) } }));
jest.mock("@/services/setService", () => ({ setService: {} }));
jest.mock("react-native", () => ({ Text: "Text", View: "View", ActivityIndicator: "ActivityIndicator" }));
let sync!: ReturnType<typeof useSync>, workouts!: ReturnType<typeof useWorkout>, mounts = 0;
let localRows: Workout[];
const date = new Date(); date.setHours(12,0,0,0);
const fixture = (): Workout => ({ id: "workout", user_id: "user", name: "Local", workoutType: "circuit", scheduled_datetime: date.toISOString(), is_completed: 0, exercises: [], cardio_entries: [], circuit_rounds: [] });
function Probe() { sync = useSync(); workouts = useWorkout(); useEffect(() => { mounts++; }, []); return null; }
let tree: TestRenderer.ReactTestRenderer;
async function mount() {
  await act(async () => { tree = TestRenderer.create(<SyncProvider><WorkoutProvider><Probe /></WorkoutProvider></SyncProvider> as Parameters<typeof TestRenderer.create>[0]); });
}
beforeEach(() => {
  localRows = [fixture()]; mounts = 0;
  jest.mocked(workoutService.getAllWorkouts).mockImplementation(async () => localRows);
  jest.mocked(syncService.sync).mockResolvedValue(undefined);
});
afterEach(() => { act(() => tree?.unmount()); jest.clearAllMocks(); });
it("renders local workouts while remote initialization is still pending", async () => {
  let finish!: () => void;
  jest.mocked(syncService.sync).mockReturnValue(new Promise(resolve => { finish = () => resolve(); }));
  await mount();
  expect(workouts.workouts).toEqual(localRows);
  expect(sync.isSyncLoading).toBe(true); expect(mounts).toBe(1);
  await act(async () => { finish(); });
  expect(mounts).toBe(1);
});
it("keeps the provider and committed workouts mounted after a failed remote sync", async () => {
  jest.mocked(syncService.sync).mockRejectedValue(new Error("Push rejected"));
  await mount();
  expect(workouts.workouts).toEqual(localRows); expect(mounts).toBe(1);
  act(() => workouts.insertWorkout({ ...fixture(), name: "Offline edit" }));
  expect(workouts.workouts[0].name).toBe("Offline edit");
  expect(syncService.sync).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByType("Text" as any).some(node => node.props.children === "Push rejected")).toBe(true);
  expect(mounts).toBe(1);
});
it("reloads context after a successful refresh has committed the local replacement", async () => {
  await mount();
  jest.mocked(syncService.refreshWorkouts).mockImplementation(async () => {
    localRows = [{ ...fixture(), name: "Refreshed", duration: 40 }];
    return { success: true };
  });
  await act(async () => { expect((await sync.refreshWorkouts()).success).toBe(true); });
  expect(workouts.workouts).toEqual(localRows); expect(mounts).toBe(1);
});
it("does not reload or discard local state when refresh fails", async () => {
  await mount();
  const reads = jest.mocked(workoutService.getAllWorkouts).mock.calls.length;
  const revision = sync.workoutRevision;
  jest.mocked(syncService.refreshWorkouts).mockResolvedValue({ success: false, error: "Pending local writes" });
  await act(async () => { expect((await sync.refreshWorkouts()).success).toBe(false); });
  expect(workouts.workouts).toEqual(localRows);
  expect(workoutService.getAllWorkouts).toHaveBeenCalledTimes(reads);
  expect(sync.workoutRevision).toBe(revision); expect(mounts).toBe(1);
});

it("keeps both flags active until all overlapping provider requests settle", async () => {
  let finishFirst!: () => void, finishSecond!: () => void;
  jest.mocked(syncService.sync)
    .mockReturnValueOnce(new Promise(resolve => { finishFirst = resolve; }))
    .mockReturnValueOnce(new Promise(resolve => { finishSecond = resolve; }));
  await mount();
  let second!: Promise<void>;
  act(() => { second = sync.resetSync(); });
  await act(async () => { finishSecond(); await second; });
  expect(sync.isSyncing).toBe(true); expect(sync.isSyncLoading).toBe(true);
  await act(async () => { finishFirst(); });
  expect(sync.isSyncing).toBe(false); expect(sync.isSyncLoading).toBe(false);
});
it("syncs at startup but never subscribes for reconnect uploads", async () => {
  await mount();
  await act(async () => { mockNetworkListener?.({ isConnected: true, isInternetReachable: true }); });
  expect(syncService.sync).toHaveBeenCalledTimes(1);
  await act(async () => {
    mockNetworkListener?.({ isConnected: false, isInternetReachable: false });
    mockNetworkListener?.({ isConnected: true, isInternetReachable: true });
  });
  expect(syncService.sync).toHaveBeenCalledTimes(1);
  expect(NetInfo.addEventListener).not.toHaveBeenCalled();
});

it("keeps startup loading active when the initial online event arrives", async () => {
  let finish!: () => void;
  jest.mocked(syncService.sync).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  await mount();
  await act(async () => { mockNetworkListener?.({ isConnected: true, isInternetReachable: true }); });
  expect(syncService.sync).toHaveBeenCalledTimes(1);
  expect(sync.isSyncing).toBe(true); expect(sync.isSyncLoading).toBe(true);
  await act(async () => { finish(); });
  expect(sync.isSyncing).toBe(false); expect(sync.isSyncLoading).toBe(false);
});

it("does not let stale refresh or startup callbacks request sync after switching accounts", async () => {
  await mount();
  const oldRefresh = sync.refreshWorkouts, oldReset = sync.resetSync;
  mockUser.id = "other";
  try {
    await act(async () => { tree.update(<SyncProvider><WorkoutProvider><Probe /></WorkoutProvider></SyncProvider> as Parameters<typeof tree.update>[0]); });
    jest.mocked(syncService.sync).mockClear(); jest.mocked(syncService.refreshWorkouts).mockClear();
    await act(async () => { expect((await oldRefresh()).success).toBe(false); await oldReset(); });
    expect(syncService.sync).not.toHaveBeenCalled(); expect(syncService.refreshWorkouts).not.toHaveBeenCalled();
  } finally { mockUser.id = "user"; }
});
