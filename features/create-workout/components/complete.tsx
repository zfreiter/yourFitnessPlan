import { useColorTheme } from "@/context/colorThemeContext";
import { Text, View } from "react-native";
import { Checkbox } from "expo-checkbox";
import { useState } from "react";
import { CreateWorkoutForm } from "@/types/interfaces/types";
import { useForm, Control, Controller, useFormContext } from "react-hook-form";

export function CompleteWorkoutButton({}) {
  const [value, setValue] = useState(false);
  const { control } = useFormContext<CreateWorkoutForm>();
  const { theme } = useColorTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
      }}
    >
      <Controller
        control={control}
        name="is_completed"
        render={({ field: { onChange, value } }) => (
          <Checkbox
            style={{ borderColor: theme.color.border }}
            value={value === 1 ? true : false}
            onValueChange={(newValue) => {
              setValue(newValue);
              onChange(newValue ? 1 : 0);
              console.log("Workout completed: ", newValue);
            }}
            color={value ? theme.color.accentActive : undefined}
          />
        )}
      />
      <Text
        style={{
          color: theme.color.textPrimary,
          fontSize: 16,
          fontWeight: "bold",
        }}
      >
        {value ? "WORKOUT COMPLETED" : "Mark as Completed"}
      </Text>
    </View>
  );
}
