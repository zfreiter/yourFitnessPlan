import { Text, Pressable, StyleSheet } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import { CreateCircuitForm, CreateWorkoutForm } from "@/types/interfaces/types";
import {
  Control,
  UseFieldArrayAppend,
  useFormContext,
  UseFormGetValues,
  UseFormReset,
  useWatch,
} from "react-hook-form";
import * as Crypto from "expo-crypto";
import { useEffect, useRef, useState } from "react";

interface AddCircuitButtonProps {
  control: Control<CreateCircuitForm>;
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  reset: UseFormReset<CreateCircuitForm>;
  modalVisible?: boolean;
  getValues: UseFormGetValues<CreateCircuitForm>;
  workoutId: string;
  appendExercise: UseFieldArrayAppend<CreateWorkoutForm, "exercises">;
  circuitId?: string;
}

export function AddCircuitButton({
  control,
  setModalVisible,
  reset,
  modalVisible = true,
  getValues,
  workoutId,
  appendExercise,
  circuitId: existingCircuitId,
}: AddCircuitButtonProps) {
  const { theme } = useColorTheme();
  const exercises = useWatch({ control, name: "exercises" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitted = useRef(false);
  useEffect(() => {
    submitted.current = !modalVisible;
    setIsSubmitting(false);
  }, [modalVisible]);
  const disabled = !modalVisible || !exercises?.length || isSubmitting;

  // Main workout
  const { setValue, getValues: getWorkoutValues } = useFormContext<CreateWorkoutForm>();

  const onSubmit = () => {
    const circuitExercises = getValues("exercises");
    if (!modalVisible || submitted.current || circuitExercises.length === 0) return;
    submitted.current = true;
    setIsSubmitting(true);
    const exerciseOrderStart = (getWorkoutValues("exercises") ?? []).length;
    // // add the circuit - id, workout_Id, round_number, rest_after_round, notes
    const circuitId = existingCircuitId ?? Crypto.randomUUID();
    // This metadata has no field-array rows to render. Notify subscribers now:
    // a field-array append emits from an effect that can be lost when the
    // native modal unmounts its children on the same submit.
    const round = {
      id: circuitId,
      workout_id: workoutId,
      round_number: getValues("rounds"),
      rest_after_round: getValues("restAfterRound"),
      notes: getValues("notes"),
    };
    const rounds = getWorkoutValues("circuit_rounds") ?? [];
    setValue("circuit_rounds", existingCircuitId
      ? rounds.map(value => value.id === circuitId ? round : value)
      : [...rounds, round], { shouldDirty: true });

    // // add each workout_exercise set round_number(most likely going to remove this), circuit_id
    circuitExercises.forEach((exercise, index) => {
      const exerciseId = Crypto.randomUUID();

      appendExercise({
        ...exercise,
        id: exerciseId,
        workout_id: workoutId,
        exercise_order: exerciseOrderStart + index,
        round_number: getValues("rounds"),
        group_id: circuitId,
        circuit_id: circuitId,
        group_type: "circuit",
        sets: exercise.sets.map((set) => ({
          ...set,
          id: Crypto.randomUUID(),
          workout_exercise_id: exerciseId,
        })),
      });
    });
    reset();
    setModalVisible(false);
  };

  return (
    <Pressable
      onPress={onSubmit}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: isSubmitting }}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        {
          marginTop: "auto",
          marginBottom: theme.spacing.headerBottomMargin,
          height: theme.spacing.buttonHeight,
          backgroundColor: disabled ? theme.color.disabled : theme.color.accent,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
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
