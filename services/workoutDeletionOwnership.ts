import { SQLiteDatabase } from "expo-sqlite";

export const workoutDeletionReceiptKey = (queueId: number) => `workout-delete-owner:${queueId}`;
export const workoutDeletionReceiptValue = (userId: string, workoutId: string) =>
  JSON.stringify({ userId, workoutId });

// Only call within the transaction removing the workout. Ownership comes from
// the persisted row, never a queue payload or the currently signed-in account.
export async function queueOwnedWorkoutDeletion(
  transaction: SQLiteDatabase, userId: string, workoutId: string,
): Promise<void> {
  const workout = await transaction.getFirstAsync<{ user_id: string }>(
    "SELECT user_id FROM workouts WHERE id = ? AND user_id = ?", [workoutId, userId],
  );
  if (workout?.user_id !== userId) throw new Error("Workout deletion owner mismatch");
  const result = await transaction.runAsync(
    `INSERT INTO sync_queue (user_id, table_name, record_id, operation, data, synced)
     VALUES (?, 'workouts', ?, 'delete', ?, 0)`,
    [userId, workoutId, JSON.stringify({ id: workoutId })],
  );
  await transaction.runAsync("INSERT INTO app_meta (key, value) VALUES (?, ?)", [
    workoutDeletionReceiptKey(result.lastInsertRowId), workoutDeletionReceiptValue(userId, workoutId),
  ]);
}
