import { View, Text, StyleSheet, TextInput } from "react-native";
import React, { useState } from "react";
import {
  Control,
  FieldErrors,
  Controller,
  useFormContext,
} from "react-hook-form";
import { useColorTheme } from "@/context/colorThemeContext";
import { CreateWorkoutForm } from "@/types/interfaces/types";

export function DescriptionInput() {
  const [inputFieldFocused, setInputFieldFocused] = useState("");
  const {
    control,
    formState: { errors },
    setValue,
  } = useFormContext<CreateWorkoutForm>();
  const { theme } = useColorTheme();

  return (
    <View style={{ gap: theme.spacing.label }}>
      <Text style={[styles.fieldLabel, { color: theme.color.textSecondary }]}>
        DESCRIPTION
      </Text>
      <Controller
        name="description"
        control={control}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            placeholder="Add a description..."
            placeholderTextColor={theme.color.placeholderColor}
            value={value || ""}
            onFocus={() => setInputFieldFocused("description")}
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
                  inputFieldFocused === "description"
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
