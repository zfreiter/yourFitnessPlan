import { ScrollView, Text, View } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import { Control, FieldArrayWithId } from "react-hook-form";
import { AddExerciseForm, ValidUnit } from "@/types/interfaces/types";
import { ManualSetField } from "./manualSetField";
import { AutoFillSetField } from "./autoFillSetField";

interface SetBuilderProps {
  entryMethodSelector: "quick_add" | "manual" | "auto_fill";
  selectedLoggingStyle: "compound_set" | "regular" | "superset";
  control: Control<AddExerciseForm>;
  exerciseFields: FieldArrayWithId<AddExerciseForm, "exercises", "id">[];
}

export function SetBuilder({
  entryMethodSelector,
  selectedLoggingStyle,
  control,
  exerciseFields,
}: SetBuilderProps) {
  const { theme } = useColorTheme();

  if (entryMethodSelector === "quick_add") {
    return (
      <View
        style={{
          flex: 1,
          padding: theme.spacing.screenPadding,
          paddingBottom: 0,
          marginBottom: theme.spacing.screenPadding,
          backgroundColor: theme.color.surface,
          borderColor:
            selectedLoggingStyle === "regular"
              ? theme.color.border
              : selectedLoggingStyle === "superset"
                ? "#4A90D9"
                : "#E8923A",
          borderWidth: 1,
          borderRadius: 8,
        }}
      >
        {exerciseFields.map((field) => (
          <Text key={field.id} style={{ color: theme.color.textPrimary }}>
            {field.exercise_name}
          </Text>
        ))}
        <Text style={{ color: theme.color.textSecondary }}>
          No sets configured yet
        </Text>
      </View>
    );
  } else {
    return (
      <ScrollView
        style={{
          padding: theme.spacing.screenPadding,
          paddingBottom: 0,
          marginBottom: theme.spacing.screenPadding,
          backgroundColor: theme.color.surface,
          borderColor:
            selectedLoggingStyle === "regular"
              ? theme.color.border
              : selectedLoggingStyle === "superset"
                ? "#4A90D9"
                : "#E8923A",
          borderWidth: 1,
          borderRadius: 8,
        }}
      >
        {entryMethodSelector === "manual" ? (
          <ManualSetField
            exerciseFields={exerciseFields}
            control={control}
            entryMethodSelector={entryMethodSelector}
          />
        ) : (
          <AutoFillSetField
            exerciseFields={exerciseFields}
            entryMethodSelector={entryMethodSelector}
          />
        )}
      </ScrollView>
    );
  }
}
