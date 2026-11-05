import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { AuthProvider, AuthSessionScope, useAuth } from "../authContext";
import { SyncProvider, useSync } from "../SyncContext";
import { WorkoutProvider, useWorkout } from "../workoutContext";
import RootLayout from "@/app/(app)/_layout";
import FabButton from "@/components/fabButton";
import SettingsScreen from "@/app/(app)/main/settings/index";
import WorkoutCard from "@/features/home/TodaysWorkout/WorkoutCard";
import SignIn from "@/app/(app)/login";
import { supabase } from "@/lib/supabaseClient";
import { syncService } from "@/services/syncService";
import { workoutService } from "@/services/workoutService";

let mockListener: (event: string, session: any) => unknown;
let mockSession: any;
const mockUnsubscribe = jest.fn();
jest.mock("@/lib/supabaseClient", () => ({ supabase: {
  auth: { onAuthStateChange: jest.fn(), signInWithPassword: jest.fn(), signOut: jest.fn() },
  from: jest.fn(() => { throw new Error("Auth callback must not query Supabase"); }),
} }));
jest.mock("react-native-toast-message", () => ({ __esModule: true, default: { show: jest.fn() } }));
jest.mock("@/context/AppInitContext", () => ({ useAppInit: () => ({ isDbReady: true, isAppInitLoading: false }) }));
jest.mock("@/context/colorThemeContext", () => ({ useColorTheme: () => ({ theme: { color: {}, spacing: {}, fonts: {} } }) }));
jest.mock("@/services/profileService", () => ({ profileService: { getProfile: jest.fn(async (id) => ({ id })) } }));
jest.mock("@/services/syncService", () => ({ syncService: {
  sync: jest.fn(), refreshWorkouts: jest.fn(), setAuthenticatedUser: jest.fn(), invalidateUserSync: jest.fn(),
  isSyncActive: () => false, subscribeSyncActivity: () => () => {},
} }));
jest.mock("@/services/workoutService", () => ({ workoutService: { getAllWorkouts: jest.fn() } }));
jest.mock("@/services/exerciseService", () => ({ exerciseService: { getExercises: jest.fn().mockResolvedValue([]) } }));
jest.mock("@/services/setService", () => ({ setService: {} }));
jest.mock("@/services/database", () => ({}));
jest.mock("@react-native-community/netinfo", () => ({ addEventListener: () => () => {} }));
jest.mock("react-native", () => ({ Text: "Text", View: "View", Pressable: "Pressable", TextInput: "TextInput", Modal: "Modal", ActivityIndicator: "ActivityIndicator", Image: "Image", StyleSheet: { create: (value: any) => value, flatten: (value: any) => Object.assign({}, ...value) } }));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView", useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@expo/vector-icons/MaterialIcons", () => () => null);
jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => () => null);
const mockPush = jest.fn();
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("expo-router", () => {
  const React = require("react");
  const Stack: any = ({ children, ...props }: any) => React.createElement("Stack", props, children);
  Stack.Protected = ({ guard, children }: any) => guard ? children : null;
  Stack.Screen = (props: any) => React.createElement("Screen", props);
  const Link = ({ children, onPress, href }: any) => React.cloneElement(children, {
    onPress: (event: any = {}) => { children.props.onPress?.(event); onPress?.(event); if (!event.defaultPrevented) mockPush(href); },
  });
  return { Stack, Link, useRouter: () => ({ push: mockPush }), Redirect: (props: any) => React.createElement("Redirect", props), router: { push: mockPush } };
});

let auth!: ReturnType<typeof useAuth>, sync!: ReturnType<typeof useSync>, workouts!: ReturnType<typeof useWorkout>;
let mounts = 0, cleanups = 0;
function Controls() {
  const { user } = useAuth();
  if (!user) return null;
  return <><FabButton /><SettingsScreen /><WorkoutCard workout={{ id: "workout", name: "Local", user_id: user.id, workoutType: "strength", scheduled_datetime: "2030-01-01T12:00", is_completed: 0, exercises: [], cardio_entries: [], circuit_rounds: [] }} /></>;
}
function Probe() {
  auth = useAuth(); sync = useSync(); workouts = useWorkout();
  React.useEffect(() => { mounts++; return () => { cleanups++; }; }, []);
  return null;
}
const session = (id: string) => ({ user: { id, user_metadata: {}, created_at: "2026-01-01" } });
let tree: TestRenderer.ReactTestRenderer;
async function mount(initial: any = null) {
  mockSession = initial;
  await act(async () => { tree = TestRenderer.create(
    <AuthProvider><AuthSessionScope><SyncProvider><WorkoutProvider><Probe /><SignIn /><RootLayout /><Controls /></WorkoutProvider></SyncProvider></AuthSessionScope></AuthProvider> as any,
  ); });
}
async function login(id = "user") { await act(async () => { expect(await auth.signIn(id, "test-password")).toBe(true); }); }
async function logout() { await act(async () => { await auth.signOut(); }); }
function authenticatedRoutes() { return tree.root.findAllByType("Screen" as any).filter(node => node.props.name === "main"); }
function gate() { let release!: () => void; const promise = new Promise<void>(done => { release = done; }); return { promise, release }; }
beforeEach(() => {
  mounts = cleanups = 0;
  jest.mocked(supabase.auth.onAuthStateChange).mockImplementation((listener: any) => {
    mockListener = listener;
    expect(listener("INITIAL_SESSION", mockSession)).toBeUndefined();
    return { data: { subscription: { unsubscribe: mockUnsubscribe } } } as any;
  });
  // Model Supabase's lock: signIn waits for subscribers to return before it resolves.
  jest.mocked(supabase.auth.signInWithPassword).mockImplementation(async ({ email }: any) => {
    mockSession = session(email);
    expect(mockListener("SIGNED_IN", mockSession)).toBeUndefined();
    return { data: { user: mockSession.user, session: mockSession }, error: null };
  });
  jest.mocked(supabase.auth.signOut).mockImplementation(async () => {
    mockSession = null;
    expect(mockListener("SIGNED_OUT", null)).toBeUndefined();
    return { error: null };
  });
  jest.mocked(syncService.sync).mockResolvedValue(undefined);
  jest.mocked(workoutService.getAllWorkouts).mockImplementation(async (id) => [{ id: id + "-workout", user_id: id, scheduled_datetime: "2030-01-01", exercises: [], cardio_entries: [], circuit_rounds: [] }] as any);
});
afterEach(() => { act(() => tree?.unmount()); jest.clearAllMocks(); });

it.each(["user", "other-user"])("signs out and immediately signs in as %s without restarting", async id => {
  await mount(session("user"));
  const initializedMounts = mounts, initializedCleanups = cleanups;
  await logout();
  expect(auth.user).toBeNull(); expect(workouts.workouts).toEqual([]); expect(authenticatedRoutes()).toHaveLength(0);
  expect(tree.root.findByType("Stack" as any).props.initialRouteName).toBe("login");
  await login(id);
  expect(auth.user?.id).toBe(id); expect(auth.isLoading).toBe(false);
  expect(authenticatedRoutes()[0].props.name).toBe("main");
  expect(workouts.workouts.map(row => row.user_id)).toEqual([id]);
  expect(mounts).toBe(initializedMounts); expect(cleanups).toBe(initializedCleanups);
  const routes = tree.root.findAllByType("Screen" as any).map(node => node.props.name);
  expect(routes).toContain("main"); expect(routes).not.toContain("login");
  expect(tree.root.findByType("Stack" as any).props.initialRouteName).toBe("main");
  const fallbacks = tree.root.findAllByType("Screen" as any).filter(node => ["index", "loading"].includes(node.props.name));
  expect(fallbacks.every(node => node.props.options.headerShown === false)).toBe(true);
  expect(supabase.from).not.toHaveBeenCalled();
  expect(supabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
});
it("publishes a valid restored session while remote sync remains pending", async () => {
  const held = gate(); jest.mocked(syncService.sync).mockReturnValue(held.promise);
  await mount(session("user"));
  expect(auth.isAuthInitialized).toBe(true); expect(auth.isLoading).toBe(false);
  expect(sync.isSyncLoading).toBe(true); expect(authenticatedRoutes()).toHaveLength(1);
  await act(async () => { held.release(); });
});
it("navigates after login even when remote sync fails", async () => {
  jest.mocked(syncService.sync).mockRejectedValue(new Error("Offline sync failure"));
  await mount(); await login();
  expect(authenticatedRoutes()).toHaveLength(1); expect(auth.isLoading).toBe(false);
  expect(sync.isSyncLoading).toBe(false);
});
it("invalidates active sync on logout and ignores its completion after same-account login", async () => {
  const held = gate(); jest.mocked(syncService.sync).mockReturnValueOnce(held.promise);
  await mount(session("user"));
  await logout(); expect(syncService.invalidateUserSync).toHaveBeenCalledWith("user");
  await login();
  const revision = sync.workoutRevision;
  await act(async () => { held.release(); });
  expect(sync.workoutRevision).toBe(revision); expect(auth.user?.id).toBe("user");
  expect(authenticatedRoutes()).toHaveLength(1);
});
it("does not remount user providers on token refresh for the same session", async () => {
  await mount(session("user"));
  const count = mounts;
  await act(async () => { mockListener("TOKEN_REFRESHED", session("user")); });
  expect(mounts).toBe(count); expect(auth.isLoading).toBe(false);
});
it.each([false, true])("settles the login spinner on a login failure (throw=%s)", async throws => {
  await mount();
  jest.mocked(supabase.auth.signInWithPassword).mockImplementation(async () => {
    if (throws) throw new Error("Invalid login credentials");
    return { data: { user: null, session: null }, error: new Error("Invalid login credentials") } as any;
  });
  const inputs = tree.root.findAllByType("TextInput" as any);
  await act(async () => { inputs[0].props.onChangeText("user@example.com"); inputs[1].props.onChangeText("test-password"); });
  const button = tree.root.findAllByType("Pressable" as any).find(node => node.props.disabled !== undefined)!;
  await act(async () => { await button.props.onPress(); });
  expect(auth.isLoading).toBe(false); expect(auth.error).toBe("Invalid login credentials");
  expect(tree.root.findByType("Modal" as any).props.visible).toBe(false);
  expect(tree.root.findAllByType("Text" as any).some(node => node.props.children === "Invalid login credentials")).toBe(true);
});

it("restores an existing valid session offline and hydrates local workouts without a profile API call", async () => {
  jest.mocked(syncService.sync).mockRejectedValue(new Error("No internet connection"));
  await mount(session("user"));
  expect(auth.isAuthInitialized).toBe(true); expect(auth.isLoading).toBe(false);
  expect(auth.user?.id).toBe("user"); expect(authenticatedRoutes()).toHaveLength(1);
  expect(workouts.workouts).toHaveLength(1);
  expect(supabase.from).not.toHaveBeenCalled();
});
it("does not publish a late sign-in response after a sign-out event", async () => {
  const held = gate();
  await mount();
  jest.mocked(supabase.auth.signInWithPassword).mockImplementation(async () => {
    await held.promise;
    return { data: { session: session("user"), user: session("user").user }, error: null } as any;
  });
  let signingIn!: Promise<boolean>;
  act(() => { signingIn = auth.signIn("user", "test-password"); });
  // Simulate an external session becoming signed in, then signed out before
  // this delayed request's response is delivered.
  await act(async () => { mockListener("SIGNED_IN", session("user")); mockListener("SIGNED_OUT", null); });
  await act(async () => { held.release(); expect(await signingIn).toBe(false); });
  expect(auth.user).toBeNull(); expect(auth.isLoading).toBe(false);
});

async function exerciseNavigationControls() {
  const pressables = tree.root.findAllByType("Pressable" as any);
  const findText = (text: string) => pressables.find(node => node.findAllByType("Text" as any).some(child => child.props.children === text))!;
  mockPush.mockClear();
  await act(async () => {
    findText("+").props.onPress({ defaultPrevented: false });
    findText("Account").props.onPress();
    findText("Local").props.onPress({ defaultPrevented: false });
  });
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/CreateWorkout", params: { date: undefined } });
  expect(mockPush).toHaveBeenCalledWith("./settings/account");
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/[workoutId]", params: { workoutId: "workout" } });
  expect(pressables.filter(node => node.props.disabled === true)).toHaveLength(0);
}
it("runs immediate Home/create/settings navigation during pending sync and repeated login cycles", async () => {
  const held = gate(); jest.mocked(syncService.sync).mockReturnValue(held.promise);
  await mount();
  for (let cycle = 0; cycle < 3; cycle++) {
    await login();
    expect(sync.isSyncing).toBe(true);
    await exerciseNavigationControls();
    expect(tree.root.findAllByType("Modal" as any)).toHaveLength(0);
    await logout();
    expect(workouts.workouts).toEqual([]);
  }
  await act(async () => { held.release(); });
  expect(mounts).toBe(1); expect(cleanups).toBe(0);
});
it("runs navigation callbacks after remote synchronization fails", async () => {
  jest.mocked(syncService.sync).mockRejectedValue(new Error("Remote unavailable"));
  await mount(); await login();
  await exerciseNavigationControls();
});
it("rejects a previous session's delayed workout snapshot after same-account re-login", async () => {
  let release!: (rows: any) => void;
  jest.mocked(workoutService.getAllWorkouts).mockReturnValueOnce(new Promise(resolve => { release = resolve; }));
  await mount(session("user"));
  const oldSetter = workouts.setWorkouts;
  await logout(); await login();
  const rows = workouts.workouts;
  act(() => oldSetter([]));
  expect(workouts.workouts).toEqual(rows);
  await act(async () => { release([{ id: "stale", user_id: "user", scheduled_datetime: "2030-01-01" }]); });
  expect(workouts.workouts).toEqual(rows);
  expect(workouts.workouts.some(row => row.id === "stale")).toBe(false);
});
