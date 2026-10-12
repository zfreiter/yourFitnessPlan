import { CreateCircuitForm } from "@/types/interfaces/types";
import { View, Text, Pressable } from "react-native";
import { Control, Controller, FieldPath } from "react-hook-form";
import { useColorTheme } from "@/context/colorThemeContext";
import AntDesign from "@expo/vector-icons/AntDesign";

interface StepperInputProps {
  control: Control<CreateCircuitForm>;
  name: FieldPath<CreateCircuitForm>;
  title: string;
  step: number;
  min: number;
  max: number;
}

export function StepperInput({
  control,
  name,
  title,
  step,
  min,
  max,
}: StepperInputProps) {
  const { theme } = useColorTheme();
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ textAlign: "center", color: theme.color.textPrimary }}>
        {title}
      </Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Pressable
              onPress={() => onChange(Math.max(min, (value as number) - step))}
            >
              <AntDesign
                name="minus-circle"
                size={24}
                color={theme.color.accent}
              />
            </Pressable>

            <Text
              style={{
                color: theme.color.textPrimary,
                fontSize: 18,
                minWidth: 40,
                textAlign: "center",
              }}
            >
              {value?.toString()}
            </Text>

            <Pressable
              onPress={() => onChange(Math.min(max, (value as number) + step))}
            >
              <AntDesign
                name="plus-circle"
                size={24}
                color={theme.color.accent}
              />
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}
