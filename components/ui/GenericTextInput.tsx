import React from "react";
import { TextInput, Text, View } from "react-native";
import { Controller, useFormContext } from "react-hook-form";

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
}

export const GenericTextInput: React.FC<GenericTextInputProps> = ({
  name,
  placeholder,
  title,
  keyboardType,
}) => {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <View style={{ gap: title ? 5 : 0 }}>
      {title && (
        <Text style={{ fontSize: 16, fontWeight: "bold" }}>{title}</Text>
      )}
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            placeholder={placeholder}
            keyboardType={keyboardType}
            value={String(value || "")}
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
            style={{
              padding: 10,
              backgroundColor: "white",
              borderColor: "black",
              borderWidth: 1,
              borderRadius: 8,
            }}
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
};
