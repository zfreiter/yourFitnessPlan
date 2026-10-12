import { SQLiteDatabase } from "expo-sqlite";
import { getDB } from "./database";

/**
 * Run local database work in an exclusive transaction.
 * All queries in the callback must use the provided transaction handle.
 */
export async function withLocalTransaction<T>(
  task: (transaction: SQLiteDatabase) => Promise<T>,
): Promise<T> {
  const db = await getDB();
  let result!: T;

  await db.withExclusiveTransactionAsync(async (transaction) => {
    result = await task(transaction);
  });

  return result;
}
