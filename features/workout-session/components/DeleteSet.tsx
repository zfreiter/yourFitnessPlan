import { useColorTheme } from "@/context/colorThemeContext";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { useDatabase } from "@/context/databaseContext";
import { useFieldArray, useFormContext } from "react-hook-form";
import { setService } from "@/services/setService";
import { useWorkout } from "@/context/workoutContext";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

export function DeleteSet({ exerciseIndex }: { exerciseIndex: number }) {
  const { db } = useDatabase();
  const { theme } = useColorTheme();
  const { setWorkouts } = useWorkout();
  const { watch } = useFormContext();
  const { remove } = useFieldArray({
    name: `exercises.${exerciseIndex}.sets`,
  });

  const exercise = watch(`exercises.${exerciseIndex}`);
  const sets = watch(`exercises.${exerciseIndex}.sets`);
  const size = sets?.length || 0;

  return (
    <Pressable
      style={({ pressed }) => [
        {
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={async () => {
        if (size > 0) {
          const lastSet = sets[size - 1];
          const setId = lastSet.id;
          const setWorkoutId = lastSet.workout_id;
          const setExerciseId = lastSet.workout_exercise_id;

          try {
            const response = await setService.deleteSet(db!, lastSet.id);

            if (response.success) {
              setWorkouts((prevWorkouts) =>
                prevWorkouts.map((workout) =>
                  workout.id === exercise.workout_id
                    ? {
                        ...workout,
                        exercises: workout.exercises.map((exercise) =>
                          exercise.id === lastSet.workout_exercise_id
                            ? {
                                ...exercise,
                                sets: exercise.sets.filter(
                                  (set) => set.id !== setId
                                ),
                              }
                            : exercise
                        ),
                      }
                    : workout
                )
              );
              remove(size - 1);
            }
          } catch (error) {
            console.error("Error deleting set:", error);
          }
        }
      }}
    >
      <View style={[styles.addIconContainer]}>
        <FontAwesome6
          name="circle-minus"
          size={32}
          color={theme.color.accent}
        />
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  addIconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
