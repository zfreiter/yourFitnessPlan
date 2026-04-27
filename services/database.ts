import * as SQLite from "expo-sqlite";
import { SCHEMA_STATEMENTS } from "@/services/schema";

const DATABASE_NAME = "workout.db";

let db: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const getDB = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;

  if (!dbPromise) {
    dbPromise = (async () => {
      console.log("Opening database...");

      const instance = await SQLite.openDatabaseAsync(DATABASE_NAME);

      await instance.execAsync("PRAGMA journal_mode = WAL;");
      await instance.execAsync("PRAGMA busy_timeout = 5000;");

      for (const statement of SCHEMA_STATEMENTS) {
        await instance.execAsync(statement);
      }

      await instance.execAsync("PRAGMA foreign_keys = ON;");

      const result = await instance.getFirstAsync<{ foreign_keys: number }>(
        "PRAGMA foreign_keys;",
      );

      if (result?.foreign_keys !== 1) {
        console.warn("⚠️ Foreign keys are NOT enabled");
      } else {
        console.log("✅ Foreign keys enabled");
      }

      console.log("Database ready");
      db = instance;
      return db;
    })();
  }

  return dbPromise;
};

export const resetDBConnection = async () => {
  if (db) {
    await db.closeAsync();
    db = null;
    dbPromise = null;
  }
};

export const debugSchema = async () => {
  const db = await getDB();

  const fkResult = await db.getFirstAsync<{ foreign_keys: number }>(
    "PRAGMA foreign_keys;",
  );
  console.log("Foreign keys enabled:", fkResult?.foreign_keys === 1);

  const tables = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;`,
  );
  console.log(
    "Tables:",
    tables.map((t) => t.name),
  );

  const fkCheck = await db.getAllAsync(
    `PRAGMA foreign_key_list(workout_exercises);`,
  );
  console.log("workout_exercises FKs:", JSON.stringify(fkCheck, null, 2));

  const fkCheck2 = await db.getAllAsync(
    `PRAGMA foreign_key_list(exercise_sets);`,
  );
  console.log("exercise_sets FKs:", JSON.stringify(fkCheck2, null, 2));
};

export const resetDatabase = async () => {
  const db = await getDB();

  await db.execAsync(`
    DROP TABLE IF EXISTS exercise_sets;
    DROP TABLE IF EXISTS workout_exercises;
    DROP TABLE IF EXISTS workouts;
    DROP TABLE IF EXISTS exercise_unit_combinations;
    DROP TABLE IF EXISTS exercise_valid_units;
    DROP TABLE IF EXISTS exercise_equipment;
    DROP TABLE IF EXISTS exercise_muscles;
    DROP TABLE IF EXISTS exercise_types;
    DROP TABLE IF EXISTS exercises;
    DROP TABLE IF EXISTS training_max_history;
    DROP TABLE IF EXISTS weight_history;
    DROP TABLE IF EXISTS sync_queue;
    DROP TABLE IF EXISTS user_preferences;
    DROP TABLE IF EXISTS profiles;
  `);

  console.log("All tables dropped");

  await db.withTransactionAsync(async () => {
    for (const statement of SCHEMA_STATEMENTS) {
      await db!.execAsync(statement);
    }
  });

  await db.execAsync("PRAGMA foreign_keys = ON;");
  console.log("Database reset complete");
};

const CURRENT_SCHEMA_VERSION = 1;
