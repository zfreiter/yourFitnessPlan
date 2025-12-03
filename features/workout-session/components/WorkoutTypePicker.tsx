import React, { useState } from "react";
import { View, Text, TextStyle, ViewStyle } from "react-native";
import { Controller, useFormContext } from "react-hook-form";
import { Picker } from "@react-native-picker/picker";
import { ExerciseType } from "../../../types/interfaces/types";
import { debounce } from "@/utils/debounce";
import { workoutService } from "@/services/workoutService";
import { useDatabase } from "@/context/databaseContext";
import { useWorkout } from "@/context/workoutContext";
import { useColorTheme } from "@/context/colorThemeContext";

interface WorkoutTypePickerProps {
  workoutType: ExerciseType;
  items: string[];
  name: string;
  textStyle?: TextStyle;
  viewStyle?: ViewStyle;
}

export function WorkoutTypePicker({
  workoutType,
  items,
  name,
  textStyle,
  viewStyle,
}: WorkoutTypePickerProps) {
  const {
    control,
    getValues,
    formState: { errors },
  } = useFormContext();
  const { db } = useDatabase();
  const [workoutTypeState, setWorkoutTypeState] = useState(workoutType);
  const [oldWorkoutType, setOldWorkoutType] = useState(workoutType);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const { updateWorkoutType } = useWorkout();
  const { theme } = useColorTheme();

  return (
    <View style={{ gap: 4 }}>
      <Text
        style={[{ fontSize: 16, fontWeight: "bold", color: theme.textPrimary }]}
      >
        Select Workout Type:
      </Text>

      <View
        style={[
          {
            width: "100%",
            borderWidth: 1,
            borderColor: theme.accent,
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
                backgroundColor: theme.surface,
                color: theme.textPrimary,
              }}
              onFocus={() => setIsFocused(true)}
              selectedValue={workoutTypeState}
              onValueChange={(value) => {
                const oldWorkoutType = workoutTypeState;
                const updateWorkoutTypeDebounced = debounce(
                  async (value: ExerciseType) => {
                    try {
                      const response = await workoutService.updateWorkoutType(
                        db!,
                        getValues().id,
                        value
                      );
                      if (response.success) {
                        setWorkoutTypeState(value);
                        onChange(value);
                        setOldWorkoutType(value);
                        updateWorkoutType(getValues().id, value);
                      }
                    } catch (error) {
                      console.error("Error updating workout type:", error);
                    }
                  },
                  1000
                );

                updateWorkoutTypeDebounced(value);
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
