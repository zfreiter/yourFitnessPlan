import { CreateWorkoutContainer } from "@/features/create-workout/components/createWorkoutContainer";
import { useWorkout } from "@/context/workoutContext";

export default function Index() {
  const { exercises } = useWorkout();

  return <CreateWorkoutContainer exerciseList={exercises} />;
}
