import { Exercise, ExerciseSet, Workout } from "@/types/type";
import { StyleSheet, Text, View, TextInput, Keyboard } from "react-native";
import { useFormContext, Controller, useFieldArray } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import { useColorTheme } from "@/context/colorThemeContext";
import { useWorkoutSession } from "@/context/WorkoutSessionContext";
import { useUnits } from "@/hooks/useUnits";
import { useWeightRounding } from "@/hooks/useWeightRounding";

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
  const { markDirty, trackSetUpdate } = useWorkoutSession();
  const { watch, control } = useFormContext();
  const { theme } = useColorTheme();
  const [isFocusedOldValue, setIsFocusedOldValue] = useState<number | null>(
    null,
  );
  const {
    convertToUSWeight,
    convertToMetricWeight,
    convertToUSDistance,
    convertToMetricDistance,
  } = useUnits();
  const { applyWeightRounding } = useWeightRounding();

  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        const currentlyFocused = TextInput.State.currentlyFocusedInput();
        if (currentlyFocused) {
          TextInput.State.blurTextInput(currentlyFocused);
        }
      },
    );
    return () => {
      keyboardDidHideListener?.remove();
    };
  }, []);

  const handleFieldChange = (field: keyof ExerciseSet, text: string) => {
    const parsed = parseInt(text) || 0;
    const currentSet = watch(`exercises.${exerciseIndex}.sets.${setIndex}`);
    // merge new value in manually since watch hasnt updated yet
    trackSetUpdate({ ...currentSet, [field]: parsed });
    markDirty(`exercises.${exerciseIndex}.sets.${setIndex}`);
  };

  const handleSetBlur = () => {
    const currentSet = watch(`exercises.${exerciseIndex}.sets.${setIndex}`);
    trackSetUpdate(currentSet);
  };

  return (
    <View style={styles.SetCardInputOptionsContainer}>
      {options.track_reps === 1 && (
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.SetCardInputLabel,
              { color: theme.color.textSecondary },
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
                  if (value === 0) onChange("");
                }}
                onBlur={() => {
                  onBlur();
                  setIsSetFocused(false);
                  if (value === "") onChange(isFocusedOldValue || 0);
                }}
                onChangeText={(text) => {
                  onChange(parseInt(text) || 0);
                  handleFieldChange("reps", text);
                }}
              />
            )}
          />
        </View>
      )}

      {options.track_reps === 1 && options.track_weight === 1 && (
        <Text style={[styles.separator, { color: theme.color.textSecondary }]}>
          ×
        </Text>
      )}

      {options.track_weight === 1 && (
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.SetCardInputLabel,
              { color: theme.color.textSecondary },
            ]}
          >
            Wt.
          </Text>
          <Controller
            name={`exercises.${exerciseIndex}.sets.${setIndex}.weight`}
            control={control}
            render={({ field: { onChange, value, onBlur } }) => (
              <TextInput
                keyboardType="numeric"
                style={[
                  styles.SetCardInput,
                  {
                    width: 120,
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
                  if (value === 0) {
                    console.log(
                      "weight field focused with 0 value, changing to empty string for better UX",
                    );
                    onChange("");
                  }
                }}
                onBlur={() => {
                  setIsWeightFocused(false);
                  onBlur();
                  if (value === "") onChange(isFocusedOldValue || 0);
                }}
                onChangeText={(text) => {
                  const value = parseFloat(text) || 0;
                  // apply user rounding preference to the converted metric value for consistency in calculations and storage
                  onChange(value);

                  // handleFieldChange needs to receive the metric value for consistency with other fields and calculations, even if the displayed value is rounded and in US units
                  handleFieldChange("weight", value.toString());
                }}
              />
            )}
          />
        </View>
      )}

      {options.track_time === 1 && (
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.SetCardInputLabel,
              { color: theme.color.textSecondary },
            ]}
          >
            Time
          </Text>
          <Controller
            name={`exercises.${exerciseIndex}.sets.${setIndex}.duration`}
            control={control}
            render={({ field: { onChange, value, onBlur } }) => (
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
                  if (value === 0) onChange("");
                }}
                onBlur={() => {
                  setIsDurationFocused(false);
                  onBlur();
                  if (value === "") onChange(isFocusedOldValue || 0);
                }}
                onChangeText={(text) => {
                  const value = parseInt(text) || 0;
                  onChange(value);
                  handleFieldChange("duration", value.toString());
                }}
              />
            )}
          />
        </View>
      )}

      {options.track_distance === 1 && (
        <View style={styles.inputContainer}>
          <Text
            style={[
              styles.SetCardInputLabel,
              { color: theme.color.textSecondary },
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
                value={convertToUSDistance(value)?.toString() || ""}
                onFocus={() => {
                  setIsDistanceFocused(true);
                  setIsFocusedOldValue(value || 0);
                  if (value === 0) onChange("");
                }}
                onBlur={() => {
                  setIsDistanceFocused(false);
                  onBlur();
                  if (value === "") onChange(isFocusedOldValue || 0);
                }}
                onChangeText={(text) => {
                  // convert to metric for storage and calculations, convert back to us for display if needed
                  const value = parseInt(text) || 0;
                  onChange(value);
                  handleFieldChange("duration", value.toString());
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
    alignItems: "center",
    gap: 8,
  },
  inputContainer: {
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  SetCardInput: {
    width: 60,
    textAlign: "center",
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  SetCardInputLabel: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  separator: {
    fontSize: 16,
    fontWeight: "300",
    marginTop: 14, // nudge down to align with inputs, not labels
  },
});
