import { Workout } from "@/types/type";
import { Link } from "expo-router";
import { View, Text, ScrollView } from "react-native";
import { colors } from "@/utils/colors";
import WorkoutCard from "@/features/home/TodaysWorkout/WorkoutCard";
export default function DailyWorkoutSchedule({
  currentDay,
  workoutList,
}: {
  currentDay: string | null;
  workoutList: Workout[];
}): JSX.Element {
  if (!currentDay) {
    return <Text>No workouts for today</Text>;
  }
  const date = new Date(currentDay + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", // Full weekday name
    year: "numeric", // Full year
    month: "short", // Abbreviated month name (e.g., "Apr")
    day: "numeric", // Day of the month
  });

  return (
    <View style={{ flex: 1, padding: 0 }}>
      <Text style={{}}>{date}</Text>
      <View
        style={{
          height: 1,
          backgroundColor: "#ccc",
          marginVertical: 10,
        }}
      />
      <ScrollView>
        <View style={{ gap: 10 }}>
          {workoutList.length > 0 &&
            workoutList.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} detailed={true} />
            ))}
        </View>
      </ScrollView>
    </View>
  );
}
