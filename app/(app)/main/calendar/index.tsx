import { useWorkout } from "@/context/workoutContext";
import CalendarIndex from "@/features/calendar/components/calendar";
import { format } from "date-fns";
import { View } from "react-native";

export default function Index() {
  const { workouts } = useWorkout();
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <View style={{ flex: 1 }}>
      <CalendarIndex workouts={workouts} today={today} />
    </View>
  );
}
