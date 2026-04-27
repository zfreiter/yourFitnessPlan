import { useColorTheme } from "@/context/colorThemeContext";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type FormValues = Exercise;

import { Picker } from "@react-native-picker/picker";
import {
  Control,
  FieldArrayWithId,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFieldArrayReplace,
} from "react-hook-form";
import { Exercise } from "@/types/type";
import SetManager from "./setManager";
import RepManager from "./repManager";
import SetWeightConfigurator from "./SetWeightConfigurator";

interface ExerciseControlProps {
  chosenExercise: Exercise | null;
  control: Control<Exercise, any, Exercise> | undefined;
  watchSetsLen: number;
  optionsChoice: string | null;
  onOptionChange: (itemValue: string) => void;
  fields: FieldArrayWithId<FormValues, "sets", "id">[];
  append: UseFieldArrayAppend<FormValues, "sets">;
  remove: UseFieldArrayRemove;
  replace: UseFieldArrayReplace<FormValues, "sets">;
}

export function ExerciseControl({
  chosenExercise,
  watchSetsLen,
  optionsChoice,
  onOptionChange,
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
          {`${chosenExercise.exercise_name}`}
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
          {chosenExercise.exercise_description}
        </Text>
      </View>

      {/* Step 2. If the exercise has more than one option we need to give the user the options */}
      {chosenExercise.validUnits && chosenExercise.validUnits.length > 1 && (
        <View>
          <Text
            style={{
              fontFamily: theme.fonts.headerBody,
              color: theme.color.textPrimary,
            }}
          >
            Options
          </Text>
          <View
            style={[
              styles.pickerContainer,
              {
                margin: 0,
                padding: 0,
                backgroundColor: theme.color.surface,
                borderWidth: 1,
                borderColor: theme.color.accentStrong,
              },
            ]}
          >
            <Picker
              mode="dialog"
              onValueChange={(value: string) => {
                setIsRepsValid(false);
                onOptionChange(value);
              }}
              accessibilityLabel="Exercise options"
              accessibilityHint="Select the type of measurement for this exercise"
              style={[
                {
                  height: 50,
                  backgroundColor: theme.color.surface,
                  color: theme.color.textPrimary,
                },
              ]}
            >
              <Picker.Item label="Select option..." value="" />
              {chosenExercise.validUnits.map((unit, index) => (
                <Picker.Item
                  key={index}
                  label={
                    Array.isArray(unit) ? unit.join(" and ") : String(unit)
                  }
                  value={Array.isArray(unit) ? unit.join("-") : String(unit)}
                />
              ))}
            </Picker>
          </View>
        </View>
      )}

      {/* Select set count */}
      {optionsChoice && (
        <SetManager
          replace={replace}
          optionsChoice={optionsChoice}
          chosenExerciseName={chosenExercise.exercise_name}
          setCount={setCount}
          setSetCount={setSetCount}
        />
      )}

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
