import { Exercise, ExerciseSet, Workout } from "@/types/type";
import { StyleSheet, Text, View, TextInput, Keyboard } from "react-native";
import { useFormContext, Controller, useFieldArray } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import { useColorTheme } from "@/context/colorThemeContext";
import { useWorkoutSession } from "@/context/WorkoutSessionContext";

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
  const [isSetFocused, setIsSetFocused] = useState<boolean>(false);
  const [isWeightFocused, setIsWeightFocused] = useState<boolean>(false);
  const [isDurationFocused, setIsDurationFocused] = useState<boolean>(false);
  const [isDistanceFocused, setIsDistanceFocused] = useState<boolean>(false);
  const { markDirty } = useWorkoutSession();
  const { watch, control } = useFormContext();
  const { theme } = useColorTheme();
  const exercise = watch(`exercises.${exerciseIndex}`);
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
    <View
      style={[
        styles.SetCardInputOptionsContainer,
        { backgroundColor: theme.color.surface2 },
      ]}
    >
      {options.track_reps === 1 && (
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.SetCardInputLabel,
              { color: theme.color.textPrimary },
            ]}
          >
            Reps
          </Text>

          <Controller
            name={`exercises.${exerciseIndex}.sets.${setIndex}.reps`}
            control={control}
            render={({ field: { onChange, value, onBlur } }) => (
              <TextInput
                style={[
                  styles.SetCardInput,
                  {
                    backgroundColor: theme.color.input,
                    borderColor: isSetFocused
                      ? theme.color.accentActive
                      : theme.color.border,
                    color: theme.color.textPrimary,
                  },
                ]}
                keyboardType="numeric"
                value={value?.toString() || ""}
                onFocus={() => {
                  setIsSetFocused(true);
                  setIsFocusedOldValue(value || 0);
                }}
                onBlur={() => {
                  onBlur();
                  setIsSetFocused(false);
                  if (value === null) {
                    onChange(isFocusedOldValue || 0);
                  }
                }}
                onChangeText={(text) => {
                  onChange(parseInt(text) || 0);
                  markDirty(`exercises.${exerciseIndex}.sets.${setIndex}`);
                }}
              />
            )}
          />
        </View>
      )}

      {options.track_reps === 1 && options.track_weight === 1 && (
        <Text
          style={{
            bottom: -10,
            fontSize: 20,
            color: theme.color.textSecondary,
          }}
        >
          x
        </Text>
      )}

      {options.track_weight === 1 && (
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.SetCardInputLabel,
              { color: theme.color.textPrimary },
            ]}
          >
            wt.
          </Text>
          <Controller
            name={`exercises.${exerciseIndex}.sets.${setIndex}.weight`}
            control={control}
            render={({ field: { onChange, value, onBlur } }) => {
              return (
                <TextInput
                  keyboardType="numeric"
                  style={[
                    styles.SetCardInput,
                    {
                      backgroundColor: theme.color.input,
                      borderColor: isWeightFocused
                        ? theme.color.accentActive
                        : theme.color.border,
                      color: theme.color.textPrimary,
                    },
                  ]}
                  value={value?.toString() || ""}
                  onFocus={() => {
                    setIsWeightFocused(true);
                    setIsFocusedOldValue(value || 0);
                  }}
                  onBlur={() => {
                    setIsWeightFocused(false);
                    onBlur();
                    if (value === null) {
                      onChange(isFocusedOldValue || 0);
                    }
                  }}
                  onChangeText={(text) => {
                    onChange(parseInt(text) || 0);
                    markDirty(`exercises.${exerciseIndex}.sets.${setIndex}`);
                  }}
                />
              );
            }}
          />
        </View>
      )}

      {options.track_time === 1 && (
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.SetCardInputLabel,
              { color: theme.color.textPrimary },
            ]}
          >
            Time
          </Text>
          <Controller
            name={`exercises.${exerciseIndex}.sets.${setIndex}.duration`}
            control={control}
            render={({ field: { onChange, value, onBlur } }) => {
              return (
                <TextInput
                  style={[
                    styles.SetCardInput,
                    {
                      backgroundColor: theme.color.input,
                      borderColor: isDurationFocused
                        ? theme.color.accentActive
                        : theme.color.border,
                      color: theme.color.textPrimary,
                    },
                  ]}
                  keyboardType="numeric"
                  value={value?.toString() || ""}
                  onFocus={() => {
                    setIsDurationFocused(true);
                    setIsFocusedOldValue(value || 0);
                  }}
                  onBlur={() => {
                    setIsDurationFocused(false);
                    onBlur();
                    if (value === null) {
                      onChange(isFocusedOldValue || 0);
                    }
                  }}
                  onChangeText={(text) => {
                    onChange(parseInt(text) || 0);
                    markDirty(`exercises.${exerciseIndex}.sets.${setIndex}`);
                  }}
                />
              );
            }}
          />
        </View>
      )}

      {options.track_distance === 1 && (
        <View style={[styles.inputContainer, {}]}>
          <Text
            style={[
              styles.SetCardInputLabel,
              { color: theme.color.textPrimary },
            ]}
          >
            Dist.
          </Text>
          <Controller
            name={`exercises.${exerciseIndex}.sets.${setIndex}.distance`}
            control={control}
            render={({ field: { onChange, value, onBlur } }) => (
              <TextInput
                style={[
                  styles.SetCardInput,
                  {
                    backgroundColor: theme.color.input,
                    borderColor: isDistanceFocused
                      ? theme.color.accentActive
                      : theme.color.border,
                    color: theme.color.textPrimary,
                  },
                ]}
                keyboardType="numeric"
                value={value?.toString() || ""}
                onFocus={() => {
                  setIsDistanceFocused(true);
                  setIsFocusedOldValue(value || 0);
                }}
                onBlur={() => {
                  setIsDistanceFocused(false);
                  onBlur();
                  if (value === null) {
                    onChange(isFocusedOldValue || 0);
                  }
                }}
                onChangeText={(text) => {
                  onChange(parseInt(text) || 0);
                  markDirty(`exercises.${exerciseIndex}.sets.${setIndex}`);
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
