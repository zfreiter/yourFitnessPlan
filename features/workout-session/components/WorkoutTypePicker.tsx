import React, { useState } from "react";
import { View, Text, TextStyle, ViewStyle } from "react-native";
import { Controller, useFormContext } from "react-hook-form";
import { Picker } from "@react-native-picker/picker";
import { ExerciseType } from "../../../types/interfaces/types";
import { useColorTheme } from "@/context/colorThemeContext";
import { useDatabase } from "@/context/databaseContext";
import { useWorkout } from "@/context/workoutContext";
import { workoutService } from "@/services/workoutService";

interface WorkoutTypePickerProps {
  workoutType: ExerciseType;
  workoutId: number;
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
    getValues,
    resetField,
    formState: { errors },
  } = useFormContext();

  const [workoutTypeState, setWorkoutTypeState] = useState(workoutType);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const { db } = useDatabase();
  //workoutId: number, workoutType: ExerciseType
  const { updateWorkoutType } = useWorkout();
  const { theme } = useColorTheme();

  return (
    <View style={{ gap: 4 }}>
      <Text
        style={[
          { fontSize: 16, fontWeight: "bold", color: theme.color.textPrimary },
        ]}
      >
        Select Workout Type:
      </Text>

      <View
        style={[
          {
            width: "100%",
            borderWidth: 1,
            borderColor: isFocused ? theme.color.accent : theme.color.border,
            borderRadius: 8,
            overflow: "hidden",
            padding: 0,
            height: 40,
            justifyContent: "center",
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
              style={{
                width: "100%",
                backgroundColor: theme.color.surface,
                color: theme.color.textPrimary,
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                setIsFocused(false);
              }}
              selectedValue={workoutTypeState}
              onValueChange={async (value) => {
                // Update form state and keep the form dirty state false
                setValue("workoutType", value, { shouldDirty: false });
                // update local database state
                if (!db) return;
                const response = await workoutService.updateWorkoutType(
                  db,
                  workoutId,
                  value
                );
                // update context state
                if (response.success) {
                  updateWorkoutType(workoutId, value);
                }
                // update form to be clean
                onBlur();
              }}
            >
              {items.map((item, index) => (
                <Picker.Item
                  key={`workout-type-${index}`}
                  label={item}
                  value={item}
                  style={{ width: "100%" }}
                />
              ))}
            </Picker>
          )}
        />
      </View>
      {errors.type && (
        <Text style={{ fontSize: 16, fontWeight: "semibold", color: "red" }}>
          Select workout
        </Text>
      )}
    </View>
  );
}
