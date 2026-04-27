import { View, TextInput, Text } from "react-native";
import {
  FieldValues,
  UseFieldArrayReplace,
  FieldArrayWithId,
} from "react-hook-form";
import { useColorTheme } from "@/context/colorThemeContext";
import { Dispatch, useMemo, useState } from "react";
import { Exercise, ExerciseSet } from "@/types/type";

export default function RepManager({
  fields,
  replace,
  isRepsValid,
  setIsRepsValid,
  reps,
  setReps,
}: {
  fields: FieldArrayWithId<Exercise, "sets", "id">[];
  replace: UseFieldArrayReplace<Exercise, "sets">;
  isRepsValid: boolean;
  setIsRepsValid: Dispatch<React.SetStateAction<boolean>>;
  reps: number | null;
  setReps: Dispatch<React.SetStateAction<number | null>>;
}) {
  const { theme } = useColorTheme();
  const [isFocusedCustomInput, setIsFocusedCustomInput] =
    useState<boolean>(false);

  const handleRepsChange = (text: string) => {
    const numericValue = parseInt(text, 10);
    if (isNaN(numericValue) || numericValue < 1 || numericValue > 30) {
      setIsRepsValid(false);
      setReps(0);
    } else {
      setReps(numericValue);
      setIsRepsValid(true);
      // Call replace immediately — no debounce
      replace(
        fields.map((field) => ({
          ...field,
          reps: numericValue,
        })) as ExerciseSet[],
      );
    }
  };

  return (
    <View style={{}}>
      <Text
        style={{
          marginBottom: theme.spacing.label,
          fontFamily: theme.fonts.body,
          color: theme.color.textPrimary,
        }}
      >
        {`Set reps (1-30)`}
      </Text>

      <TextInput
        keyboardType="numeric"
        placeholder="Reps... (1-30)"
        placeholderTextColor={theme.color.placeholderColor}
        value={reps?.toString() || ""}
        onFocus={() => {
          setIsFocusedCustomInput(true);
          if (reps === 0) setReps(null);
        }}
        onBlur={() => {
          setIsFocusedCustomInput(false);
        }}
        onChangeText={handleRepsChange}
        onSubmitEditing={() => {
          console.log("submit");
        }}
        editable
        style={[
          {
            borderRadius: 8,
            borderWidth: 1,
            height: theme.spacing.inputHeight,
            paddingHorizontal: theme.spacing.lg,
            color: theme.color.textPrimary,
            backgroundColor: theme.color.surface2,
            borderColor: isFocusedCustomInput
              ? theme.color.accentStrong
              : theme.color.border,
          },
        ]}
      />
      {isRepsValid === false && (
        <Text
          style={{
            fontFamily: theme.fonts.body,
            color: theme.color.danger,
            marginTop: theme.spacing.xs,
          }}
        >
          Please enter a number between 1 and 30.
        </Text>
      )}
    </View>
  );
}
