import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider, AuthSessionScope } from "../authContext";
import { ColorThemeProvider, useColorTheme } from "../colorThemeContext";
import { AppNavigationSurface } from "@/components/navigation/AppNavigationSurface";
import LoadingScreen from "@/app/(app)/loading";
import { supabase } from "@/lib/supabaseClient";
import { SplashScreen } from "expo-router";
import { tokens } from "@/utils/colorTheme";
let mockAuthListener: (event: string, session: any) => void;
let mockSystemScheme = "light";
jest.mock("react-native", () => ({ View: "View", StatusBar: "StatusBar", ActivityIndicator: "ActivityIndicator", useColorScheme: () => mockSystemScheme }));
jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock("@/lib/supabaseClient", () => ({ supabase: { auth: { onAuthStateChange: jest.fn() }, from: jest.fn() } }));
jest.mock("@/services/syncService", () => ({ syncService: { invalidateUserSync: jest.fn() } }));
jest.mock("react-native-toast-message", () => ({ __esModule: true, default: { show: jest.fn() } }));
jest.mock("@/context/AppInitContext", () => ({ useAppInit: () => ({ isDbReady: true }) }));
jest.mock("expo-router", () => ({ SplashScreen: { hideAsync: jest.fn().mockResolvedValue(undefined) }, Redirect: (props: any) => require("react").createElement("Redirect", props) }));
jest.mock("@react-navigation/native", () => ({
  DarkTheme: { dark: true, colors: { background: "black", card: "black" } },
  DefaultTheme: { dark: false, colors: { background: "white", card: "white" } },
  ThemeProvider: (props: any) => require("react").createElement("NavigationTheme", props, props.children),
}));
let tree: TestRenderer.ReactTestRenderer;
let childMounts = 0;
const frames: string[] = [];
function SessionProbe() {
  const { theme } = useColorTheme(); frames.push(theme.color.background);
  React.useEffect(() => { childMounts++; }, []);
  return <LoadingScreen />;
}
async function mount() {
  await act(async () => { tree = TestRenderer.create(<AuthProvider><ColorThemeProvider><AppNavigationSurface><AuthSessionScope><SessionProbe /></AuthSessionScope></AppNavigationSurface></ColorThemeProvider></AuthProvider> as any); });
}
function surface() { return tree.root.findByProps({ testID: "navigation-surface" }); }
function emit(id: string | null) { mockAuthListener(id ? "SIGNED_IN" : "SIGNED_OUT", id ? { user: { id, created_at: "2026", user_metadata: {} } } : null); }
beforeEach(() => {
  childMounts = 0; frames.length = 0;
  jest.mocked(supabase.auth.onAuthStateChange).mockImplementation((listener: any) => {
    mockAuthListener = listener; listener("INITIAL_SESSION", null);
    return { data: { subscription: { unsubscribe: jest.fn() } } } as any;
  });
});
afterEach(() => { act(() => tree?.unmount()); jest.clearAllMocks(); });
it.each(["dark", "light"] as const)("preserves %s backgrounds across repeated login/logout while local storage is slow", async mode => {
  mockSystemScheme = mode === "dark" ? "light" : "dark";
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(mode);
  await mount();
  const originalSurface = surface();
  const originalMounts = childMounts;
  frames.length = 0;
  // Subsequent auth transitions must use the existing theme immediately.
  jest.mocked(AsyncStorage.getItem).mockReturnValue(new Promise(() => {}));
  for (let cycle = 0; cycle < 3; cycle++) {
    await act(async () => { emit("user"); });
    expect(surface()).toBe(originalSurface);
    await act(async () => { emit(null); });
    expect(surface()).toBe(originalSurface);
  }
  expect(childMounts).toBe(originalMounts);
  expect(new Set(frames)).toEqual(new Set([tokens[mode].background]));
  expect(surface().props.style.backgroundColor).toBe(tokens[mode].background);
  expect(tree.root.findAllByType("Text" as any)).toHaveLength(0);
  const navigation = tree.root.findByType("NavigationTheme" as any).props.value;
  expect(navigation.dark).toBe(mode === "dark");
  expect(navigation.colors.background).toBe(tokens[mode].background);
  expect(navigation.colors.card).toBe(tokens[mode].background);
  expect(tree.root.findByType("StatusBar" as any).props.backgroundColor).toBe(tokens[mode].background);
  expect(tree.root.findByProps({ testID: "auth-loading" }).props.style.backgroundColor).toBe(tokens[mode].background);
});
it("keeps the splash until local theme hydration and layout, without awaiting a remote preference", async () => {
  let release!: (value: string | null) => void;
  jest.mocked(AsyncStorage.getItem).mockReturnValue(new Promise(resolve => { release = resolve; }));
  await mount();
  act(() => surface().props.onLayout());
  expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  await act(async () => { release("dark"); });
  expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  expect(surface().props.style.backgroundColor).toBe(tokens.dark.background);
  await act(async () => { emit("user"); });
  expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
});

it("dismisses the splash without waiting for a remote theme request on a persisted session", async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
  const remote = new Promise(() => {});
  const query: any = { select: () => query, eq: () => query, single: () => remote };
  jest.mocked(supabase.from).mockReturnValue(query);
  jest.mocked(supabase.auth.onAuthStateChange).mockImplementation((listener: any) => {
    mockAuthListener = listener;
    listener("INITIAL_SESSION", { user: { id: "user", created_at: "2026", user_metadata: {} } });
    return { data: { subscription: { unsubscribe: jest.fn() } } } as any;
  });
  await mount();
  act(() => surface().props.onLayout());
  expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  expect(tree.root.findByType("Redirect" as any).props.href).toBe("/(app)/main/");
});
