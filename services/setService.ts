import * as SQLite from "expo-sqlite";

export interface ExerciseSet {
  id: number;
  workout_exercise_id: number;
  reps?: number;
  weight?: number;
  time?: number;
  distance?: number;
  set_order?: number;
}

export const setService = {
  getSetsByWorkout: async (
    db: SQLite.SQLiteDatabase,
    workoutId: number
  ): Promise<ExerciseSet[]> => {
    const sets = await db.getAllAsync(
      `
      SELECT es.*
      FROM exercise_sets es
      JOIN workout_exercises we ON es.workout_exercise_id = we.id
      WHERE we.workout_id = ?
      ORDER BY es.id
    `,
      [workoutId]
    );
    return sets as ExerciseSet[];
  },

  getSetsByExercise: async (
    db: SQLite.SQLiteDatabase,
    exerciseId: number
  ): Promise<ExerciseSet[]> => {
    const sets = await db.getAllAsync(
      `
      SELECT es.*
      FROM exercise_sets es
      JOIN workout_exercises we ON es.workout_exercise_id = we.id
      WHERE we.exercise_id = ?
      ORDER BY es.id
    `,
      [exerciseId]
    );
    return sets as ExerciseSet[];
  },

  getSetsByWorkoutExercise: async (
    db: SQLite.SQLiteDatabase,
    workoutExerciseId: number
  ): Promise<ExerciseSet[]> => {
    const sets = await db.getAllAsync(
      `
      SELECT *
      FROM exercise_sets
      WHERE workout_exercise_id = ?
      ORDER BY id
    `,
      [workoutExerciseId]
    );
    return sets as ExerciseSet[];
  },
  addSet: async (
    db: SQLite.SQLiteDatabase,
    set: Omit<ExerciseSet, "id">
  ): Promise<number> => {
    const result = await db.runAsync(
      `
      INSERT INTO exercise_sets (workout_exercise_id, reps, weight, time, distance, set_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [
        set.workout_exercise_id,
        set.reps ?? null,
        set.weight ?? null,
        set.time ?? null,
        set.distance ?? null,
        set.set_order ?? null,
      ]
    );
    return result.lastInsertRowId;
  },
  createSet: async (
    db: SQLite.SQLiteDatabase,
    set: Omit<ExerciseSet, "id">
  ): Promise<{ success: boolean; rowId?: number; error?: string }> => {
    try {
      const result = await db.runAsync(
        `INSERT INTO exercise_sets (workout_exercise_id, reps, weight, time, distance, set_order) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          set.workout_exercise_id,
          set.reps ?? null,
          set.weight ?? null,
          set.time ?? null,
          set.distance ?? null,
          set.set_order ?? null,
        ]
      );
      return { success: true, rowId: result.lastInsertRowId };
    } catch (error) {
      console.error(error);
      return { success: false, error: error as string };
    }
  },
  deleteSet: async (
    db: SQLite.SQLiteDatabase,
    setId: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await db.runAsync(`DELETE FROM exercise_sets WHERE id = ?`, [setId]);
      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, error: error as string };
    }
  },
  deleteSetAndUpdateOrder: async (
    db: SQLite.SQLiteDatabase,
    setId: number,
    exerciseId: number,
    extraSet: boolean,
    setOrder: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await db.runAsync(`BEGIN TRANSACTION`);
      const removedSet = await db.runAsync(
        `DELETE FROM exercise_sets WHERE id = ?`,
        [setId]
      );

      if (extraSet) {
        const setsToUpdate: ExerciseSet[] = await db.getAllAsync(
          `SELECT * FROM exercise_sets WHERE workout_exercise_id = ? AND set_order > ?`,
          [exerciseId, setOrder]
        );
        await Promise.all(
          setsToUpdate.map(async (set) => {
            await db.runAsync(
              `UPDATE exercise_sets SET set_order = ? WHERE id = ?`,
              [set.set_order! - 1, set.id]
            );
          })
        );
      }
      await db.runAsync(`COMMIT`);
      // remove the set from the exercise
      // update the order of the sets.
      // await db.runAsync(`DELETE FROM exercise_sets WHERE id = ?`, [setId]);
      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, error: error as string };
    }
  },
  updateSet: async (
    db: SQLite.SQLiteDatabase,
    set: ExerciseSet
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("set", set);
      await db.runAsync(
        `UPDATE exercise_sets SET reps = ?, weight = ?, time = ?, distance = ? WHERE id = ?`,
        [
          set.reps ?? null,
          set.weight ?? null,
          set.time ?? null,
          set.distance ?? null,
          set.id,
        ]
      );
      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, error: error as string };
    }
  },
};
