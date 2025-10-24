import { useDatabase } from "@/context/databaseContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { View, Pressable, StyleSheet } from "react-native";
import { Exercise, ExerciseDirection } from "@/types/type";
import { useWorkout } from "@/context/workoutContext";
import { workoutService } from "@/services/workoutService";

export default function ExerciseControls({
  exerciseIndex,
  exercise,
}: {
  exerciseIndex: number;
  exercise: Exercise;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { updateWorkoutExerciseOrder } = useWorkout();
  const { watch } = useFormContext();
  const { db } = useDatabase();
  const { move } = useFieldArray({
    name: "exercises",
  });

  const exercises = watch("exercises");
  const size = exercises.length;

  // console.log(
  //   "exercise id, name, order",
  //   exercises[exerciseIndex].id,
  //   exercises[exerciseIndex].exercise_name,
  //   exercises[exerciseIndex].exercise_order
  // );
  const handleMoveUp = async () => {
    setIsUpdating(true);
    try {
      if (exerciseIndex !== 0) {
        // add service to update the exercise order

        const result = await workoutService.updateExerciseOrder(
          db!,
          exercises[exerciseIndex].id,
          exercises[exerciseIndex - 1].id,
          exercises[exerciseIndex].exercise_order,
          exercises[exerciseIndex - 1].exercise_order
        );
        if (result.success) {
          move(exerciseIndex, exerciseIndex - 1);
          updateWorkoutExerciseOrder(
            exercise.workout_id,
            exerciseIndex,
            exerciseIndex - 1,
            ExerciseDirection.UP
          );
        }
      }
    } catch (error) {
      console.error("Error moving exercise:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMoveDown = async () => {
    setIsUpdating(true);
    try {
      if (exerciseIndex !== (size || 0) - 1) {
        // add service to update the exercise order
        const result = await workoutService.updateExerciseOrder(
          db!,
          exercises[exerciseIndex].id,
          exercises[exerciseIndex + 1].id,
          exercises[exerciseIndex].exercise_order,
          exercises[exerciseIndex + 1].exercise_order
        );
        if (result.success) {
          move(exerciseIndex, exerciseIndex + 1);
          updateWorkoutExerciseOrder(
            exercise.workout_id,
            exerciseIndex,
            exerciseIndex + 1,
            ExerciseDirection.DOWN
          );
        }
      }
    } catch (error) {
      console.error("Error moving exercise:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
      }}
    >
      <Pressable
        style={({ pressed }) => [
          styles.iconButton,
          exerciseIndex === 0 || isUpdating
            ? styles.disabledButton
            : styles.moveButton,
          pressed && styles.pressedButton,
        ]}
        disabled={exerciseIndex === 0}
        onPress={handleMoveUp}
      >
        <Ionicons name="chevron-up" size={16} color="white" />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.iconButton,
          exerciseIndex === (size || 0) - 1 || isUpdating
            ? styles.disabledButton
            : styles.moveButton,
          pressed && styles.pressedButton,
        ]}
        disabled={exerciseIndex === (size || 0) - 1}
        onPress={handleMoveDown}
      >
        <Ionicons name="chevron-down" size={16} color="white" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ExerciseCardContainer: {
    padding: 0,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "black",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    minHeight: 60, // Ensure minimum height to prevent layout issues
    width: "100%",
  },
  exerciseCardContent: {
    padding: 10,
    borderRadius: 10,
  },
  SetCardContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    paddingTop: 10,
    alignItems: "flex-start", // Ensure proper alignment
  },
  activeItem: {
    borderColor: "blue",
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "red",
  },
  addButton: {
    backgroundColor: "green",
  },
  moveButton: {
    backgroundColor: "#007AFF",
  },
  disabledButton: {
    backgroundColor: "#8E8E93",
  },
  pressedButton: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});
