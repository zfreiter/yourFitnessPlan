import {
  CardioActivity,
  CardioEntry,
  CardioInterval,
  CardioMode,
  HeartRateZone,
} from "@/types/interfaces/types";
import { SQLiteDatabase } from "expo-sqlite";
import { assertWorkoutChildDoesNotExist, assertWorkoutChildOwned, assertWorkoutOwned } from "./localOwnership";

interface CardioEntryRow {
  id: string;
  workout_id: string;
  activity: CardioActivity;
  mode: CardioMode;
  duration: number | null;
  distance: number | null;
  calories: number | null;
  heart_rate_avg: number | null;
  heart_rate_zone: HeartRateZone | null;
  is_finisher: number;
  entry_order: number;
  notes: string | null;
}

interface CardioIntervalRow {
  id: string;
  cardio_entry_id: string;
  interval_order: number;
  work_duration: number | null;
  rest_duration: number | null;
  distance: number | null;
  calories: number | null;
  notes: string | null;
}

export const cardioService = {
  insertWorkoutCardioEntries: async (
    cardioEntries: CardioEntry[],
    db: SQLiteDatabase,
    userId: string,
  ): Promise<void> => {
    try {
      for (const cardioEntry of cardioEntries) {
        await assertWorkoutOwned(db, userId, cardioEntry.workout_id);
        await assertWorkoutChildDoesNotExist(db, "cardio_entries", cardioEntry.id);
        const {
          id,
          workout_id,
          intervals,
          activity,
          mode,
          duration,
          distance,
          calories,
          heart_rate_avg,
          heart_rate_zone,
          is_finisher,
          entry_order,
          notes,
        } = cardioEntry;

        await db.runAsync(
          "INSERT INTO cardio_entries (id, workout_id, activity, mode, duration, distance, calories, heart_rate_avg, heart_rate_zone, is_finisher, entry_order, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            id,
            workout_id,
            activity,
            mode,
            duration ?? null,
            distance ?? null,
            calories ?? null,
            heart_rate_avg ?? null,
            heart_rate_zone ?? null,
            is_finisher ?? null,
            entry_order ?? null,
            notes ?? null,
          ],
        );

        for (const interval of intervals) {
          if (interval.cardio_entry_id !== id) throw new Error("Interval belongs to a different cardio entry");
          await assertWorkoutChildDoesNotExist(db, "cardio_intervals", interval.id);
          const {
            id: intervalId,
            cardio_entry_id,
            interval_order,
            work_duration,
            rest_duration,
            distance,
            calories,
            notes,
          } = interval;

          await db.runAsync(
            "INSERT INTO cardio_intervals (id, cardio_entry_id, interval_order, work_duration, rest_duration, distance, calories, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
              intervalId,
              cardio_entry_id,
              interval_order ?? null,
              work_duration ?? null,
              rest_duration ?? null,
              distance ?? null,
              calories ?? null,
              notes ?? null,
            ],
          );
        }
      }
    } catch (error) {
      console.error("Error inserting cardio entries:", error);
      throw error;
    }
  },
  insertWorkoutCardioIntervals: async (
    intervals: CardioInterval[],
    db: SQLiteDatabase,
    userId: string,
  ): Promise<void> => {
    for (const interval of intervals) {
      await assertWorkoutChildOwned(db, userId, "cardio_entries", interval.cardio_entry_id);
      await assertWorkoutChildDoesNotExist(db, "cardio_intervals", interval.id);
      await db.runAsync(
        `INSERT INTO cardio_intervals
         (id, cardio_entry_id, interval_order, work_duration, rest_duration, distance, calories, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          interval.id,
          interval.cardio_entry_id,
          interval.interval_order ?? 1,
          interval.work_duration ?? null,
          interval.rest_duration ?? null,
          interval.distance ?? null,
          interval.calories ?? null,
          interval.notes ?? null,
        ],
      );
    }
  },
  getWorkoutCardioEntries: async (
    userId: string,
    workoutId: string,
    db: SQLiteDatabase,
  ): Promise<CardioEntry[]> => {
    try {
      const cardioEntries = await db.getAllAsync<CardioEntryRow>(
        `SELECT ce.*
         FROM cardio_entries ce
         JOIN workouts w ON w.id = ce.workout_id
         WHERE ce.workout_id = ? AND w.user_id = ?
         ORDER BY ce.entry_order`,
        [workoutId, userId],
      );

      return await Promise.all(
        cardioEntries.map(async (entry) => {
          const intervals = await db.getAllAsync<CardioIntervalRow>(
            `SELECT ci.*
             FROM cardio_intervals ci
             JOIN cardio_entries ce ON ce.id = ci.cardio_entry_id
             JOIN workouts w ON w.id = ce.workout_id
             WHERE ci.cardio_entry_id = ? AND w.user_id = ?
             ORDER BY ci.interval_order`,
            [entry.id, userId],
          );

          return {
            id: entry.id,
            workout_id: entry.workout_id,
            activity: entry.activity,
            mode: entry.mode,
            duration: entry.duration ?? undefined,
            distance: entry.distance ?? undefined,
            calories: entry.calories ?? undefined,
            heart_rate_avg: entry.heart_rate_avg ?? undefined,
            heart_rate_zone: entry.heart_rate_zone ?? undefined,
            is_finisher: entry.is_finisher,
            entry_order: entry.entry_order,
            notes: entry.notes ?? undefined,

            intervals: intervals.map((interval) => ({
              id: interval.id,
              cardio_entry_id: interval.cardio_entry_id,
              interval_order: interval.interval_order,
              work_duration: interval.work_duration ?? undefined,
              rest_duration: interval.rest_duration ?? undefined,
              distance: interval.distance ?? undefined,
              calories: interval.calories ?? undefined,
              notes: interval.notes ?? undefined,
            })),
          };
        }),
      );
    } catch (error) {
      console.error("Error getting cardio entries:", error);
      return [];
    }
  },
  updateWorkoutCardioEntry: async (
    entry: CardioEntry,
    db: SQLiteDatabase,
    userId: string,
  ): Promise<void> => {
    await assertWorkoutChildOwned(db, userId, "cardio_entries", entry.id, entry.workout_id);
    await db.runAsync(
      `UPDATE cardio_entries
     SET
       activity = ?,
       mode = ?,
       duration = ?,
       distance = ?,
       calories = ?,
       heart_rate_avg = ?,
       heart_rate_zone = ?,
       is_finisher = ?,
       entry_order = ?,
       notes = ?
     WHERE id = ?`,
      [
        entry.activity,
        entry.mode,
        entry.duration ?? null,
        entry.distance ?? null,
        entry.calories ?? null,
        entry.heart_rate_avg ?? null,
        entry.heart_rate_zone ?? null,
        entry.is_finisher ?? 0,
        entry.entry_order ?? 1,
        entry.notes ?? null,
        entry.id,
      ],
    );
  },
  updateWorkoutCardioInterval: async (
    interval: CardioInterval,
    db: SQLiteDatabase,
    userId: string,
  ): Promise<void> => {
    const workoutId = await assertWorkoutChildOwned(db, userId, "cardio_intervals", interval.id);
    await assertWorkoutChildOwned(db, userId, "cardio_entries", interval.cardio_entry_id, workoutId);
    const existingInterval = await db.getFirstAsync<{ cardio_entry_id: string }>(
      `SELECT cardio_entry_id FROM cardio_intervals WHERE id = ?`, [interval.id],
    );
    if (existingInterval?.cardio_entry_id !== interval.cardio_entry_id) throw new Error("Interval parent cannot be changed");
    await db.runAsync(
      `UPDATE cardio_intervals
     SET
       interval_order = ?,
       work_duration = ?,
       rest_duration = ?,
       distance = ?,
       calories = ?,
       notes = ?
     WHERE id = ?`,
      [
        interval.interval_order ?? 1,
        interval.work_duration ?? null,
        interval.rest_duration ?? null,
        interval.distance ?? null,
        interval.calories ?? null,
        interval.notes ?? null,
        interval.id,
      ],
    );
  },
};
