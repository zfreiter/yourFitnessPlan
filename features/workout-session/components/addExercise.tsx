import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Crypto from "expo-crypto";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import {
  Controller,
  useForm,
  useFieldArray,
  useFormContext,
} from "react-hook-form";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useState, useCallback, useRef } from "react";
import { useWorkout } from "@/context/workoutContext";
import { AppButton } from "@/components/button";
import { Exercise } from "@/types/common/workoutInterface";
import { ValidUnit } from "@/types/interfaces/types";
import { useColorTheme } from "@/context/colorThemeContext";
import { Dropdown } from "react-native-element-dropdown";
import { ExerciseControl } from "@/features/create-workout/components/exerciseControl";
import { workoutService } from "@/services/workoutService";
import { useAuth } from "@/context/authContext";

export default function AddExercise({
  setShowExerciseModal,
}: {
  setShowExerciseModal: (show: boolean) => void;
}) {
  const [chosenExercise, setChosenExercise] = useState<Exercise | null>(null);
  const [optionsChoice, setOptionsChoice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { bottom } = useSafeAreaInsets();
  const methods = useFormContext();
  const { theme } = useColorTheme();
  const { exercises, addWorkoutExercise } = useWorkout();
  const { user } = useAuth();
  const searchRef = useRef<TextInput>(null);

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

  // onSubmit logic from workout-session (we need to update the exercise list in the context)

  const onSubmit = useCallback(
    async (data: Exercise) => {
      // Validate that an exercise is selected
      if (data.exercise_id === "") {
        setError("exercise_id", { message: "Please select an exercise" });
        return;
      }

      const currentExerciseList = methods.getValues("exercises");
      const workoutId = methods.getValues("id");

      const exerciseId = Crypto.randomUUID();

      const submitExercise: Exercise = {
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
        validUnits: chosenExercise!.validUnits,
        musclesTargeted: [],
        equipment: [],
        sets: data.sets.map((set) => ({
          ...set,
          workout_exercise_id: exerciseId,
        })),
        exercise_order: methods.getValues("exercises").length + 1,
      };

      // workout service
      const response = await workoutService.updateWorkoutNewExercise(
        user?.id!,
        workoutId,
        submitExercise,
      );

      if (!response.success) return;

      methods.setValue("exercises", [...currentExerciseList, submitExercise]);
      addWorkoutExercise(submitExercise, workoutId);

      reset({
        exercise_id: "",
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
        return;
      }

      const foundExercise =
        exercises.find(
          (exercise) => exercise.exercise_id.toString() === itemValue,
        ) || null;

      if (!foundExercise) throw new Error("Exercise not found");

      const autoUnit =
        foundExercise.validUnits?.length === 1
          ? foundExercise.validUnits[0]
          : null;

      // Single reset instead of 8 setValue calls
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
      console.log("optionValue: ", optionValue);
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
          backgroundColor: theme.color.background,
          padding: theme.spacing.screenPadding,
        }}
      >
        <View style={{ marginTop: 20, marginRight: 0 }}>
          <Pressable onPress={handleCloseModal}>
            <MaterialIcons
              name="cancel"
              size={30}
              style={{ alignSelf: "flex-end" }}
              color={theme.color.accent}
            />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingTop: theme.spacing.xl }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={true}
        >
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
                      autoFocus // 💥 THIS works
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
            <Text style={[styles.textError, { color: theme.color.danger }]}>
              {errors.exercise_id.message}
            </Text>
          )}
          {/* Exercise Information 
          Handles everything to do with the exercise options*/}
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
        </ScrollView>

        <AppButton
          title={isSubmitting ? "Adding exercise..." : "Add exercise"}
          onPress={handleSubmit(onSubmit)}
          style={{ marginBottom: bottom + 16 }}
          textStyle={{ color: theme.color.textPrimary }}
          disabled={chosenExercise === null}
        />
      </View>
    </SafeAreaView>
  );
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
