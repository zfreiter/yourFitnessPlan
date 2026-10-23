import { Text, View, Pressable, StyleSheet } from "react-native";
import {
  Control,
  FieldArrayWithId,
  useFormContext,
} from "react-hook-form";
import { AddExerciseForm, ValidUnit } from "@/types/interfaces/types";
import * as Crypto from "expo-crypto";
import { useColorTheme } from "@/context/colorThemeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SetCardCreator } from "../setCardCreator";
import {
  ExerciseSetFieldArray,
  NestedExerciseSetArray,
} from "./nestedExerciseSetArray";

interface ManualSetFieldProps {
  exerciseFields: FieldArrayWithId<AddExerciseForm, "exercises", "id">[];
  control: Control<AddExerciseForm>;
}

// Users can add sets and update each individual values
// compound and super sets get sets added or removed together
// if a user switches entry method or selectedLoggingStyle, sets get removed
export function ManualSetField({
  exerciseFields,
}: ManualSetFieldProps) {
  const { theme } = useColorTheme();
  const { getValues } = useFormContext<AddExerciseForm>();

  const isTwoExercises = exerciseFields.length === 2;

  // ManualSetField
  const exerciseOneUnits: ValidUnit[] = [
    ...(exerciseFields[0]?.validUnits ?? []),
  ];

  const exerciseTwoUnits: ValidUnit[] = isTwoExercises
    ? [...(exerciseFields[1]?.validUnits ?? [])]
    : [];

  const renderSetFields = (
    first: ExerciseSetFieldArray,
    second?: ExerciseSetFieldArray,
  ) => {
    const exerciseOneSets = first.fields;
    const exerciseTwoSets = second?.fields ?? [];
    const rowCount = Math.max(exerciseOneSets.length, exerciseTwoSets.length);
    const handleAddSet = () => {
      const exercises = getValues("exercises");
      first.append({
        id: Crypto.randomUUID(),
        workout_exercise_id: exercises[0].id,
        is_warmup: 0,
        is_max: 0,
        set_order: exerciseOneSets.length + 1,
        reps: exerciseOneUnits.includes("reps") ? 0 : undefined,
        weight: exerciseOneUnits.includes("weight") ? 0 : undefined,
        time: exerciseOneUnits.includes("time") ? 0 : undefined,
        distance: exerciseOneUnits.includes("distance") ? 0 : undefined,
      });

      if (isTwoExercises && second) {
        second.append({
          id: Crypto.randomUUID(),
          workout_exercise_id: exercises[1].id,
          is_warmup: 0,
          is_max: 0,
          set_order: exerciseTwoSets.length + 1,
          reps: exerciseTwoUnits.includes("reps") ? 0 : undefined,
          weight: exerciseTwoUnits.includes("weight") ? 0 : undefined,
          time: exerciseTwoUnits.includes("time") ? 0 : undefined,
          distance: exerciseTwoUnits.includes("distance") ? 0 : undefined,
        });
      }
    };
    const handleRemoveSet = (index: number) => {
      first.remove(index);
      if (isTwoExercises) second?.remove(index);
    };

    return (
      <View style={styles.container}>
        {Array.from({ length: rowCount }, (_, index) => (
          <View
            key={`${exerciseOneSets[index]?.id ?? ""}:${exerciseTwoSets[index]?.id ?? ""}:${index}`}
            style={styles.setGroup}
          >
            {exerciseOneSets[index] && (
              <>
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
              </>
            )}

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
  };

  return (
    <NestedExerciseSetArray exerciseIndex={0}>
      {(first) =>
        isTwoExercises ? (
          <NestedExerciseSetArray exerciseIndex={1}>
            {(second) => renderSetFields(first, second)}
          </NestedExerciseSetArray>
        ) : (
          renderSetFields(first)
        )
      }
    </NestedExerciseSetArray>
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
