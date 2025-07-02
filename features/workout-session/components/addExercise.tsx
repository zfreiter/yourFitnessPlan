import AntDesign from "@expo/vector-icons/AntDesign";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import {
  Controller,
  useFieldArray,
  useForm,
  useFormContext,
  Control,
} from "react-hook-form";
import { useWorkout } from "@/context/workoutContent";
import { Picker } from "@react-native-picker/picker";
import {
  Exercise,
  SetDetails,
  ValidUnit,
  WorkoutExercise,
} from "@/types/interfaces/types";
import { useCallback, useState } from "react";
import { AppButton } from "@/components/button";
export default function AddExercise({
  setShowExerciseModal,
}: {
  setShowExerciseModal: (show: boolean) => void;
}) {
  const [chosenExercise, setChosenExercise] = useState<Exercise | null>(null);
  const [optionsChoice, setOptionsChoice] = useState<string | null>(null);
  const {
    control: formControl,
    setValue: setValueFormContext,
    getValues: getValuesFormContext,
  } = useFormContext();

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WorkoutExercise>({
    defaultValues: {
      exercise: undefined,
      chosenUnitCombination: [],
      sets: [
        {
          reps: undefined,
          weight: undefined,
          time: undefined,
          distance: undefined,
        },
      ],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "sets",
  });

  const { exercises } = useWorkout();

  const onSubmit = useCallback(
    (data: WorkoutExercise) => {
      const currentExerciseList = getValuesFormContext("exercises");
      if (currentExerciseList.length === 0) {
        setShowExerciseModal(false);
      }

      const newExercise = {
        exercise: chosenExercise!,
        chosenUnitCombination: data.chosenUnitCombination,
        sets: getValues("sets"),
      };

      setValueFormContext("exercises", [...currentExerciseList, newExercise]);

      reset({
        exercise: undefined,
        chosenUnitCombination: [],
        sets: [
          {
            reps: undefined,
            weight: undefined,
            time: undefined,
            distance: undefined,
          },
        ],
      });
      setChosenExercise(null);
      setOptionsChoice(null);
      setShowExerciseModal(false);
    },
    [
      getValuesFormContext,
      getValues,
      setValueFormContext,
      reset,
      chosenExercise,
      setShowExerciseModal,
    ]
  );

  const handleExerciseChange = useCallback(
    (itemValue: string, onChange: (value: string) => void) => {
      onChange(itemValue);

      setOptionsChoice(null);
      reset({
        exercise: undefined,
        chosenUnitCombination: [],
        sets: [
          {
            reps: undefined,
            weight: undefined,
            time: undefined,
            distance: undefined,
          },
        ],
      });

      if (itemValue === "NA") {
        setChosenExercise(null);
        return;
      }

      const foundExercise =
        exercises.find((exercise) => exercise.id === itemValue) || null;

      if (foundExercise === null) {
        throw new Error("Exercise not found");
      }

      setChosenExercise(foundExercise);
      setValue("exercise", foundExercise);

      const validUnits = foundExercise?.validUnits;
      if (validUnits.length === 1) {
        setValue("chosenUnitCombination", validUnits[0]);
      }
    },
    [exercises, reset, setValue]
  );
  const onOptionChange = useCallback(
    (option: string) => {
      const optionValue: ValidUnit[] = option.split("-") as ValidUnit[];
      setValue("chosenUnitCombination", optionValue);
      setOptionsChoice(option);
    },
    [setValue]
  );

  const handleAddSet = useCallback(() => {
    append({
      reps: undefined,
      weight: undefined,
      time: undefined,
      distance: undefined,
    });
  }, [append]);

  const handleRemoveSet = useCallback(
    (index: number) => {
      remove(index);
    },
    [remove]
  );
  const watchSets = watch("sets");
  const handleCloseModal = useCallback(() => {
    setShowExerciseModal(false);
  }, [setShowExerciseModal]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.headerContainer}>
        <Pressable
          style={{ alignSelf: "flex-end", margin: 5 }}
          onPress={handleCloseModal}
          accessibilityLabel="Close exercise modal"
          accessibilityHint="Double tap to close the exercise selection modal"
          accessibilityRole="button"
        >
          {({ pressed }) => (
            <AntDesign
              name="closecircleo"
              size={24}
              color={pressed ? "#DC2626" : "#1F2937"}
            />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollViewContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={true}
      >
        <View>
          <Text style={styles.text}>Select exercise</Text>
          <View style={styles.pickerContainer}>
            <Controller
              name="exercise"
              control={control}
              rules={{
                required: "Exercise selection is required",
                validate: (value) =>
                  value !== undefined || "Please select an exercise",
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Picker
                  mode="dialog"
                  selectedValue={value?.id}
                  onValueChange={(itemValue) => {
                    handleExerciseChange(itemValue, onChange);
                  }}
                  accessibilityLabel="Exercise selection"
                  accessibilityHint="Select an exercise from the list"
                >
                  <Picker.Item label="Select exercise" value="select" />
                  {exercises.map((exercise) => (
                    <Picker.Item
                      key={exercise.id}
                      label={exercise.name}
                      value={exercise.id}
                    />
                  ))}
                </Picker>
              )}
            />
          </View>
          {errors.exercise && (
            <Text style={styles.textError}>{errors.exercise.message}</Text>
          )}
          <View style={styles.hr} />

          {/* Exercise Information */}
          {chosenExercise && (
            <View>
              <View>
                <Text style={styles.exerciseName}>{chosenExercise.name}</Text>
                <Text style={styles.setDetailsHeader}>Set Details</Text>
              </View>

              {/* If the exercise has more than one option we need to give the user the options */}
              {chosenExercise.validUnits.length > 1 && (
                <>
                  <Text style={styles.optionsLabel}>Options</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      mode="dialog"
                      onValueChange={onOptionChange}
                      accessibilityLabel="Exercise options"
                      accessibilityHint="Select the type of measurement for this exercise"
                    >
                      {chosenExercise.validUnits.map((unit, index) => (
                        <Picker.Item
                          key={index}
                          label={
                            Array.isArray(unit)
                              ? unit.join(" and ")
                              : String(unit)
                          }
                          value={
                            Array.isArray(unit) ? unit.join("-") : String(unit)
                          }
                        />
                      ))}
                    </Picker>
                  </View>
                </>
              )}

              {fields.map((field, index) => (
                <View key={field.id} style={styles.setContainer}>
                  {chosenExercise.validUnits.length > 1 ? (
                    <>
                      {optionsChoice && (
                        <Options
                          options={optionsChoice}
                          index={index}
                          control={control}
                        />
                      )}
                    </>
                  ) : (
                    <Options
                      options={chosenExercise.validUnits[0].join("-")}
                      index={index}
                      control={control}
                    />
                  )}

                  {watchSets.length > 0 && (
                    <AppButton
                      title="Remove set"
                      onPress={() => handleRemoveSet(index)}
                      style={styles.removeSetButton}
                    />
                  )}
                </View>
              ))}
              <AppButton
                title="Add set"
                onPress={handleAddSet}
                style={styles.addSetButton}
              />
            </View>
          )}

          <View style={styles.hr} />
          <AppButton
            title="Add exercise"
            onPress={handleSubmit(onSubmit)}
            style={styles.addExerciseButton}
          />
        </View>
      </ScrollView>
    </View>
  );
}

interface OptionsProps {
  options: string;
  index: number;
  control: Control<WorkoutExercise, any, WorkoutExercise>;
}

export function Options({ options, index, control }: OptionsProps) {
  const renderInput = (
    name: keyof SetDetails,
    placeholder: string,
    accessibilityLabel: string
  ) => (
    <Controller
      name={`sets.${index}.${name}` as const}
      control={control}
      rules={{
        validate: (value: number | undefined | null) => {
          if (value === undefined || value === null) {
            return true; // Allow empty values
          }
          if (isNaN(value)) {
            return "Please enter a valid number";
          }
          if (value < 0) {
            return "Value must be greater than or equal to 0";
          }
          return true;
        },
      }}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <View>
          <TextInput
            placeholder={placeholder}
            keyboardType="number-pad"
            value={value?.toString() || ""}
            onChangeText={(text) => {
              // Allow empty string or valid numbers
              if (text === "" || /^\d*\.?\d*$/.test(text)) {
                onChange(text === "" ? undefined : Number(text));
              }
            }}
            style={[styles.input, error && styles.inputError]}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={`Enter the ${placeholder.toLowerCase()} (optional)`}
          />
          {error && <Text style={styles.textError}>{error.message}</Text>}
        </View>
      )}
    />
  );

  switch (options) {
    case "reps":
      return renderInput("reps", "Reps", `Set ${index + 1} repetitions`);
    case "reps-weight":
      return (
        <>
          {renderInput("reps", "Reps", `Set ${index + 1} repetitions`)}
          {renderInput("weight", "Weight (kg)", `Set ${index + 1} weight`)}
        </>
      );
    case "time":
      return renderInput("time", "Time (seconds)", `Set ${index + 1} time`);
    case "time-distance":
      return (
        <>
          {renderInput("time", "Time (seconds)", `Set ${index + 1} time`)}
          {renderInput(
            "distance",
            "Distance (meters)",
            `Set ${index + 1} distance`
          )}
        </>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    fontWeight: "medium",
    color: "#1F2937",
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
  addExerciseButton: {
    backgroundColor: "#059669",
    marginTop: 8,
  },
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
    marginVertical: 4,
  },
  scrollViewContainer: {
    padding: 10,
    backgroundColor: "#F9FAFB",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 10,
    backgroundColor: "#E5E7EB",
  },
  exerciseName: {
    marginLeft: 10,
    marginTop: 20,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  setDetailsHeader: {
    marginLeft: 10,
    marginTop: 20,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
    color: "#4B5563",
  },
  optionsLabel: {
    marginLeft: 10,
    marginTop: 20,
    color: "#4B5563",
    fontSize: 16,
  },
  setContainer: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  hr: {
    borderBottomColor: "#D1D5DB",
    borderBottomWidth: 1,
    marginVertical: 20,
    width: "100%",
  },
  inputError: {
    borderColor: "#DC2626",
  },
});
