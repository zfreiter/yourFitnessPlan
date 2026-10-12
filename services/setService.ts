import * as SQLite from "expo-sqlite";
import * as Crypto from "expo-crypto";
import { syncService } from "@/services/syncService";
import { getDB } from "./database";
import { ExerciseSet } from "@/types/interfaces/types";
import { withLocalTransaction } from "./localTransaction";

export const setService = {
  insertWorkoutSets: async (
    sets: ExerciseSet[],
    db: SQLite.SQLiteDatabase,
  ): Promise<void> => {
    try {
      for (const set of sets) {
        await db.runAsync(
          `INSERT INTO exercise_sets
            (
              id,
              workout_exercise_id,
              reps,
              weight,
              time,
              distance,
              is_warmup,
              is_max,
              set_order
            )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            set.id,
            set.workout_exercise_id,
            set.reps ?? null,
            set.weight ?? null,
            set.time ?? null,
            set.distance ?? null,
            set.is_warmup,
            set.is_max,
            set.set_order,
          ],
        );
      }
    } catch (error) {
      console.error("Error inserting workout sets:", error);
      throw error;
    }
  },

  updateWorkoutSet: async (
    set: ExerciseSet,
    db: SQLite.SQLiteDatabase,
  ): Promise<void> => {
    try {
      await db.runAsync(
        `UPDATE exercise_sets
       SET
         reps = ?,
         weight = ?,
         time = ?,
         distance = ?,
         is_warmup = ?,
         is_max = ?,
         set_order = ?
       WHERE id = ?`,
        [
          set.reps ?? null,
          set.weight ?? null,
          set.time ?? null,
          set.distance ?? null,
          set.is_warmup ?? 0,
          set.is_max ?? 0,
          set.set_order ?? 1,
          set.id,
        ],
      );
    } catch (error) {
      console.error(`Error updating workout set ${set.id}:`, error);
      throw new Error("Failed to update workout set");
    }
  },

  getWorkoutSets: async (
    workoutExerciseId: string,
    db: SQLite.SQLiteDatabase,
  ): Promise<ExerciseSet[]> => {
    try {
      return await db.getAllAsync<ExerciseSet>(
        `SELECT *
         FROM exercise_sets
         WHERE workout_exercise_id = ?
         ORDER BY set_order`,
        [workoutExerciseId],
      );
    } catch (error) {
      console.error("Error getting workout sets:", error);
      return [];
    }
  },

  getSetsByWorkout: async (workoutId: string): Promise<ExerciseSet[]> => {
    const db = await getDB();

    return db.getAllAsync<ExerciseSet>(
      `SELECT es.*
       FROM exercise_sets es
       JOIN workout_exercises we
         ON es.workout_exercise_id = we.id
       WHERE we.workout_id = ?
       ORDER BY we.exercise_order, es.set_order`,
      [workoutId],
    );
  },

  getSetsByExercise: async (exerciseId: string): Promise<ExerciseSet[]> => {
    const db = await getDB();

    return db.getAllAsync<ExerciseSet>(
      `SELECT es.*
       FROM exercise_sets es
       JOIN workout_exercises we
         ON es.workout_exercise_id = we.id
       WHERE we.exercise_id = ?
       ORDER BY we.exercise_order, es.set_order`,
      [exerciseId],
    );
  },

  getSetsByWorkoutExercise: async (
    workoutExerciseId: string,
  ): Promise<ExerciseSet[]> => {
    const db = await getDB();

    return db.getAllAsync<ExerciseSet>(
      `SELECT *
       FROM exercise_sets
       WHERE workout_exercise_id = ?
       ORDER BY set_order`,
      [workoutExerciseId],
    );
  },

  addSet: async (
    userId: string,
    set: Omit<ExerciseSet, "id">,
  ): Promise<string> => {
    const id = Crypto.randomUUID();
    await withLocalTransaction(async (transaction) => {
      await transaction.runAsync(
      `INSERT INTO exercise_sets
        (
          id,
          workout_exercise_id,
          reps,
          weight,
          time,
          distance,
          is_warmup,
          is_max,
          set_order
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          set.workout_exercise_id,
          set.reps ?? null,
          set.weight ?? null,
          set.time ?? null,
          set.distance ?? null,
          set.is_warmup,
          set.is_max,
          set.set_order,
        ],
      );

      await syncService.addToSyncQueueInTransaction(
        transaction,
        userId,
        "exercise_sets",
        id,
        "insert",
        {
          id,
          workout_exercise_id: set.workout_exercise_id,
          reps: set.reps ?? null,
          weight: set.weight ?? null,
          time: set.time ?? null,
          distance: set.distance ?? null,
          is_warmup: set.is_warmup,
          is_max: set.is_max,
          set_order: set.set_order,
        },
      );
    });

    return id;
  },

  insertSet: async (
    userId: string,
    set: ExerciseSet,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await withLocalTransaction(async (transaction) => {
        await transaction.runAsync(
        `INSERT INTO exercise_sets
          (
            id,
            workout_exercise_id,
            reps,
            weight,
            time,
            distance,
            is_warmup,
            is_max,
            set_order
          )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          set.id,
          set.workout_exercise_id,
          set.reps ?? null,
          set.weight ?? null,
          set.time ?? null,
          set.distance ?? null,
          set.is_warmup,
          set.is_max,
          set.set_order,
        ],
      );

        await syncService.addToSyncQueueInTransaction(
          transaction,
          userId,
          "exercise_sets",
          set.id,
          "insert",
          set,
        );
      });

      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, error: String(error) };
    }
  },

  updateSet: async (
    userId: string,
    set: ExerciseSet,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await withLocalTransaction(async (transaction) => {
        await transaction.runAsync(
        `UPDATE exercise_sets
         SET
            reps = ?,
            weight = ?,
            time = ?,
            distance = ?,
            is_warmup = ?,
            is_max = ?,
            set_order = ?
         WHERE id = ?`,
        [
          set.reps ?? null,
          set.weight ?? null,
          set.time ?? null,
          set.distance ?? null,
          set.is_warmup,
          set.is_max,
          set.set_order,
          set.id,
        ],
      );

        await syncService.addToSyncQueueInTransaction(
          transaction,
          userId,
          "exercise_sets",
          set.id,
          "update",
          set,
        );
      });

      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, error: String(error) };
    }
  },

  updateSets: async (
    userId: string,
    sets: ExerciseSet[],
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await withLocalTransaction(async (transaction) => {
      const statement = await transaction.prepareAsync(
        `UPDATE exercise_sets
         SET
            reps = ?,
            weight = ?,
            time = ?,
            distance = ?,
            is_warmup = ?,
            is_max = ?,
            set_order = ?
         WHERE id = ?`,
      );

      try {
        for (const set of sets) {
          await statement.executeAsync([
            set.reps ?? null,
            set.weight ?? null,
            set.time ?? null,
            set.distance ?? null,
            set.is_warmup,
            set.is_max,
            set.set_order,
            set.id,
          ]);
        }
      } finally {
        await statement.finalizeAsync();
      }

      for (const set of sets) {
        await syncService.addToSyncQueueInTransaction(
          transaction,
          userId,
          "exercise_sets",
          set.id,
          "update",
          set,
        );
      }
      });

      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, error: String(error) };
    }
  },

  deleteSet: async (
    userId: string,
    setId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await withLocalTransaction(async (transaction) => {
        await transaction.runAsync(`DELETE FROM exercise_sets WHERE id = ?`, [setId]);

        await syncService.addToSyncQueueInTransaction(
          transaction,
          userId,
          "exercise_sets",
          setId,
          "delete",
          { id: setId },
        );
      });

      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, error: String(error) };
    }
  },

  deleteSetAndUpdateOrder: async (
    userId: string,
    setId: string,
    workoutExerciseId: string,
    extraSet: boolean,
    setOrder: number,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await withLocalTransaction(async (transaction) => {
        await transaction.runAsync(`DELETE FROM exercise_sets WHERE id = ?`, [setId]);

        await syncService.addToSyncQueueInTransaction(
          transaction,
          userId,
          "exercise_sets",
          setId,
          "delete",
          { id: setId },
        );

        if (extraSet) {
          const setsToUpdate = await transaction.getAllAsync<ExerciseSet>(
            `SELECT *
             FROM exercise_sets
             WHERE workout_exercise_id = ?
               AND set_order > ?
             ORDER BY set_order`,
            [workoutExerciseId, setOrder],
          );

          for (const set of setsToUpdate) {
            await transaction.runAsync(
              `UPDATE exercise_sets
               SET set_order = ?
               WHERE id = ?`,
              [set.set_order - 1, set.id],
            );

            await syncService.addToSyncQueueInTransaction(
              transaction,
              userId,
              "exercise_sets",
              set.id,
              "update",
              {
                id: set.id,
                set_order: set.set_order - 1,
              },
            );
          }
        }
      });

      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, error: String(error) };
    }
  },
};
