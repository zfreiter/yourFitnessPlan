import { CreateWorkoutContainer } from "@/features/create-workout/components/createWorkoutContainer";
import { useWorkout } from "@/context/workoutContent";

export default function Index() {
  const { exercises } = useWorkout();

  return <CreateWorkoutContainer exerciseList={exercises} />;
}
