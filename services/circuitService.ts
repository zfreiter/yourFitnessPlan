import * as SQLite from "expo-sqlite";
import { CircuitRound } from "@/types/interfaces/types";
import { SQLiteDatabase } from "expo-sqlite";
import { assertWorkoutChildDoesNotExist, assertWorkoutChildOwned, assertWorkoutOwned } from "./localOwnership";

interface CircuitRoundRow {
  id: string;
  workout_id: string;
  round_number: number;
  rest_after_round: number;
  notes: string | null;
}

export const circuitService = {
  insertWorkoutCircuitRounds: async (
    circuits: CircuitRound[],
    db: SQLite.SQLiteDatabase,
    userId: string,
  ): Promise<void> => {
    try {
      for (const circuit of circuits) {
        await assertWorkoutOwned(db, userId, circuit.workout_id);
        await assertWorkoutChildDoesNotExist(db, "circuit_rounds", circuit.id);
        const {
          id,
          workout_id,
          round_number,
          rest_after_round,
          notes = "",
        } = circuit;

        await db.runAsync(
          `INSERT INTO circuit_rounds
            (id, workout_id, round_number, rest_after_round, notes)
           VALUES (?, ?, ?, ?, ?)`,
          [id, workout_id, round_number, rest_after_round, notes],
        );
      }
    } catch (error) {
      console.error("Error inserting circuit rounds:", error);
      throw error;
    }
  },

  getWorkoutCircuitRounds: async (
    userId: string,
    workoutId: string,
    db: SQLite.SQLiteDatabase,
  ): Promise<CircuitRound[]> => {
    try {
      const rows = await db.getAllAsync<CircuitRoundRow>(
        `SELECT cr.*
         FROM circuit_rounds cr
         JOIN workouts w ON w.id = cr.workout_id
         WHERE cr.workout_id = ? AND w.user_id = ?
         ORDER BY cr.round_number`,
        [workoutId, userId],
      );

      return rows.map((row) => ({
        id: row.id,
        workout_id: row.workout_id,
        round_number: row.round_number,
        rest_after_round: row.rest_after_round,
        notes: row.notes ?? undefined,
      }));
    } catch (error) {
      console.error("Error getting circuit rounds:", error);
      return [];
    }
  },
  updateWorkoutCircuitRound: async (
    round: CircuitRound,
    db: SQLiteDatabase,
    userId: string,
  ): Promise<void> => {
    await assertWorkoutChildOwned(db, userId, "circuit_rounds", round.id, round.workout_id);
    await db.runAsync(
      `UPDATE circuit_rounds
     SET
       round_number = ?,
       rest_after_round = ?,
       notes = ?
     WHERE id = ?`,
      [
        round.round_number,
        round.rest_after_round,
        round.notes ?? null,
        round.id,
      ],
    );
  },
};
