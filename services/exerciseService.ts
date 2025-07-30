import * as SQLite from "expo-sqlite";
import { Exercise, ValidUnit, ExerciseType, Difficulty } from "@/types/type";

interface ExerciseRow {
  id: number;
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
  getExercises: (db: SQLite.SQLiteDatabase) => Promise<Exercise[]>;
  getExerciseById: (
    db: SQLite.SQLiteDatabase,
    id: number
  ) => Promise<Exercise | null>;
  getExercisesByType: (
    db: SQLite.SQLiteDatabase,
    type: ExerciseType
  ) => Promise<Exercise[]>;
  getExercisesByMuscle: (
    db: SQLite.SQLiteDatabase,
    muscle: string
  ) => Promise<Exercise[]>;
  getExerciseByEquipment: (
    db: SQLite.SQLiteDatabase,
    equipment: string
  ) => Promise<Exercise[]>;
  getParsedExercises: (exercises: ExerciseRow[]) => Exercise[];
  getParsedExerciseById: (exercise: ExerciseRow) => Exercise | null;
}

export const exerciseService: ExerciseService = {
  // parse exercises from db to Exercise[]
  getParsedExercises: (exercises: ExerciseRow[]): Exercise[] => {
    return exercises.map((exercise) => ({
      id: exercise.id,
      exercise_id: exercise.id,
      workout_id: 0, // Template exercises don't belong to a specific workout
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
      workout_id: 0, // Template exercises don't belong to a specific workout
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

  getExercises: async (db: SQLite.SQLiteDatabase) => {
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
      //console.log("test        ", exercises[0]);
      const parsedExercises: Exercise[] =
        exerciseService.getParsedExercises(exercises);

      return parsedExercises;
    } catch (error) {
      console.error("Error fetching all exercises:", error);
      throw new Error("Failed to fetch exercises");
    }
  },
  getExerciseById: async (db: SQLite.SQLiteDatabase, id: number) => {
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
        [id]
      );

      if (!foundExercise) {
        return null;
      }
      const parsedExercise =
        exerciseService.getParsedExerciseById(foundExercise);

      return parsedExercise;
    } catch (error) {
      console.error("Error fetching exercise by id:", error);
      throw new Error("Failed to fetch exercise by id");
    }
  },
  getExercisesByType: async (db: SQLite.SQLiteDatabase, type: ExerciseType) => {
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
        [type]
      );

      if (!exercises) {
        return [];
      }

      const parsedExercises: Exercise[] =
        exerciseService.getParsedExercises(exercises);

      return parsedExercises;
    } catch (error) {
      console.error("Error fetching exercises by type:", error);
      throw new Error("Failed to fetch exercises by type");
    }
  },
  getExercisesByMuscle: async (db: SQLite.SQLiteDatabase, muscle: string) => {
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
        [muscle]
      );

      if (!exercises) {
        return [];
      }

      const parsedExercises: Exercise[] =
        exerciseService.getParsedExercises(exercises);
      return parsedExercises;
    } catch (error) {
      console.error("Error fetching exercises by muscle:", error);
      throw new Error("Failed to fetch exercises by muscle");
    }
  },
  getExerciseByEquipment: async (
    db: SQLite.SQLiteDatabase,
    equipment: string
  ) => {
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
        [equipment]
      );

      if (!exercises) {
        return [];
      }

      const parsedExercises: Exercise[] =
        exerciseService.getParsedExercises(exercises);
      return parsedExercises;
    } catch (error) {
      console.error("Error fetching exercises by equipment:", error);
      throw new Error("Failed to fetch exercises by equipment");
    }
  },
};
