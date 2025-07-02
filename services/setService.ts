import * as SQLite from "expo-sqlite";

export interface ExerciseSet {
  id: number;
  workout_exercise_id: number;
  reps?: number;
  weight?: number;
  time?: number;
  distance?: number;
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
      INSERT INTO exercise_sets (workout_exercise_id, reps, weight, time, distance)
      VALUES (?, ?, ?, ?, ?)
    `,
      [
        set.workout_exercise_id,
        set.reps ?? null,
        set.weight ?? null,
        set.time ?? null,
        set.distance ?? null,
      ]
    );
    return result.lastInsertRowId;
  },
};
