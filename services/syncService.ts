import NetInfo from "@react-native-community/netinfo";
import { SupabaseClient } from "@supabase/supabase-js";
import { getDB } from "./database";
import { getMeta, META_KEYS, setMeta } from "@/utils/appMeta";
import { SQLiteDatabase } from "expo-sqlite";

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
  cardio_entries: "id",
  cardio_intervals: "id",
  circuit_rounds: "id",
  user_preferences: "user_id",
};

// Prevents overlapping pushToSupabase runs (e.g. two screens triggering
// sync() at the same time), which was causing duplicate-key races.
let isPushing = false;

function isPostgrestErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
}

export const syncService = {
  isOnline: async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return !!state.isConnected && !!state.isInternetReachable;
  },

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

  addToSyncQueueInTransaction: async (
    transaction: SQLiteDatabase,
    userId: string,
    tableName: string,
    recordId: string,
    operation: "insert" | "update" | "delete",
    data: object,
  ): Promise<void> => {
    await transaction.runAsync(
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

  purgeOrphanedQueueItemsInTransaction: async (
    transaction: SQLiteDatabase,
    workoutId: string,
  ): Promise<void> => {
    const workoutExercises = await transaction.getAllAsync<{ id: string }>(
      `SELECT id FROM workout_exercises WHERE workout_id = ?`,
      [workoutId],
    );
    const cardioEntries = await transaction.getAllAsync<{ id: string }>(
      `SELECT id FROM cardio_entries WHERE workout_id = ?`,
      [workoutId],
    );
    const circuitRounds = await transaction.getAllAsync<{ id: string }>(
      `SELECT id FROM circuit_rounds WHERE workout_id = ?`,
      [workoutId],
    );

    const pendingItems = await transaction.getAllAsync<SyncQueueItem>(
      `SELECT id, user_id, table_name, record_id, operation, data, created_at, synced
       FROM sync_queue
       WHERE synced = 0
         AND table_name IN (
           'workout_exercises', 'exercise_sets', 'cardio_entries',
           'cardio_intervals', 'circuit_rounds'
         )`,
    );

    const workoutExerciseIds = new Set(workoutExercises.map(({ id }) => id));
    const cardioEntryIds = new Set(cardioEntries.map(({ id }) => id));
    const targetIds: Record<string, Set<string>> = {
      workout_exercises: workoutExerciseIds,
      exercise_sets: new Set(),
      cardio_entries: cardioEntryIds,
      cardio_intervals: new Set(),
      circuit_rounds: new Set(circuitRounds.map(({ id }) => id)),
    };
    const parsedItems = pendingItems.map((item) => {
      try {
        return { item, data: JSON.parse(item.data) as Record<string, unknown> };
      } catch {
        return { item, data: {} as Record<string, unknown> };
      }
    });

    // Pending inserts retain the parent IDs after a child has already been
    // deleted locally, so use both local rows and queue payloads to find them.
    for (const { item, data } of parsedItems) {
      if (
        item.table_name === "workout_exercises" &&
        data.workout_id === workoutId
      ) {
        workoutExerciseIds.add(item.record_id);
      } else if (
        item.table_name === "cardio_entries" &&
        data.workout_id === workoutId
      ) {
        cardioEntryIds.add(item.record_id);
      } else if (
        item.table_name === "circuit_rounds" &&
        data.workout_id === workoutId
      ) {
        targetIds.circuit_rounds.add(item.record_id);
      }
    }

    const localSets = await transaction.getAllAsync<{ id: string }>(
      `SELECT es.id FROM exercise_sets es
       JOIN workout_exercises we ON we.id = es.workout_exercise_id
       WHERE we.workout_id = ?`,
      [workoutId],
    );
    const localIntervals = await transaction.getAllAsync<{ id: string }>(
      `SELECT ci.id FROM cardio_intervals ci
       JOIN cardio_entries ce ON ce.id = ci.cardio_entry_id
       WHERE ce.workout_id = ?`,
      [workoutId],
    );
    for (const { id } of localSets) targetIds.exercise_sets.add(id);
    for (const { id } of localIntervals) targetIds.cardio_intervals.add(id);

    for (const { item, data } of parsedItems) {
      if (
        item.table_name === "exercise_sets" &&
        typeof data.workout_exercise_id === "string" &&
        workoutExerciseIds.has(data.workout_exercise_id)
      ) {
        targetIds.exercise_sets.add(item.record_id);
      } else if (
        item.table_name === "cardio_intervals" &&
        typeof data.cardio_entry_id === "string" &&
        cardioEntryIds.has(data.cardio_entry_id)
      ) {
        targetIds.cardio_intervals.add(item.record_id);
      }
    }

    for (const item of pendingItems) {
      if (targetIds[item.table_name]?.has(item.record_id)) {
        await transaction.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [
          item.id,
        ]);
      }
    }
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

  pushToSupabase: async (
    userId: string,
    supabase: SupabaseClient,
  ): Promise<{ success: boolean; error?: string }> => {
    // Guard against concurrent invocations racing on the same queue rows.
    if (isPushing) {
      console.log("pushToSupabase already running - skipping overlapping call");
      return { success: true };
    }
    isPushing = true;

    try {
      const db = await getDB();

      const pendingItems = await db.getAllAsync<SyncQueueItem>(
        `SELECT * FROM sync_queue WHERE synced = 0 AND user_id = ?
       ORDER BY 
         CASE table_name
           WHEN 'workouts' THEN 1
           WHEN 'workout_exercises' THEN 2
           WHEN 'exercise_sets' THEN 3
           WHEN 'cardio_entries' THEN 4
           WHEN 'cardio_intervals' THEN 5
           WHEN 'circuit_rounds' THEN 6
           ELSE 7
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
          // Skip orphaned exercise_sets
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

          // Skip orphaned workout_exercises
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

          switch (item.operation) {
            case "insert": {
              // Upsert instead of insert: makes retries/races idempotent
              // instead of throwing 23505 on an already-synced row.
              const { error } = await supabase
                .from(item.table_name)
                .insert(data);

              if (error) throw error;

              break;
            }

            case "update": {
              const { error } = await supabase
                .from(item.table_name)
                .update(data)
                .eq(pk, data[pk]);

              if (error) throw error;

              break;
            }

            case "delete": {
              const { error } = await supabase
                .from(item.table_name)
                .delete()
                .eq(pk, data[pk]);

              if (error) throw error;

              break;
            }

            default:
              throw new Error(`Unknown sync operation: ${item.operation}`);
          }

          // Only mark synced after Supabase succeeds
          await db.runAsync(`UPDATE sync_queue SET synced = 1 WHERE id = ?`, [
            item.id,
          ]);

          console.log(`Synced ${item.table_name} ${item.id} successfully`);
        } catch (error) {
          // A duplicate-key error on insert means the row already made it
          // to Supabase (e.g. from a prior/overlapping run) - treat as
          // synced rather than retrying forever.
          if (
            item.operation === "insert" &&
            isPostgrestErrorCode(error, "23505")
          ) {
            console.log(
              `Item ${item.id} (${item.table_name}) already exists remotely - marking synced`,
            );
            await db.runAsync(`UPDATE sync_queue SET synced = 1 WHERE id = ?`, [
              item.id,
            ]);
            continue;
          }

          console.error(`Failed to sync item ${item.id}:`, error);

          // Leave item unsynced so it retries later
        }
      }

      // Cleanup old synced items
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

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to push to Supabase",
      };
    } finally {
      isPushing = false;
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

      if (error) throw error;
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
