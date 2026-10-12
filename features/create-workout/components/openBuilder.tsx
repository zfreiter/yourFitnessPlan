import { View, Text } from "react-native";
import React from "react";
import { useColorTheme } from "@/context/colorThemeContext";
import { useFormContext } from "react-hook-form";
import { CreateWorkoutForm } from "@/types/interfaces/types";

export function OpenBuilder() {
  const { theme } = useColorTheme();
  const { control, watch } = useFormContext<CreateWorkoutForm>();

  return (
    <View>
      <Text>Open Builder</Text>
    </View>
  );
}
