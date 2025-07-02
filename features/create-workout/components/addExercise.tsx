import AntDesign from "@expo/vector-icons/AntDesign";
import {
  Controller,
  useForm,
  useFieldArray,
  Control,
  useFormContext,
} from "react-hook-form";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  AccessibilityInfo,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useState, useCallback, useEffect, useMemo } from "react";
import { ExerciseProps } from "../types/type";
import { ValidUnit } from "@/types/interfaces/types";
import { Exercise } from "@/types/type";
import { AppButton } from "@/components/button";
import { ExerciseFormData } from "@/types/type";

export function AddExercise({
  workoutType,
  exerciseList,
  setShowExerciseModal,
}: ExerciseProps) {
  const [chosenExercise, setChosenExercise] = useState<Exercise | null>(null);
  const [optionsChoice, setOptionsChoice] = useState<string | null>(null);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const methods = useFormContext();
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled);
  }, []);

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExerciseFormData>({
    defaultValues: {
      exercise_id: -1,
      exercise_name: "",
      exercise_description: "",
      exercise_difficulty: "",
      track_reps: 0,
      track_weight: 0,
      track_time: 0,
      track_distance: 0,

      sets: [
        {
          reps: undefined,
          weight: undefined,
          duration: undefined,
          distance: undefined,
        },
      ],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "sets",
  });

  const watchSets = watch("sets");

  const onSubmit = useCallback(
    (data: ExerciseFormData) => {
      //console.log("data", data);
      if (data.exercise_id === -1) {
        console.log("Exercise ID is required");
        throw new Error("Exercise ID is required");
      }
      const currentExerciseList = methods.getValues("exercises");

      const newExercise: ExerciseFormData = {
        exercise_id: data.exercise_id,
        exercise_name: data.exercise_name,
        exercise_description: data.exercise_description,
        exercise_difficulty: data.exercise_difficulty,
        track_reps: data.track_reps,
        track_weight: data.track_weight,
        track_time: data.track_time,
        track_distance: data.track_distance,
        sets: data.sets,
      };
      //console.log("newExercise", data.exercise_description);
      methods.setValue("exercises", [...currentExerciseList, newExercise]);

      //reset the form to default values and close the modal double check this
      reset({
        exercise_id: -1,
        track_reps: 0,
        track_weight: 0,
        track_time: 0,
        track_distance: 0,
        sets: [
          {
            reps: undefined,
            weight: undefined,
            duration: undefined,
            distance: undefined,
          },
        ],
      });
      setChosenExercise(null);
      setOptionsChoice(null);
      setShowExerciseModal(false);
      setValue("exercise_id", -1);
    },
    [getValues, methods, reset, chosenExercise, setShowExerciseModal]
  );

  const handleExerciseChange = useCallback(
    (itemValue: string, onChange: (value: string) => void) => {
      onChange(itemValue);

      setOptionsChoice(null);
      reset({
        exercise_id: 0,
        track_reps: 0,
        track_weight: 0,
        track_time: 0,
        track_distance: 0,

        sets: [
          {
            reps: undefined,
            weight: undefined,
            duration: undefined,
            distance: undefined,
          },
        ],
      });

      if (itemValue === "NA") {
        setChosenExercise(null);
        return;
      }

      const foundExercise =
        exerciseList.find(
          (exercise) => exercise.exercise_id.toString() === itemValue
        ) || null;
      //console.log("foundExercise", foundExercise);
      if (foundExercise === null) {
        throw new Error("Exercise not found");
      }
      setValue("exercise_id", foundExercise.exercise_id);
      setValue("exercise_name", foundExercise.exercise_name);
      setValue("exercise_description", foundExercise.exercise_description);
      setValue("exercise_difficulty", foundExercise.exercise_difficulty);

      if (foundExercise.validUnits?.length === 1) {
        setValue(
          "track_reps",
          foundExercise.validUnits?.[0].includes("reps") ? 1 : 0
        );
        setValue(
          "track_weight",
          foundExercise.validUnits?.[0].includes("weight") ? 1 : 0
        );
        setValue(
          "track_time",
          foundExercise.validUnits?.[0].includes("time") ? 1 : 0
        );
        setValue(
          "track_distance",
          foundExercise.validUnits?.[0].includes("distance") ? 1 : 0
        );
        setOptionsChoice(foundExercise.validUnits?.[0].join("-") || "");
      }

      setChosenExercise(foundExercise);
      setValue("exercise_id", foundExercise.exercise_id);
    },
    [exerciseList, reset, setValue]
  );

  const onOptionChange = useCallback(
    (option: string) => {
      const optionValue: ValidUnit[] = option.split("-") as ValidUnit[];

      setValue("track_reps", optionValue.includes("reps") ? 1 : 0);
      setValue("track_weight", optionValue.includes("weight") ? 1 : 0);
      setValue("track_time", optionValue.includes("time") ? 1 : 0);
      setValue("track_distance", optionValue.includes("distance") ? 1 : 0);
      setOptionsChoice(option);
    },
    [setValue]
  );

  const handleAddSet = useCallback(() => {
    append({
      reps: undefined,
      weight: undefined,
      duration: undefined,
      distance: undefined,
    });
  }, [append]);

  const handleRemoveSet = useCallback(
    (index: number) => {
      remove(index);
    },
    [remove]
  );

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
            <AppButton
              title="Cancel"
              style={{
                backgroundColor: "#FF9500",
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
              onPress={handleCloseModal}
              textStyle={{ color: "white" }}
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
              name="exercise_id"
              control={control}
              rules={{
                required: "Exercise selection is required",
                validate: (value) =>
                  value.toString() !== "" || "Please select an exercise",
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Picker
                  mode="dialog"
                  selectedValue={value}
                  onValueChange={(itemValue) => {
                    handleExerciseChange(itemValue.toString(), (val) => {
                      const exercise = exerciseList.find(
                        (e) => e.exercise_id.toString() === val
                      );
                      onChange(val);
                    });
                  }}
                  accessibilityLabel="Exercise selection"
                  accessibilityHint="Select an exercise from the list"
                >
                  <Picker.Item label="Select exercise" value="NA" />
                  {exerciseList.map((exercise) => (
                    <Picker.Item
                      key={exercise.exercise_id}
                      label={exercise.exercise_name}
                      value={exercise.exercise_id.toString()}
                    />
                  ))}
                </Picker>
              )}
            />
          </View>
          {errors.exercise_id && (
            <Text style={styles.textError}>{errors.exercise_id.message}</Text>
          )}

          {/* Exercise Information */}
          {chosenExercise && (
            <View>
              <View>
                <Text style={styles.exerciseName}>
                  {chosenExercise.exercise_name}
                </Text>
                <Text style={styles.setDetailsHeader}>Set Details</Text>
              </View>

              {/* If the exercise has more than one option we need to give the user the options */}
              {chosenExercise.validUnits &&
                chosenExercise.validUnits.length > 1 && (
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
                              Array.isArray(unit)
                                ? unit.join("-")
                                : String(unit)
                            }
                          />
                        ))}
                      </Picker>
                    </View>
                  </>
                )}

              {fields.map((field, index) => (
                <View key={field.id} style={styles.setContainer}>
                  {chosenExercise.validUnits &&
                  chosenExercise.validUnits.length > 1 ? (
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
                      options={chosenExercise.validUnits?.[0].join("-") || ""}
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
  control: Control<ExerciseFormData>;
}

export function Options({ options, index, control }: OptionsProps) {
  const renderInput = (
    name: keyof ExerciseFormData["sets"][number],
    placeholder: string,
    accessibilityLabel: string
  ) => {
    return (
      <Controller
        name={`sets.${index}.${name}`}
        control={control}
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            keyboardType="numeric"
            onChangeText={(text) =>
              onChange(text ? parseFloat(text) : undefined)
            }
            value={value?.toString()}
            accessibilityLabel={accessibilityLabel}
          />
        )}
      />
    );
  };

  switch (options) {
    case "reps":
      return renderInput("reps", "Reps", `Set ${index + 1} reps`);
    case "weight":
      return renderInput("weight", "Weight (kg)", `Set ${index + 1} weight`);
    case "time":
      return renderInput("duration", "Time (seconds)", `Set ${index + 1} time`);
    case "time-distance":
      return (
        <>
          {renderInput("duration", "Time (seconds)", `Set ${index + 1} time`)}
          {renderInput("distance", "Distance (m)", `Set ${index + 1} distance`)}
        </>
      );
    case "reps-weight":
      return (
        <>
          {renderInput("reps", "Reps", `Set ${index + 1} reps`)}
          {renderInput("weight", "Weight (kg)", `Set ${index + 1} weight`)}
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

const setTrackingValues = (
  setOptionsChoice: (value: string) => void,
  foundExercise: Exercise
): Record<string, boolean> => {
  setOptionsChoice(foundExercise.validUnits?.[0].join("-") || "");
  const trackingValues = foundExercise.validUnits?.[0].map((value) => [
    value,
    true,
  ]);

  return Object.fromEntries(trackingValues || []);
};
