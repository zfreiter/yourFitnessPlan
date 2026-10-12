import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Crypto from "expo-crypto";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import {
  CreateWorkoutForm,
  ExerciseSet,
  ValidUnit,
  WorkoutExercise,
} from "@/types/interfaces/types";
import { useColorTheme } from "@/context/colorThemeContext";
import { SetCardEditor } from "./setCardEditor";

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  exerciseOrder: number;
  onDelete?: () => void;
}

export const ExerciseCard = ({
  exercise,
  exerciseOrder,
  onDelete,
}: ExerciseCardProps) => {
  const { theme } = useColorTheme();

  const { control } = useFormContext<CreateWorkoutForm>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: `exercises.${exerciseOrder}.sets`,
  });

  const sets = useWatch({
    control,
    name: `exercises.${exerciseOrder}.sets`,
  });

  const handleRemoveSet = (index: number) => {
    remove(index);
  };
  const selectedUnits: ValidUnit[] = exercise.validUnits ?? [];

  const borderColor =
    exercise.group_type === "superset"
      ? "#4A90D9"
      : exercise.group_type === "compound_set"
        ? "#E8923A"
        : exercise.group_type === "circuit"
          ? "#50B86B"
          : theme.color.border;

  const handleAddSet = () => {
    const newSet: ExerciseSet = {
      id: Crypto.randomUUID(),
      workout_exercise_id: exercise.id,
      is_warmup: 0,
      is_max: 0,
      set_order: fields.length + 1,

      reps: selectedUnits.includes("reps") ? 0 : undefined,
      weight: selectedUnits.includes("weight") ? 0 : undefined,
      time: selectedUnits.includes("time") ? 0 : undefined,
      distance: selectedUnits.includes("distance") ? 0 : undefined,
    };

    append(newSet, {
      shouldFocus: false,
    });
  };

  let workingSetNumber = 1;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.color.surface,
          borderColor,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          {exercise.group_type && (
            <Text
              style={[
                styles.groupLabel,
                {
                  color: borderColor,
                },
              ]}
            >
              {exercise.group_type === "superset"
                ? "Superset"
                : exercise.group_type === "compound_set"
                  ? "Compound Set"
                  : "Circuit"}
            </Text>
          )}

          <Text
            style={[
              styles.name,
              {
                color: theme.color.textPrimary,
              },
            ]}
          >
            {exercise.exercise_name}
          </Text>
        </View>

        {onDelete && (
          <Pressable
            onPress={onDelete}
            hitSlop={8}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
              width: 24,
            })}
          >
            {({ pressed }) => (
              <Ionicons
                name="trash-outline"
                size={18}
                color={pressed ? "#ff8a8a" : theme.color.danger}
              />
            )}
          </Pressable>
        )}
      </View>

      <View style={styles.headerRow}>
        <Text
          style={[
            styles.setHeader,
            {
              color: theme.color.textSecondary,
            },
          ]}
        >
          Set
        </Text>

        <View style={styles.headerInputs}>
          {selectedUnits.includes("reps") && (
            <Text
              style={[
                styles.headerCell,
                {
                  color: theme.color.textSecondary,
                },
              ]}
            >
              Reps
            </Text>
          )}

          {selectedUnits.includes("weight") && (
            <Text
              style={[
                styles.headerCell,
                {
                  color: theme.color.textSecondary,
                },
              ]}
            >
              Wt
            </Text>
          )}

          {selectedUnits.includes("distance") && (
            <Text
              style={[
                styles.headerCell,
                {
                  color: theme.color.textSecondary,
                },
              ]}
            >
              Dist
            </Text>
          )}

          {selectedUnits.includes("time") && (
            <Text
              style={[
                styles.headerCell,
                {
                  color: theme.color.textSecondary,
                },
              ]}
            >
              Time
            </Text>
          )}
          <View style={{ width: 24 }}></View>
        </View>
      </View>

      <View style={styles.setContainer}>
        {fields.map((field, index) => {
          const set = sets?.[index];

          if (!set) return null;

          let displayLabel: string | number;

          if (set.is_warmup) {
            displayLabel = "W";
          } else if (set.is_max) {
            displayLabel = "M";
          } else {
            displayLabel = workingSetNumber;
            workingSetNumber += 1;
          }

          return (
            <SetCardEditor
              key={field.id}
              set={set}
              setOrder={index}
              exerciseOrder={exerciseOrder}
              displayLabel={displayLabel}
              control={control}
              onRemove={() => handleRemoveSet(index)}
            />
          );
        })}
      </View>

      {exercise.group_type !== "circuit" && (
        <Pressable
          onPress={handleAddSet}
          style={({ pressed }) => [
            styles.addSetButton,
            {
              borderColor: theme.color.accent,
              backgroundColor: theme.color.accent,
              opacity: pressed ? 0.7 : 1,
              transform: [
                {
                  scale: pressed ? 0.95 : 1,
                },
              ],
            },
          ]}
        >
          <Text
            style={{
              color: theme.color.textPrimary,
            }}
          >
            + Add Set
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  left: {
    flex: 1,
    gap: 3,
  },

  groupLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 6,
  },

  headerInputs: {
    flexDirection: "row",
    alignItems: "center",
  },

  setHeader: {
    width: 40,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },

  headerCell: {
    width: 72,
    marginRight: 10,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },

  setContainer: {
    gap: 6,
  },

  addSetButton: {
    width: "100%",
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
