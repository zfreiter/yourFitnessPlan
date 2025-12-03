import React from "react";
import { TextInput, Text, View, TextStyle } from "react-native";
import { Controller, useFormContext } from "react-hook-form";
import { useColorTheme } from "@/context/colorThemeContext";
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
  const [isFocused, setIsFocused] = useState<boolean>(false);

  return (
    <View style={{ gap: title ? 4 : 0 }}>
      {title && (
        <Text
          style={[
            { fontSize: 16, fontWeight: "bold", color: theme.textPrimary },
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
            placeholderTextColor={theme.placeholderColor}
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
            }}
            style={[
              {
                padding: 10,
                backgroundColor: theme.surface,
                borderColor: isFocused ? theme.accent : theme.border,
                borderWidth: 1,
                borderRadius: 8,
                color: theme.textPrimary,
              },
              inputStyle,
            ]}
          />
        )}
      />
      {errors[name] && (
        <Text style={{ color: "red", fontSize: 12, marginTop: 4 }}>
          {String(errors[name]?.message)}
        </Text>
      )}
    </View>
  );
}
