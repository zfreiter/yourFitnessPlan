import { Workout } from "@/types/type";
import { View, Text, ScrollView } from "react-native";
import WorkoutCard from "@/features/home/TodaysWorkout/WorkoutCard";
import { useColorTheme } from "@/context/colorThemeContext";

export default function DailyWorkoutSchedule({
  currentDay,
  workoutList,
}: {
  currentDay: string | null;
  workoutList: Workout[];
}): JSX.Element {
  const { theme } = useColorTheme();
  const date = new Date(currentDay + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", // Full weekday name
    year: "numeric", // Full year
    month: "short", // Abbreviated month name (e.g., "Apr")
    day: "numeric", // Day of the month
  });

  if (workoutList.length === 0) {
    return (
      <View style={{ flex: 1, padding: 0 }}>
        <Text style={{ color: theme.textPrimary }}>{date}</Text>
        <View
          style={{
            height: 1,
            backgroundColor: theme.hr,
            marginVertical: 10,
          }}
        />
        <Text style={{ color: theme.textPrimary }}>No workouts for today</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 0 }}>
      <Text style={{ color: theme.textPrimary }}>{date}</Text>
      <View
        style={{
          height: 1,
          backgroundColor: theme.hr,
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
