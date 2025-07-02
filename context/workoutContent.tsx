import { exerciseService } from "@/services/exerciseService";
import { workoutService } from "@/services/workoutService";
import { Workout, Exercise } from "@/types/type";
import { useDatabase } from "@/context/databaseContext";
import {
  createContext,
  Dispatch,
  type PropsWithChildren,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";

interface WorkoutContextType {
  workouts: Workout[];
  setWorkouts: Dispatch<SetStateAction<Workout[]>>;
  exercises: Exercise[];
  setExercises: Dispatch<SetStateAction<Exercise[]>>;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function useWorkout() {
  const value = useContext(WorkoutContext);

  if (!value) {
    throw new Error("useWorkout must be wrapped in a <WorkoutProvider />");
  }

  return value;
}

export function WorkoutProvider({ children }: PropsWithChildren) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const { db, isLoading } = useDatabase();

  useEffect(() => {
    const fetchExercises = async () => {
      if (db) {
        const exercises = await exerciseService.getExercises(db);
        setExercises(exercises);
      }
    };
    if (db) {
      fetchExercises();
    }
  }, [db]);

  useEffect(() => {
    const fetchWorkouts = async () => {
      if (db) {
        const workouts = await workoutService.getAllWorkouts(db);
        setWorkouts(workouts);
      }
    };
    if (db) {
      fetchWorkouts();
    }
  }, [db]);

  //console.log("workouts in workoutContent", workouts);

  return (
    <WorkoutContext.Provider
      value={{ workouts, setWorkouts, exercises, setExercises }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}
