import { Text, View, Pressable, StyleSheet } from "react-native";
import {
  Control,
  FieldArrayWithId,
  useFieldArray,
  useFormContext,
} from "react-hook-form";
import { AddExerciseForm, ValidUnit } from "@/types/interfaces/types";
import * as Crypto from "expo-crypto";
import { useColorTheme } from "@/context/colorThemeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SetCardCreator } from "../setCardCreator";
import { useEffect } from "react";

interface ManualSetFieldProps {
  exerciseFields: FieldArrayWithId<AddExerciseForm, "exercises", "id">[];
  control: Control<AddExerciseForm>;
  entryMethodSelector: "quick_add" | "manual" | "auto_fill";
}

// Users can add sets and update each individual values
// compound and super sets get sets added or removed together
// if a user switches entry method or selectedLoggingStyle, sets get removed
export function ManualSetField({
  exerciseFields,
  entryMethodSelector,
}: ManualSetFieldProps) {
  const { theme } = useColorTheme();
  const { getValues } = useFormContext<AddExerciseForm>();

  const {
    fields: exerciseOneSets,
    append: appendExerciseOneSet,
    remove: removeExerciseOneSet,
  } = useFieldArray({
    name: `exercises.0.sets`,
  });

  const {
    fields: exerciseTwoSets,
    append: appendExerciseTwoSet,
    remove: removeExerciseTwoSet,
  } = useFieldArray({
    name: `exercises.1.sets`,
  });

  const isTwoExercises = exerciseFields.length === 2;

  // ManualSetField
  const exerciseOneUnits: string[] = [
    ...(exerciseFields[0]?.validUnits?.[0] ?? []),
  ];

  const exerciseTwoUnits: string[] = isTwoExercises
    ? [...(exerciseFields[1]?.validUnits?.[0] ?? [])]
    : [];

  const handleAddSet = () => {
    const exercises = getValues("exercises");
    const newSet = {
      id: Crypto.randomUUID(),
      workout_exercise_id: exercises[0].id,
      is_warmup: 0,
      is_max: 0,
      set_order: exerciseOneSets.length + 1,
      reps: 0,
      weight: 0,
    };

    appendExerciseOneSet(newSet);
    if (isTwoExercises)
      appendExerciseTwoSet({
        id: Crypto.randomUUID(),
        workout_exercise_id: exercises[1].id ? exercises[1].id : "",
        is_warmup: 0,
        is_max: 0,
        set_order: exerciseTwoSets.length + 1,
        reps: 0,
        weight: 0,
      });
  };

  const handleRemoveSet = (index: number) => {
    removeExerciseOneSet(index);
    if (isTwoExercises) removeExerciseTwoSet(index);
  };

  useEffect(() => {
    removeExerciseOneSet();
    if (isTwoExercises) removeExerciseTwoSet();
  }, [entryMethodSelector]);

  return (
    <View style={styles.container}>
      {exerciseOneSets.map((set, index) => (
        <View key={set.id} style={styles.setGroup}>
          {/* Exercise 1 label if two exercises */}
          {isTwoExercises && (
            <Text
              style={[
                styles.exerciseLabel,
                { color: theme.color.textSecondary },
              ]}
            >
              {exerciseFields[0].exercise_name}
            </Text>
          )}

          <SetCardCreator
            exerciseIndex={0}
            setIndex={index}
            validUnits={exerciseOneUnits}
            onRemove={() => handleRemoveSet(index)}
          />

          {/* Exercise 2 set card */}
          {isTwoExercises && exerciseTwoSets[index] && (
            <>
              <Text
                style={[
                  styles.exerciseLabel,
                  { color: theme.color.textSecondary },
                ]}
              >
                {exerciseFields[1].exercise_name}
              </Text>
              <SetCardCreator
                exerciseIndex={1}
                setIndex={index}
                validUnits={exerciseTwoUnits}
                onRemove={() => handleRemoveSet(index)}
              />
            </>
          )}
        </View>
      ))}

      {/* Add Set Button */}
      <Pressable
        onPress={handleAddSet}
        style={[
          styles.addButton,
          {
            borderColor: theme.color.border,
            backgroundColor: theme.color.input,
          },
        ]}
      >
        <Ionicons name="add" size={18} color={theme.color.accent} />
        <Text style={[styles.addButtonText, { color: theme.color.accent }]}>
          Add Set
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingBottom: 40,
  },
  setGroup: {
    gap: 8,
  },
  exerciseLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
