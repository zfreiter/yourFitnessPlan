import * as SQLite from "expo-sqlite";
import { syncService } from "@/services/syncService";
import { UserPreferences, UserPreferencesUpdate } from "@/types/user/type";
import { getDB } from "./database";

interface UserPreferenceServiceInterface {
  /**
   * Returns the preferences stored locally (SQLite) or `null` if not found.
   * Errors are logged and result in a `null` return value so callers can
   * continue with a fallback strategy (eg. fetching from Supabase).
   */
  getUserPreferences: (userId: string) => Promise<UserPreferences | null>;

  cacheUserPreferences: (data: UserPreferences) => Promise<boolean>;
  /**
   * Applies the given update to the local database and also enqueues the
   * change for syncing.  No value is returned; errors are logged so callers
   * can ignore the result.
   */
  updateUserPreferences: (
    preferences: UserPreferencesUpdate,
  ) => Promise<boolean>;
}

export const userPreferenceService: UserPreferenceServiceInterface = {
  getUserPreferences: async (
    userId: string,
  ): Promise<UserPreferences | null> => {
    const db = await getDB();
    try {
      // look up the record in local sqlite; might return null
      const userPreferences: UserPreferences | null =
        await db.getFirstAsync<UserPreferences>(
          `SELECT * FROM user_preferences WHERE user_id = ?`,
          [userId],
        );

      return userPreferences;
    } catch (error) {
      console.log("Error in userPreferenceService get user preference ", error);
      return null;
    }
  },

  cacheUserPreferences: async (data: UserPreferences): Promise<boolean> => {
    const db = await getDB();
    try {
      const result = await db.runAsync(
        `INSERT OR REPLACE INTO user_preferences 
    (user_id, theme, unit_system, set_progression_style, rm_formula, weight_rounding, 
     allow_analytics, default_workout_visibility, allow_friend_requests, who_can_send_workouts, 
     notifications_enabled, email_product_updates, email_tips, created_at, updated_at) 
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.user_id,
          data.theme,
          data.unit_system,
          data.set_progression_style,
          data.rm_formula,
          data.weight_rounding,
          data.allow_analytics ? 1 : 0,
          data.default_workout_visibility,
          data.allow_friend_requests ? 1 : 0,
          data.who_can_send_workouts,
          data.notifications_enabled ? 1 : 0,
          data.email_product_updates ? 1 : 0,
          data.email_tips ? 1 : 0,
          data.created_at,
          data.updated_at,
        ],
      );

      return result.changes === 1;
    } catch {
      return false;
    }
  },

  updateUserPreferences: async (
    preferences: UserPreferencesUpdate,
  ): Promise<boolean> => {
    const db = await getDB();
    try {
      // update sqlite
      const response = await db.runAsync(
        `UPDATE user_preferences 
   SET theme = ?,unit_system = ?, set_progression_style = ?, rm_formula = ?, 
       weight_rounding = ?, allow_analytics = ?, default_workout_visibility = ?, allow_friend_requests = ?, 
       who_can_send_workouts = ?, notifications_enabled = ?, email_product_updates = ?, email_tips = ?, 
       updated_at = ?
   WHERE user_id = ?`,
        [
          preferences.theme ?? null,
          preferences.unit_system ?? null,
          preferences.set_progression_style ?? null,
          preferences.rm_formula ?? null,
          preferences.weight_rounding ?? null,
          preferences.allow_analytics != null
            ? preferences.allow_analytics
              ? 1
              : 0
            : null,
          preferences.default_workout_visibility ?? null,
          preferences.allow_friend_requests != null
            ? preferences.allow_friend_requests
              ? 1
              : 0
            : null,
          preferences.who_can_send_workouts ?? null,
          preferences.notifications_enabled != null
            ? preferences.notifications_enabled
              ? 1
              : 0
            : null,
          preferences.email_product_updates != null
            ? preferences.email_product_updates
              ? 1
              : 0
            : null,
          preferences.email_tips != null
            ? preferences.email_tips
              ? 1
              : 0
            : null,
          new Date().toISOString(),
          preferences.user_id,
        ],
      );

      // add to sync
      await syncService.addToSyncQueue(
        preferences.user_id,
        "user_preferences",
        preferences.user_id,
        "update",
        preferences,
      );

      return true;
    } catch (error) {
      console.log(
        "Error in userPreferenceService update user preference ",
        error,
      );
      return false;
    }
  },
};
