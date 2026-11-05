// Legacy sample data contracts, separate from persisted exercise/workout models.
export type SampleWorkoutCategory = "strength" | "cardio" | "mobility" | "circuit";
export type SampleMetric = "reps" | "weight" | "time" | "distance";

export interface SampleExercise {
  id: string;
  name: string;
  description: string;
  types: SampleWorkoutCategory[];
  validUnits: SampleMetric[][];
  musclesTargeted: string[];
  equipment: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  noWeight: boolean;
}

export interface SampleSet {
  reps?: number;
  weight?: number;
  time?: number;
  distance?: number;
}

export interface SampleWorkoutExercise {
  exercise: SampleExercise;
  chosenUnitCombination: SampleMetric[];
  sets: SampleSet[];
}

export interface SampleWorkout {
  id: string;
  name: string;
  description: string;
  type: SampleWorkoutCategory;
  scheduled_datetime: string;
  duration: number;
  exercises: SampleWorkoutExercise[];
  isCompleted: boolean;
}
