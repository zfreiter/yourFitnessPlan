import { Exercise, ExerciseSet, Workout } from "@/types/type";
import { debounce } from "@/utils/debounce";
import { StyleSheet, Text, View, TextInput, Keyboard } from "react-native";
import { useFormContext, Controller, useFieldArray } from "react-hook-form";
import { useDatabase } from "@/context/databaseContext";
import { useWorkout } from "@/context/workoutContent";
import { setService } from "@/services/setService";
import { useEffect, useRef, useState } from "react";

interface SetInputsProps {
  set: ExerciseSet;
  exerciseIndex: number;
  setIndex: number;
  options: {
    track_reps: number;
    track_weight: number;
    track_time: number;
    track_distance: number;
  };
}

export default function SetInputs({
  set,
  exerciseIndex,
  setIndex,
  options,
}: SetInputsProps) {
  const { watch, control } = useFormContext();
  const exercise = watch(`exercises.${exerciseIndex}`);
  const { updateWorkoutExerciseSet } = useWorkout();
  const { db } = useDatabase();

  // Use refs to maintain stable debounced functions
  const debouncedFunctionsRef = useRef<{
    reps: ReturnType<typeof debounce>;
    weight: ReturnType<typeof debounce>;
    duration: ReturnType<typeof debounce>;
    distance: ReturnType<typeof debounce>;
  } | null>(null);

  // Create debounced functions only once
  if (!debouncedFunctionsRef.current) {
    const createDebouncedFn = (field: keyof ExerciseSet) =>
      debounce(async (text: string) => {
        if (db) {
          const updateData = {
            ...set,
            [field]: parseInt(text) || 0,
          };

          const response = await setService.updateSet(db, updateData);
          if (response.success) {
            updateWorkoutExerciseSet(
              exercise.workout_id,
              exercise.id,
              set.id,
              field,
              text
            );
          } else {
            console.error("Failed to update set:", response.error);
          }
        }
      }, 1000);

    debouncedFunctionsRef.current = {
      reps: createDebouncedFn("reps"),
      weight: createDebouncedFn("weight"),
      duration: createDebouncedFn("duration"),
      distance: createDebouncedFn("distance"),
    };
  }

  const {
    reps: debouncedRepsChange,
    weight: debouncedWeightChange,
    duration: debouncedDurationChange,
    distance: debouncedDistanceChange,
  } = debouncedFunctionsRef.current;

  const [isFocusedOldValue, setIsFocusedOldValue] = useState<number | null>(
    null
  );
  // In your keyboard listener:
  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        // This will blur whatever input is currently focused
        const currentlyFocused = TextInput.State.currentlyFocusedInput();
        if (currentlyFocused) {
          TextInput.State.blurTextInput(currentlyFocused);
        }
      }
    );

    return () => {
      keyboardDidHideListener?.remove();
    };
  }, []);
  return (
    <View style={[styles.SetCardInputOptionsContainer]}>
      {options.track_reps === 1 && (
        <View style={styles.inputContainer}>
          <Text style={styles.SetCardInputLabel}>Reps</Text>
          <Controller
            name={`exercises.${exerciseIndex}.sets.${setIndex}.reps`}
            control={control}
            render={({ field: { onChange, value, onBlur } }) => (
              <TextInput
                style={styles.SetCardInput}
                keyboardType="numeric"
                value={value?.toString() || ""}
                onFocus={() => {
                  setIsFocusedOldValue(value || 0);
                  onChange(null);
                }}
                onBlur={() => {
                  onBlur();
                  if (value === null) {
                    onChange(isFocusedOldValue || 0);
                  }
                }}
                onChangeText={(text) => {
                  onChange(parseInt(text) || 0); // Update form immediately for UI responsiveness
                  debouncedRepsChange(text); // Debounce the database update
                }}
              />
            )}
          />
        </View>
      )}

      {options.track_reps === 1 && options.track_weight === 1 && (
        <Text style={{ bottom: -10, fontSize: 20 }}>x</Text>
      )}

      {options.track_weight === 1 && (
        <View style={styles.inputContainer}>
          <Text style={styles.SetCardInputLabel}>wt.</Text>
          <Controller
            name={`exercises.${exerciseIndex}.sets.${setIndex}.weight`}
            control={control}
            render={({ field: { onChange, value, onBlur } }) => {
              return (
                <TextInput
                  keyboardType="numeric"
                  style={styles.SetCardInput}
                  value={value?.toString() || ""}
                  onFocus={() => {
                    setIsFocusedOldValue(value || 0);
                    onChange(null);
                  }}
                  onBlur={() => {
                    onBlur();
                    if (value === null) {
                      onChange(isFocusedOldValue || 0);
                    }
                  }}
                  onChangeText={(text) => {
                    onChange(parseInt(text) || 0); // Update form immediately for UI responsiveness
                    debouncedWeightChange(text); // Debounce the database update
                  }}
                />
              );
            }}
          />
        </View>
      )}

      {options.track_time === 1 && (
        <View style={styles.inputContainer}>
          <Text style={styles.SetCardInputLabel}>Time</Text>
          <Controller
            name={`exercises.${exerciseIndex}.sets.${setIndex}.duration`}
            control={control}
            render={({ field: { onChange, value, onBlur } }) => {
              return (
                <TextInput
                  style={styles.SetCardInput}
                  keyboardType="numeric"
                  value={value?.toString() || ""}
                  onFocus={() => {
                    setIsFocusedOldValue(value || 0);
                    onChange(null);
                  }}
                  onBlur={() => {
                    onBlur();
                    if (value === null) {
                      onChange(isFocusedOldValue || 0);
                    }
                  }}
                  onChangeText={(text) => {
                    onChange(parseInt(text) || 0); // Update form immediately for UI responsiveness
                    debouncedDurationChange(text); // Debounce the database update
                  }}
                />
              );
            }}
          />
        </View>
      )}

      {options.track_distance === 1 && (
        <View style={styles.inputContainer}>
          <Text style={styles.SetCardInputLabel}>Dist.</Text>
          <Controller
            name={`exercises.${exerciseIndex}.sets.${setIndex}.distance`}
            control={control}
            render={({ field: { onChange, value, onBlur } }) => (
              <TextInput
                style={styles.SetCardInput}
                keyboardType="numeric"
                value={value?.toString() || ""}
                onFocus={() => {
                  setIsFocusedOldValue(value || 0);
                  onChange(null);
                }}
                onBlur={() => {
                  onBlur();
                  if (value === null) {
                    onChange(isFocusedOldValue || 0);
                  }
                }}
                onChangeText={(text) => {
                  onChange(parseInt(text) || 0); // Update form immediately for UI responsiveness
                  debouncedDistanceChange(text); // Debounce the database update
                }}
              />
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  SetCardInputOptionsContainer: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 3,
    paddingTop: 0,
    alignItems: "center", // Ensure proper alignment
  },
  SetCardInput: {
    width: 45,
    textAlign: "right",
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 5,
    padding: 5,
    backgroundColor: "white",
  },
  SetCardInputLabel: {
    width: 45,
    textAlign: "left",
  },
  inputContainer: {
    flexDirection: "column",
    paddingTop: 0,
  },
});
