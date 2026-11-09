import { SQLiteDatabase } from "expo-sqlite";
import { assertWorkoutChildOwned, assertWorkoutOwned } from "./localOwnership";
import { cancelNeverAttempted } from "./uploadLifecycle";

export const deletionParents = {
  exercise_sets: ["workout_exercises", "workout_exercise_id"],
  workout_exercises: ["workouts", "workout_id"],
  circuit_rounds: ["workouts", "workout_id"],
  cardio_intervals: ["cardio_entries", "cardio_entry_id"],
  cardio_entries: ["workouts", "workout_id"],
} as const;
export type DeletionTable = keyof typeof deletionParents | "workouts";
export interface DeletionEvidence {
  version: 2;
  userId: string;
  table: DeletionTable;
  recordId: string;
  workoutId: string;
  queueId: number;
  parents: { table: string; id: string }[];
  remoteConfirmed: boolean;
}
export const deletionEvidenceKey = (userId: string, table: string, id: string) =>
  `owned-delete:v2:${JSON.stringify([userId, table, id])}`;

export async function readDeletionEvidence(db: SQLiteDatabase, userId: string, table: string, id: string): Promise<DeletionEvidence | null> {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_meta WHERE key = ?", [deletionEvidenceKey(userId, table, id)]);
  try {
    const value = JSON.parse(row?.value ?? "null") as DeletionEvidence | null;
    return value?.version === 2 && value.userId === userId && value.table === table && value.recordId === id &&
      Number.isInteger(value.queueId) && value.queueId > 0 && typeof value.workoutId === "string" && value.workoutId.length > 0 &&
      Array.isArray(value.parents) && value.parents.every(parent => parent && typeof parent.id === "string" && parent.id.length > 0 &&
        (parent.table === "workouts" || parent.table in deletionParents)) &&
      typeof value.remoteConfirmed === "boolean" ? value : null;
  } catch { return null; }
}

// Must run before local removal, on the caller's exclusive transaction handle.
// Never infer ownership from a historical payload or from a missing local row.
export async function queueOwnedDeletion(db: SQLiteDatabase, userId: string, table: DeletionTable, id: string): Promise<void> {
  const workoutId = table === "workouts" ? id : await assertWorkoutChildOwned(db, userId, table, id);
  await assertWorkoutOwned(db, userId, workoutId);
  if (await cancelNeverAttempted(db, userId, table, id)) return;
  const previous = await readDeletionEvidence(db, userId, table, id);
  if (previous && await db.getFirstAsync("SELECT id FROM sync_queue WHERE id = ? AND user_id = ? AND table_name = ? AND record_id = ? AND operation = 'delete' AND synced = 0", [previous.queueId, userId, table, id])) return;
  const parents: DeletionEvidence["parents"] = [];
  if (table === "workout_exercises") {
    const exercise = await db.getFirstAsync<{ circuit_id: string | null }>("SELECT circuit_id FROM workout_exercises WHERE id = ?", [id]);
    if (exercise?.circuit_id) parents.push({ table: "circuit_rounds", id: exercise.circuit_id });
  }
  let currentTable: DeletionTable = table;
  let currentId = id;
  while (currentTable !== "workouts") {
    const [parentTable, field] = deletionParents[currentTable];
    const row = await db.getFirstAsync<Record<string, string>>(`SELECT ${field} FROM ${currentTable} WHERE id = ?`, [currentId]);
    if (!row?.[field]) throw new Error("Deletion parent evidence is unavailable");
    parents.push({ table: parentTable, id: row[field] });
    currentTable = parentTable;
    currentId = row[field];
  }
  // Do not discard earlier operations. They remain retryable evidence until
  // this terminal delete is authorized and its remote effect is confirmed.
  const result = await db.runAsync(
    "INSERT INTO sync_queue (user_id, table_name, record_id, operation, data, synced) VALUES (?, ?, ?, 'delete', ?, 0)",
    [userId, table, id, JSON.stringify({ id })],
  );
  const evidence: DeletionEvidence = { version: 2, userId, table, recordId: id, workoutId, queueId: result.lastInsertRowId, parents, remoteConfirmed: false };
  await db.runAsync("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)", [deletionEvidenceKey(userId, table, id), JSON.stringify(evidence)]);
  if (table === "workouts") {
    // Retain the legacy root receipt for the existing read-only inspector.
    await db.runAsync("INSERT INTO app_meta (key, value) VALUES (?, ?)", [`workout-delete-owner:${result.lastInsertRowId}`, JSON.stringify({ userId, workoutId })]);
  }
}

export async function queueExerciseDeletion(db: SQLiteDatabase, userId: string, exerciseId: string): Promise<void> {
  await assertWorkoutChildOwned(db, userId, "workout_exercises", exerciseId);
  const sets = await db.getAllAsync<{ id: string }>("SELECT id FROM exercise_sets WHERE workout_exercise_id = ?", [exerciseId]);
  for (const set of sets) await queueOwnedDeletion(db, userId, "exercise_sets", set.id);
  await queueOwnedDeletion(db, userId, "workout_exercises", exerciseId);
}
