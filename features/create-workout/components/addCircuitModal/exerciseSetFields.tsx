import { CreateCircuitForm } from "@/types/interfaces/types";
import {
  Control,
  FieldArrayWithId,
  UseFieldArrayRemove,
  Controller,
} from "react-hook-form";
import { View, ScrollView, Text, TextInput, StyleSheet } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import React, { useState } from "react";
import { ThemeContext } from "@react-navigation/native";

interface ExerciseSetFieldsProps {
  exerciseFields: FieldArrayWithId<CreateCircuitForm, "exercises", "id">[];
  control: Control<CreateCircuitForm>;
  remove: UseFieldArrayRemove;
}

export function ExerciseSetFields({
  exerciseFields,
  control,
  remove,
}: ExerciseSetFieldsProps) {
  const { theme } = useColorTheme();

  return (
    <View style={{ gap: 8 }}>
      {exerciseFields.map((exercise, index) => (
        <SetCircuitInputs
          key={exercise.id}
          exercise={exercise}
          exerciseIndex={index}
          control={control}
        />
      ))}
    </View>
  );
}

const FIELD_LABELS = {
  reps: "Reps",
  weight: "Weight",
  time: "Time",
  distance: "Distance",
} as const;

type Unit = keyof typeof FIELD_LABELS;

interface SetCircuitInputsProps {
  exercise: FieldArrayWithId<CreateCircuitForm, "exercises", "id">;
  exerciseIndex: number;
  control: Control<CreateCircuitForm>;
}

export function SetCircuitInputs({
  exercise,
  exerciseIndex,
  control,
}: SetCircuitInputsProps) {
  const { theme } = useColorTheme();
  const units = exercise.validUnits ?? [];
  const [inputFieldFocused, setInputFieldFocused] = useState("");

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.color.surface,
          borderColor: theme.color.border,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 8,
        },
      ]}
    >
      <Text
        style={[styles.exerciseName, { color: theme.color.textSecondary }]}
        numberOfLines={2}
      >
        {exercise.exercise_name}
      </Text>

      <View style={styles.inputsContainer}>
        {units.map((unit) => (
          <Controller
            key={unit}
            control={control}
            name={`exercises.${exerciseIndex}.sets.0.${unit}`}
            render={({ field: { value, onBlur, onChange } }) => (
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { color: theme.color.textSecondary },
                  ]}
                >
                  {FIELD_LABELS[unit]}
                </Text>

                <TextInput
                  value={value?.toString() ?? ""}
                  onFocus={() => setInputFieldFocused(unit)}
                  onBlur={() => {
                    setInputFieldFocused("");
                    onBlur();
                  }}
                  onChangeText={(text) =>
                    onChange(text === "" ? undefined : Number(text))
                  }
                  keyboardType="numeric"
                  style={[
                    styles.textInput,
                    {
                      height: theme.spacing.inputHeight,
                      color: theme.color.textPrimary,
                      backgroundColor: theme.color.input,
                      borderColor:
                        inputFieldFocused === unit
                          ? theme.color.accentActive
                          : theme.color.border,
                    },
                  ]}
                />
              </View>
            )}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },

  exerciseName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    paddingRight: 16,
  },

  inputsContainer: {
    flexDirection: "row",
    gap: 12,
  },

  inputGroup: {
    width: 70,
    gap: 4,
  },

  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textAlign: "center",
  },

  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 16,
  },
});
