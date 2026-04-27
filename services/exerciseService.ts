import * as SQLite from "expo-sqlite";
import { Exercise, ValidUnit, ExerciseType, Difficulty } from "@/types/type";
import { syncService } from "@/services/syncService";
import { getDB } from "./database";

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

export interface ExerciseService {
  getExercises: () => Promise<Exercise[]>;
  getExerciseById: (id: string) => Promise<Exercise | null>;
  getExercisesByType: (type: ExerciseType) => Promise<Exercise[]>;
  getExercisesByMuscle: (muscle: string) => Promise<Exercise[]>;
  getExerciseByEquipment: (equipment: string) => Promise<Exercise[]>;
  getParsedExercises: (exercises: ExerciseRow[]) => Exercise[];
  getParsedExerciseById: (exercise: ExerciseRow) => Exercise | null;
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
  getParsedExercises: (exercises: ExerciseRow[]): Exercise[] => {
    return exercises.map((exercise) => ({
      id: exercise.id,
      exercise_id: exercise.id,
      workout_id: "",
      exercise_name: exercise.name,
      exercise_description: exercise.description,
      exercise_difficulty: exercise.difficulty as Difficulty,
      track_reps: 0,
      track_weight: 0,
      track_time: 0,
      track_distance: 0,
      validUnits: exercise.validUnits
        ? exercise.validUnits
            .split(",")
            .map((combo) => combo.split("||") as ValidUnit[])
        : [],
      sets: [],
      exercise_order: 0,
    }));
  },

  getParsedExerciseById: (exercise: ExerciseRow): Exercise => {
    return {
      id: exercise.id,
      exercise_id: exercise.id,
      workout_id: "",
      exercise_name: exercise.name,
      exercise_description: exercise.description,
      exercise_difficulty: exercise.difficulty as Difficulty,
      track_reps: 0,
      track_weight: 0,
      track_time: 0,
      track_distance: 0,
      validUnits: exercise.validUnits
        ? exercise.validUnits
            .split(",")
            .map((combo) => combo.split("||") as ValidUnit[])
        : [],
      sets: [],
      exercise_order: 0,
    };
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
        a.exercise_name.localeCompare(b.exercise_name),
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

      return exerciseService.getParsedExerciseById(foundExercise);
    } catch (error) {
      console.error("Error fetching exercise by id:", error);
      throw new Error("Failed to fetch exercise by id");
    }
  },

  getExercisesByType: async (type: ExerciseType) => {
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
    const db = await getDB();
    try {
      await db.withTransactionAsync(async () => {
        await Promise.all(
          exercisesToUpdate.map(async (exercise) => {
            await db.runAsync(
              `UPDATE workout_exercises SET exercise_order = ? WHERE id = ?`,
              [exercise.exercise_order, exercise.id],
            );
          }),
        );
      });

      // Add each reordered exercise to sync queue
      for (const exercise of exercisesToUpdate) {
        await syncService.addToSyncQueue(
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
    const db = await getDB();
    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `DELETE FROM exercise_sets WHERE workout_exercise_id = ?`,
          [exerciseId],
        );
        await db.runAsync(`DELETE FROM workout_exercises WHERE id = ?`, [
          exerciseId,
        ]);
      });

      // Sync queue — sets are cascade deleted via workout_exercise in Supabase
      // so we only need to delete the workout_exercise
      await syncService.addToSyncQueue(
        userId,
        "workout_exercises",
        exerciseId,
        "delete",
        { id: exerciseId },
      );

      return { success: true };
    } catch (error) {
      console.error("Error deleting exercise:", error);
      return { success: false, error: "Failed to delete exercise" };
    }
  },
};
