import { Text, Pressable, StyleSheet } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import { useWorkoutExercisesFieldArray } from "@/hooks/useCreateWorkoutExercisesFieldArray";
import { CreateCircuitForm, CreateWorkoutForm } from "@/types/interfaces/types";
import {
  Control,
  useFieldArray,
  UseFieldArrayAppend,
  useFormContext,
  UseFormGetValues,
  UseFormReset,
} from "react-hook-form";
import * as Crypto from "expo-crypto";
import { useEffect } from "react";

// need to be able to have full access to the inner circuit form and the outer reset for the main form
interface AddCircuitButtonProps {
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  reset: UseFormReset<CreateCircuitForm>;
  getValues: UseFormGetValues<CreateCircuitForm>;
  workoutId: string;
  appendExercise: UseFieldArrayAppend<CreateWorkoutForm, "exercises">;
}

export function AddCircuitButton({
  setModalVisible,
  reset,
  getValues,
  workoutId,
  appendExercise,
}: AddCircuitButtonProps) {
  const { theme } = useColorTheme();

  // Main workout
  const { control } = useFormContext<CreateWorkoutForm>();

  const circuitMethods = useFieldArray({
    control,
    name: "circuit_rounds",
  });

  const onSubmit = () => {
    setModalVisible(false);
    const circuitExercises = getValues("exercises");
    // // add the circuit - id, workout_Id, round_number, rest_after_round, notes
    const circuitId = Crypto.randomUUID();
    circuitMethods.append({
      id: circuitId,
      workout_id: workoutId,
      round_number: getValues("rounds"),
      rest_after_round: getValues("restAfterRound"),
    });

    // // add each workout_exercise set round_number(most likely going to remove this), circuit_id
    circuitExercises.forEach((exercise, index) => {
      const exerciseId = Crypto.randomUUID();

      appendExercise({
        ...exercise,
        id: exerciseId,
        workout_id: workoutId,
        exercise_order: index + 1,
        round_number: getValues("rounds"),
        group_id: circuitId,
        group_type: "circuit",
        sets: exercise.sets.map((set) => ({
          ...set,
          id: Crypto.randomUUID(),
          workout_exercise_id: exerciseId,
        })),
      });
    });
  };

  return (
    <Pressable
      onPress={onSubmit}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        {
          marginTop: "auto",
          marginBottom: theme.spacing.headerBottomMargin,
          height: theme.spacing.buttonHeight,
          backgroundColor: theme.color.accent,
          borderColor: theme.color.border,
        },
      ]}
    >
      <Text style={{ color: theme.color.textPrimary }}>Add circuit</Text>
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
});
