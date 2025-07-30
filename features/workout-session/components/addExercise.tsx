import AntDesign from "@expo/vector-icons/AntDesign";
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
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useState, useCallback } from "react";
import { useWorkout } from "@/context/workoutContent";
import { AppButton } from "@/components/button";
import { ExerciseFormData } from "@/types/common/workoutInterface";
import {
  Exercise,
  SetDetails,
  ValidUnit,
  WorkoutExercise,
} from "@/types/interfaces/types";
import { workoutService } from "@/services/workoutService";

export default function AddExercise({
  setShowExerciseModal,
}: {
  setShowExerciseModal: (show: boolean) => void;
}) {
  const [chosenExercise, setChosenExercise] = useState<Exercise | null>(null);
  const [optionsChoice, setOptionsChoice] = useState<string | null>(null);
  const methods = useFormContext();
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
      sets: [
        {
          reps: undefined,
          weight: undefined,
          time: undefined,
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
  const { exercises: rawExercises } = useWorkout();
  // Map exercises to the expected format for WorkoutExercise
  const exercises: Exercise[] = rawExercises.map((ex: any) => ({
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
  const watchSets = watch("sets");

  // onSubmit logic from workout-session (we need to update the exercise list in the context)

  const onSubmit = useCallback(
    async (data: WorkoutExercise) => {
      const newExercise: ExerciseFormData = {
        exercise_id: parseInt(chosenExercise!.id),
        exercise_name: chosenExercise!.name,
        exercise_description: chosenExercise!.description,
        exercise_difficulty: chosenExercise!.difficulty,
        track_reps: 0,
        track_weight: 0,
        track_time: 0,
        track_distance: 0,
        validUnits: chosenExercise!.validUnits,
        musclesTargeted: chosenExercise!.musclesTargeted,
        equipment: chosenExercise!.equipment,
        sets: data.sets.map((set, idx) => ({
          ...set,
          set_order: idx,
        })),
        exercise_order: 0,
        // sets: data.sets.map((set) => ({
        //   reps: set.reps ?? 0,
        //   weight: set.weight ?? 0,
        //   time: set.time ?? 0,
        //   distance: set.distance ?? 0,
        // })),
      };
      const workoutId = methods.getValues("id");

      if (!db) {
        console.log("Database not found");
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
        console.log("error", error);
        return;
      }

      // steps to add the new exercise to the context
      // 1.get the new exercise from the context
      // 2. add the new exercise to the database
      // 3. get the returned exercise + sets from the database
      // 4. update the context with the new exercise + sets
      const currentExerciseList = methods.getValues("exercises");
      methods.setValue("exercises", [...currentExerciseList, newExerciseData]);
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
    [methods, getValues, reset, chosenExercise, setShowExerciseModal]
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
        exercises.find((exercise) => exercise.id.toString() === itemValue) ||
        null;
      if (foundExercise === null) {
        throw new Error("Exercise not found");
      }
      setValue("exercise", foundExercise);
      if (foundExercise.validUnits?.length === 1) {
        setValue("chosenUnitCombination", foundExercise.validUnits[0]);
        setOptionsChoice(foundExercise.validUnits[0].join("-"));
      }
      setChosenExercise(foundExercise);
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
              render={({ field: { onChange, value } }) => (
                <Picker
                  mode="dialog"
                  selectedValue={value?.id?.toString() || "NA"}
                  onValueChange={(itemValue) => {
                    handleExerciseChange(itemValue.toString(), onChange);
                  }}
                  accessibilityLabel="Exercise selection"
                  accessibilityHint="Select an exercise from the list"
                >
                  <Picker.Item label="Select exercise" value="NA" />
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
            <Text style={styles.textError}>{errors.exercise.message}</Text>
          )}
          {/* Exercise Information */}
          {chosenExercise && (
            <View>
              <View>
                <Text style={styles.exerciseName}>{chosenExercise.name}</Text>
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
  control: Control<WorkoutExercise>;
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
      render={({ field: { onChange, value } }) => (
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          keyboardType="numeric"
          onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
          value={value?.toString() ?? ""}
          accessibilityLabel={accessibilityLabel}
        />
      )}
    />
  );
  switch (options) {
    case "reps":
      return renderInput("reps", "Reps", `Set ${index + 1} reps`);
    case "weight":
      return renderInput("weight", "Weight (kg)", `Set ${index + 1} weight`);
    case "time":
      return renderInput("time", "Time (seconds)", `Set ${index + 1} time`);
    case "time-distance":
      return (
        <>
          {renderInput("time", "Time (seconds)", `Set ${index + 1} time`)}
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
