import { SQLiteDatabase } from "expo-sqlite";
import { queueOwnedDeletion } from "./ownedDeletion";

export const workoutDeletionReceiptKey = (queueId: number) => `workout-delete-owner:${queueId}`;
export const workoutDeletionReceiptValue = (userId: string, workoutId: string) =>
  JSON.stringify({ userId, workoutId });

// Only call within the transaction removing the workout. Ownership comes from
// the persisted row, never a queue payload or the currently signed-in account.
export async function queueOwnedWorkoutDeletion(
  transaction: SQLiteDatabase, userId: string, workoutId: string,
): Promise<void> {
  await queueOwnedDeletion(transaction, userId, "workouts", workoutId);
}
