import { createContext, useContext, useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { Text } from "react-native";
import { supabase } from "@/lib/supabaseClient";
import { syncService } from "@/services/syncService";
import { useAppInit } from "./AppInitContext";
import { useAuth } from "./authContext";
import { profileService } from "@/services/profileService";

interface SyncContextType {
  isSyncLoading: boolean;
  isSyncing: boolean;
  isProfileSet: boolean;
  resetSync: () => Promise<void>;
  refreshWorkouts: () => Promise<{ success: boolean; error?: string }>;
  workoutRevision: number;
}

const SyncContext = createContext<SyncContextType>({
  isSyncLoading: true,
  isSyncing: true,
  isProfileSet: false,
  resetSync: async () => {},
  refreshWorkouts: async () => ({ success: false }),
  workoutRevision: 0,
});

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [profileLoading, setProfileLoading] = useState(true);
  const [requestsByUser, setRequestsByUser] = useState<Record<string, number>>({});
  const activeUser = useRef<string | undefined>(undefined);
  const [profileUserId, setProfileUserId] = useState<string>();
  const [isSyncing, setIsSyncing] = useState(true);
  const [workoutRevision, setWorkoutRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { isDbReady } = useAppInit();
  const { user } = useAuth();
  activeUser.current = user?.id;
  const isProfileSet = !!user && profileUserId === user.id;
  const requests = user ? requestsByUser[user.id] ?? 0 : 0;
  const isSyncLoading = profileLoading || requests > 0 || isSyncing;
  const changeRequests = (delta: number) => {
    if (!user) return;
    const userId = user.id;
    setRequestsByUser(counts => ({ ...counts, [userId]: (counts[userId] ?? 0) + delta }));
  };
  const begin = () => changeRequests(1);
  const end = () => changeRequests(-1);

  useEffect(() => {
    setIsSyncing(user ? syncService.isSyncActive(user.id) : false);
    return syncService.subscribeSyncActivity((userId, active) => {
      if (activeUser.current === userId) setIsSyncing(active);
    });
  }, [user?.id]);

  // In SyncContext, accept an optional callback
  const refreshWorkouts = async (onComplete?: () => Promise<void>) => {
    if (!user) return { success: false, error: "Not signed in" };
    begin();
    const requestUser = user.id;
    try {
      setError(null);
      const result = await syncService.refreshWorkouts(supabase, user.id);
      if (activeUser.current !== requestUser) return { success: false, error: "User changed" };
      if (!result.success) throw new Error(result.error);
      setWorkoutRevision(revision => revision + 1);
      await onComplete?.();
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Refresh failed";
      if (activeUser.current === requestUser) setError(message);
      return { success: false, error: message };
    } finally {
      end();
    }
  };

  const initalizeProfile = async () => {
    setProfileUserId(undefined);
    setProfileLoading(true);
    if (!user) { setProfileLoading(false); return; }

    const requestUser = user.id;
    try {
      const profile = await profileService.getProfile(user.id);

      if (activeUser.current !== requestUser) return;
      if (profile) {
        setProfileUserId(requestUser);
      } else {
        console.log(
          "No profile found for user, getting profile from Supabase...",
        );
        const data = await profileService.fetchAndCacheProfile(user.id);
        if (activeUser.current !== requestUser) return;
        if (data) {
          setProfileUserId(requestUser);
        } else {
          console.log("No profile found for user in Supabase either");
        }
      }
    } catch (err) {
      console.error("Profile initialization error:", err);
      if (activeUser.current === requestUser) setError(
        err instanceof Error ? err.message : "Profile initialization error",
      );
    } finally {
      console.log(
        "Profile initialization complete, setting isProfileSet and isSyncLoading",
      );
      if (activeUser.current === requestUser) setProfileLoading(false);
    }
  };

  const initializeSync = async () => {
    if (!user || !isProfileSet) {
      console.log("Cannot initialize sync, user or profile not set");
      return;
    }

    const requestUser = user.id;
    begin();

    try {

      await syncService.sync(supabase, user?.id);
      if (activeUser.current !== requestUser) return;
      setWorkoutRevision(revision => revision + 1);
      setError(null);
    } catch (err) {
      console.error("Sync error:", err);
      if (activeUser.current === requestUser) setError(err instanceof Error ? err.message : "Sync error");
    } finally {
      end();
    }
  };

  // Sync profile on app init if user is already signed in and db is ready (e.g. after app restart)
  useEffect(() => {
    if (!isDbReady) return;
    console.log("Initializing profile on app start...");
    initalizeProfile();
  }, [isDbReady, user?.id]);

  // Sync Workout data on app init if user is already signed in and db is ready (e.g. after app restart)
  useEffect(() => {
    if (!isDbReady || !user || !isProfileSet) return;
    console.log("Initializing sync on app start...");
    initializeSync();
  }, [isDbReady, user?.id, isProfileSet]);

  useEffect(() => {
    if (!isDbReady || !user || !isProfileSet) return;
    // NetInfo emits an initial snapshot; startup already handles that request.
    let wasOnline: boolean | undefined;
    return NetInfo.addEventListener(state => {
      // Unknown reachability is not a disconnect/reconnect transition.
      if (state.isConnected !== false && state.isInternetReachable == null) return;
      const online = !!state.isConnected && state.isInternetReachable === true;
      if (wasOnline === false && online) void initializeSync();
      wasOnline = online;
    });
  }, [isDbReady, user?.id, isProfileSet]);

  return (
    <SyncContext.Provider
      value={{
        isSyncLoading,
        isSyncing: isSyncing || requests > 0,
        isProfileSet,
        resetSync: initializeSync,
        refreshWorkouts,
        workoutRevision,
      }}
    >
      {error && <Text accessibilityRole="alert" style={{ color: "red", textAlign: "center" }}>{error}</Text>}
      {children}
    </SyncContext.Provider>
  );
}

export const useSync = () => {
  const context = useContext(SyncContext);

  if (!context) {
    throw new Error("useSync must be used within SyncProvider");
  }

  return context;
};
