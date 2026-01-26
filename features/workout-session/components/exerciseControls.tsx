import { useDatabase } from "@/context/databaseContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { View, Pressable, StyleSheet } from "react-native";
import { Exercise, ExerciseDirection } from "@/types/type";
import { useWorkout } from "@/context/workoutContext";
import { workoutService } from "@/services/workoutService";
import { useColorTheme } from "@/context/colorThemeContext";
import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

export default function ExerciseControls({
  exerciseIndex,
  exercise,
}: {
  exerciseIndex: number;
  exercise: Exercise;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { updateWorkoutExerciseOrder } = useWorkout();
  const { watch, setValue, resetField } = useFormContext();
  const { theme } = useColorTheme();
  const { db } = useDatabase();
  const { move } = useFieldArray({
    name: "exercises",
  });

  const exercises = watch("exercises");
  const size = exercises.length;

  const handleMoveUp = async () => {
    setIsUpdating(true);
    try {
      if (exerciseIndex !== 0) {
        // update the exercise order in the database
        const result = await workoutService.updateExerciseOrder(
          db!,
          exercises[exerciseIndex].id,
          exercises[exerciseIndex - 1].id,
          exercises[exerciseIndex].exercise_order,
          exercises[exerciseIndex - 1].exercise_order
        );
        if (result.success) {
          // update the form state
          move(exerciseIndex, exerciseIndex - 1);

          // update the context state
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
        style={({ pressed }) => []}
        disabled={exerciseIndex === 0}
        onPress={handleMoveUp}
      >
        <FontAwesome6
          name="circle-chevron-up"
          size={32}
          color={theme.color.accent}
        />
      </Pressable>

      <Pressable
        style={({ pressed }) => []}
        disabled={exerciseIndex === (size || 0) - 1}
        onPress={handleMoveDown}
      >
        <FontAwesome6
          name="circle-chevron-down"
          size={32}
          color={theme.color.accent}
        />
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
    // padding: 10,
    borderRadius: 10,
  },
  SetCardContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    //paddingTop: 10,
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
