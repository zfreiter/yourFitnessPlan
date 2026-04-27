import React, { useState } from "react";
import { TextInput, Text, View, TextStyle, StyleSheet } from "react-native";
import { Controller, useFormContext } from "react-hook-form";
import { useColorTheme } from "@/context/colorThemeContext";
import { useWorkoutSession } from "@/context/WorkoutSessionContext";

interface GenericTextInputProps {
  name: string;
  placeholder: string;
  title?: string;
  keyboardType?:
    | "default"
    | "number-pad"
    | "decimal-pad"
    | "email-address"
    | "phone-pad"
    | "url";
  textStyle?: TextStyle | TextStyle[];
  inputStyle?: TextStyle | TextStyle[];
  inputRef?: React.RefObject<TextInput | null>;
}

export function GenericTextInput({
  name,
  placeholder,
  title,
  keyboardType,
  textStyle,
  inputStyle,
  inputRef,
}: GenericTextInputProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const { theme } = useColorTheme();
  const { markDirty, trackWorkoutUpdate } = useWorkoutSession();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={{ gap: title ? theme.spacing.label : 0 }}>
      {title && (
        <Text
          style={[
            styles.fieldLabel,
            { color: theme.color.textSecondary },
            textStyle,
          ]}
        >
          {title.toUpperCase()}
        </Text>
      )}
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            placeholder={placeholder}
            placeholderTextColor={theme.color.placeholderColor}
            keyboardType={keyboardType}
            ref={inputRef}
            value={String(value || "")}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              onBlur();
            }}
            onChangeText={(text) => {
              if (
                keyboardType === "number-pad" ||
                keyboardType === "decimal-pad"
              ) {
                onChange(text.replace(/[^0-9]/g, ""));
              } else {
                onChange(text.trim());
                trackWorkoutUpdate({ name: text });
              }
            }}
            style={[
              styles.input,
              {
                backgroundColor: theme.color.input,
                borderColor: isFocused
                  ? theme.color.accentActive
                  : theme.color.border,
                color: theme.color.textPrimary,
              },
              inputStyle,
            ]}
          />
        )}
      />
      {errors[name] && (
        <Text style={[styles.errorText, { color: theme.color.danger }]}>
          {String(errors[name]?.message)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  input: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
});
