import { CreateCircuitForm } from "@/types/interfaces/types";
import { View } from "react-native";
import { Control } from "react-hook-form";
import { useColorTheme } from "@/context/colorThemeContext";

import { StepperInput } from "./stepperInput";

interface CiruitSettingsProps {
  control: Control<CreateCircuitForm>;
}

export function CircuitSettings({ control }: CiruitSettingsProps) {
  const { theme } = useColorTheme();
  return (
    <View
      style={{
        marginTop: theme.spacing.headerBottomMargin,
        flexDirection: "row",
        justifyContent: "space-around",
      }}
    >
      <StepperInput
        control={control}
        name="rounds"
        title="Rounds"
        step={1}
        min={0}
        max={20}
      />
      <StepperInput
        control={control}
        name="restAfterRound"
        title="Rest"
        step={15}
        min={0}
        max={600}
      />
    </View>
  );
}
