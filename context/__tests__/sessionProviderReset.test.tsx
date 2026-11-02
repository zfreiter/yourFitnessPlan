import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { ProfileProvider, useProfile } from "../profileContext";
import { UserPreferenceProvider, useUserPreference } from "../userPreferenceContext";
import { MaxLiftProvider, useMaxLift } from "../maxLiftContext";
import { profileService } from "@/services/profileService";
import { userPreferenceService } from "@/services/userPreferenceService";
import { maxLiftService } from "@/services/maxLiftService";
const mockAuth: any = { user: { id: "first" }, sessionKey: 1, isLoading: false };
jest.mock("@/context/authContext", () => ({ useAuth: () => mockAuth }));
jest.mock("@/context/SyncContext", () => ({ useSync: () => ({ isProfileSet: true }) }));
jest.mock("@/services/profileService", () => ({ profileService: { getProfile: jest.fn() } }));
jest.mock("@/services/userPreferenceService", () => ({ userPreferenceService: { getUserPreferences: jest.fn() } }));
jest.mock("@/services/maxLiftService", () => ({ maxLiftService: { getCurrentMaxLifts: jest.fn() } }));
jest.mock("@/lib/supabaseClient", () => ({ supabase: { from: jest.fn(() => { throw new Error("Unexpected remote request"); }) } }));
let profile!: ReturnType<typeof useProfile>, preferences!: ReturnType<typeof useUserPreference>, maxes!: ReturnType<typeof useMaxLift>;
let mounts = 0;
function Probe() { profile = useProfile(); preferences = useUserPreference(); maxes = useMaxLift(); React.useEffect(() => { mounts++; }, []); return null; }
const providers = () => <ProfileProvider><UserPreferenceProvider><MaxLiftProvider><Probe /></MaxLiftProvider></UserPreferenceProvider></ProfileProvider>;
let tree: TestRenderer.ReactTestRenderer;
async function changeUser(id: string | null) {
  mockAuth.user = id ? { id } : null; mockAuth.sessionKey++;
  await act(async () => { tree.update(providers() as any); });
}
beforeEach(() => {
  mockAuth.user = { id: "first" }; mockAuth.sessionKey = 1; mounts = 0;
  jest.mocked(profileService.getProfile).mockImplementation(async (id) => ({ id, full_name: "Current profile" }) as any);
  jest.mocked(userPreferenceService.getUserPreferences).mockImplementation(async (id) => ({ user_id: id, theme: "dark" }) as any);
  jest.mocked(maxLiftService.getCurrentMaxLifts).mockImplementation(async (id) => [{ id: "max", user_id: id, exercise_name: "Squat", one_rep_max: 100 }] as any);
});
afterEach(() => { act(() => tree?.unmount()); jest.clearAllMocks(); });
it("clears user-owned provider state on logout without remounting consumers", async () => {
  await act(async () => { tree = TestRenderer.create(providers() as any); });
  expect(profile.profile?.id).toBe("first"); expect(preferences.userPreferences?.user_id).toBe("first"); expect(Object.keys(maxes.exerciseMaxes)).toEqual(["Squat"]);
  await changeUser(null);
  expect(profile.profile).toBeNull(); expect(preferences.userPreferences).toBeNull(); expect(maxes.exerciseMaxes).toEqual({});
  expect(profile.isLoading).toBe(false); expect(preferences.isLoading).toBe(false); expect(maxes.isMaxLiftLoading).toBe(false);
  expect(mounts).toBe(1);
});
it.each(["first", "second"])("rejects all delayed initialization results after re-login as %s", async id => {
  let releaseProfile!: (value: any) => void, releasePreferences!: (value: any) => void;
  jest.mocked(profileService.getProfile).mockReturnValueOnce(new Promise(resolve => { releaseProfile = resolve; }));
  jest.mocked(userPreferenceService.getUserPreferences).mockReturnValueOnce(new Promise(resolve => { releasePreferences = resolve; }));
  await act(async () => { tree = TestRenderer.create(providers() as any); });
  await changeUser(null); await changeUser(id);
  await act(async () => { releaseProfile({ id: "first", full_name: "Stale profile" }); releasePreferences({ user_id: "first", theme: "light" }); });
  expect(profile.profile?.id).toBe(id); expect(profile.profile?.full_name).toBe("Current profile");
  expect(preferences.userPreferences?.user_id).toBe(id); expect(preferences.userPreferences?.theme).toBe("dark");
  expect(profile.isLoading).toBe(false); expect(preferences.isLoading).toBe(false);
  expect(mounts).toBe(1);
});
it("rejects a delayed max-lift response from a previous same-account session", async () => {
  let release!: (value: any) => void;
  jest.mocked(maxLiftService.getCurrentMaxLifts).mockReturnValueOnce(new Promise(resolve => { release = resolve; }));
  await act(async () => { tree = TestRenderer.create(providers() as any); });
  await changeUser(null); await changeUser("first");
  await act(async () => { release([{ id: "stale", user_id: "first", exercise_name: "Stale", one_rep_max: 999 }]); });
  expect(Object.keys(maxes.exerciseMaxes)).toEqual(["Squat"]);
  expect(maxes.isMaxLiftLoading).toBe(false);
});
it("settles loading after initialization failures and supports another session", async () => {
  jest.mocked(profileService.getProfile).mockRejectedValueOnce(new Error("Local read failed"));
  jest.mocked(userPreferenceService.getUserPreferences).mockRejectedValueOnce(new Error("Local read failed"));
  await act(async () => { tree = TestRenderer.create(providers() as any); });
  expect(profile.isLoading).toBe(false); expect(preferences.isLoading).toBe(false);
  await changeUser(null); await changeUser("first");
  expect(profile.profile?.id).toBe("first"); expect(preferences.userPreferences?.user_id).toBe("first");
});
