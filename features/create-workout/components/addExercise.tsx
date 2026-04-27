import { useCallback, useEffect, useRef, useState } from "react";
import { useColorTheme } from "@/context/colorThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Crypto from "expo-crypto";
import {
  AccessibilityInfo,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ExerciseControl } from "./exerciseControl";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dropdown } from "react-native-element-dropdown";
import { useWorkout } from "@/context/workoutContext";

export function AddExercise({
  setShowExerciseModal,
}: {
  setShowExerciseModal: (show: boolean) => void;
}) {
  const [chosenExercise, setChosenExercise] = useState<Exercise | null>(null);
  const [optionsChoice, setOptionsChoice] = useState<string | null>(null);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const { theme } = useColorTheme();
  const methods = useFormContext();
  const { exercises } = useWorkout();
  const { bottom } = useSafeAreaInsets();
  const searchRef = useRef<TextInput>(null);

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
  } = useForm<Exercise>({
    defaultValues: {
      id: "",
      exercise_id: "",
      workout_id: "",
      exercise_name: "",
      exercise_description: "",
      exercise_difficulty: "",
      track_reps: 0,
      track_weight: 0,
      track_time: 0,
      track_distance: 0,
      sets: [],
    },
    mode: "onChange",
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "sets",
  });

  const watchSetsLen = watch("sets").length;

  const onSubmit = useCallback(
    (data: Exercise) => {
      if (data.exercise_id === "") {
        setError("exercise_id", { message: "Please select an exercise" });
        return;
      }
      const currentExerciseList = methods.getValues("exercises");
      const exerciseId = Crypto.randomUUID();
      const workoutId = methods.getValues("id");

      const newExercise: Exercise = {
        id: exerciseId,
        workout_id: workoutId,
        exercise_id: data.exercise_id,
        exercise_name: data.exercise_name,
        exercise_description: data.exercise_description,
        exercise_difficulty: data.exercise_difficulty,
        track_reps: data.track_reps,
        track_weight: data.track_weight,
        track_time: data.track_time,
        track_distance: data.track_distance,
        sets: data.sets.map((set) => ({
          ...set,
          workout_exercise_id: exerciseId,
        })),
        exercise_order: 0,
      };

      methods.setValue("exercises", [...currentExerciseList, newExercise]);

      reset({
        exercise_id: "",
        workout_id: "",
        exercise_name: "",
        exercise_description: "",
        exercise_difficulty: "",
        track_reps: 0,
        track_weight: 0,
        track_time: 0,
        track_distance: 0,
        sets: [],
      });
      setChosenExercise(null);
      setOptionsChoice(null);
      setShowExerciseModal(false);
      setValue("exercise_id", "");
    },
    [getValues, methods, reset, chosenExercise, setShowExerciseModal],
  );

  const handleExerciseChange = useCallback(
    (itemValue: string, onChange: (value: string) => void) => {
      onChange(itemValue);

      if (itemValue === "NA") {
        setChosenExercise(null);
        setOptionsChoice(null);
        reset({
          exercise_id: "",
          exercise_name: "",
          exercise_description: "",
          exercise_difficulty: "",
          track_reps: 0,
          track_weight: 0,
          track_time: 0,
          track_distance: 0,
          sets: [],
        });
        return;
      }

      const foundExercise =
        exercises.find(
          (exercise) => exercise.exercise_id.toString() === itemValue,
        ) ?? null;

      if (!foundExercise) throw new Error("Exercise not found");

      const autoUnit =
        foundExercise.validUnits?.length === 1
          ? foundExercise.validUnits[0]
          : null;

      reset({
        exercise_id: foundExercise.exercise_id,
        exercise_name: foundExercise.exercise_name,
        exercise_description: foundExercise.exercise_description,
        exercise_difficulty: foundExercise.exercise_difficulty,
        track_reps: autoUnit?.includes("reps") ? 1 : 0,
        track_weight: autoUnit?.includes("weight") ? 1 : 0,
        track_time: autoUnit?.includes("time") ? 1 : 0,
        track_distance: autoUnit?.includes("distance") ? 1 : 0,
        sets: [],
      });

      setChosenExercise(foundExercise);
      setOptionsChoice(autoUnit ? autoUnit.join("-") : null);
    },
    [exercises, reset],
  );

  const onOptionChange = useCallback(
    (option: string) => {
      const optionValue: ValidUnit[] = option.split("-") as ValidUnit[];
      setValue("track_reps", optionValue.includes("reps") ? 1 : 0);
      setValue("track_weight", optionValue.includes("weight") ? 1 : 0);
      setValue("track_time", optionValue.includes("time") ? 1 : 0);
      setValue("track_distance", optionValue.includes("distance") ? 1 : 0);
      setOptionsChoice(option);
      reset({
        ...getValues(),
        sets: [],
      });
    },
    [setValue, replace],
  );

  const handleCloseModal = useCallback(() => {
    setShowExerciseModal(false);
  }, [setShowExerciseModal]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.color.accent }}
      edges={["top", "bottom"]}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: theme.spacing.screenPadding,
          backgroundColor: theme.color.background,
        }}
      >
        {/* Close button — outside KAV so it never moves */}
        <View style={{ marginTop: 20 }}>
          <Pressable onPress={handleCloseModal}>
            <MaterialIcons
              name="cancel"
              size={30}
              style={{ alignSelf: "flex-end" }}
              color={theme.color.accent}
            />
          </Pressable>
        </View>

        {/* KAV wraps only the ScrollView so it shrinks when keyboard opens */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={40}
        >
          <ScrollView
            contentContainerStyle={{
              paddingTop: theme.spacing.xl,
              paddingBottom: 60,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={true}
          >
            <View style={{ flex: 1, gap: theme.spacing.lg }}>
              {/* Exercise picker */}
              <View style={{ flex: 1, gap: theme.spacing.label }}>
                <Text
                  style={[
                    styles.text,
                    {
                      fontFamily: theme.fonts.headerBody,
                      fontSize: 18,
                      color: theme.color.textPrimary,
                    },
                  ]}
                >
                  Select exercise
                </Text>

                <View
                  style={[
                    styles.pickerContainer,
                    {
                      height: theme.spacing.buttonHeight,
                      borderWidth: 1,
                      borderColor: theme.color.border,
                      borderRadius: 8,
                      backgroundColor: theme.color.surface,
                      justifyContent: "center",
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
                      <Dropdown
                        flatListProps={{
                          initialNumToRender: 10,
                          maxToRenderPerBatch: 10,
                          windowSize: 5,
                        }}
                        renderInputSearch={(onSearch) => (
                          <TextInput
                            ref={searchRef}
                            onChangeText={onSearch}
                            placeholder="Search..."
                            autoFocus
                            style={{
                              backgroundColor: theme.color.surface,
                              paddingHorizontal: theme.spacing.md,
                              paddingVertical: theme.spacing.sm,
                              borderBottomWidth: 1,
                              borderColor: theme.color.border,
                              color: theme.color.textPrimary,
                              fontFamily: theme.fonts.body,
                            }}
                            placeholderTextColor={theme.color.placeholderColor}
                          />
                        )}
                        data={exercises.map((e) => ({
                          label: e.exercise_name,
                          value: e.id.toString(),
                        }))}
                        fontFamily={theme.fonts.body}
                        iconColor={theme.color.accent}
                        search
                        searchPlaceholder="Search exercise..."
                        labelField="label"
                        valueField="value"
                        placeholder="Select exercise"
                        value={value === "NA" ? null : value}
                        onBlur={onBlur}
                        onChange={(item) => {
                          handleExerciseChange(item.value, (val) => {
                            onChange(val);
                          });
                        }}
                        accessibilityLabel="Exercise selection"
                        style={{
                          backgroundColor: theme.color.surface,
                          marginLeft: theme.spacing.md,
                          paddingHorizontal: theme.spacing.md,
                          borderRadius: 8,
                        }}
                        containerStyle={{
                          backgroundColor: theme.color.surface,
                        }}
                        itemTextStyle={{
                          color: theme.color.textPrimary,
                          fontFamily: theme.fonts.body,
                        }}
                        selectedTextStyle={{
                          color: theme.color.textPrimary,
                          fontFamily: theme.fonts.body,
                        }}
                        placeholderStyle={{
                          color: theme.color.textPrimary,
                          fontFamily: theme.fonts.body,
                        }}
                        inputSearchStyle={{
                          color: theme.color.textPrimary,
                          fontFamily: theme.fonts.body,
                        }}
                      />
                    )}
                  />
                </View>
                {errors.exercise_id && (
                  <Text
                    style={[styles.textError, { color: theme.color.danger }]}
                  >
                    {errors.exercise_id.message}
                  </Text>
                )}
              </View>

              {/* Exercise options and sets */}
              <ExerciseControl
                chosenExercise={chosenExercise}
                control={control}
                watchSetsLen={watchSetsLen}
                optionsChoice={optionsChoice}
                onOptionChange={onOptionChange}
                fields={fields}
                append={append}
                remove={remove}
                replace={replace}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Button anchored below KAV — never bounces */}
        <AppButton
          title="Add exercise"
          onPress={handleSubmit(onSubmit)}
          style={{ marginBottom: bottom + 16 }}
          textStyle={{ color: theme.color.textPrimary }}
          disabled={chosenExercise === null}
        />
      </View>
    </SafeAreaView>
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
    accessibilityLabel: string,
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
              style={[
                styles.setInputLabel,
                { color: theme.color.textSecondary },
              ]}
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
                  color: theme.color.textPrimary,
                  backgroundColor: theme.color.surface,
                  borderWidth: 1,
                  borderColor: theme.color.accent,
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

  switch (options) {
    case "reps":
      return renderInput("reps", "Reps", `Set ${index + 1} reps`);
    case "weight":
      return renderInput("weight", "kg", `Set ${index + 1} weight`);
    case "time":
      return renderInput("duration", "sec.", `Set ${index + 1} time`);
    case "distance":
      return renderInput("distance", "m", `Set ${index + 1} distance`);
    case "time-distance":
      return [
        renderInput("duration", "sec.", `Set ${index + 1} time`),
        renderInput("distance", "m", `Set ${index + 1} distance`),
      ];
    case "reps-weight":
      return [
        renderInput("reps", "Reps", `Set ${index + 1} reps`),
        renderInput("weight", "kg", `Set ${index + 1} weight`),
      ];
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
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
  },
  scrollViewContainer: {},
  headerContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
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
