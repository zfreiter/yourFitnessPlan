import { Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { workoutService } from "@/services/workoutService";
import { Workout } from "@/types/type";
import { useDatabase } from "@/context/databaseContext";
import { useEffect, useState } from "react";
import WorkoutSessionContainer from "@/features/workout-session/components/workoutSessionContainer";
import ActiveWorkoutSession from "@/features/workout-session/components/activeWorkoutSession";

export default function WorkoutDetails() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const { db } = useDatabase();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWorkout = async () => {
      if (!db) {
        return;
      }
      try {
        const workout = await workoutService.getWorkoutById(
          db,
          Number(workoutId)
        );
        setWorkout(workout);
      } catch (error) {
        console.error("Error fetching workout:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWorkout();
  }, [db, workoutId]);

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (!workout) {
    return <Text>Workout not found</Text>;
  }

  console.log(
    "workout in workout-session",
    JSON.stringify(workout.exercises[0], null, 2)
  );

  return (
    <WorkoutSessionContainer>
      <ActiveWorkoutSession workout={workout} />
    </WorkoutSessionContainer>
  );
}
