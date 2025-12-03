import { Ionicons } from "@expo/vector-icons";
import Entypo from "@expo/vector-icons/Entypo";
import { useDatabase } from "@/context/databaseContext";
import {
  Controller,
  useForm,
  useFieldArray,
  useFormContext,
  Control,
} from "react-hook-form";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useState, useCallback, useMemo } from "react";
import { useWorkout } from "@/context/workoutContext";
import { AppButton } from "@/components/button";
import { ExerciseFormData } from "@/types/common/workoutInterface";
import {
  Exercise,
  SetDetails,
  ValidUnit,
  WorkoutExercise,
} from "@/types/interfaces/types";
import { Workout } from "@/types/type";
import { useColorTheme } from "@/context/colorThemeContext";
import { workoutService } from "@/services/workoutService";

// Utility functions for set initialization
const createEmptySet = (): SetDetails => ({
  reps: undefined,
  weight: undefined,
  time: undefined,
  distance: undefined,
});

const createSetFromUnits = (units: ValidUnit[]): SetDetails => ({
  reps: units.includes("reps") ? 0 : undefined,
  weight: units.includes("weight") ? 0 : undefined,
  time: units.includes("time") ? 0 : undefined,
  distance: units.includes("distance") ? 0 : undefined,
});

// Type guard to safely validate ValidUnit arrays
const isValidUnitArray = (units: string[]): units is ValidUnit[] => {
  const validUnits: readonly string[] = ["reps", "weight", "time", "distance"];
  return units.every((unit) => validUnits.includes(unit));
};

// Constants for picker default values
const DEFAULT_PICKER_VALUE = "NA" as const;
const SELECT_EXERCISE_LABEL = "Select exercise" as const;
const SELECT_OPTION_LABEL = "Please select an option" as const;

// Validation rules and messages
const VALIDATION_MESSAGES = {
  EXERCISE_REQUIRED: "Exercise selection is required",
  EXERCISE_UNDEFINED: "Please select an exercise",
  OPTION_REQUIRED: "Please select an option",
} as const;

const validationRules = {
  exercise: {
    required: VALIDATION_MESSAGES.EXERCISE_REQUIRED,
    validate: (value: Exercise | undefined) =>
      value !== undefined || VALIDATION_MESSAGES.EXERCISE_UNDEFINED,
  },
  chosenUnitCombination: {
    validate: (value: ValidUnit[] | undefined) => {
      if (!value || value.length === 0) {
        return VALIDATION_MESSAGES.OPTION_REQUIRED;
      }
      return true;
    },
  },
} as const;

export default function AddExercise({
  setShowExerciseModal,
}: {
  setShowExerciseModal: (show: boolean) => void;
}) {
  const [chosenExercise, setChosenExercise] = useState<Exercise | null>(null);
  const [optionsChoice, setOptionsChoice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const methods = useFormContext();
  const { theme } = useColorTheme();
  const { db } = useDatabase();
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
      sets: [createEmptySet()],
    },
    mode: "onChange",
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "sets",
  });
  const {
    exercises: rawExercises,
    workouts,
    setWorkouts,
    addWorkoutExercise,
  } = useWorkout();

  // Map exercises to the expected format for WorkoutExercise
  const exercises = useMemo(() => {
    return rawExercises.map((ex: any) => ({
      id: ex.exercise_id?.toString?.() ?? ex.id?.toString?.() ?? "",
      name: ex.exercise_name ?? ex.name ?? "",
      description: ex.exercise_description ?? ex.description ?? "",
      types: ex.types ?? [],
      validUnits: ex.validUnits ?? [],
      musclesTargeted: ex.musclesTargeted ?? [],
      equipment: ex.equipment ?? [],
      difficulty: ex.exercise_difficulty ?? ex.difficulty ?? "beginner",
      noWeight: ex.noWeight ?? false,
    }));
  }, [rawExercises]);

  const watchSetsLen = watch("sets").length;

  // Standardized reset functions for consistent form reset behavior
  const resetToInitialState = useCallback(() => {
    reset({
      exercise: undefined,
      chosenUnitCombination: [],
      sets: [createEmptySet()],
    });
    setChosenExercise(null);
    setOptionsChoice(null);
    setShowExerciseModal(false);
  }, [reset, setShowExerciseModal]);

  const resetFormForNewExercise = useCallback(() => {
    reset({
      exercise: undefined,
      chosenUnitCombination: [],
      sets: [createEmptySet()],
    });
    setOptionsChoice(null);
    // Note: chosenExercise and modal state remain unchanged
  }, [reset]);

  const resetOptionsOnly = useCallback(
    (onChange?: (value: ValidUnit[]) => void) => {
      setValue("chosenUnitCombination", []);
      setOptionsChoice(null);
      setValue("sets", [createEmptySet()]);
      onChange?.([]);
    },
    [setValue]
  );

  // onSubmit logic from workout-session (we need to update the exercise list in the context)

  const onSubmit = useCallback(
    async (data: WorkoutExercise) => {
      // Validate that an exercise is selected
      if (!chosenExercise) {
        console.error("No exercise selected");
        return;
      }

      setIsSubmitting(true);
      try {
        const newExercise: ExerciseFormData = {
          exercise_id: parseInt(chosenExercise.id),
          exercise_name: chosenExercise.name,
          exercise_description: chosenExercise.description,
          exercise_difficulty: chosenExercise.difficulty,
          track_reps: data.chosenUnitCombination.includes("reps") ? 1 : 0,
          track_weight: data.chosenUnitCombination.includes("weight") ? 1 : 0,
          track_time: data.chosenUnitCombination.includes("time") ? 1 : 0,
          track_distance: data.chosenUnitCombination.includes("distance")
            ? 1
            : 0,
          validUnits: chosenExercise.validUnits,
          musclesTargeted: chosenExercise.musclesTargeted,
          equipment: chosenExercise.equipment,
          sets: data.sets.map((set, index) => ({
            reps: set.reps ?? undefined,
            weight: set.weight ?? undefined,
            time: set.time ?? undefined,
            distance: set.distance ?? undefined,
            set_order: index,
          })),
          exercise_order: methods.getValues("exercises").length + 1,
        };
        const workoutId = methods.getValues("id");

        if (!db) {
          console.error("Database not found");
          throw new Error("Database not found");
        }

        const {
          success,
          data: newExerciseData,
          error,
        } = await workoutService.updateWorkoutNewExercise(
          db,
          workoutId,
          newExercise
        );
        if (error) {
          console.error("Failed to add exercise:", error);
          throw new Error(error);
        }

        const currentExerciseList = methods.getValues("exercises");

        methods.setValue("exercises", [
          ...currentExerciseList,
          newExerciseData,
        ]);
        const currentWorkoutList = methods.getValues("id");

        if (newExerciseData) {
          addWorkoutExercise(newExerciseData, currentWorkoutList);
        }

        resetToInitialState();
      } catch (error) {
        console.error("Unexpected error adding exercise:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [methods, chosenExercise, resetToInitialState, db]
  );

  const handleExerciseChange = useCallback(
    (itemValue: string, onChange: (value: string) => void) => {
      // Setting to selected exercise id
      onChange(itemValue);
      // console.log("AddExercise - itemValue:", itemValue);
      // Resetting the form to default values (exercise, chosenUnitCombination, sets)
      resetFormForNewExercise();
      // If the user selects "Select exercise" we set the chosen exercise to null
      if (itemValue === DEFAULT_PICKER_VALUE) {
        setChosenExercise(null);
        return;
      }
      // Finding the exercise in the exercises list
      const foundExercise =
        exercises.find((exercise) => exercise.id.toString() === itemValue) ||
        null;
      // If the exercise is not found we throw an error
      if (foundExercise === null) {
        throw new Error("Exercise not found");
      }
      // Setting the exercise to the found exercise
      setValue("exercise", foundExercise);

      // If the exercise has only one valid unit we set the chosen unit combination to the valid unit
      if (
        foundExercise.validUnits?.length === 1 &&
        foundExercise.validUnits[0]
      ) {
        const defaultUnit = foundExercise.validUnits[0];
        setValue("chosenUnitCombination", defaultUnit);
        setOptionsChoice(defaultUnit.join("-"));
        setValue("sets", [createSetFromUnits(defaultUnit)]);
      }
      // Setting the chosen exercise to the found exercise
      setChosenExercise(foundExercise);
    },
    [exercises, resetFormForNewExercise, setValue, setChosenExercise, getValues]
  );

  // handleOptionChange is used to handle the change of the option in the picker
  // it is used to set the chosen unit combination and the sets based on the selected option
  // it is also used to reset the form to default values when the user selects "Select exercise"
  const handleOptionChange = useCallback(
    (itemValue: string, onChange: (value: ValidUnit[]) => void) => {
      if (itemValue === DEFAULT_PICKER_VALUE) {
        // Reset to empty state
        resetOptionsOnly(onChange);
      } else {
        // Parse and validate the new option
        const splitUnits = itemValue.split("-");
        if (!isValidUnitArray(splitUnits)) {
          console.error("Invalid unit combination:", itemValue);
          return;
        }

        const optionValue: ValidUnit[] = splitUnits;
        setValue("chosenUnitCombination", optionValue);
        setOptionsChoice(itemValue);
        onChange(optionValue);

        // Initialize sets based on selected units
        setValue("sets", [createSetFromUnits(optionValue)]);
      }
    },
    [resetOptionsOnly, setValue, setOptionsChoice]
  );

  const handleAddSet = useCallback(
    (foundExercise: Exercise) => {
      // Use the currently selected unit combination, fallback to first valid unit if none selected
      const currentUnits = getValues("chosenUnitCombination");
      const unitsToUse =
        currentUnits && currentUnits.length > 0
          ? currentUnits
          : foundExercise.validUnits?.[0];

      if (!unitsToUse) {
        console.error("No valid units found for exercise");
        return;
      }
      console.log("test ", createSetFromUnits(unitsToUse));
      append(createSetFromUnits(unitsToUse));
    },
    [append, getValues]
  );

  //   const handleAddSet = useCallback(() => {
  //   append({
  //     reps: 0,
  //     weight: 0,
  //     duration: 0,
  //     distance: 0,
  //     set_order: 0,
  //   });
  // }, [append]);

  const handleRemoveSet = useCallback(
    (index: number) => {
      remove(index);
    },
    [remove]
  );

  const handleCloseModal = useCallback(() => {
    setShowExerciseModal(false);
  }, [setShowExerciseModal]);

  const showAddSetButton = watch("chosenUnitCombination")?.length > 0;

  const handleSubmitPress = useCallback(() => {
    if (!isSubmitting) {
      handleSubmit(onSubmit)();
    }
  }, [isSubmitting, handleSubmit, onSubmit]);

  return (
    <View
      style={[styles.modalContainer, { backgroundColor: theme.background }]}
    >
      <View
        style={[styles.headerContainer, { backgroundColor: theme.background }]}
      >
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
        <Text style={[styles.text, { color: theme.textPrimary }]}>
          Select exercise
        </Text>
        <View
          style={[
            styles.pickerContainer,
            { backgroundColor: theme.surface, borderColor: theme.accent },
          ]}
        >
          <Controller
            name="exercise"
            control={control}
            rules={validationRules.exercise}
            render={({ field: { onChange, value } }) => (
              <Picker
                mode="dialog"
                selectedValue={value?.id?.toString() || DEFAULT_PICKER_VALUE}
                onValueChange={(itemValue) => {
                  handleExerciseChange(itemValue.toString(), onChange);
                }}
                style={{
                  width: "100%",
                  backgroundColor: theme.surface,
                  color: theme.textPrimary,
                }}
                accessibilityLabel="Exercise selection"
                accessibilityHint="Select an exercise from the list"
                enabled={!isSubmitting}
              >
                <Picker.Item
                  label={SELECT_EXERCISE_LABEL}
                  value={DEFAULT_PICKER_VALUE}
                />
                {exercises.map((exercise) => (
                  <Picker.Item
                    key={exercise.id}
                    label={exercise.name}
                    value={exercise.id.toString()}
                  />
                ))}
              </Picker>
            )}
          />
        </View>
        {errors.exercise && (
          <Text style={[styles.textError, { color: theme.danger }]}>
            {errors.exercise.message}
          </Text>
        )}
        {/* Exercise Information */}
        {chosenExercise && (
          <View style={{}}>
            <View style={[styles.hr, { borderBottomColor: theme.hr }]} />
            <View></View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.exerciseName, { color: theme.textPrimary }]}
                >
                  {`${chosenExercise.name}`}
                </Text>
                <Text
                  style={[
                    styles.setDetailsHeader,
                    { color: theme.textSecondary },
                  ]}
                >
                  {chosenExercise.description}
                </Text>
              </View>

              <View
                style={[
                  styles.SetCardInputContainer,
                  {
                    height: 40,
                    width: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.surface,
                    borderWidth: 1,
                    borderColor: theme.accentStrong,
                  },
                ]}
              >
                <Pressable
                  style={({ pressed }) => [
                    {
                      backgroundColor: pressed ? theme.surface : "transparent",
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                  onPress={() => !isSubmitting && handleAddSet(chosenExercise)}
                >
                  <View style={[styles.addIconContainer]}>
                    <Ionicons name="add" size={20} color={theme.accentStrong} />
                  </View>
                </Pressable>
              </View>

              <View
                style={[
                  styles.SetCardInputContainer,
                  {
                    height: 40,
                    width: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.surface,
                    borderWidth: 1,
                    borderColor: theme.accentStrong,
                  },
                ]}
              >
                <Pressable
                  disabled={watchSetsLen === 0}
                  style={({ pressed }) => [
                    {
                      backgroundColor: pressed ? theme.surface : "transparent",
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                  onPress={() => handleRemoveSet(watchSetsLen - 1)}
                >
                  <View style={[styles.addIconContainer]}>
                    <Entypo name="minus" size={24} color={theme.accentStrong} />
                  </View>
                </Pressable>
              </View>
            </View>

            {/* If the exercise has more than one option we need to give the user the options */}
            {chosenExercise.validUnits &&
              chosenExercise.validUnits.length > 1 && (
                <>
                  <Text
                    style={[styles.optionsLabel, { color: theme.textPrimary }]}
                  >
                    Options
                  </Text>
                  <View
                    style={[
                      styles.pickerContainer,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.accent,
                      },
                    ]}
                  >
                    <Controller
                      name="chosenUnitCombination"
                      control={control}
                      rules={validationRules.chosenUnitCombination}
                      render={({ field: { onChange, value } }) => (
                        <Picker
                          mode="dialog"
                          style={{ color: theme.textPrimary }}
                          selectedValue={
                            value?.join("-") || DEFAULT_PICKER_VALUE
                          }
                          onValueChange={(itemValue) => {
                            handleOptionChange(itemValue, onChange);
                          }}
                          accessibilityLabel="Exercise options"
                          accessibilityHint="Select the type of measurement for this exercise"
                          enabled={!isSubmitting}
                        >
                          <Picker.Item
                            label={SELECT_OPTION_LABEL}
                            value={DEFAULT_PICKER_VALUE}
                          />
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
                      )}
                    />
                  </View>
                  {errors.chosenUnitCombination && (
                    <Text style={[styles.textError, { color: theme.danger }]}>
                      {errors.chosenUnitCombination.message}
                    </Text>
                  )}
                </>
              )}

            {optionsChoice && (
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 20,
                }}
              >
                {fields.map((field, index) => (
                  <Pressable
                    key={index}
                    accessibilityLabel={`Set ${index + 1}`}
                    accessibilityHint="Long-press to remove this set"
                    accessibilityRole="button"
                    style={{
                      padding: 10,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.surface,
                      borderRadius: 20,
                    }}
                    onLongPress={() => {
                      Alert.alert("Remove set", `Set ${index + 1} `);
                      handleRemoveSet(index);
                    }}
                  >
                    {chosenExercise.validUnits &&
                    chosenExercise.validUnits.length > 1 ? (
                      <View
                        style={{
                          flexDirection: "column",
                        }}
                      >
                        <Text style={{ color: theme.textPrimary }}>
                          Set {index + 1}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          {optionsChoice && (
                            <Options
                              options={optionsChoice}
                              index={index}
                              control={control}
                            />
                          )}
                        </View>
                      </View>
                    ) : (
                      <View
                        style={{
                          flexDirection: "column",
                        }}
                      >
                        <Text style={{ color: theme.textPrimary }}>
                          Set {index + 1}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <Options
                            options={
                              chosenExercise.validUnits?.[0].join("-") || ""
                            }
                            index={index}
                            control={control}
                          />
                        </View>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={[styles.hr, { borderBottomColor: theme.hr }]} />
        {chosenExercise && (
          <AppButton
            title={isSubmitting ? "Adding exercise..." : "Add exercise"}
            onPress={handleSubmitPress}
            style={[
              styles.addExerciseButton,
              ...(isSubmitting ? [styles.buttonDisabled] : []),
            ]}
          />
        )}
      </ScrollView>
    </View>
  );
}

interface OptionsProps {
  options: string;
  index: number;
  control: Control<WorkoutExercise>;
}

export function Options({ options, index, control }: OptionsProps) {
  const renderInput = (
    name: keyof SetDetails,
    placeholder: string,
    accessibilityLabel: string
  ) => {
    const { theme } = useColorTheme();
    return (
      <Controller
        key={`${index}-${name}`}
        name={`sets.${index}.${name}` as const}
        control={control}
        render={({ field: { onChange, value } }) => (
          <View
            style={{
              gap: 2,
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <Text
              style={[styles.setInputLabel, { color: theme.textSecondary }]}
            >
              {placeholder}
            </Text>
            <TextInput
              style={[
                styles.setInput,
                {
                  height: 50,
                  width: 70,
                  paddingHorizontal: 10,
                  textAlign: "center",
                  textAlignVertical: "center",
                  fontSize: 18,
                  color: theme.textPrimary,
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.accent,
                  borderRadius: 8,
                },
              ]}
              keyboardType="numeric"
              onChangeText={(text) =>
                onChange(text ? parseFloat(text) : undefined)
              }
              value={value?.toString()}
              accessibilityLabel={accessibilityLabel}
            />
          </View>
        )}
      />
    );
  };
  let content: JSX.Element | JSX.Element[] | null = null;
  switch (options) {
    case "reps":
      return renderInput("reps", "Reps", `Set ${index + 1} reps`);
      break;
    case "weight":
      return renderInput("weight", "Weight (kg)", `Set ${index + 1} weight`);
      break;
    case "time":
      return renderInput("time", "Time (seconds)", `Set ${index + 1} time`);
      break;
    case "time-distance":
      return [
        renderInput("time", "Time (seconds)", `Set ${index + 1} time`),
        renderInput("distance", "Distance (m)", `Set ${index + 1} distance`),
      ];
      break;
    case "reps-weight":
      return [
        renderInput("reps", "Reps", `Set ${index + 1} reps`),
        renderInput("weight", "Weight (kg)", `Set ${index + 1} weight`),
      ];
      break;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
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
    width: 45,
    textAlign: "right",
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 5,
    padding: 5,
    backgroundColor: "white",
  },
  addExerciseButton: {
    backgroundColor: "#059669",
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.6,
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
    borderRadius: 8,
    overflow: "hidden",
    padding: 0,
    marginVertical: 4,
  },
  scrollViewContainer: {
    padding: 10,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 10,
  },
  exerciseName: {
    marginTop: 4,
    textAlign: "left",
    fontSize: 18,
    fontWeight: "600",
  },
  setDetailsHeader: {
    marginTop: 4,
    marginBottom: 20,
    textAlign: "left",
    fontSize: 16,
    fontWeight: "500",
  },
  optionsLabel: {
    marginTop: 4,
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
    borderBottomWidth: 1,
    marginVertical: 20,
    width: "100%",
  },
  inputError: {
    borderColor: "#DC2626",
  },
  setInput: {
    width: 45,
    textAlign: "right",
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 5,
    padding: 5,
    backgroundColor: "white",
  },
  setInputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#4B5563",
  },
  SetCardInputContainer: {
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  },
  addIconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
