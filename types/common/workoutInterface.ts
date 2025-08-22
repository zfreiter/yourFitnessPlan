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
  exercise_id: number;
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
  date: string;
  time: string;
  duration: number;
  exercises: BaseWorkoutExercise[];
  isCompleted: boolean;
}

export interface ExerciseSet extends BaseExerciseSet {
  id: number;
  workout_exercise_id: number;
}

export interface Exercise extends BaseWorkoutExercise {
  id: number;
  exercise_id: number;
  workout_id: number; // Add this field to link exercise to workout
  sets: ExerciseSet[];
}

export interface Workout extends BaseWorkout {
  id: number;
  exercises: Exercise[];
}

export interface ExerciseFormData extends BaseWorkoutExercise {}

export interface CreateWorkoutForm extends BaseWorkout {
  exercises: ExerciseFormData[];
}
