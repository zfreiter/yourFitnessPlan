export type ExerciseType =
  | "Select workout"
  | "strength"
  | "cardio"
  | "mobility"
  | "circuit";

export type ValidUnit = "reps" | "weight" | "time" | "distance";
export type Difficulty = "" | "beginner" | "intermediate" | "advanced";
export interface BaseExerciseSet {
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
  set_order: number;
}

export interface BaseWorkoutExercise {
  exercise_id: string;
  exercise_name: string;
  exercise_description?: string;
  exercise_difficulty?: Difficulty;
  track_reps: number;
  track_weight: number;
  track_time: number;
  track_distance: number;
  validUnits?: ValidUnit[][];
  musclesTargeted?: string[];
  equipment?: string[];
  sets: BaseExerciseSet[];
  exercise_order: number;
}

export interface BaseWorkout {
  name: string;
  description: string;
  workoutType: ExerciseType;
  scheduled_datetime: string;
  duration: number;
  exercises: BaseWorkoutExercise[];
  isCompleted: boolean;
  completed_at?: number | string | null;
}

export interface ExerciseSet extends BaseExerciseSet {
  id: string;
  workout_exercise_id: string;
}

export interface Exercise extends BaseWorkoutExercise {
  id: string;
  exercise_id: string;
  workout_id: string; // Add this field to link exercise to workout
  sets: ExerciseSet[];
}

export interface Workout extends BaseWorkout {
  id: string;
  user_id: string;
  exercises: Exercise[];
}

export interface ExerciseFormData extends BaseWorkoutExercise {}

export interface CreateWorkoutForm extends BaseWorkout {
  exercises: ExerciseFormData[];
}

export enum ExerciseDirection {
  UP = "up",
  DOWN = "down",
}
