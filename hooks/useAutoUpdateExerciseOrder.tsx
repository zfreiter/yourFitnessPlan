import { useEffect, useState, useCallback } from "react";
import { Exercise } from "@/types/type";
import { debounce } from "@/utils/debounce";
import { workoutService } from "@/services/workoutService";
import { useDatabase } from "@/context/databaseContext";
import { useWorkout } from "@/context/workoutContent";
// This hook is used to update the exercise order in the database when the user reorders the exercises
// It uses a debounced function to update the database after a delay
// It also updates the exercises state when the initial exercises change
export default function useAutoUpdateExerciseOrder(exercises: Exercise[]) {
  const [updatedExercises, setUpdatedExercises] = useState<Exercise[]>(
    exercises || []
  );
  const [updatedExercisesIds, setUpdatedExercisesIds] = useState<
    { id: number; newOrder: number }[]
  >([]);
  const { db } = useDatabase();
  const { workouts, setWorkouts } = useWorkout();
  // Debounced function to update database
  const debouncedUpdateDatabase = useCallback(
    debounce(async (exerciseIds: { id: number; newOrder: number }[]) => {
      // if (exerciseIds.length > 0) {
      //   console.log(
      //     "Updating database with exercise order changes:",
      //     exerciseIds
      //   );
      //   if (db) {
      //     const result = await workoutService.updateExerciseOrder(
      //       db,
      //       exerciseIds
      //     );
      // if (result.success) {
      //   console.log("Exercise order updated successfully");
      // update the workouts state with the updated exercises
      //   setWorkouts((prevWorkouts) => {
      //     return prevWorkouts.map((workout) => {
      //       if (workout.id === updatedExercises[0].workout_id) {
      //         return { ...workout, exercises: updatedExercises };
      //       }
      //       return workout;
      //     });
      //   });
      // }
      // }
      // }
    }, 500),
    []
  );

  useEffect(() => {
    if (updatedExercisesIds.length > 0) {
      console.log("Updated exercises ids:", updatedExercisesIds);
      debouncedUpdateDatabase(updatedExercisesIds);
    }
  }, [updatedExercisesIds, debouncedUpdateDatabase]);

  // Update exercises when initial exercises change
  useEffect(() => {
    if (exercises && exercises.length > 0) {
      setUpdatedExercises(exercises);
    }
  }, [exercises]);

  return { updatedExercises, setUpdatedExercises, setUpdatedExercisesIds };
}
