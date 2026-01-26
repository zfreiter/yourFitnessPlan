import React from "react";
import { TextInput, Text, View, TextStyle } from "react-native";
import { Controller, useFormContext } from "react-hook-form";
import { useColorTheme } from "@/context/colorThemeContext";
import { useWorkoutSession } from "@/context/WorkoutSessionContext";
import { useState } from "react";

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
  const { markDirty } = useWorkoutSession();
  useWorkoutSession();
  const [isFocused, setIsFocused] = useState<boolean>(false);

  return (
    <View style={{ gap: title ? theme.spacing.label : 0 }}>
      {title && (
        <Text
          style={[
            {
              fontSize: 16,
              fontWeight: "bold",
              color: theme.color.textPrimary,
            },
            textStyle,
          ]}
        >
          {title}
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
              // Only apply numeric filtering for number-pad keyboard type
              if (
                keyboardType === "number-pad" ||
                keyboardType === "decimal-pad"
              ) {
                const numericValue = text.replace(/[^0-9]/g, "");
                onChange(numericValue);
              } else {
                onChange(text);
              }

              // Mark form as needing update and add field to update list
              markDirty(name);
            }}
            style={[
              {
                padding: 10,
                backgroundColor: theme.color.surface,
                borderColor: isFocused
                  ? theme.color.accent
                  : theme.color.border,
                borderWidth: 1,
                borderRadius: 8,
                color: theme.color.textPrimary,
              },
              inputStyle,
            ]}
          />
        )}
      />
      {errors[name] && (
        <Text style={{ color: theme.color.danger, fontSize: 12, marginTop: 4 }}>
          {String(errors[name]?.message)}
        </Text>
      )}
    </View>
  );
}
