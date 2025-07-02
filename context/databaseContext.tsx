import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import * as SQLite from "expo-sqlite";
import { SCHEMA } from "@/services/schema";
import { seedDataSQL } from "@/services/seedData";

interface DatabaseContextType {
  db: SQLite.SQLiteDatabase | null;
  isLoading: boolean;
  resetDatabase: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isLoading: true,
  resetDatabase: async () => {},
});

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDB] = useState<SQLite.SQLiteDatabase | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initializeDatabase = async () => {
    try {
      const database = await SQLite.openDatabaseAsync("workout.db");

      // Drop all tables
      await database.execAsync(`
        DROP TABLE IF EXISTS exercise_sets;
        DROP TABLE IF EXISTS workout_exercises;
        DROP TABLE IF EXISTS workouts;
        DROP TABLE IF EXISTS exercise_unit_combinations;
        DROP TABLE IF EXISTS exercise_valid_units;
        DROP TABLE IF EXISTS exercise_equipment;
        DROP TABLE IF EXISTS exercise_muscles;
        DROP TABLE IF EXISTS exercise_types;
        DROP TABLE IF EXISTS exercises;
      `);

      // Create tables
      await database.execAsync(SCHEMA);

      // Insert seed data
      await database.execAsync(seedDataSQL);

      setDB(database);
    } catch (error) {
      console.error("Error initializing database:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetDatabase = async () => {
    setIsLoading(true);
    await initializeDatabase();
  };

  useEffect(() => {
    initializeDatabase();
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, isLoading, resetDatabase }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export const useDatabase = () => {
  const context = useContext(DatabaseContext);

  if (!context) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }

  return context;
};
