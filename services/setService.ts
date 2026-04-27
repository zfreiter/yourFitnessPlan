import * as SQLite from "expo-sqlite";
import * as Crypto from "expo-crypto";
import { syncService } from "@/services/syncService";
import { getDB } from "./database";

export interface ExerciseSet {
  id: string;
  workout_exercise_id: string;
  reps?: number;
  weight?: number;
  time?: number;
  distance?: number;
  set_order?: number;
}

export const setService = {
  getSetsByWorkout: async (workoutId: string): Promise<ExerciseSet[]> => {
    const db = await getDB();
    const sets = await db.getAllAsync(
      `
      SELECT es.*
      FROM exercise_sets es
      JOIN workout_exercises we ON es.workout_exercise_id = we.id
      WHERE we.workout_id = ?
      ORDER BY es.id
    `,
      [workoutId],
    );
    return sets as ExerciseSet[];
  },

  getSetsByExercise: async (exerciseId: string): Promise<ExerciseSet[]> => {
    const db = await getDB();
    const sets = await db.getAllAsync(
      `
      SELECT es.*
      FROM exercise_sets es
      JOIN workout_exercises we ON es.workout_exercise_id = we.id
      WHERE we.exercise_id = ?
      ORDER BY es.id
    `,
      [exerciseId],
    );
    return sets as ExerciseSet[];
  },

  getSetsByWorkoutExercise: async (
    workoutExerciseId: string,
  ): Promise<ExerciseSet[]> => {
    const db = await getDB();
    const sets = await db.getAllAsync(
      `
      SELECT *
      FROM exercise_sets
      WHERE workout_exercise_id = ?
      ORDER BY id
    `,
      [workoutExerciseId],
    );
    return sets as ExerciseSet[];
  },

  addSet: async (
    userId: string,
    set: Omit<ExerciseSet, "id">,
  ): Promise<string> => {
    const db = await getDB();
    const id = Crypto.randomUUID();
    await db.runAsync(
      `
      INSERT INTO exercise_sets (id, workout_exercise_id, reps, weight, time, distance, set_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        id,
        set.workout_exercise_id,
        set.reps ?? null,
        set.weight ?? null,
        set.time ?? null,
        set.distance ?? null,
        set.set_order ?? null,
      ],
    );

    await syncService.addToSyncQueue(userId, "exercise_sets", id, "insert", {
      id,
      workout_exercise_id: set.workout_exercise_id,
      reps: set.reps ?? null,
      weight: set.weight ?? null,
      time: set.time ?? null,
      distance: set.distance ?? null,
      set_order: set.set_order ?? null,
    });

    return id;
  },

  insertSet: async (
    userId: string,
    set: ExerciseSet,
  ): Promise<{ success: boolean; error?: string }> => {
    const db = await getDB();
    try {
      await db.runAsync(
        `INSERT INTO exercise_sets (id, workout_exercise_id, reps, weight, time, distance, set_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          set.id,
          set.workout_exercise_id,
          set.reps ?? null,
          set.weight ?? null,
          set.time ?? null,
          set.distance ?? null,
          set.set_order ?? null,
        ],
      );

      await syncService.addToSyncQueue(
        userId,
        "exercise_sets",
        set.id,
        "insert",
        {
          id: set.id,
          workout_exercise_id: set.workout_exercise_id,
          reps: set.reps ?? null,
          weight: set.weight ?? null,
          time: set.time ?? null,
          distance: set.distance ?? null,
          set_order: set.set_order ?? null,
        },
      );

      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, error: error as string };
    }
  },

  deleteSet: async (
    userId: string,
    setId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const db = await getDB();
    try {
      await db.runAsync(`DELETE FROM exercise_sets WHERE id = ?`, [setId]);

      await syncService.addToSyncQueue(
        userId,
        "exercise_sets",
        setId,
        "delete",
        {
          id: setId,
        },
      );

      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, error: error as string };
    }
  },

  deleteSetAndUpdateOrder: async (
    userId: string,
    setId: string,
    exerciseId: string,
    extraSet: boolean,
    setOrder: number,
  ): Promise<{ success: boolean; error?: string }> => {
    const db = await getDB();
    try {
      await db.runAsync(`BEGIN TRANSACTION`);
      await db.runAsync(`DELETE FROM exercise_sets WHERE id = ?`, [setId]);

      await syncService.addToSyncQueue(
        userId,
        "exercise_sets",
        setId,
        "delete",
        {
          id: setId,
        },
      );

      if (extraSet) {
        const setsToUpdate: ExerciseSet[] = await db.getAllAsync(
          `SELECT * FROM exercise_sets WHERE workout_exercise_id = ? AND set_order > ?`,
          [exerciseId, setOrder],
        );
        await Promise.all(
          setsToUpdate.map(async (set) => {
            await db.runAsync(
              `UPDATE exercise_sets SET set_order = ? WHERE id = ?`,
              [set.set_order! - 1, set.id],
            );

            await syncService.addToSyncQueue(
              userId,
              "exercise_sets",
              set.id,
              "update",
              {
                id: set.id,
                set_order: set.set_order! - 1,
              },
            );
          }),
        );
      }
      await db.runAsync(`COMMIT`);
      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, error: error as string };
    }
  },

  updateSet: async (
    userId: string,
    set: ExerciseSet,
  ): Promise<{ success: boolean; error?: string }> => {
    const db = await getDB();
    try {
      await db.runAsync(
        `UPDATE exercise_sets SET reps = ?, weight = ?, time = ?, distance = ? WHERE id = ?`,
        [
          set.reps ?? null,
          set.weight ?? null,
          set.time ?? null,
          set.distance ?? null,
          set.id,
        ],
      );

      await syncService.addToSyncQueue(
        userId,
        "exercise_sets",
        set.id,
        "update",
        {
          id: set.id,
          workout_exercise_id: set.workout_exercise_id,
          reps: set.reps ?? null,
          weight: set.weight ?? null,
          time: set.time ?? null,
          distance: set.distance ?? null,
          set_order: set.set_order ?? null,
        },
      );

      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, error: error as string };
    }
  },

  updateSets: async (
    userId: string,
    sets: ExerciseSet[],
  ): Promise<{ success: boolean; error?: string }> => {
    console.log("userId in setService updateSets: ", userId);
    console.log(
      "Updating multiple sets with updateSets in setService updateSets: ",
      sets,
    );
    const db = await getDB();
    try {
      const statement = await db.prepareAsync(
        `UPDATE exercise_sets 
           SET reps = ?, weight = ?, time = ?, distance = ?, set_order = ?
           WHERE id = ?`,
      );

      try {
        for (const set of sets) {
          await statement.executeAsync([
            set.reps ?? null,
            set.weight ?? null,
            set.time ?? null,
            set.distance ?? null,
            set.set_order ?? null,
            set.id,
          ]);
        }
      } finally {
        await statement.finalizeAsync();
      }

      // Add each set to sync queue after transaction completes
      for (const set of sets) {
        await syncService.addToSyncQueue(
          userId,
          "exercise_sets",
          set.id,
          "update",
          {
            id: set.id,
            workout_exercise_id: set.workout_exercise_id,
            reps: set.reps ?? null,
            weight: set.weight ?? null,
            time: set.time ?? null,
            distance: set.distance ?? null,
            set_order: set.set_order ?? null,
          },
        );
      }

      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, error: error as string };
    }
  },
};
