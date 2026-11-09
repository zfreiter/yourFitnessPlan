import { traceUi, runUiAction, uiPressEvents } from "@/utils/uiDiagnostics";
import { Alert, Text, Pressable, StyleSheet, View } from "react-native";
import { useRef, useState } from "react";
import { useSessionLifetime } from "@/hooks/useSessionLifetime";
import { assertNoEmptyCircuits, emptyCircuitMessages } from "@/utils/circuitValidation";
import { useColorTheme } from "@/context/colorThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFormContext, useWatch } from "react-hook-form";
import {
  CreateWorkoutForm,
  Workout,
  WorkoutType,
} from "@/types/interfaces/types";
import { workoutService } from "@/services/workoutService";
import { useAuth } from "@/context/authContext";
import { useWorkout } from "@/context/workoutContext";
import { useRouter } from "expo-router";

const convertFormToWorkout = (
  form: CreateWorkoutForm,
  userId: string,
): Workout => {
  return {
    id: form.id,
    user_id: userId,
    name: form.name,
    workoutType: form.workoutType as WorkoutType, // cast away 'select' option
    scheduled_datetime: form.scheduled_datetime,
    description: form.description,
    duration: form.duration,
    perceived_effort: form.perceived_effort,
    is_completed: form.is_completed,
    completed_at: form.completed_at,
    exercises: form.exercises ?? [],
    cardio_entries: form.cardio_entries ?? [],
    circuit_rounds: form.circuit_rounds ?? [],
  };
};

export function CreateWorkoutButton({}) {
  const { theme } = useColorTheme();
  const { user } = useAuth();
  const { insertWorkout, reportCommittedReloadFailure, pendingCommittedReloads, workouts } = useWorkout();
  const isCurrent = useSessionLifetime();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { control, getValues } = useFormContext<CreateWorkoutForm>();
  const [name, exercises, circuits] = useWatch({ control, name: ["name", "exercises", "circuit_rounds"] });
  const workoutId = useWatch({ control, name: "id" });
  const hasName = !!name?.trim();
  const messages = emptyCircuitMessages(exercises, circuits);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const committed = useRef(false);
  const [isCommitted, setIsCommitted] = useState(false);
  const alreadyCommitted = isCommitted || pendingCommittedReloads?.includes(workoutId) || workouts?.some(workout => workout.id === workoutId);
  const disabled = !hasName || messages.length > 0 || isSubmitting || !!alreadyCommitted;

  const submitWorkout = async () => {
    if (!isCurrent() || submitting.current || committed.current || alreadyCommitted) return;
    if (!user?.id) { traceUi("create-workout", "guard", { reason: "no-user" }); return; }

    const workout = JSON.parse(JSON.stringify(convertFormToWorkout(getValues(), user.id))) as Workout;
    try {
      assertNoEmptyCircuits(workout.exercises, workout.circuit_rounds);
    } catch (error) {
      Alert.alert("Empty circuit", (error as Error).message);
      return;
    }
    // console.log("workout ", JSON.stringify(workout, null, 2));
    // console.log("========== VALIDATING WORKOUT ==========");

    // workout.exercises.forEach((exercise, exerciseIndex) => {
    //   console.log(
    //     `Exercise ${exerciseIndex}: ${exercise.exercise_name}`,
    //     "\n  Exercise ID:",
    //     exercise.id,
    //     "\n  Workout ID:",
    //     exercise.workout_id,
    //   );

    //   exercise.sets.forEach((set, setIndex) => {
    //     const valid = set.workout_exercise_id === exercise.id;

    //     console.log(
    //       `  Set ${setIndex}`,
    //       "\n    Set ID:",
    //       set.id,
    //       "\n    Parent ID:",
    //       set.workout_exercise_id,
    //       "\n    Expected :",
    //       exercise.id,
    //       "\n    Match    :",
    //       valid ? "✅" : "❌",
    //     );

    //     if (!valid) {
    //       console.error("❌ INVALID SET FOUND");
    //       console.log({
    //         exercise,
    //         set,
    //       });
    //     }
    //   });
    // });

    // console.log("========== VALIDATION COMPLETE ==========");

    submitting.current = true;
    setIsSubmitting(true);
    try {
      const result = await runUiAction("create-workout.sqlite", () => workoutService.insertWorkout(workout, user.id));

      if (!isCurrent()) return;
      if (result.success) committed.current = true;

      if (!result.success) {
        traceUi("create-workout", "failed");
        console.error("Error inserting workout: ", result.error);
        return;
      }

      // update context
      setIsCommitted(true);
      if (result.data) insertWorkout(result.data);
      else reportCommittedReloadFailure?.(workout);
      // navigate to home
      runUiAction("create-workout.navigation", () => router.push("/(app)/main/home"), { destination: "/(app)/main/home" });
    } finally {
      submitting.current = false;
      if (isCurrent()) setIsSubmitting(false);
    }
  };

  return (
    <View style={{ marginTop: "auto", marginBottom: insets.bottom + 16, gap: 8 }}>
      {messages.map(message => <Text key={message} accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: theme.color.danger }}>{message}</Text>)}
      <Pressable
        {...uiPressEvents("create-workout")}
        onPress={() => runUiAction("create-workout", submitWorkout)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled, busy: isSubmitting }}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
          {
            height: theme.spacing.buttonHeight,
            backgroundColor: disabled ? theme.color.disabled : theme.color.accent,
            borderColor: theme.color.border,
          },
        ]}
      >
        <Text style={{ color: theme.color.textPrimary }}>Create workout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  searchRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  wrapContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
    columnGap: 8,
    paddingHorizontal: 16,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: "600",
  },
  exerciseSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  footerSubtext: {
    fontSize: 13,
  },
  confirmButton: {
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
