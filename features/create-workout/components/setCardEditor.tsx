import { CreateWorkoutForm, ExerciseSet } from "@/types/interfaces/types";
import { useColorTheme } from "@/context/colorThemeContext";
import { Control, Controller } from "react-hook-form";
import { Text, View, StyleSheet, TextInput, Pressable } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";

interface SetCardEditorProps {
  set: ExerciseSet;
  setOrder: number;
  exerciseOrder: number;
  displayLabel: string | number;
  control: Control<CreateWorkoutForm>;
  onRemove?: () => void;
}

export function SetCardEditor({
  set,
  setOrder,
  exerciseOrder,
  displayLabel,
  control,
  onRemove,
}: SetCardEditorProps) {
  const { theme } = useColorTheme();

  type SetInput = {
    name: "reps" | "weight" | "distance" | "time";
    value: number;
  };

  const inputs: SetInput[] = [
    set.reps !== undefined && set.reps !== null
      ? { name: "reps", value: set.reps }
      : null,
    set.weight !== undefined && set.weight !== null
      ? { name: "weight", value: set.weight }
      : null,
    set.distance !== undefined && set.distance !== null
      ? { name: "distance", value: set.distance }
      : null,
    set.time !== undefined && set.time !== null
      ? { name: "time", value: set.time }
      : null,
  ].filter((input): input is SetInput => input !== null);

  return (
    <View style={[styles.row]}>
      {/* Set Number / W / M */}
      <View
        style={[
          styles.setColumn,
          {
            flexDirection: "column",
            marginVertical: "auto",
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Text
          style={[
            styles.setLabel,
            {
              color: theme.color.textSecondary,
            },
          ]}
        >
          {displayLabel}
        </Text>
      </View>

      {/* Inputs */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {inputs.map((input) => (
          <View key={input.name} style={styles.inputColumn}>
            <Controller
              control={control}
              name={
                `exercises.${exerciseOrder}.sets.${setOrder}.${input.name}` as const
              }
              render={({ field: { onChange, value } }) => {
                return (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.color.textPrimary,
                        borderColor: theme.color.border,
                        backgroundColor: theme.color.input,
                      },
                    ]}
                    value={value?.toString() ?? ""}
                    keyboardType="numeric"
                    onChangeText={(text) =>
                      onChange(text === "" ? 0 : Number(text))
                    }
                  />
                );
              }}
            />
          </View>
        ))}

        <Pressable
          onPress={() => onRemove?.()}
          hitSlop={8}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            padding: 2,
            width: 24,
          })}
        >
          <Ionicons name="trash-outline" size={17} color={theme.color.danger} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  setColumn: {
    width: 36,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
  },

  setLabel: {
    fontSize: 15,
    fontWeight: "700",
  },

  inputColumn: {
    width: 72,
    marginRight: 10,
  },

  header: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
    textTransform: "capitalize",
  },

  input: {
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    textAlign: "center",
    fontSize: 15,
  },
});
