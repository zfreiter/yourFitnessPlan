// ========================================
// PRIMITIVES & ENUMS
// ========================================

export type WorkoutType = "strength" | "cardio" | "circuit" | "open";
export type WorkoutTypeOptions =
  | "Select workout"
  | "strength"
  | "cardio"
  | "circuit"
  | "open";

export type ValidUnit = "reps" | "weight" | "time" | "distance";

export type Difficulty = "" | "beginner" | "intermediate" | "advanced";

export type PerceivedEffort = "easy" | "moderate" | "hard";

export type ExerciseGroupType = "superset" | "compound_set" | "circuit";

export type CardioActivity =
  | "run"
  | "sprint"
  | "bike"
  | "row"
  | "swim"
  | "jump_rope"
  | "hike"
  | "walk";

export type CardioMode = "simple" | "intervals";

export type HeartRateZone = "z1" | "z2" | "z3" | "z4" | "z5";

export type Theme = "light" | "dark";

export type UnitSystem = "us" | "metric";

export type SetProgressionStyle = "straight" | "ramp" | "custom";

export type RMFormula = "epley" | "brzycki" | "lombardi";

export type WeightRounding = "2.5" | "5" | "10" | "none";

export type WorkoutVisibility = "private" | "shareable";

export type FriendRequestAccess = "everyone" | "friends" | "none";

export enum ExerciseDirection {
  UP = "up",
  DOWN = "down",
}

// ========================================
// RAW DATABASE ROW TYPES
// ========================================

export interface ExerciseRow {
  id: string;
  name: string;
  description: string | null;
  difficulty: Difficulty | null;
  no_weight: number; // SQLite 0 or 1
}

export interface ExerciseTypeRow {
  exercise_id: string;
  type: WorkoutType;
}

export interface ExerciseMuscleRow {
  exercise_id: string;
  muscle: string;
}

export interface ExerciseEquipmentRow {
  exercise_id: string;
  equipment: string;
}

export interface ExerciseUnitCombinationRow {
  exercise_id: string;
  unit_combination: string; // e.g. "reps+weight" or "time+distance"
}

// ========================================
// EXERCISE LIBRARY (ASSEMBLED)
// ========================================

export interface Exercise {
  id: string;
  name: string;
  description: string;
  types: WorkoutType[];
  validUnits: ValidUnit[];
  musclesTargeted: string[];
  equipment: string[];
  difficulty: Difficulty;
  noWeight: boolean;
}

// ========================================
// SETS
// ========================================

export interface BaseExerciseSet {
  reps?: number;
  weight?: number;
  time?: number;
  distance?: number;
  is_warmup: number; // 0 or 1
  is_max: number; // 0 or 1
  set_order: number;
}

export interface ExerciseSet extends BaseExerciseSet {
  id: string;
  workout_exercise_id: string;
}

// ========================================
// WORKOUT EXERCISES
// ========================================

export interface BaseWorkoutExercise {
  exercise_id: string;
  exercise_name: string;

  validUnits: ValidUnit[];

  musclesTargeted?: string[];
  equipment?: string[];
  description?: string;

  exercise_order: number;

  group_id?: string | null;
  group_type?: ExerciseGroupType | null;
  round_number?: number | null;

  sets: BaseExerciseSet[];
}

export interface WorkoutExercise extends BaseWorkoutExercise {
  id: string;
  workout_id: string;
  sets: ExerciseSet[];
}

// ========================================
// FORMS
// ========================================
export interface AddExerciseForm {
  logging_style: "straight" | "superset" | "compound_set";
  exercises: WorkoutExercise[];
}

// ========================================
// CARDIO
// ========================================

export interface BaseCardioInterval {
  interval_order: number;
  work_duration?: number;
  rest_duration?: number;
  distance?: number;
  calories?: number;
  notes?: string;
}

export interface CardioInterval extends BaseCardioInterval {
  id: string;
  cardio_entry_id: string;
}

export interface BaseCardioEntry {
  activity: CardioActivity;
  mode: CardioMode;
  duration?: number | null;
  distance?: number | null;
  calories?: number | null;
  heart_rate_avg?: number | null;
  heart_rate_zone?: HeartRateZone | null;
  is_finisher: number; // 0 or 1
  entry_order: number;
  notes?: string | null;
  intervals: BaseCardioInterval[];
}

export interface CardioEntry extends BaseCardioEntry {
  id: string;
  workout_id: string;
  intervals: CardioInterval[];
}

// ========================================
// CIRCUIT
// ========================================

export interface BaseCircuitRound {
  round_number: number;
  rest_after_round: number; // seconds, default 90
  notes?: string;
}

export interface CircuitRound extends BaseCircuitRound {
  id: string;
  workout_id: string;
}

export interface CreateCircuitForm {
  rounds: number;
  restAfterRound: number;
  notes: string;
  exercises: WorkoutExercise[];
}
// ========================================
// WORKOUTS
// ========================================

export interface BaseWorkout {
  name: string;
  description?: string;
  workoutType: WorkoutType;
  scheduled_datetime: string;
  duration?: number;
  perceived_effort?: PerceivedEffort;
  is_completed: number; // 0 or 1
  completed_at?: string | null;
  exercises: BaseWorkoutExercise[];
  cardio_entries: BaseCardioEntry[];
  circuit_rounds: BaseCircuitRound[];
}

export interface Workout extends BaseWorkout {
  id: string;
  user_id: string;
  exercises: WorkoutExercise[];
  cardio_entries: CardioEntry[];
  circuit_rounds: CircuitRound[];
}

// ========================================
// WORKOUT FORMS
// ========================================

export interface ExerciseFormData extends BaseWorkoutExercise {}

export interface CreateWorkoutForm extends Omit<
  BaseWorkout,
  "exercises" | "cardio_entries" | "circuit_rounds" | "workoutType"
> {
  id: string;
  workoutType: WorkoutTypeOptions;
  exercises?: WorkoutExercise[];
  cardio_entries?: CardioEntry[];
  circuit_rounds?: CircuitRound[];
}

// ========================================
// TRAINING MAX
// ========================================

export interface TrainingMax {
  id: string;
  user_id: string | null;
  exercise_name: string;
  one_rep_max: number;
  tested_date: string | null;
  created_at: string;
}

export interface TrainingMaxInsert {
  user_id?: string | null;
  exercise_name: string;
  one_rep_max: number;
  tested_date?: string | null;
}

// ========================================
// TRACKING
// ========================================

export interface TrackingOptions {
  reps?: boolean;
  weight?: boolean;
  time?: boolean;
  distance?: boolean;
}

// ========================================
// PROFILE
// ========================================

export interface ProfileInterface {
  id: string;
  age?: number | null;
  current_height?: number | null;
  current_weight?: number | null;
  full_name: string;
  username?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

// Form level — first_name and last_name split for UX
// Service layer concatenates to full_name before saving
export interface ProfileUpdate {
  id: string;
  age?: number | null;
  current_height?: number | null;
  current_weight?: number | null;
  first_name: string;
  last_name: string;
  username?: string | null;
  avatar_url?: string | null;
}

// Function level — full_name already assembled
export interface ProfileUpdateFunction {
  age?: number | null;
  current_height?: number | null;
  current_weight?: number | null;
  full_name: string;
  username?: string | null;
}

// ========================================
// USER PREFERENCES
// ========================================

export interface UserPreferences {
  user_id: string;
  theme: Theme;
  unit_system: UnitSystem;
  set_progression_style: SetProgressionStyle;
  rm_formula: RMFormula;
  weight_rounding: WeightRounding;
  allow_analytics: boolean; // SQLite 0 or 1
  default_workout_visibility: WorkoutVisibility;
  allow_friend_requests: boolean; // SQLite 0 or 1
  who_can_send_workouts: FriendRequestAccess;
  notifications_enabled: boolean; // SQLite 0 or 1
  email_product_updates: boolean; // SQLite 0 or 1
  email_tips: boolean; // SQLite 0 or 1
  created_at: string;
  updated_at: string;
}

// All fields optional except user_id — covers both insert and update
export interface UserPreferencesUpdate {
  user_id: string;
  theme?: Theme;
  unit_system?: UnitSystem;
  set_progression_style?: SetProgressionStyle;
  rm_formula?: RMFormula;
  weight_rounding?: WeightRounding;
  allow_analytics?: boolean;
  default_workout_visibility?: WorkoutVisibility;
  allow_friend_requests?: boolean;
  who_can_send_workouts?: FriendRequestAccess;
  notifications_enabled?: boolean;
  email_product_updates?: boolean;
  email_tips?: boolean;
}
