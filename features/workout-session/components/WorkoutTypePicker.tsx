import React, { useState } from "react";
import { View, Text, TextStyle, ViewStyle, StyleSheet } from "react-native";
import { Controller, useFormContext } from "react-hook-form";
import { Picker } from "@react-native-picker/picker";
import { ExerciseType } from "../../../types/interfaces/types";
import { useColorTheme } from "@/context/colorThemeContext";
import { useWorkout } from "@/context/workoutContext";
import { workoutService } from "@/services/workoutService";
import { useAuth } from "@/context/authContext";

interface WorkoutTypePickerProps {
  workoutType: ExerciseType;
  workoutId: string;
  items: string[];
  name: string;
  textStyle?: TextStyle;
  viewStyle?: ViewStyle;
}

export function WorkoutTypePicker({
  workoutType,
  workoutId,
  items,
  name,
  textStyle,
  viewStyle,
}: WorkoutTypePickerProps) {
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext();

  const [workoutTypeState, setWorkoutTypeState] = useState(workoutType);
  const [isFocused, setIsFocused] = useState(false);
  const { updateWorkoutType } = useWorkout();
  const { user } = useAuth();
  const { theme } = useColorTheme();

  return (
    <View style={{ gap: theme.spacing.label }}>
      <Text style={[styles.fieldLabel, { color: theme.color.textSecondary }]}>
        WORKOUT TYPE
      </Text>

      <View
        style={[
          styles.pickerWrapper,
          {
            borderColor: isFocused
              ? theme.color.accentActive
              : theme.color.border,
            backgroundColor: theme.color.input,
          },
          viewStyle,
        ]}
      >
        <Controller
          name={name}
          control={control}
          rules={{
            required: true,
            validate: (value) => value !== "Select workout",
          }}
          render={({ field: { onChange, onBlur } }) => (
            <Picker
              mode="dialog"
              key={workoutTypeState}
              style={[styles.picker, { color: theme.color.textPrimary }]}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              selectedValue={workoutTypeState}
              onValueChange={async (value) => {
                setValue("workoutType", value, { shouldDirty: false });

                const response = await workoutService.updateWorkoutType(
                  user?.id!,
                  workoutId,
                  value,
                );
                if (response.success) {
                  updateWorkoutType(workoutId, value);
                }
                onBlur();
              }}
            >
              {items.map((item, index) => (
                <Picker.Item
                  key={`workout-type-${index}`}
                  label={item.charAt(0).toUpperCase() + item.slice(1)}
                  value={item}
                />
              ))}
            </Picker>
          )}
        />
      </View>

      {errors.type && (
        <Text style={[styles.errorText, { color: theme.color.danger }]}>
          Select a workout type
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  pickerWrapper: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    height: 40,
    justifyContent: "center",
  },
  picker: {
    width: "100%",
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
});
