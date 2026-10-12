import { useColorTheme } from "@/context/colorThemeContext";
import { CreateCircuitForm } from "@/types/interfaces/types";
import { useState } from "react";
import { Control, Controller } from "react-hook-form";
import { Text, StyleSheet, View, TextInput } from "react-native";

interface NotesProps {
  control: Control<CreateCircuitForm>;
}

export function Notes({ control }: NotesProps) {
  const [inputFieldFocused, setInputFieldFocused] = useState("");

  const { theme } = useColorTheme();

  return (
    <View style={{ gap: theme.spacing.label }}>
      <Text style={[styles.fieldLabel, { color: theme.color.textSecondary }]}>
        DESCRIPTION
      </Text>
      <Controller
        name="notes"
        control={control}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            placeholder="Add notes..."
            placeholderTextColor={theme.color.placeholderColor}
            value={value || ""}
            onFocus={() => setInputFieldFocused("notes")}
            onBlur={() => {
              setInputFieldFocused("");
              onBlur();
            }}
            onChangeText={onChange}
            multiline
            style={[
              styles.areaTextInput,
              {
                padding: theme.spacing.lg,
                backgroundColor: theme.color.input,
                color: theme.color.textPrimary,
                borderColor:
                  inputFieldFocused === "notes"
                    ? theme.color.accentActive
                    : theme.color.border,
              },
            ]}
          />
        )}
      />
    </View>
  );
}
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
  scrollViewContainer: {},
  textInput: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  areaTextInput: {
    borderWidth: 1,
    minHeight: 80,
    fontSize: 16,
    textAlignVertical: "top",
    borderRadius: 8,
  },
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  dateButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateButtonRight: {
    flexDirection: "row",
    gap: 8,
  },
  dateValue: {
    fontSize: 14,
  },
});
