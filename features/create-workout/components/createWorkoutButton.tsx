import { Text, Pressable, StyleSheet } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFormContext } from "react-hook-form";
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
  const { insertWorkout } = useWorkout();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { watch, setValue, getValues } = useFormContext<CreateWorkoutForm>();
  const name = watch("name");
  const hasName = !!name?.trim();

  const submitWorkout = async () => {
    console.log(getValues());
    if (!user?.id) return;

    const workout = convertFormToWorkout(getValues(), user?.id);
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

    const result = await workoutService.insertWorkout(workout);

    if (!result.success) {
      console.error("Error inserting workout: ", result.error);
      return;
    }

    // update context
    insertWorkout(workout);
    // navigate to home
    router.push("/(app)/main/home");
  };

  return (
    <Pressable
      onPress={submitWorkout}
      disabled={!hasName}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        {
          marginTop: "auto",
          marginBottom: insets.bottom + 16,
          height: theme.spacing.buttonHeight,
          backgroundColor: !hasName ? theme.color.disabled : theme.color.accent,
          borderColor: theme.color.border,
        },
      ]}
    >
      <Text style={{ color: theme.color.textPrimary }}>Create workout</Text>
    </Pressable>
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
