import { useColorTheme } from "@/context/colorThemeContext";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

type FormValues = WorkoutExercise;

import {
  Control,
  Controller,
  FieldArrayWithId,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFieldArrayReplace,
} from "react-hook-form";
import { Exercise, WorkoutExercise } from "@/types/interfaces/types";
import SetManager from "./setManager";
import RepManager from "./repManager";
import SetWeightConfigurator from "./SetWeightConfigurator";

interface ExerciseControlProps {
  chosenExercise: Exercise | null;
  control: Control<WorkoutExercise> | undefined;
  watchSetsLen: number;
  optionsChoice: string | null;
  fields: FieldArrayWithId<FormValues, "sets", "id">[];
  append: UseFieldArrayAppend<FormValues, "sets">;
  remove: UseFieldArrayRemove;
  replace: UseFieldArrayReplace<FormValues, "sets">;
}

export function ExerciseControl({
  chosenExercise,
  control,
  watchSetsLen,
  optionsChoice,
  fields,
  replace,
}: ExerciseControlProps) {
  const [isRepsValid, setIsRepsValid] = useState<boolean>(true);
  const [setCount, setSetCount] = useState<number>(0);
  const [reps, setReps] = useState<number | null>(0);
  const { theme } = useColorTheme();

  if (!chosenExercise) {
    return null;
  }

  return (
    <View style={{ gap: theme.spacing.lg }}>
      {/* Selected exercise */}

      <View style={{}}>
        <Text
          style={[
            styles.exerciseName,
            {
              fontFamily: theme.fonts.headerBody,
              color: theme.color.textPrimary,
            },
          ]}
        >
          {`${chosenExercise.name}`}
        </Text>

        <Text
          style={[
            styles.setDetailsHeader,
            {
              fontFamily: theme.fonts.body,
              color: theme.color.textSecondary,
            },
          ]}
        >
          {chosenExercise.description}
        </Text>
      </View>

      {/* Select set count */}
      {optionsChoice && (
        <SetManager
          replace={replace}
          optionsChoice={optionsChoice}
          validUnits={chosenExercise.validUnits ?? []}
          chosenExerciseName={chosenExercise.name}
          setCount={setCount}
          setSetCount={setSetCount}
        />
      )}

      {fields.map((field, index) => (
        <View key={field.id} style={{ flexDirection: "row", gap: theme.spacing.md }}>
          {(chosenExercise.validUnits ?? []).map((unit: "reps" | "weight" | "time" | "distance") => (
            <Controller
              key={unit}
              control={control}
              name={`sets.${index}.${unit}`}
              render={({ field: { value, onChange, onBlur } }) => (
                <View>
                  <Text style={{ color: theme.color.textSecondary }}>{unit.toUpperCase()}</Text>
                  <TextInput
                    style={[styles.setInput, { color: theme.color.textPrimary, backgroundColor: theme.color.input }]}
                    value={value?.toString() ?? ""}
                    keyboardType={unit === "reps" ? "numeric" : "decimal-pad"}
                    onBlur={onBlur}
                    onChangeText={(text) => onChange(text === "" ? undefined : Number(text))}
                  />
                </View>
              )}
            />
          ))}
        </View>
      ))}
      {/* Step 3. Set the reps if available */}
      {optionsChoice === "reps-weight" && watchSetsLen > 0 && (
        <RepManager
          fields={fields}
          replace={replace}
          isRepsValid={isRepsValid}
          setIsRepsValid={setIsRepsValid}
          reps={reps}
          setReps={setReps}
        />
      )}

      {optionsChoice === "reps-weight" &&
        reps !== null &&
        reps > 0 &&
        watchSetsLen > 0 && (
          <SetWeightConfigurator
            setCount={setCount}
            reps={reps}
            replace={replace}
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    fontWeight: "medium",
  },
  textError: {
    fontSize: 16,
    fontWeight: "semibold",
    color: "#DC2626",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "white",
    marginVertical: 4,
    color: "#1F2937",
  },
  addExerciseButton: {},
  addSetButton: {
    backgroundColor: "#2563EB",
    marginTop: 8,
  },
  removeSetButton: {
    backgroundColor: "#DC2626",
    marginTop: 4,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  pickerContainer: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    overflow: "hidden",
    padding: 0,
    backgroundColor: "white",
    marginTop: 4,
  },
  scrollViewContainer: {},
  headerContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  exerciseName: {
    textAlign: "left",
  },
  setDetailsHeader: {
    textAlign: "left",
  },
  optionsLabel: {},
  setContainer: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  setInput: {
    width: 45,
    textAlign: "right",
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 5,
    padding: 5,
    backgroundColor: "white",
    fontSize: 16,
  },
  setInputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#4B5563",
  },
  hr: {
    borderBottomColor: "#D1D5DB",
    borderBottomWidth: 1,
    width: "100%",
  },
  inputError: {
    borderColor: "#DC2626",
  },
  SetCardInputContainer: {},
  addIconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
