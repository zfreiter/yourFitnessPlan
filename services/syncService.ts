import NetInfo from "@react-native-community/netinfo";
import { SupabaseClient } from "@supabase/supabase-js";
import { getDB } from "./database";
import { getMeta, META_KEYS, setMeta } from "@/utils/appMeta";

interface SyncQueueItem {
  id: number;
  user_id: string;
  table_name: string;
  record_id: string;
  operation: "insert" | "update" | "delete";
  data: string;
  created_at: string;
  synced: number;
}

const TABLE_PRIMARY_KEYS: Record<string, string> = {
  workouts: "id",
  workout_exercises: "id",
  exercise_sets: "id",
  user_preferences: "user_id", // 👈 THIS is the fix
};

export const syncService = {
  // Check if device is online
  isOnline: async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return !!state.isConnected && !!state.isInternetReachable;
  },

  // Add item to sync queue
  addToSyncQueue: async (
    userId: string,
    tableName: string,
    recordId: string,
    operation: "insert" | "update" | "delete",
    data: object,
  ): Promise<void> => {
    const db = await getDB();
    await db.runAsync(
      `INSERT INTO sync_queue (user_id, table_name, record_id, operation, data, synced)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [userId, tableName, recordId, operation, JSON.stringify(data)],
    );
  },

  purgeOrphanedQueueItems: async (workoutId: string): Promise<void> => {
    const db = await getDB();
    const result = await db.runAsync(
      `DELETE FROM sync_queue 
     WHERE table_name = 'exercise_sets' 
     AND synced = 0
     AND record_id IN (
       SELECT id FROM exercise_sets WHERE workout_exercise_id IN (
         SELECT id FROM workout_exercises WHERE workout_id = ?
       )
     )`,
      [workoutId],
    );
    console.log(
      `Purged ${result.changes} orphaned exercise_sets queue items for workout ${workoutId}`,
    );
    const result2 = await db.runAsync(
      `DELETE FROM sync_queue 
     WHERE table_name = 'workout_exercises' 
     AND synced = 0
     AND record_id IN (
       SELECT id FROM workout_exercises WHERE workout_id = ?
     )`,
      [workoutId],
    );
    console.log(
      `Purged ${result2.changes} orphaned workout_exercises queue items for workout ${workoutId}`,
    );
  },

  refreshWorkouts: async (
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const db = await getDB();
    try {
      const online = await syncService.isOnline();
      if (!online) return { success: false, error: "No internet connection" };

      // Push any pending local changes first so we don't lose them
      await syncService.pushToSupabase(userId, supabase);

      // Clear local workout data for this user
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `DELETE FROM exercise_sets WHERE workout_exercise_id IN 
      (SELECT id FROM workout_exercises WHERE workout_id IN 
        (SELECT id FROM workouts WHERE user_id = ?))`,
          [userId],
        );
        await db.runAsync(
          `DELETE FROM workout_exercises WHERE workout_id IN 
      (SELECT id FROM workouts WHERE user_id = ?)`,
          [userId],
        );
        await db.runAsync(`DELETE FROM workouts WHERE user_id = ?`, [userId]);
      });

      // Reset sync timestamp to force a full re-pull
      await setMeta(META_KEYS.WORKOUTS_SYNCED_AT, "");

      // Pull fresh from Supabase
      await syncService.pullFromSupabase(supabase, userId);

      // Update sync timestamp
      await setMeta(META_KEYS.WORKOUTS_SYNCED_AT, new Date().toISOString());

      return { success: true };
    } catch (error) {
      console.error("Error refreshing workouts:", error);
      return { success: false, error: "Failed to refresh workouts" };
    }
  },

  // Push pending items from sync_queue to Supabase
  pushToSupabase: async (
    userId: string,
    supabase: SupabaseClient,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const db = await getDB();

      const pendingItems = await db.getAllAsync<SyncQueueItem>(
        `SELECT * FROM sync_queue WHERE synced = 0 AND user_id = ?
         ORDER BY 
           CASE table_name
             WHEN 'workouts' THEN 1
             WHEN 'workout_exercises' THEN 2
             WHEN 'exercise_sets' THEN 3
             ELSE 4
           END,
           created_at ASC`,
        [userId],
      );

      if (pendingItems.length === 0) return { success: true };
      console.log("pending items ", pendingItems);

      for (const item of pendingItems) {
        const data = JSON.parse(item.data);
        const pk = TABLE_PRIMARY_KEYS[item.table_name] || "id";

        try {
          // ✅ Skip orphaned exercise_sets inserts/updates
          if (
            item.table_name === "exercise_sets" &&
            (item.operation === "insert" || item.operation === "update")
          ) {
            const parent = await db.getFirstAsync(
              `SELECT id FROM workout_exercises WHERE id = ?`,
              [data.workout_exercise_id],
            );
            if (!parent) {
              console.log(
                `Skipping orphaned exercise_set ${item.id} — parent workout_exercise not found`,
              );
              await db.runAsync(
                `UPDATE sync_queue SET synced = 1 WHERE id = ?`,
                [item.id],
              );
              continue;
            }
          }

          // ✅ Skip orphaned workout_exercises inserts/updates
          if (
            item.table_name === "workout_exercises" &&
            (item.operation === "insert" || item.operation === "update")
          ) {
            const parent = await db.getFirstAsync(
              `SELECT id FROM workouts WHERE id = ?`,
              [data.workout_id],
            );
            if (!parent) {
              console.log(
                `Skipping orphaned workout_exercise ${item.id} — parent workout not found`,
              );
              await db.runAsync(
                `UPDATE sync_queue SET synced = 1 WHERE id = ?`,
                [item.id],
              );
              continue;
            }
          }

          await db.runAsync(`UPDATE sync_queue SET synced = 1 WHERE id = ?`, [
            item.id,
          ]);
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
        }
      }

      // Clean up synced items older than 7 days
      await db.runAsync(
        `DELETE FROM sync_queue 
         WHERE synced = 1 
         AND user_id = ?
         AND created_at < datetime('now', '-7 days')`,
        [userId],
      );

      return { success: true };
    } catch (error) {
      console.error("Error pushing to Supabase:", error);
      return { success: false, error: "Failed to push to Supabase" };
    }
  },

  // Pull 3 month window from Supabase - only on first install or new device
  pullFromSupabase: async (
    supabase: SupabaseClient,
    userId: string,
  ): Promise<void> => {
    const db = await getDB();
    try {
      const { data: workouts, error } = await supabase
        .from("workouts")
        .select(
          `
    *,
    workout_exercises (
      *,
      exercise_sets (*)
    )
  `,
        )
        .eq("user_id", userId)
        .order("scheduled_datetime", { ascending: true });

      //console.log("pullFromSupabase response ", workouts, error);
      if (error) throw error;
      //console.log("SyncService workouts pulled from supabase ", workouts);
      if (!workouts?.length) return;

      for (const workout of workouts) {
        await db.runAsync(
          `INSERT OR IGNORE INTO workouts 
           (id, user_id, name, description, type, scheduled_datetime, duration, is_completed, completed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            workout.id,
            workout.user_id,
            workout.name,
            workout.description,
            workout.type,
            workout.scheduled_datetime,
            workout.duration,
            workout.is_completed ? 1 : 0,
            workout.completed_at,
          ],
        );

        for (const we of workout.workout_exercises ?? []) {
          await db.runAsync(
            `INSERT OR IGNORE INTO workout_exercises
             (id, workout_id, exercise_id, exercise_name, chosen_unit_combination, track_reps, track_weight, track_time, track_distance, exercise_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              we.id,
              we.workout_id,
              we.exercise_id,
              we.exercise_name,
              we.chosen_unit_combination,
              we.track_reps ? 1 : 0,
              we.track_weight ? 1 : 0,
              we.track_time ? 1 : 0,
              we.track_distance ? 1 : 0,
              we.exercise_order,
            ],
          );

          for (const set of we.exercise_sets ?? []) {
            await db.runAsync(
              `INSERT OR IGNORE INTO exercise_sets
               (id, workout_exercise_id, reps, weight, time, distance, set_order)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                set.id,
                set.workout_exercise_id,
                set.reps,
                set.weight,
                set.time,
                set.distance,
                set.set_order,
              ],
            );
          }
        }
      }

      console.log("Pull from Supabase complete");
    } catch (error) {
      console.error("Error pulling from Supabase in syncService:", error);
    }
  },

  // Clean up old local workouts (keep last, current, next month only)
  cleanupOldWorkouts: async (userId: string): Promise<void> => {
    const db = await getDB();
    try {
      await db.runAsync(
        `DELETE FROM workouts 
         WHERE user_id = ?
         AND scheduled_datetime < date('now', 'start of month', '-1 month')
         AND is_completed = 1`,
        [userId],
      );
    } catch (error) {
      console.error("Error cleaning up old workouts:", error);
    }
  },

  // Main sync function - call this on app launch
  sync: async (supabase: SupabaseClient, userId: string): Promise<void> => {
    try {
      const online = await syncService.isOnline();
      if (!online) {
        console.log("Offline - skipping sync");
        return;
      }

      console.log("Online - starting sync");

      // Always push pending local changes first
      await syncService.pushToSupabase(userId, supabase);

      // Only pull on first install or new device login
      const lastSynced = await getMeta(META_KEYS.WORKOUTS_SYNCED_AT);
      console.log("Last synced at ", lastSynced);
      if (!lastSynced) {
        console.log("First sync - pulling from Supabase in syncService...");
        await syncService.pullFromSupabase(supabase, userId);
        await setMeta(META_KEYS.WORKOUTS_SYNCED_AT, new Date().toISOString());
      }

      // Clean up old local data
      await syncService.cleanupOldWorkouts(userId);

      console.log("Sync complete");
    } catch (error) {
      console.error("Sync failed:", error);
    }
  },
};
