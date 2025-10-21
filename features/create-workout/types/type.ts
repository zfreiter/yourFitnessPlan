import { ExerciseType } from "@/types/interfaces/types";
import { Control, UseFormGetValues, UseFormSetValue } from "react-hook-form";
import { Exercise } from "@/types/type";

export interface WorkoutFormValues {
  name: string;
  description: string;
  duration: string;
  date: Date;
  workoutType: ExerciseType;
  workoutExerciseList: Exercise[];
  isCompleted: boolean;
}

export interface ExerciseProps {
  workoutType: string;
  exerciseList: Exercise[];
  setShowExerciseModal: (showExerciseModal: boolean) => void;
}

// Interface for a complete workout
export interface WorkoutUpdateFormValues {
  id: number;
  name: string;
  description: string;
  type: string;
  date: Date;
  duration: number;
  exercises: Exercise[];
  isCompleted: boolean;
  completed_at?: number | string | null;
}
