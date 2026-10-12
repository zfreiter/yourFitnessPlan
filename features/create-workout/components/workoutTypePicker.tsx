import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import {
  CreateWorkoutForm,
  WorkoutTypeOptions,
} from "@/types/interfaces/types";
import { FieldErrors, Controller, useFormContext } from "react-hook-form";
import { useColorTheme } from "@/context/colorThemeContext";

interface WorkoutTypePickerProps {
  errors: FieldErrors<CreateWorkoutForm>;
  onTypeChange: (type: WorkoutTypeOptions) => void;
}

export const WorkoutTypePicker = ({
  errors,
  onTypeChange,
}: WorkoutTypePickerProps) => {
  const { control, reset, getValues } = useFormContext<CreateWorkoutForm>();
  const { theme } = useColorTheme();
  const [inputFieldFocused, setInputFieldFocused] = useState("");

  return (
    <View style={{ gap: theme.spacing.label }}>
      <Text style={[styles.fieldLabel, { color: theme.color.textSecondary }]}>
        WORKOUT TYPE
      </Text>
      <View
        style={[
          styles.pickerWrapper,
          {
            borderColor:
              inputFieldFocused === "workoutType"
                ? theme.color.accentActive
                : theme.color.border,
            backgroundColor: theme.color.input,
          },
        ]}
      >
        <Controller
          name="workoutType"
          control={control}
          rules={{
            required: true,
            validate: (value) => value !== "Select workout",
          }}
          render={({ field: { onChange, value } }) => (
            <Picker
              mode="dialog"
              selectionColor={theme.color.textPrimary}
              dropdownIconColor={theme.color.accent}
              style={{
                backgroundColor: theme.color.input,
                color: theme.color.textPrimary,
              }}
              onFocus={() => setInputFieldFocused("workoutType")}
              onBlur={() => setInputFieldFocused("")}
              selectedValue={value}
              onValueChange={(val) => {
                reset({
                  ...getValues(),
                  workoutType: val,
                  exercises: [],
                  cardio_entries: [],
                  circuit_rounds: [],
                });
                onChange(val);
                onTypeChange(val);
              }}
            >
              {(
                [
                  "Select workout",
                  "strength",
                  "cardio",
                  "circuit",
                ] as WorkoutTypeOptions[]
              ).map((item, index) => (
                <Picker.Item
                  key={`workout-type-${index}`}
                  label={
                    item === "Select workout"
                      ? item
                      : item.charAt(0).toUpperCase() + item.slice(1)
                  }
                  value={item}
                  style={{
                    backgroundColor: theme.color.input,
                    color: theme.color.textPrimary,
                  }}
                />
              ))}
            </Picker>
          )}
        />
      </View>
      {errors.workoutType && (
        <Text style={[styles.errorText, { color: theme.color.danger }]}>
          Select a workout type
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 2,
  },
  pickerWrapper: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    height: 40,
    justifyContent: "center",
  },
  pickerContainer: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
});
