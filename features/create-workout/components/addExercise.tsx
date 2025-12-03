import { useCallback, useEffect, useState } from "react";
import { useColorTheme } from "@/context/colorThemeContext";
import {
  AccessibilityInfo,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import {
  Control,
  Controller,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form";
import { AppButton } from "@/components/button";
import { ValidUnit } from "@/types/interfaces/types";
import { Exercise, ExerciseFormData } from "@/types/type";
import { ExerciseProps } from "../types/type";
import { Ionicons } from "@expo/vector-icons";
import Entypo from "@expo/vector-icons/Entypo";

export function AddExercise({
  workoutType,
  exerciseList,
  setShowExerciseModal,
}: ExerciseProps) {
  const [chosenExercise, setChosenExercise] = useState<Exercise | null>(null);
  const [optionsChoice, setOptionsChoice] = useState<string | null>(null);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const { theme } = useColorTheme();
  const methods = useFormContext();

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled);
  }, []);

  const {
    control,
    handleSubmit,
    reset,
    setError,
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
          reps: 0,
          weight: 0,
          duration: 0,
          distance: 0,
        },
      ],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "sets",
  });

  const watchSetsLen = watch("sets").length;

  const onSubmit = useCallback(
    (data: ExerciseFormData) => {
      //console.log("data", data);
      if (data.exercise_id === -1) {
        setError("exercise_id", { message: "Please select an exercise" });
        return;
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
        exercise_order: 0,
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
            reps: 0,
            weight: 0,
            duration: 0,
            distance: 0,
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
            reps: 0,
            weight: 0,
            duration: 0,
            distance: 0,
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
      reps: 0,
      weight: 0,
      duration: 0,
      distance: 0,
      set_order: 0,
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
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.headerContainer]}>
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
                backgroundColor: theme.warning,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
              onPress={handleCloseModal}
              textStyle={{ color: theme.textPrimary }}
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
        <View style={{ flex: 1 }}>
          <Text style={[styles.text, { color: theme.textPrimary }]}>
            Select exercise
          </Text>
          <View
            style={[
              styles.pickerContainer,
              {
                margin: 0,
                padding: 0,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.accentStrong,
              },
            ]}
          >
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
                  style={[
                    {
                      height: 50,
                      backgroundColor: theme.surface,
                      color: theme.textPrimary,
                    },
                  ]}
                >
                  <Picker.Item label="Select exercise" value="NA" />
                  {exerciseList.map((exercise) => (
                    <Picker.Item
                      key={exercise.exercise_id}
                      label={exercise.exercise_name}
                      value={exercise.exercise_id.toString()}
                      style={[
                        {
                          backgroundColor: theme.surface,
                          color: theme.textPrimary,
                        },
                      ]}
                    />
                  ))}
                </Picker>
              )}
            />
          </View>
          {errors.exercise_id && (
            <Text style={[styles.textError, { color: theme.danger }]}>
              {errors.exercise_id.message}
            </Text>
          )}
          {/* Exercise Information */}
          {chosenExercise && (
            <View style={{}}>
              <View style={[styles.hr, { borderBottomColor: theme.hr }]} />
              <View style={{}}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.exerciseName,
                        { color: theme.textPrimary },
                      ]}
                    >
                      {`${chosenExercise.exercise_name}`}
                    </Text>

                    <Text
                      style={[
                        styles.setDetailsHeader,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {chosenExercise.exercise_description}
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
                          backgroundColor: pressed
                            ? theme.surface
                            : "transparent",
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                      ]}
                      onPress={handleAddSet}
                    >
                      <View style={[styles.addIconContainer]}>
                        <Ionicons
                          name="add"
                          size={20}
                          color={theme.accentStrong}
                        />
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
                      style={({ pressed }) => [
                        {
                          backgroundColor: pressed
                            ? theme.surface
                            : "transparent",
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                      ]}
                      onPress={() => handleRemoveSet(watchSetsLen - 1)}
                    >
                      <View style={[styles.addIconContainer]}>
                        <Entypo
                          name="minus"
                          size={24}
                          color={theme.accentStrong}
                        />
                      </View>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* If the exercise has more than one option we need to give the user the options */}
              {chosenExercise.validUnits &&
                chosenExercise.validUnits.length > 1 && (
                  <>
                    <Text
                      style={[
                        styles.optionsLabel,
                        { color: theme.textPrimary },
                      ]}
                    >
                      Options
                    </Text>
                    <View
                      style={[
                        styles.pickerContainer,
                        {
                          margin: 0,
                          padding: 0,
                          backgroundColor: theme.surface,
                          borderWidth: 1,
                          borderColor: theme.accentStrong,
                        },
                      ]}
                    >
                      <Picker
                        mode="dialog"
                        onValueChange={onOptionChange}
                        accessibilityLabel="Exercise options"
                        accessibilityHint="Select the type of measurement for this exercise"
                        style={[
                          {
                            height: 50,
                            backgroundColor: theme.surface,
                            color: theme.textPrimary,
                          },
                        ]}
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
              title="Add exercise"
              onPress={handleSubmit(onSubmit)}
              style={styles.addExerciseButton}
              textStyle={{ color: theme.textPrimary }}
            />
          )}
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
  const { theme } = useColorTheme();

  const renderInput = (
    name: keyof ExerciseFormData["sets"][number],
    placeholder: string,
    accessibilityLabel: string
  ) => {
    return (
      <Controller
        key={`${index}-${name}`}
        name={`sets.${index}.${name}`}
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
      return renderInput("weight", "kg", `Set ${index + 1} weight`);
      break;
    case "time":
      return renderInput("duration", "sec.", `Set ${index + 1} time`);
      break;
    case "distance":
      return renderInput("distance", "m", `Set ${index + 1} distance`);
      break;
    case "time-distance":
      return [
        renderInput("duration", "sec.", `Set ${index + 1} time`),
        renderInput("distance", "m", `Set ${index + 1} distance`),
      ];
      break;
    case "reps-weight":
      return [
        renderInput("reps", "Reps", `Set ${index + 1} reps`),
        renderInput("weight", "kg", `Set ${index + 1} weight`),
      ];
      break;
    default:
      return null;
  }
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
    marginTop: 4,
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
    fontWeight: "500",
  },
  setDetailsHeader: {
    marginTop: 4,
    marginBottom: 20,
    textAlign: "left",
    fontSize: 16,
    fontWeight: "500",
    color: "#4B5563",
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
    marginVertical: 20,
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
