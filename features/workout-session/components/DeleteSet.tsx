import { useColorTheme } from "@/context/colorThemeContext";
import { Pressable, View, StyleSheet } from "react-native";
import { useFieldArray, useFormContext } from "react-hook-form";
import { ExerciseSet } from "@/services/setService";
import { useWorkout } from "@/context/workoutContext";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Exercise } from "@/types/type";
import { useAuth } from "@/context/authContext";

export function DeleteSet({ exerciseIndex }: { exerciseIndex: number }) {
  const { theme } = useColorTheme();
  const { user } = useAuth();
  const { deleteSet } = useWorkout();
  const {
    watch,
    reset,
    getValues,
    formState: { dirtyFields },
  } = useFormContext();
  const { fields, remove } = useFieldArray({
    name: `exercises.${exerciseIndex}.sets`,
  });

  const exercise: Exercise = watch(`exercises.${exerciseIndex}`);
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
          const lastSet: ExerciseSet = sets[size - 1];
          const setId = lastSet.id;
          const setWorkoutId = exercise.workout_id;
          const setExerciseId = lastSet.workout_exercise_id;

          const result = await deleteSet(
            user?.id!,
            setId,
            setExerciseId,
            setWorkoutId,
          );
          if (result.success) {
            remove(size - 1);
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
