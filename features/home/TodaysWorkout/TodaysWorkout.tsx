import { View, Text, StyleSheet } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import { useWorkout } from "@/context/workoutContext";
import WorkoutCard from "./WorkoutCard";

export default function TodaysWorkout() {
  const { theme } = useColorTheme();
  const { currentWorkouts } = useWorkout();

  if (!currentWorkouts || currentWorkouts.length === 0)
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}
      >
        <Text style={[styles.text, { color: theme.textPrimary }]}>
          No workouts schedule
        </Text>
      </View>
    );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}
    >
      <Text style={[styles.text, { color: theme.textPrimary }]}>
        Today's Workout
      </Text>
      <View style={{ gap: 10 }}>
        {currentWorkouts.map((workout) => (
          <WorkoutCard key={workout.id} workout={workout} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
    marginBottom: 5,
  },
});
