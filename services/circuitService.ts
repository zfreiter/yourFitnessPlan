import * as SQLite from "expo-sqlite";
import { CircuitRound } from "@/types/interfaces/types";
import { SQLiteDatabase } from "expo-sqlite";

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
  ): Promise<void> => {
    try {
      for (const circuit of circuits) {
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
    workoutId: string,
    db: SQLite.SQLiteDatabase,
  ): Promise<CircuitRound[]> => {
    try {
      const rows = await db.getAllAsync<CircuitRoundRow>(
        `SELECT *
         FROM circuit_rounds
         WHERE workout_id = ?
         ORDER BY round_number`,
        [workoutId],
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
  ): Promise<void> => {
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
