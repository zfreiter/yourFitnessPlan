import { syncService } from "@/services/syncService";
import { ProfileInterface } from "@/types/user/type";
import { getDB } from "./database";
import { supabase } from "@/lib/supabaseClient";

export interface ProfileUpdate {
  id: string;
  age?: number | null;
  current_height?: number | null;
  current_weight?: number | null;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
}

interface ProfileServiceInterface {
  /**
   * Returns the profile stored locally (SQLite) or `null` if not found.
   * Errors are logged and result in a `null` return value so callers can
   * continue with a fallback strategy (eg. fetching from Supabase).
   */
  getProfile: (userId: string) => Promise<ProfileInterface | null>;
  fetchAndCacheProfile: (userId: string) => Promise<ProfileInterface | null>;
  /**
   * Inserts or replaces the profile in the local SQLite cache.
   */
  cacheProfile: (data: ProfileInterface) => Promise<boolean>;

  /**
   * Applies the given update to the local database and enqueues the
   * change for syncing. Errors are logged so callers can handle failures.
   */
  updateProfile: (profile: ProfileUpdate) => Promise<boolean>;
}

export const profileService: ProfileServiceInterface = {
  getProfile: async (userId: string): Promise<ProfileInterface | null> => {
    const db = await getDB();
    try {
      const profile: ProfileInterface | null =
        await db.getFirstAsync<ProfileInterface>(
          `SELECT * FROM profiles WHERE id = ?`,
          [userId],
        );

      return profile;
    } catch (error) {
      console.log("Error in profileService getProfile ", error);
      return null;
    }
  },

  fetchAndCacheProfile: async (
    userId: string,
  ): Promise<ProfileInterface | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile from Supabase:", error);
        return null;
      }

      if (!data) {
        console.log("No profile found for user:", userId);
        return null;
      }

      // Cache the fetched profile
      const cached = await profileService.cacheProfile(data);
      if (!cached) {
        console.warn("Failed to cache profile in local database");
      }

      return data;
    } catch (error) {
      console.error("Unexpected error in fetchAndCacheProfile:", error);
      return null;
    }
  },

  cacheProfile: async (data: ProfileInterface): Promise<boolean> => {
    const db = await getDB();
    try {
      const result = await db.runAsync(
        `INSERT OR REPLACE INTO profiles 
        (id, full_name, username, avatar_url, age, current_weight, current_height, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.id,
          data.full_name,
          data.username ?? null,
          data.avatar_url ?? null,
          data.age ?? null,
          data.current_weight ?? null,
          data.current_height ?? null,
          data.created_at,
          data.updated_at,
        ],
      );

      return result.changes === 1;
    } catch (error) {
      console.log("Error in profileService cacheProfile ", error);
      return false;
    }
  },

  updateProfile: async (profile: ProfileUpdate): Promise<boolean> => {
    const db = await getDB();
    try {
      const response = await db.runAsync(
        `UPDATE profiles
        SET full_name = ?, username = ?, avatar_url = ?, age = ?,
            current_weight = ?, current_height = ?, updated_at = ?
        WHERE id = ?`,
        [
          profile.full_name ?? null,
          profile.username ?? null,
          profile.avatar_url ?? null,
          profile.age ?? null,
          profile.current_weight ?? null,
          profile.current_height ?? null,
          new Date().toISOString(),
          profile.id,
        ],
      );

      await syncService.addToSyncQueue(
        profile.id,
        "profiles",
        profile.id,
        "update",
        profile,
      );

      return response.changes === 1;
    } catch (error) {
      console.log("Error in profileService updateProfile ", error);
      return false;
    }
  },
};
