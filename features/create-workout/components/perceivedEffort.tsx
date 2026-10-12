import { useColorTheme } from "@/context/colorThemeContext";
import { CreateWorkoutForm } from "@/types/interfaces/types";
import Slider from "@react-native-community/slider";
import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { View, Text } from "react-native";

export function PerceivedEffortInput() {
  const { control } = useFormContext<CreateWorkoutForm>();
  const { theme } = useColorTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Controller
        control={control}
        name="perceived_effort"
        render={({ field: { onChange, value } }) => {
          const sliderValue =
            value === "easy" ? 0 : value === "moderate" ? 0.5 : 1;

          return (
            <View style={{ flex: 1 }}>
              <View style={{ flex: 1, justifyContent: "space-between" }}>
                <Text
                  style={{ color: theme.color.textPrimary, fontWeight: "700" }}
                >
                  Perceived Effort
                </Text>

                <Text style={{ color: theme.color.textPrimary }}>
                  Selected Effort:{" "}
                  {value === "easy"
                    ? "Easy"
                    : value === "moderate"
                      ? "Moderate"
                      : "Hard"}
                </Text>
              </View>

              <Slider
                style={{ width: "100%", height: 40 }}
                minimumValue={0}
                maximumValue={1}
                step={0.5}
                value={sliderValue}
                onValueChange={(newValue) => {
                  const effortValue =
                    newValue === 0
                      ? "easy"
                      : newValue === 0.5
                        ? "moderate"
                        : "hard";

                  onChange(effortValue);
                }}
                minimumTrackTintColor={theme.color.accent}
                maximumTrackTintColor={theme.color.border}
                thumbTintColor={theme.color.textPrimary}
              />
            </View>
          );
        }}
      />
    </View>
  );
}
