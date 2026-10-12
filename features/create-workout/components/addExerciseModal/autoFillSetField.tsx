import { AddExerciseForm, ValidUnit } from "@/types/interfaces/types";
import {
  FieldArrayWithId,
  useFieldArray,
  useFormContext,
} from "react-hook-form";
import { Text, View, Pressable, StyleSheet, TextInput } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import * as Crypto from "expo-crypto";

interface AutoFillSetFieldProps {
  exerciseFields: FieldArrayWithId<AddExerciseForm, "exercises", "id">[];
  entryMethodSelector: "quick_add" | "manual" | "auto_fill";
}

const canAutofill = (validUnits: ValidUnit[][] | undefined): boolean => {
  const combo = validUnits?.[0] ?? [];
  return combo.includes("reps") && combo.includes("weight");
};

export function AutoFillSetField({
  exerciseFields,
  entryMethodSelector,
}: AutoFillSetFieldProps) {
  const { theme } = useColorTheme();
  const { getValues } = useFormContext<AddExerciseForm>();
  const {
    fields: exerciseOneSets,
    replace: replaceExerciseOneSets,
    remove: removeExerciseOneSet,
  } = useFieldArray({ name: `exercises.0.sets` });

  const {
    fields: exerciseTwoSets,
    replace: replaceExerciseTwoSets,
    remove: removeExerciseTwoSet,
  } = useFieldArray({ name: `exercises.1.sets` });

  const isTwoExercises = exerciseFields.length === 2;

  const exerciseOneCanAutofill = canAutofill(exerciseFields[0]?.validUnits);
  const exerciseTwoCanAutofill =
    isTwoExercises && canAutofill(exerciseFields[1]?.validUnits);
  const anyCanAutofill = exerciseOneCanAutofill || exerciseTwoCanAutofill;

  const [totalSets, setTotalSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [startWeight, setStartWeight] = useState("");
  const [endWeight, setEndWeight] = useState("");
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    removeExerciseOneSet();
    if (isTwoExercises) removeExerciseTwoSet();
    setGenerated(false);
  }, [entryMethodSelector]);

  const generateSets = () => {
    const exercises = getValues("exercises");
    const n = Math.max(1, parseInt(totalSets) || 1);
    const r = parseInt(reps) || 0;
    const start = parseFloat(startWeight) || 0;
    const end = parseFloat(endWeight) || start;

    const sets = Array.from({ length: n }, (_, i) => {
      const weight =
        n === 1
          ? start
          : Math.round((start + ((end - start) / (n - 1)) * i) * 2) / 2;
      return {
        id: Crypto.randomUUID(),
        workout_exercise_id: exercises[0].id,
        is_warmup: 0,
        is_max: 0,
        set_order: i + 1,
        reps: r,
        weight,
      };
    });

    replaceExerciseOneSets(sets);
    if (isTwoExercises) replaceExerciseTwoSets(sets);
    setGenerated(true);
  };

  const handleRemoveSet = (index: number) => {
    removeExerciseOneSet(index);
    if (isTwoExercises) removeExerciseTwoSet(index);
  };

  if (!anyCanAutofill) {
    return (
      <View style={styles.unavailableContainer}>
        <Ionicons
          name="flash-off-outline"
          size={24}
          color={theme.color.textSecondary}
        />
        <Text
          style={[styles.unavailableText, { color: theme.color.textSecondary }]}
        >
          Auto-fill is not available for this exercise type
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Config Panel */}
      <View
        style={[
          styles.configCard,
          {
            backgroundColor: theme.color.surface,
            borderColor: theme.color.border,
          },
        ]}
      >
        <View style={styles.configRow}>
          <ConfigInput
            label="SETS"
            value={totalSets}
            onChange={setTotalSets}
            keyboardType="numeric"
          />
          <ConfigInput
            label="REPS"
            value={reps}
            onChange={setReps}
            keyboardType="numeric"
          />
        </View>

        {exerciseOneCanAutofill && (
          <View style={styles.configRow}>
            <ConfigInput
              label="START (lbs)"
              value={startWeight}
              onChange={setStartWeight}
              keyboardType="decimal-pad"
              placeholder="e.g. 60"
            />
            <View style={styles.arrowContainer}>
              <Ionicons
                name="arrow-forward"
                size={14}
                color={theme.color.textSecondary}
              />
            </View>
            <ConfigInput
              label="END (lbs)"
              value={endWeight}
              onChange={setEndWeight}
              keyboardType="decimal-pad"
              placeholder="e.g. 100"
            />
          </View>
        )}

        <Pressable
          onPress={generateSets}
          style={[
            styles.generateButton,
            { backgroundColor: theme.color.accent },
          ]}
        >
          <Ionicons name="flash" size={14} color={theme.color.textPrimary} />
          <Text
            style={[
              styles.generateButtonText,
              { color: theme.color.textPrimary },
            ]}
          >
            {generated ? "Regenerate" : "Generate Sets"}
          </Text>
        </Pressable>
      </View>

      {/* Generated Sets */}
      {exerciseOneSets.map((set, index) => (
        <View key={set.id} style={styles.setGroup}>
          {isTwoExercises && (
            <Text
              style={[
                styles.exerciseLabel,
                { color: theme.color.textSecondary },
              ]}
            >
              {exerciseFields[0]?.exercise_name}
            </Text>
          )}

          {exerciseOneCanAutofill ? (
            <EditableSetRow
              exerciseIndex={0}
              setIndex={index}
              onRemove={() => handleRemoveSet(index)}
            />
          ) : (
            <UnsupportedRow
              setIndex={index}
              onRemove={() => handleRemoveSet(index)}
            />
          )}

          {isTwoExercises && exerciseTwoSets[index] && (
            <>
              <Text
                style={[
                  styles.exerciseLabel,
                  { color: theme.color.textSecondary },
                ]}
              >
                {exerciseFields[1]?.exercise_name}
              </Text>
              {exerciseTwoCanAutofill ? (
                <EditableSetRow
                  exerciseIndex={1}
                  setIndex={index}
                  onRemove={() => handleRemoveSet(index)}
                />
              ) : (
                <UnsupportedRow
                  setIndex={index}
                  onRemove={() => handleRemoveSet(index)}
                />
              )}
            </>
          )}
        </View>
      ))}
    </View>
  );
}

function EditableSetRow({
  exerciseIndex,
  setIndex,
  onRemove,
}: {
  exerciseIndex: number;
  setIndex: number;
  onRemove: () => void;
}) {
  const { theme } = useColorTheme();
  const { watch, setValue } = useFormContext<AddExerciseForm>();

  const reps = watch(`exercises.${exerciseIndex}.sets.${setIndex}.reps`);
  const weight = watch(`exercises.${exerciseIndex}.sets.${setIndex}.weight`);

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.color.surface,
          borderColor: theme.color.border,
        },
      ]}
    >
      <Text style={[styles.setLabel, { color: theme.color.textSecondary }]}>
        SET {setIndex + 1}
      </Text>

      <View style={styles.inputs}>
        <View style={styles.inputField}>
          <Text
            style={[styles.inputLabel, { color: theme.color.textSecondary }]}
          >
            REPS
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.color.input,
                borderColor: theme.color.border,
                color: theme.color.textPrimary,
              },
            ]}
            keyboardType="numeric"
            placeholder="-"
            placeholderTextColor={theme.color.textSecondary}
            value={reps ? reps.toString() : ""}
            onChangeText={(val) =>
              setValue(
                `exercises.${exerciseIndex}.sets.${setIndex}.reps`,
                val === "" ? undefined : Number(val),
              )
            }
          />
        </View>

        <View style={styles.inputField}>
          <Text
            style={[styles.inputLabel, { color: theme.color.textSecondary }]}
          >
            WEIGHT (lbs)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.color.input,
                borderColor: theme.color.border,
                color: theme.color.textPrimary,
              },
            ]}
            keyboardType="decimal-pad"
            placeholder="-"
            placeholderTextColor={theme.color.textSecondary}
            value={weight ? weight.toString() : ""}
            onChangeText={(val) =>
              setValue(
                `exercises.${exerciseIndex}.sets.${setIndex}.weight`,
                val === "" ? undefined : Number(val),
              )
            }
          />
        </View>
      </View>

      <Pressable onPress={onRemove} hitSlop={8}>
        <Ionicons name="close" size={16} color={theme.color.danger} />
      </Pressable>
    </View>
  );
}

function UnsupportedRow({
  setIndex,
  onRemove,
}: {
  setIndex: number;
  onRemove: () => void;
}) {
  const { theme } = useColorTheme();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.color.surface,
          borderColor: theme.color.border,
        },
      ]}
    >
      <Text style={[styles.setLabel, { color: theme.color.textSecondary }]}>
        SET {setIndex + 1}
      </Text>
      <Text
        style={[styles.unsupportedText, { color: theme.color.textSecondary }]}
      >
        Auto-fill not supported
      </Text>
      <Pressable onPress={onRemove} hitSlop={8}>
        <Ionicons name="close" size={16} color={theme.color.danger} />
      </Pressable>
    </View>
  );
}

function ConfigInput({
  label,
  value,
  onChange,
  keyboardType,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  keyboardType: "numeric" | "decimal-pad";
  placeholder?: string;
}) {
  const { theme } = useColorTheme();

  return (
    <View style={styles.configField}>
      <Text style={[styles.inputLabel, { color: theme.color.textSecondary }]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.color.input,
            borderColor: theme.color.border,
            color: theme.color.textPrimary,
          },
        ]}
        keyboardType={keyboardType}
        placeholder={placeholder ?? "-"}
        placeholderTextColor={theme.color.textSecondary}
        value={value}
        onChangeText={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingBottom: 40,
  },
  configCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  configRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  configField: {
    flex: 1,
    gap: 4,
  },
  arrowContainer: {
    paddingBottom: 10,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    paddingVertical: 10,
  },
  generateButtonText: {
    fontSize: 13,
    fontWeight: "700",
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  setLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    minWidth: 40,
  },
  inputs: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  inputField: {
    flex: 1,
    gap: 4,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  input: {
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    textAlign: "center",
    fontSize: 14,
  },
  unavailableContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 32,
  },
  unavailableText: {
    fontSize: 13,
    textAlign: "center",
  },
  unsupportedText: {
    flex: 1,
    fontSize: 12,
    fontStyle: "italic",
  },
});
