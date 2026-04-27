import { createContext, useContext, useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabaseClient";
import { getMeta, META_KEYS, setMeta } from "@/utils/appMeta";
import { getDB, resetDBConnection } from "@/services/database";

interface AppInitContextType {
  isAppInitLoading: boolean;
  isDbReady: boolean;
  resetAppInit: () => Promise<void>;
}

const AppInitContext = createContext<AppInitContextType>({
  isAppInitLoading: true,
  isDbReady: false,
  resetAppInit: async () => {},
});

export function AppInitProvider({ children }: { children: React.ReactNode }) {
  const [isAppInitLoading, setIsAppInitLoading] = useState(true);
  const [isDbReady, setIsDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeAppInit = async () => {
    setIsAppInitLoading(true);

    // Initialize database connection for application initialization tasks
    const db = await getDB();
    setIsDbReady(true);
    // Check if exercises have been synced before
    const exercisesSyncedAt = await getMeta(META_KEYS.EXERCISES_SYNCED_AT);

    // If not, seed exercises from Supabase and mark as synced
    if (!exercisesSyncedAt) {
      try {
        // First-time app initialization: seed exercises and mark as synced
        console.log("Seeding exercises from Supabase in AppInitProvider...");
        await seedExercisesFromSupabase(db);

        console.log(
          "Exercises seeded in AppInitProvider, marking as synced...",
        );
        console.log("Marking exercises as synced in AppInitProvider...");
        await setMeta(META_KEYS.EXERCISES_SYNCED_AT, new Date().toISOString());
      } catch (err) {
        console.error("Database init error:", err);

        setError(err instanceof Error ? err.message : "Database error");
      } finally {
        setIsAppInitLoading(false);
      }
    } else {
      setIsAppInitLoading(false);
    }
    console.log("App initialization complete");
  };

  useEffect(() => {
    initializeAppInit();
  }, []);

  const seedExercisesFromSupabase = async (db: any) => {
    const { data: exercises, error } = await supabase
      .from("exercises")
      .select("*");

    if (error) throw error;

    for (const exercise of exercises) {
      await db.runAsync(
        `INSERT OR IGNORE INTO exercises (id, name, description, difficulty, no_weight)
         VALUES (?, ?, ?, ?, ?)`,
        [
          exercise.id,
          exercise.name,
          exercise.description,
          exercise.difficulty,
          exercise.no_weight,
        ],
      );

      for (const type of exercise.types ?? []) {
        await db.runAsync(
          `INSERT OR IGNORE INTO exercise_types (exercise_id, type) VALUES (?, ?)`,
          [exercise.id, type],
        );
      }

      for (const muscle of exercise.muscles ?? []) {
        await db.runAsync(
          `INSERT OR IGNORE INTO exercise_muscles (exercise_id, muscle) VALUES (?, ?)`,
          [exercise.id, muscle],
        );
      }

      for (const item of exercise.equipment ?? []) {
        await db.runAsync(
          `INSERT OR IGNORE INTO exercise_equipment (exercise_id, equipment) VALUES (?, ?)`,
          [exercise.id, item],
        );
      }

      for (const combo of exercise.valid_units ?? []) {
        await db.runAsync(
          `INSERT OR IGNORE INTO exercise_unit_combinations (exercise_id, unit_combination) VALUES (?, ?)`,
          [exercise.id, combo.join("||")],
        );
      }
    }
  };

  const resetAppInit = async () => {
    setIsAppInitLoading(true);
    setError(null);

    await resetDBConnection();

    await initializeAppInit();
    setIsAppInitLoading(false);
  };

  if (isAppInitLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading database...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "red" }}>Database Error: {error}</Text>
      </View>
    );
  }

  return (
    <AppInitContext.Provider
      value={{ isAppInitLoading, isDbReady, resetAppInit }}
    >
      {children}
    </AppInitContext.Provider>
  );
}

export const useAppInit = () => {
  const context = useContext(AppInitContext);

  if (!context) {
    throw new Error("useAppInit must be used within AppInitProvider");
  }

  return context;
};
