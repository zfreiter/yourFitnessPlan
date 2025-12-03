import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import { router, useLocalSearchParams } from "expo-router";
import { Workout } from "@/types/type";
import { useWorkout } from "@/context/workoutContext";
import { useEffect, useState } from "react";

import ActiveWorkoutSession from "@/features/workout-session/components/activeWorkoutSession";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function WorkoutDetails() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const { workouts } = useWorkout();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useColorTheme();

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
    router.replace("/main/calendar");
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
    padding: 8,
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
