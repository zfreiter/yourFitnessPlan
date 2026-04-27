import { View, Text, StyleSheet } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import { useWorkout } from "@/context/workoutContext";
import WorkoutCard from "./WorkoutCard";

export default function TodaysWorkout() {
  const { theme } = useColorTheme();
  const { currentWorkouts } = useWorkout();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.color.background,
          borderColor: theme.color.border,
          shadowColor: theme.color.shadow,
        },
      ]}
    >
      <Text style={[styles.sectionLabel, { color: theme.color.textSecondary }]}>
        TODAY'S WORKOUT
      </Text>

      {!currentWorkouts || currentWorkouts.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.color.textPrimary }]}>
          No workouts scheduled
        </Text>
      ) : (
        <View style={styles.list}>
          {currentWorkouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  emptyText: {
    fontFamily: "Inter-Regular",
    fontSize: 14,
  },
  list: {
    flexDirection: "column",
    gap: 8,
    flexShrink: 0, // prevents the list from compressing its children
  },
});
