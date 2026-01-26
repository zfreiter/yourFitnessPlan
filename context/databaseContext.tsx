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
import { View, Text, ActivityIndicator } from "react-native";

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
  const [error, setError] = useState<string | null>(null);

  // const initializeDatabase = async () => {
  //   try {
  //     console.log("Opening database...");
  //     const database = await SQLite.openDatabaseAsync("workout.db");
  //     console.log("Database opened successfully");

  //     // Uncomment these if you need to reset/initialize
  //     // await database.execAsync(`
  //     //   DROP TABLE IF EXISTS exercise_sets;
  //     //   DROP TABLE IF EXISTS workout_exercises;
  //     //   DROP TABLE IF EXISTS workouts;
  //     //   DROP TABLE IF EXISTS exercise_unit_combinations;
  //     //   DROP TABLE IF EXISTS exercise_valid_units;
  //     //   DROP TABLE IF EXISTS exercise_equipment;
  //     //   DROP TABLE IF EXISTS exercise_muscles;
  //     //   DROP TABLE IF EXISTS exercise_types;
  //     //   DROP TABLE IF EXISTS exercises;
  //     // `);

  //      await database.execAsync(SCHEMA);
  //      await database.execAsync(seedDataSQL);

  //     setDB(database);
  //     console.log("Database initialized");
  //   } catch (error) {
  //     console.error("Error initializing database:", error);
  //     setError(error instanceof Error ? error.message : "Database error");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const initializeDatabase = async () => {
    try {
      console.log("Opening database...");
      const database = await SQLite.openDatabaseAsync("workout.db");
      console.log("Database opened successfully");

      // Uncomment these lines to manually reset the database (then comment out again)
      // await database.execAsync(`
      //   DROP TABLE IF EXISTS exercise_sets;
      //   DROP TABLE IF EXISTS workout_exercises;
      //   DROP TABLE IF EXISTS workouts;
      //   DROP TABLE IF EXISTS exercise_unit_combinations;
      //   DROP TABLE IF EXISTS exercise_valid_units;
      //   DROP TABLE IF EXISTS exercise_equipment;
      //   DROP TABLE IF EXISTS exercise_muscles;
      //   DROP TABLE IF EXISTS exercise_types;
      //   DROP TABLE IF EXISTS exercises;
      // `);
      // await database.execAsync(SCHEMA);
      // await database.execAsync(seedDataSQL);

      // Check if tables exist
      const result = await database.getAllAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='exercises'"
      );

      // Create tables if they don't exist (automatic first-run setup)
      if (result.length === 0) {
        console.log("First run - creating schema and seeding data");

        // Execute schema creation
        await database.execAsync(SCHEMA);
        console.log("Schema created successfully");

        // Execute seed data
        await database.execAsync(seedDataSQL);
        console.log("Seed data inserted successfully");
      } else {
        console.log("Database already initialized");
      }

      setDB(database);
      console.log("Database initialized");
    } catch (error) {
      console.error("Error initializing database:", error);
      setError(error instanceof Error ? error.message : "Database error");
    } finally {
      setIsLoading(false);
    }
  };

  const resetDatabase = async () => {
    setIsLoading(true);
    setError(null);
    await initializeDatabase();
  };

  useEffect(() => {
    initializeDatabase();
  }, []);

  // Don't render children until database is ready
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading database...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text style={{ color: "red", textAlign: "center" }}>
          Database Error: {error}
        </Text>
      </View>
    );
  }

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
