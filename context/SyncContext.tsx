import { createContext, useContext, useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabaseClient";
import { getMeta, META_KEYS, setMeta } from "@/utils/appMeta";
import { getDB, resetDBConnection } from "@/services/database";
import { syncService } from "@/services/syncService";
import { useAppInit } from "./AppInitContext";
import { useAuth } from "./authContext";
import { profileService } from "@/services/profileService";

interface SyncContextType {
  isSyncLoading: boolean;
  isSyncing: boolean;
  isProfileSet: boolean;
  resetSync: () => Promise<void>;
  refreshWorkouts: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  isSyncLoading: true,
  isSyncing: true,
  isProfileSet: false,
  resetSync: async () => {},
  refreshWorkouts: async () => {},
});

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isSyncLoading, setIsSyncLoading] = useState(true);
  const [isProfileSet, setIsProfileSet] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isDbReady } = useAppInit();
  const { user, isLoading } = useAuth();

  // In SyncContext, accept an optional callback
  const refreshWorkouts = async (onComplete?: () => Promise<void>) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const result = await syncService.refreshWorkouts(supabase, user.id);
      if (!result.success) throw new Error(result.error);
      await onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const initalizeProfile = async () => {
    setIsProfileSet(false);
    setIsSyncLoading(true);
    if (!user) return;

    try {
      const profile = await profileService.getProfile(user.id);

      if (profile) {
        setIsProfileSet(true);
      } else {
        console.log(
          "No profile found for user, getting profile from Supabase...",
        );
        const data = await profileService.fetchAndCacheProfile(user.id);
        if (data) {
          setIsProfileSet(true);
        } else {
          console.log("No profile found for user in Supabase either");
        }
      }
    } catch (err) {
      console.error("Profile initialization error:", err);
      setError(
        err instanceof Error ? err.message : "Profile initialization error",
      );
    } finally {
      console.log(
        "Profile initialization complete, setting isProfileSet and isSyncLoading",
      );
      setIsSyncLoading(false);
    }
  };

  const initializeSync = async () => {
    if (!user || !isProfileSet) {
      console.log("Cannot initialize sync, user or profile not set");
      return;
    }

    setIsSyncLoading(true);

    try {
      setIsSyncing(true);

      await syncService.sync(supabase, user?.id);
    } catch (err) {
      console.error("Sync error:", err);
      setError(err instanceof Error ? err.message : "Sync error");
    } finally {
      console.log(
        "Sync complete, setting isSyncLoading and isSyncing to false",
      );
      setIsSyncLoading(false);
      setIsSyncing(false);
    }
  };

  // Sync profile on app init if user is already signed in and db is ready (e.g. after app restart)
  useEffect(() => {
    if (!isDbReady || !user) return;
    console.log("Initializing profile on app start...");
    initalizeProfile();
  }, [isDbReady, user]);

  // Sync Workout data on app init if user is already signed in and db is ready (e.g. after app restart)
  useEffect(() => {
    if (!isDbReady || !user || !isProfileSet) return;
    console.log("Initializing sync on app start...");
    initializeSync();
  }, [isDbReady, user, isProfileSet]);

  if (user && isSyncLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Initializing sync...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "red", textAlign: "center" }}>{error}</Text>
      </View>
    );
  }

  return (
    <SyncContext.Provider
      value={{
        isSyncLoading,
        isSyncing,
        isProfileSet,
        resetSync: initializeSync,
        refreshWorkouts,
      }}
    >
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
