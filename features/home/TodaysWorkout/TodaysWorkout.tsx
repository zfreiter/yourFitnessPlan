import { View, Text, StyleSheet } from "react-native";
import { useWorkout } from "@/context/workoutContext";
import WorkoutCard from "./WorkoutCard";

export default function TodaysWorkout() {
  const { currentWorkouts } = useWorkout();

  if (!currentWorkouts || currentWorkouts.length === 0)
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No workouts schedule</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Today's Workout</Text>
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
