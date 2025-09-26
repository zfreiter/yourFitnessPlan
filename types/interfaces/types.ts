// Base types for the application
export type ExerciseType =
  | "Select workout"
  | "strength"
  | "cardio"
  | "mobility"
  | "circuit";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type ValidUnit = "reps" | "weight" | "time" | "distance";

// Database row types - these represent the raw data from the database
export interface ExerciseRow {
  id: number;
  name: string;
  description: string | null;
  difficulty: Difficulty | null;
  no_weight: number; // SQLite stores booleans as 0/1
}

export interface ExerciseTypeRow {
  exercise_id: number;
  type: ExerciseType;
}

export interface ExerciseMuscleRow {
  exercise_id: number;
  muscle: string;
}

export interface ExerciseEquipmentRow {
  exercise_id: number;
  equipment: string;
}

export interface ExerciseUnitCombinationRow {
  exercise_id: number;
  unit_combination: string; // Stored as "reps+weight" or "time+distance" etc.
}

// Application types - these are the types used in your application
export interface Exercise {
  id: string; // Converted to string for consistency
  name: string;
  description: string;
  types: ExerciseType[];
  validUnits: ValidUnit[][]; // Array of valid unit combinations
  musclesTargeted: string[];
  equipment: string[];
  difficulty: Difficulty;
  noWeight: boolean;
}

// Workout related types
export interface SetDetails {
  id?: number;
  reps?: number;
  weight?: number;
  time?: number;
  distance?: number;
}

export interface TrackingOptions {
  reps?: boolean;
  weight?: boolean;
  time?: boolean;
  distance?: boolean;
}

export interface WorkoutExercise {
  exercise: Exercise; // Reference to the full exercise
  chosenUnitCombination: ValidUnit[]; // The specific unit combination chosen for this exercise
  sets: SetDetails[];
}

export interface Workout {
  id: string;
  name: string;
  description?: string;
  type: ExerciseType;
  scheduled_datetime: string;
  duration?: number;
  exercises: WorkoutExercise[];
  isCompleted: boolean;
}

export interface SubmitNewWorkout {
  name: string;
  description?: string;
  type: ExerciseType;
  scheduled_datetime: string;
  duration?: number;
  exercises: WorkoutExercise[];
  isCompleted: boolean;
}
