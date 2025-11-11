import * as SQLite from "expo-sqlite";
import { SCHEMA } from "./schema";
import { seedDataSQL } from "./seedData";

const DATABASE_NAME = "workout.db";

export const initializeDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  try {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    console.log("databse ", db);
    try {
      // Create tables
      await db.execAsync(SCHEMA);

      // Check if we need to seed the database
      const result = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM exercises"
      );

      if (result && result.count === 0) {
        // Database is empty, insert seed data
        await db.execAsync(seedDataSQL);
      }

      return db;
    } catch (error) {
      console.error("Error executing database schema:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error opening database:", error);
    throw error;
  }
};
