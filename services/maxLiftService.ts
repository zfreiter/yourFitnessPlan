import * as SQLite from "expo-sqlite";
import * as Crypto from "expo-crypto";
import { syncService } from "@/services/syncService";
import { getDB } from "@/services/database";
import { format } from "date-fns";
import { ExerciseMax } from "@/types/interfaces/types";
import { supabase } from "@/lib/supabaseClient";

export const maxLiftService = {
  insertMaxLifts: async (
    userId: string,
    formData: Record<string, any>,
    touchedFields: Record<string, boolean>,
  ): Promise<{ success: boolean }> => {
    const db = await getDB();
    const exercises = new Set<string>();
    Object.keys(touchedFields).forEach((key) => {
      if (touchedFields[key] && key.endsWith("_1rm")) {
        exercises.add(key);
      }
    });

    const insertRecords = Array.from(exercises)
      .filter((exercise) => {
        return formData[exercise] != null;
      })
      .map((exercise) => {
        const baseName = exercise.replace(/_1rm$/, "");
        const date = new Date().toISOString();
        return {
          user_id: userId,
          exercise_name: exercise,
          one_rep_max: formData[exercise],
          tested_date:
            formData[`${baseName}_tested_date`] || format(date, "yyyy-MM-dd"),
          created_at: date,
        };
      });

    try {
      await db.withTransactionAsync(async () => {
        for (const max of insertRecords) {
          const {
            user_id,
            exercise_name,
            one_rep_max,
            tested_date,
            created_at,
          } = max;

          const id = Crypto.randomUUID();
          await db.runAsync(
            `INSERT INTO training_max_history (id, user_id, exercise_name, one_rep_max, tested_date, created_at)
        VALUES (?,?,?,?,?,?)`,
            [id, user_id, exercise_name, one_rep_max, tested_date, created_at],
          );

          await syncService.addToSyncQueue(
            userId,
            "training_max_history",
            id,
            "insert",
            {
              id,
              user_id,
              exercise_name,
              one_rep_max,
              tested_date,
              created_at,
            },
          );
        }
      });
      return { success: true };
    } catch (error) {
      console.log("Error in insertMaxLifts: ", error);
      return { success: false };
    }
  },

  /**
   * Bulk insert maxes from Supabase into local SQLite cache.
   * Uses INSERT OR IGNORE to avoid duplicates.
   */
  cacheMaxLifts: async (maxLifts: ExerciseMax[]): Promise<boolean> => {
    const db = await getDB();
    try {
      await db.withTransactionAsync(async () => {
        for (const max of maxLifts) {
          await db.runAsync(
            `INSERT OR IGNORE INTO training_max_history 
            (id, user_id, exercise_name, one_rep_max, tested_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
              max.id,
              max.user_id,
              max.exercise_name,
              max.one_rep_max,
              max.tested_date,
              max.created_at,
            ],
          );
        }
      });
      return true;
    } catch (error) {
      console.log("Error in maxLiftService cacheMaxLifts ", error);
      return false;
    }
  },

  getAllMaxLifts: async (userId: string) => {},

  getCurrentMaxLifts: async (userId: string): Promise<ExerciseMax[]> => {
    const db = await getDB();
    try {
      const currentMaxLifts: ExerciseMax[] = await db.getAllAsync(
        `SELECT * FROM training_max_history t1
         WHERE user_id = ?
         AND tested_date = (
           SELECT MAX(tested_date) FROM training_max_history t2
           WHERE t2.exercise_name = t1.exercise_name
           AND t2.user_id = t1.user_id
         )`,
        [userId],
      );
      return currentMaxLifts;
    } catch (error) {
      console.log("MaxLift Service error get current max lifts ", error);
      return [];
    }
  },
};
