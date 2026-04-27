import { useWorkout } from "@/context/workoutContext";
import { Exercise, Workout } from "@/types/type";
import { useFieldArray, useFormContext } from "react-hook-form";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { ExerciseSet } from "@/types/type";
import { useColorTheme } from "@/context/colorThemeContext";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import * as Crypto from "expo-crypto";
import { workoutService } from "@/services/workoutService";
import { useEffect } from "react";
import { useAuth } from "@/context/authContext";

export default function AddSet({
  setIndex,
  size,
  exerciseIndex,
}: {
  setIndex: number;
  size: number;
  exerciseIndex: number;
}) {
  const {
    watch,
    reset,
    getValues,
    formState: { dirtyFields },
  } = useFormContext();
  const { insertSet, setWorkouts } = useWorkout();
  const { fields, append } = useFieldArray({
    name: `exercises.${exerciseIndex}.sets`,
  });
  const exercise: Exercise = watch(`exercises.${exerciseIndex}`);

  const { theme } = useColorTheme();
  const { user } = useAuth();

  const handleAddSet = async () => {
    //if (db) {
    const setId = Crypto.randomUUID();
    const newSet: ExerciseSet = {
      id: setId,
      workout_exercise_id: exercise.id,
      reps: exercise.track_reps ? 0 : undefined,
      weight: exercise.track_weight ? 0 : undefined,
      duration: exercise.track_time ? 0 : undefined,
      distance: exercise.track_distance ? 0 : undefined,
      set_order: (exercise.sets?.length || 0) + 1,
    };

    const result = await insertSet(user?.id!, newSet, exercise.workout_id);

    if (result.success) {
      append(newSet);
      //reset(getValues());
    }
  };

  return (
    <View style={styles.SetCardInputContainer}>
      <Pressable
        style={({ pressed }) => [
          {
            backgroundColor: pressed ? "#E5E7EB" : "transparent",
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        onPress={handleAddSet}
      >
        <View style={styles.addIconContainer}>
          <FontAwesome6
            name="circle-plus"
            size={32}
            color={theme.color.accent}
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  SetCardInputContainer: {},
  addIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    //marginTop: 5,
  },
});
