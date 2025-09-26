import React, { useState } from "react";
import { View, Text } from "react-native";
import { Controller, useFormContext } from "react-hook-form";
import { Picker } from "@react-native-picker/picker";
import { ExerciseType } from "../../../types/interfaces/types";
import { debounce } from "@/utils/debounce";
import { workoutService } from "@/services/workoutService";
import { useDatabase } from "@/context/databaseContext";
import { useWorkout } from "@/context/workoutContent";
interface WorkoutTypePickerProps {
  workoutType: ExerciseType;
  items: string[];
  name: string;
}

export function WorkoutTypePicker({
  workoutType,
  items,
  name,
}: WorkoutTypePickerProps) {
  const {
    control,
    getValues,
    formState: { errors },
  } = useFormContext();
  const { db } = useDatabase();
  const [workoutTypeState, setWorkoutTypeState] = useState(workoutType);
  const [oldWorkoutType, setOldWorkoutType] = useState(workoutType);
  const { updateWorkoutType } = useWorkout();
  return (
    <View style={{ gap: 5 }}>
      <Text style={{ fontSize: 16, fontWeight: "bold" }}>
        Select Workout Type:
      </Text>

      <View
        style={{
          width: "100%",
          borderWidth: 1,
          borderColor: "black",
          borderRadius: 8,
          overflow: "hidden",
          padding: 0,
          height: 40,
          justifyContent: "center",
        }}
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
              style={{ width: "100%", backgroundColor: "white" }}
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
