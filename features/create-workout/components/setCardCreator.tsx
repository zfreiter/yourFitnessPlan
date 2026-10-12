import { View, Text, Pressable, StyleSheet, TextInput } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import { useFormContext } from "react-hook-form";
import { AddExerciseForm } from "@/types/interfaces/types";
import Ionicons from "@expo/vector-icons/Ionicons";

interface SetCardCreatorProps {
  exerciseIndex: number;
  setIndex: number;
  validUnits: string[];
  onRemove?: () => void;
}

const SET_TYPES = [
  { label: "W", value: "warmup", title: "Warm Up" },
  { label: "S", value: "working", title: "Working" },
  { label: "M", value: "max", title: "Max" },
];

const UNIT_LABELS: Record<string, string> = {
  reps: "REPS",
  weight: "WEIGHT",
  distance: "DISTANCE",
};

const UNIT_KEYBOARD: Record<string, "numeric" | "decimal-pad"> = {
  reps: "numeric",
  weight: "decimal-pad",
  distance: "decimal-pad",
};

//
export const SetCardCreator = ({
  exerciseIndex,
  setIndex,
  validUnits,
  onRemove,
}: SetCardCreatorProps) => {
  const { theme } = useColorTheme();
  const { watch, setValue } = useFormContext<AddExerciseForm>();

  const isWarmup = watch(
    `exercises.${exerciseIndex}.sets.${setIndex}.is_warmup`,
  );
  const isMax = watch(`exercises.${exerciseIndex}.sets.${setIndex}.is_max`);

  const activeType = isWarmup ? "warmup" : isMax ? "max" : "working";

  const handleTypePress = (type: string) => {
    if (type === "warmup") {
      setValue(
        `exercises.${exerciseIndex}.sets.${setIndex}.is_warmup`,
        activeType === "warmup" ? 0 : 1,
      );
      setValue(`exercises.${exerciseIndex}.sets.${setIndex}.is_max`, 0);
    } else if (type === "max") {
      setValue(
        `exercises.${exerciseIndex}.sets.${setIndex}.is_max`,
        activeType === "max" ? 0 : 1,
      );
      setValue(`exercises.${exerciseIndex}.sets.${setIndex}.is_warmup`, 0);
    } else {
      setValue(`exercises.${exerciseIndex}.sets.${setIndex}.is_warmup`, 0);
      setValue(`exercises.${exerciseIndex}.sets.${setIndex}.is_max`, 0);
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.color.surface,
          borderColor: theme.color.border,
        },
      ]}
    >
      {/* Set Number + Delete */}
      <View style={styles.header}>
        <Text style={[styles.setNumber, { color: theme.color.textSecondary }]}>
          SET {setIndex + 1}
        </Text>
        <Pressable onPress={onRemove} hitSlop={8}>
          <Ionicons name="close" size={16} color={theme.color.danger} />
        </Pressable>
      </View>

      {/* Set Type Selector */}
      <View style={styles.typeRow}>
        {SET_TYPES.map((type) => (
          <Pressable
            key={type.value}
            onPress={() => handleTypePress(type.value)}
            style={[
              styles.typeButton,
              {
                backgroundColor:
                  activeType === type.value
                    ? theme.color.accent
                    : theme.color.input,
                borderColor: theme.color.border,
              },
            ]}
          >
            <Text
              style={{
                color:
                  activeType === type.value
                    ? theme.color.textPrimary
                    : theme.color.textSecondary,
                fontSize: 11,
                fontWeight: "700",
              }}
            >
              {type.label}
            </Text>
            <Text
              style={{
                color:
                  activeType === type.value
                    ? theme.color.textPrimary
                    : theme.color.textSecondary,
                fontSize: 10,
              }}
            >
              {type.title}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Dynamic Unit Inputs */}
      <View style={styles.valuesRow}>
        {validUnits.map((unit) => {
          const fieldKey = unit as "reps" | "weight" | "distance";
          const value = watch(
            `exercises.${exerciseIndex}.sets.${setIndex}.${fieldKey}`,
          );

          return (
            <View key={unit} style={styles.valueField}>
              <Text
                style={[
                  styles.valueLabel,
                  { color: theme.color.textSecondary },
                ]}
              >
                {UNIT_LABELS[unit] ?? unit.toUpperCase()}
              </Text>
              <TextInput
                style={[
                  styles.valueInput,
                  {
                    backgroundColor: theme.color.input,
                    borderColor: theme.color.border,
                    color: theme.color.textPrimary,
                  },
                ]}
                keyboardType={UNIT_KEYBOARD[unit] ?? "decimal-pad"}
                placeholder="-"
                placeholderTextColor={theme.color.textSecondary}
                value={value ? value.toString() : ""}
                onChangeText={(val) =>
                  setValue(
                    `exercises.${exerciseIndex}.sets.${setIndex}.${fieldKey}`,
                    val === "" ? undefined : Number(val),
                  )
                }
              />
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  setNumber: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  typeRow: {
    flexDirection: "row",
    gap: 6,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  valuesRow: {
    flexDirection: "row",
    gap: 10,
  },
  valueField: {
    flex: 1,
    gap: 4,
  },
  valueLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  valueInput: {
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    textAlign: "center",
    fontSize: 14,
  },
});
