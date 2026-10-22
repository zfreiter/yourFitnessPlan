import {
  Difficulty,
  Exercise,
  WorkoutType,
  ValidUnit,
  WorkoutExercise,
  ExerciseGroupType,
} from "@/types/interfaces/types";
import { syncService } from "@/services/syncService";
import { getDB } from "./database";
import { SQLiteDatabase } from "expo-sqlite";
import { setService } from "./setService";
import { withLocalTransaction } from "./localTransaction";
import { assertWorkoutChildDoesNotExist, assertWorkoutChildOwned, assertWorkoutOwned } from "./localOwnership";

interface ExerciseRow {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  no_weight: number;
  types: string;
  validUnits: string;
  muscles: string;
  equipment: string;
}

interface WorkoutExerciseRow {
  id: string;
  workout_id: string;
  exercise_id: string;
  exercise_name: string;

  valid_units: string;

  muscles_targeted: string | null;
  equipment: string | null;
  description: string | null;

  exercise_order: number;

  group_id: string | null;
  group_type: ExerciseGroupType | null;
  round_number: number | null;
  circuit_id: string | null;
}

interface ExerciseSetRow {
  id: string;
  workout_exercise_id: string;
  reps: number | null;
  weight: number | null;
  time: number | null;
  distance: number | null;
  is_warmup: number;
  is_max: number;
  set_order: number;
}

export interface ExerciseService {
  insertWorkoutExercises: (
    exercises: WorkoutExercise[],
    db: SQLiteDatabase,
    userId: string,
  ) => Promise<void>;
  updateWorkoutExercise: (
    exercise: WorkoutExercise,
    db: SQLiteDatabase,
    userId: string,
  ) => Promise<void>;
  getWorkoutExercises: (
    userId: string,
    workoutId: string,
    db: SQLiteDatabase,
  ) => Promise<WorkoutExercise[]>;
  getExercises: () => Promise<Exercise[]>;
  getExerciseById: (id: string) => Promise<Exercise | null>;
  getExercisesByType: (type: WorkoutType) => Promise<Exercise[]>;
  getExercisesByMuscle: (muscle: string) => Promise<Exercise[]>;
  getExerciseByEquipment: (equipment: string) => Promise<Exercise[]>;
  getParsedExercises: (exercises: ExerciseRow[]) => Exercise[];
  updateExerciseOrder: (
    userId: string,
    exerciseListToUpdate: { id: string; exercise_order: number }[],
  ) => Promise<{ success: boolean; error?: string }>;
  deleteExercise: (
    userId: string,
    exerciseId: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

export const exerciseService: ExerciseService = {
  insertWorkoutExercises: async (
    exercises: WorkoutExercise[],
    db: SQLiteDatabase,
    userId: string,
  ): Promise<void> => {
    try {
      for (const exercise of exercises) {
        await assertWorkoutOwned(db, userId, exercise.workout_id);
        await assertWorkoutChildDoesNotExist(db, "workout_exercises", exercise.id);
        const circuitId = exercise.circuit_id ?? (exercise.group_type === "circuit" ? exercise.group_id : null);
        if (circuitId) await assertWorkoutChildOwned(db, userId, "circuit_rounds", circuitId, exercise.workout_id);
        for (const set of exercise.sets ?? []) {
          if (set.workout_exercise_id !== exercise.id) throw new Error("Set belongs to a different exercise");
          await assertWorkoutChildDoesNotExist(db, "exercise_sets", set.id);
        }
        const {
          id,
          workout_id,
          exercise_id,
          exercise_name,
          validUnits,
          musclesTargeted,
          equipment,
          description,
          exercise_order,
          group_id,
          group_type,
          round_number,
          circuit_id,
          sets,
        } = exercise;

        await db.runAsync(
          `INSERT INTO workout_exercises (
          id,
          workout_id,
          exercise_id,
          exercise_name,
          valid_units,
          muscles_targeted,
          equipment,
          description,
          exercise_order,
          group_id,
          group_type,
          round_number,
          circuit_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            workout_id,
            exercise_id,
            exercise_name,
            JSON.stringify(validUnits ?? []),
            musclesTargeted?.length ? musclesTargeted.join(",") : null,
            equipment?.length ? equipment.join(",") : null,
            description ?? null,
            exercise_order ?? 1,
            group_id ?? null,
            group_type ?? null,
            round_number ?? null,
            circuit_id ?? (group_type === "circuit" ? group_id ?? null : null),
          ],
        );

        await setService.insertWorkoutSets(sets, db, userId);
      }
    } catch (error) {
      console.error("Error inserting workout exercises:", error);
      throw new Error("Failed to insert workout exercises");
    }
  },
  updateWorkoutExercise: async (
    exercise: WorkoutExercise,
    db: SQLiteDatabase,
    userId: string,
  ): Promise<void> => {
    try {
      await assertWorkoutChildOwned(db, userId, "workout_exercises", exercise.id, exercise.workout_id);
      const circuitId = exercise.circuit_id ?? (exercise.group_type === "circuit" ? exercise.group_id : null);
      if (circuitId) await assertWorkoutChildOwned(db, userId, "circuit_rounds", circuitId, exercise.workout_id);
      await db.runAsync(
        `UPDATE workout_exercises
       SET
         exercise_id = ?,
         exercise_name = ?,
         valid_units = ?,
         muscles_targeted = ?,
         equipment = ?,
         description = ?,
         exercise_order = ?,
         group_id = ?,
         group_type = ?,
         round_number = ?,
         circuit_id = ?
       WHERE id = ?`,
        [
          exercise.exercise_id ?? null,
          exercise.exercise_name,
          JSON.stringify(exercise.validUnits ?? []),
          exercise.musclesTargeted?.length
            ? exercise.musclesTargeted.join(",")
            : null,
          exercise.equipment?.length ? exercise.equipment.join(",") : null,
          exercise.description ?? null,
          exercise.exercise_order ?? 1,
          exercise.group_id ?? null,
          exercise.group_type ?? null,
          exercise.round_number ?? null,
          exercise.circuit_id ??
            (exercise.group_type === "circuit" ? exercise.group_id ?? null : null),
          exercise.id,
        ],
      );
    } catch (error) {
      console.error(`Error updating workout exercise ${exercise.id}:`, error);

      throw new Error("Failed to update workout exercise");
    }
  },
  getWorkoutExercises: async (
    userId: string,
    workoutId: string,
    db: SQLiteDatabase,
  ): Promise<WorkoutExercise[]> => {
    try {
      const exerciseRows = await db.getAllAsync<WorkoutExerciseRow>(
        `SELECT
          we.id,
          we.workout_id,
          we.exercise_id,
          we.exercise_name,
          we.valid_units,
          we.muscles_targeted,
          we.equipment,
          we.description,
          we.exercise_order,
          we.group_id,
          we.group_type,
          we.round_number,
          we.circuit_id
        FROM workout_exercises we
        JOIN workouts w ON w.id = we.workout_id
        WHERE we.workout_id = ? AND w.user_id = ?
        ORDER BY we.exercise_order`,
        [workoutId, userId],
      );

      return await Promise.all(
        exerciseRows.map(async (row) => {
          const sets = await setService.getWorkoutSets(userId, row.id, db);

          let validUnits: ValidUnit[] = [];

          try {
            const parsed = JSON.parse(row.valid_units);

            if (Array.isArray(parsed)) {
              validUnits = parsed.filter(
                (unit): unit is ValidUnit =>
                  unit === "reps" ||
                  unit === "weight" ||
                  unit === "time" ||
                  unit === "distance",
              );
            }
          } catch {
            console.error("Invalid valid_units JSON:", row.valid_units);
          }

          return {
            id: row.id,
            workout_id: row.workout_id,
            exercise_id: row.exercise_id,
            exercise_name: row.exercise_name,

            validUnits,

            musclesTargeted: row.muscles_targeted
              ? row.muscles_targeted.split(",")
              : [],

            equipment: row.equipment ? row.equipment.split(",") : [],

            description: row.description ?? undefined,

            exercise_order: row.exercise_order,

            group_id: row.group_id,
            group_type: row.group_type,
            round_number: row.round_number,
            circuit_id: row.circuit_id,

            sets,
          };
        }),
      );
    } catch (error) {
      console.error("Error getting workout exercises:", error);

      throw new Error("Failed to get workout exercises");
    }
  },
  getParsedExercises: (exercises: ExerciseRow[]): Exercise[] => {
    return exercises.map((exercise) => {
      const validUnits: ValidUnit[] = exercise.validUnits
        ? exercise.validUnits
            .split(",")[0]
            .split(/[+|]/)
            .map((unit) => unit.trim())
            .filter(
              (unit): unit is ValidUnit =>
                unit === "reps" ||
                unit === "weight" ||
                unit === "time" ||
                unit === "distance",
            )
        : [];

      return {
        id: exercise.id,
        name: exercise.name,
        description: exercise.description ?? "",
        difficulty: exercise.difficulty as Difficulty,

        validUnits,

        types: exercise.types
          ? (exercise.types.split(",") as WorkoutType[])
          : [],

        musclesTargeted: exercise.muscles ? exercise.muscles.split(",") : [],

        equipment: exercise.equipment ? exercise.equipment.split(",") : [],

        noWeight: exercise.no_weight === 1,
      };
    });
  },

  getExercises: async () => {
    const db = await getDB();
    try {
      const exercises: ExerciseRow[] = await db.getAllAsync(`
        SELECT e.id, e.name, e.description, e.difficulty, e.no_weight,
        GROUP_CONCAT(DISTINCT et.type) as types,
        GROUP_CONCAT(DISTINCT euc.unit_combination) as validUnits,
        GROUP_CONCAT(DISTINCT em.muscle) as muscles,
        GROUP_CONCAT(DISTINCT eq.equipment) as equipment
        FROM exercises e 
        LEFT JOIN exercise_unit_combinations euc
        ON e.id = euc.exercise_id
        LEFT JOIN exercise_types et
        ON e.id = et.exercise_id
        LEFT JOIN exercise_muscles em
        ON e.id = em.exercise_id
        LEFT JOIN exercise_equipment eq
        ON e.id = eq.exercise_id
        GROUP BY e.id
      `);

      const parsedExercises: Exercise[] =
        exerciseService.getParsedExercises(exercises);

      const orderedExercises = parsedExercises.sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      return orderedExercises;
    } catch (error) {
      console.error("Error fetching all exercises:", error);
      throw new Error("Failed to fetch exercises");
    }
  },

  getExerciseById: async (id: string) => {
    const db = await getDB();
    try {
      const foundExercise: ExerciseRow | null = await db.getFirstAsync(
        `
        SELECT e.id, e.name, e.description, e.difficulty, e.no_weight,
        GROUP_CONCAT(DISTINCT et.type) as types,
        GROUP_CONCAT(DISTINCT euc.unit_combination) as validUnits,
        GROUP_CONCAT(DISTINCT em.muscle) as muscles,
        GROUP_CONCAT(DISTINCT eq.equipment) as equipment
        FROM exercises e 
        LEFT JOIN exercise_unit_combinations euc
        ON e.id = euc.exercise_id
        LEFT JOIN exercise_types et
        ON e.id = et.exercise_id
        LEFT JOIN exercise_muscles em
        ON e.id = em.exercise_id
        LEFT JOIN exercise_equipment eq
        ON e.id = eq.exercise_id
        WHERE e.id = ?
        GROUP BY e.id, e.name, e.description, e.difficulty, e.no_weight
        `,
        [id],
      );

      if (!foundExercise) return null;

      return exerciseService.getParsedExercises([foundExercise])[0];
    } catch (error) {
      console.error("Error fetching exercise by id:", error);
      throw new Error("Failed to fetch exercise by id");
    }
  },

  getExercisesByType: async (type: WorkoutType) => {
    const db = await getDB();
    try {
      const exercises: ExerciseRow[] = await db.getAllAsync(
        `
        SELECT e.id, e.name, e.description, e.difficulty, e.no_weight,
        GROUP_CONCAT(DISTINCT et.type) as types,
        GROUP_CONCAT(DISTINCT euc.unit_combination) as validUnits,
        GROUP_CONCAT(DISTINCT em.muscle) as muscles,
        GROUP_CONCAT(DISTINCT eq.equipment) as equipment
        FROM exercises e 
        LEFT JOIN exercise_unit_combinations euc
        ON e.id = euc.exercise_id
        LEFT JOIN exercise_types et
        ON e.id = et.exercise_id
        LEFT JOIN exercise_muscles em
        ON e.id = em.exercise_id
        LEFT JOIN exercise_equipment eq
        ON e.id = eq.exercise_id
        WHERE e.id IN (
          SELECT exercise_id FROM exercise_types WHERE type = ?
        )
        GROUP BY e.id, e.name, e.description, e.difficulty, e.no_weight
        `,
        [type],
      );

      if (!exercises) return [];

      return exerciseService.getParsedExercises(exercises);
    } catch (error) {
      console.error("Error fetching exercises by type:", error);
      throw new Error("Failed to fetch exercises by type");
    }
  },

  getExercisesByMuscle: async (muscle: string) => {
    const db = await getDB();
    try {
      const exercises: ExerciseRow[] = await db.getAllAsync(
        `
        SELECT e.id, e.name, e.description, e.difficulty, e.no_weight,
        GROUP_CONCAT(DISTINCT et.type) as types,
        GROUP_CONCAT(DISTINCT euc.unit_combination) as validUnits,
        GROUP_CONCAT(DISTINCT em.muscle) as muscles,
        GROUP_CONCAT(DISTINCT eq.equipment) as equipment
        FROM exercises e 
        LEFT JOIN exercise_unit_combinations euc
        ON e.id = euc.exercise_id
        LEFT JOIN exercise_types et
        ON e.id = et.exercise_id
        LEFT JOIN exercise_muscles em
        ON e.id = em.exercise_id
        LEFT JOIN exercise_equipment eq
        ON e.id = eq.exercise_id
        WHERE e.id IN (
          SELECT exercise_id FROM exercise_muscles WHERE muscle = ?
        )
        GROUP BY e.id, e.name, e.description, e.difficulty, e.no_weight
        `,
        [muscle],
      );

      if (!exercises) return [];

      return exerciseService.getParsedExercises(exercises);
    } catch (error) {
      console.error("Error fetching exercises by muscle:", error);
      throw new Error("Failed to fetch exercises by muscle");
    }
  },

  getExerciseByEquipment: async (equipment: string) => {
    const db = await getDB();
    try {
      const exercises: ExerciseRow[] = await db.getAllAsync(
        `
        SELECT e.id, e.name, e.description, e.difficulty, e.no_weight,
        GROUP_CONCAT(DISTINCT et.type) as types,
        GROUP_CONCAT(DISTINCT euc.unit_combination) as validUnits,
        GROUP_CONCAT(DISTINCT em.muscle) as muscles,
        GROUP_CONCAT(DISTINCT eq.equipment) as equipment
        FROM exercises e 
        LEFT JOIN exercise_unit_combinations euc
        ON e.id = euc.exercise_id
        LEFT JOIN exercise_types et
        ON e.id = et.exercise_id
        LEFT JOIN exercise_muscles em
        ON e.id = em.exercise_id
        LEFT JOIN exercise_equipment eq
        ON e.id = eq.exercise_id
        WHERE e.id IN (
          SELECT exercise_id FROM exercise_equipment WHERE equipment = ?
        )
        GROUP BY e.id, e.name, e.description, e.difficulty, e.no_weight
        `,
        [equipment],
      );

      if (!exercises) return [];

      return exerciseService.getParsedExercises(exercises);
    } catch (error) {
      console.error("Error fetching exercises by equipment:", error);
      throw new Error("Failed to fetch exercises by equipment");
    }
  },

  updateExerciseOrder: async (
    userId: string,
    exercisesToUpdate: { id: string; exercise_order: number }[],
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await withLocalTransaction(async (transaction) => {
        let ownerWorkoutId: string | undefined;
        for (const exercise of exercisesToUpdate) {
          const currentWorkoutId = await assertWorkoutChildOwned(
            transaction, userId, "workout_exercises", exercise.id,
          );
          if (ownerWorkoutId && ownerWorkoutId !== currentWorkoutId) {
            throw new Error("Exercises belong to different workouts");
          }
          ownerWorkoutId = currentWorkoutId;
          await transaction.runAsync(
            `UPDATE workout_exercises SET exercise_order = ? WHERE id = ? AND workout_id = ?`,
            [exercise.exercise_order, exercise.id, currentWorkoutId],
          );
          await syncService.addToSyncQueueInTransaction(
            transaction,
            userId,
            "workout_exercises",
            exercise.id,
            "update",
            {
              id: exercise.id,
              exercise_order: exercise.exercise_order,
            },
          );
        }
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating exercise order:", error);
      return { success: false, error: "Failed to update exercise order" };
    }
  },

  deleteExercise: async (
    userId: string,
    exerciseId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await withLocalTransaction(async (transaction) => {
        await assertWorkoutChildOwned(transaction, userId, "workout_exercises", exerciseId);
        await transaction.runAsync(
          `DELETE FROM exercise_sets WHERE workout_exercise_id = ?`,
          [exerciseId],
        );
        await transaction.runAsync(`DELETE FROM workout_exercises WHERE id = ?`, [
          exerciseId,
        ]);
        await syncService.addToSyncQueueInTransaction(
          transaction,
          userId,
          "workout_exercises",
          exerciseId,
          "delete",
          { id: exerciseId },
        );
      });

      // Sync queue — sets are cascade deleted via workout_exercise in Supabase
      // so we only need to delete the workout_exercise

      return { success: true };
    } catch (error) {
      console.error("Error deleting exercise:", error);
      return { success: false, error: "Failed to delete exercise" };
    }
  },
};
