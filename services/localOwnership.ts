import { SQLiteDatabase } from "expo-sqlite";

type WorkoutChildTable =
  | "workout_exercises"
  | "exercise_sets"
  | "cardio_entries"
  | "cardio_intervals"
  | "circuit_rounds";

const childOwnershipQueries: Record<WorkoutChildTable, string> = {
  workout_exercises: `SELECT we.id, w.id AS workout_id
    FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = ? AND w.user_id = ? AND (? IS NULL OR we.workout_id = ?)`,
  exercise_sets: `SELECT es.id, w.id AS workout_id
    FROM exercise_sets es
    JOIN workout_exercises we ON we.id = es.workout_exercise_id
    JOIN workouts w ON w.id = we.workout_id
    WHERE es.id = ? AND w.user_id = ? AND (? IS NULL OR we.workout_id = ?)`,
  cardio_entries: `SELECT ce.id, w.id AS workout_id
    FROM cardio_entries ce JOIN workouts w ON w.id = ce.workout_id
    WHERE ce.id = ? AND w.user_id = ? AND (? IS NULL OR ce.workout_id = ?)`,
  cardio_intervals: `SELECT ci.id, w.id AS workout_id
    FROM cardio_intervals ci
    JOIN cardio_entries ce ON ce.id = ci.cardio_entry_id
    JOIN workouts w ON w.id = ce.workout_id
    WHERE ci.id = ? AND w.user_id = ? AND (? IS NULL OR ce.workout_id = ?)`,
  circuit_rounds: `SELECT cr.id, w.id AS workout_id
    FROM circuit_rounds cr JOIN workouts w ON w.id = cr.workout_id
    WHERE cr.id = ? AND w.user_id = ? AND (? IS NULL OR cr.workout_id = ?)`,
};

export async function assertWorkoutOwned(
  transaction: SQLiteDatabase,
  userId: string,
  workoutId: string,
): Promise<void> {
  const row = await transaction.getFirstAsync<{ id: string }>(
    `SELECT id FROM workouts WHERE id = ? AND user_id = ?`,
    [workoutId, userId],
  );
  if (!row) throw new Error("Workout not found for authenticated user");
}

export async function assertWorkoutChildOwned(
  transaction: SQLiteDatabase,
  userId: string,
  table: WorkoutChildTable,
  recordId: string,
  expectedWorkoutId?: string,
): Promise<string> {
  const expected = expectedWorkoutId ?? null;
  const row = await transaction.getFirstAsync<{ id: string; workout_id: string }>(
    childOwnershipQueries[table],
    [recordId, userId, expected, expected],
  );
  if (!row) throw new Error(`${table} record not found for authenticated workout`);
  return row.workout_id;
}

export async function assertWorkoutChildDoesNotExist(
  transaction: SQLiteDatabase,
  table: WorkoutChildTable,
  recordId: string,
): Promise<void> {
  const row = await transaction.getFirstAsync<{ id: string }>(
    `SELECT id FROM ${table} WHERE id = ?`,
    [recordId],
  );
  if (row) throw new Error(`${table} record ID already exists`);
}
