import { exerciseService } from "@/services/exerciseService";
import { workoutService } from "@/services/workoutService";
import { Workout, Exercise } from "@/types/type";
import { useDatabase } from "@/context/databaseContext";
import {
  ExerciseDirection,
  ExerciseSet,
  ExerciseType,
} from "@/types/common/workoutInterface";
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
  updateWorkoutExerciseOrder: (
    workoutId: number,
    exerciseFirstOrder: number,
    exerciseSecondOrder: number,
    direction: ExerciseDirection
  ) => void;
  addWorkoutExercise: (newExerciseData: Exercise, workoutId: number) => void;
  deleteWorkoutExercise: (exerciseId: number) => void;
  deleteWorkoutExerciseSet: (
    workoutId: number,
    exerciseId: number,
    setId: number,
    setOrder: number
  ) => void;
  updateWorkoutExerciseSet: (
    workoutId: number,
    exerciseId: number,
    setId: number,
    field: string,
    text: string
  ) => void;
  updateWorkoutType: (workoutId: number, workoutType: ExerciseType) => void;
  updateContextWorkoutField: (
    workoutId: number,
    fieldName: string,
    value: string
  ) => void;
  updateContextWorkoutCompleted: (
    workoutId: number,
    isCompleted: boolean,
    completedDate: string | null
  ) => void;
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

  // workouts.forEach((workout) => {
  //   console.log(
  //     "workout",
  //     workout.isCompleted,
  //     workout.completed_at,
  //     workout.scheduled_datetime
  //   );
  // });

  function updateWorkoutExerciseOrder(
    workoutId: number,
    exerciseFirstOrder: number,
    exerciseSecondOrder: number,
    direction: ExerciseDirection
  ) {
    setWorkouts((workouts) => {
      const updatedWorkoutsOrder = workouts.map((workout) => {
        if (workout.id == workoutId) {
          const exerciseFirst = workout.exercises[exerciseFirstOrder];
          const exerciseSecond = workout.exercises[exerciseSecondOrder];
          if (direction === ExerciseDirection.UP) {
            workout.exercises[exerciseFirstOrder] = exerciseSecond;
            workout.exercises[exerciseFirstOrder].exercise_order =
              exerciseSecondOrder;
            workout.exercises[exerciseSecondOrder] = exerciseFirst;
            workout.exercises[exerciseSecondOrder].exercise_order =
              exerciseFirstOrder;
          } else if (direction === ExerciseDirection.DOWN) {
            workout.exercises[exerciseFirstOrder] = exerciseSecond;
            workout.exercises[exerciseFirstOrder].exercise_order =
              exerciseSecondOrder;
            workout.exercises[exerciseSecondOrder] = exerciseFirst;
            workout.exercises[exerciseSecondOrder].exercise_order =
              exerciseFirstOrder;
          }
          return workout;
        }
        return workout;
      });
      return updatedWorkoutsOrder;
    });
  }

  function addWorkoutExercise(newExerciseData: Exercise, workoutId: number) {
    setWorkouts((prev: Workout[]) => {
      if (newExerciseData) {
        const updatedWorkout = prev.map((workout: Workout) =>
          workout.id === workoutId
            ? {
                ...workout,
                exercises: [...workout.exercises, newExerciseData],
              }
            : workout
        );
        return updatedWorkout;
      }
      return prev;
    });
  }

  function deleteWorkoutExercise(exerciseId: number) {
    setWorkouts((prev: Workout[]) => {
      return prev.map((workout) => {
        return {
          ...workout,
          exercises: workout.exercises.filter((e) => e.id !== exerciseId),
        };
      });
    });
  }
  function updateWorkoutExerciseSet(
    workoutId: number,
    exerciseId: number,
    setId: number,
    field: string,
    text: string
  ) {
    setWorkouts((prevWorkouts: Workout[]) => {
      return prevWorkouts.map((workout: Workout) => {
        if (workout.id.toString() === workoutId.toString()) {
          const updatedExercises = workout.exercises.map((ex) => {
            if (ex.id === exerciseId) {
              const updatedSets = ex.sets.map((s) => {
                if (s.id === setId) {
                  return {
                    ...s,
                    [field]: parseInt(text) || 0,
                  };
                }
                return s;
              });
              return { ...ex, sets: updatedSets };
            }
            return ex;
          });
          return { ...workout, exercises: updatedExercises };
        }
        return workout;
      });
    });
  }
  function deleteWorkoutExerciseSet(
    workoutId: number,
    exerciseId: number,
    setId: number,
    setOrder: number
  ) {
    setWorkouts((prevWorkouts) =>
      prevWorkouts.map((workout) => {
        // Find the workout that contains the exercise
        if (workout.id === workoutId) {
          // Update the exercise that contains the sets we are working with
          const updatedExercises = workout.exercises.map((ex) => {
            // Find the set to remove and then update the set_order of the sets that come after the removed set
            if (ex.id === exerciseId) {
              const updatedSets = ex.sets
                .filter((s: ExerciseSet) => s.id !== setId)
                .map((s: ExerciseSet) => {
                  if (s.set_order > setOrder) {
                    return { ...s, set_order: s.set_order - 1 };
                  }
                  return s;
                });
              return { ...ex, sets: updatedSets };
            }
            return ex;
          });
          return { ...workout, exercises: updatedExercises };
        }
        return workout;
      })
    );
  }
  function deleteWorkout() {}
  function deleteExercise() {}
  function deleteExerciseSet() {}
  function updateWorkoutType(workoutId: number, workoutType: ExerciseType) {
    setWorkouts((prevWorkouts: Workout[]) =>
      prevWorkouts.map((workout: Workout) =>
        workout.id === workoutId
          ? { ...workout, workoutType: workoutType }
          : workout
      )
    );
  }
  function updateContextWorkoutField(
    workoutId: number,
    fieldName: string,
    value: string
  ) {
    setWorkouts((prevWorkouts: Workout[]) =>
      prevWorkouts.map((workout: Workout) => {
        const updatedWorkout =
          workout.id === workoutId
            ? fieldName === "date"
              ? { ...workout, date: value, time: value }
              : { ...workout, [fieldName]: value }
            : workout;

        return updatedWorkout;
      })
    );
  }
  function updateContextWorkoutCompleted(
    workoutId: number,
    isCompleted: boolean,
    completedDate: string | null
  ) {
    setWorkouts((prevWorkouts: Workout[]) =>
      prevWorkouts.map((workout: Workout) => {
        if (workout.id === workoutId) {
          return {
            ...workout,
            isCompleted: isCompleted,
            completed_at: completedDate,
          };
        }

        return workout;
      })
    );
  }

  return (
    <WorkoutContext.Provider
      value={{
        workouts,
        setWorkouts,
        exercises,
        setExercises,
        updateWorkoutExerciseOrder,
        addWorkoutExercise,
        deleteWorkoutExercise,
        deleteWorkoutExerciseSet,
        updateWorkoutExerciseSet,
        updateWorkoutType,
        updateContextWorkoutField,
        updateContextWorkoutCompleted,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}
