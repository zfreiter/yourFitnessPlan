import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Workout } from "@/types/type";
import { useWorkout } from "@/context/workoutContent";
import { useEffect, useState } from "react";
import ActiveWorkoutSession from "@/features/workout-session/components/activeWorkoutSession";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function WorkoutDetails() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const { workouts } = useWorkout();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const findWorkout = () => {
      const foundWorkout = workouts.find((w) => w.id === Number(workoutId));
      setWorkout(foundWorkout || null);
      setIsLoading(false);
    };

    if (workouts.length > 0) {
      findWorkout();
    }
  }, [workouts, workoutId]);

  const handleBack = () => {
    console.log("Back button pressed from page!");
    router.replace("/(app)/calendar");
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Getting your workout...</Text>
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Workout not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={300}
      >
        <ActiveWorkoutSession workout={workout} />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    gap: 10,
    backgroundColor: "#E0E0E0",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(142, 218, 245, 0.3)",
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "black",
  },
  text: {
    fontSize: 20,
    fontWeight: "bold",
  },
  loadingText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "black",
  },
  errorText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "red",
  },
});
