import { Workout } from "@/types/type";
import { Link } from "expo-router";
import { View, Text } from "react-native";

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
      <Text style={{ marginTop: 10 }}>{date}</Text>
      <View
        style={{ height: 1, backgroundColor: "#ccc", marginVertical: 10 }}
      />
      {workoutList.length > 0 &&
        workoutList.map((workout) => (
          <WorkoutLink key={workout.id} workout={workout} />
        ))}
    </View>
  );
}

export function WorkoutLink({ workout }: { workout: Workout }) {
  // workout types are strength, cardio, circuit, mobility
  // workout colors are red, green, blue, yellow
  return (
    <Link
      href={{
        pathname: "/workout-session/[workoutId]",
        params: { workoutId: workout.id },
      }}
      style={{ marginVertical: 5 }}
      push
    >
      <View
        style={{
          backgroundColor: "#8EDAF5",
          padding: 10,
          borderRadius: 5,
          marginVertical: 0,
          width: "100%",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "bold", marginRight: 10 }}>
            {workout.name}
          </Text>
          <View
            style={{
              borderRadius: 20,
              backgroundColor: getWorkoutTypeColor(workout.workoutType),
              width: 10,
              height: 10,
            }}
          />
        </View>
        <Text>{workout.description}</Text>
      </View>
    </Link>
  );
}
export function getWorkoutTypeColor(type: string) {
  switch (type) {
    case "#ff0000ff":
      return "red";
    case "cardio":
      return "blue";
    case "circuit":
      return "green";
    case "mobility":
      return "#f096f0ff";
    default:
      return "red";
  }
}
