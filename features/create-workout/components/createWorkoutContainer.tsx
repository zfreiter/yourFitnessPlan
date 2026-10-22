import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Crypto from "expo-crypto";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import DurationWheelPicker from "./durationWheelPicker";
import { useAuth } from "@/context/authContext";
import { useColorTheme } from "@/context/colorThemeContext";
import { useWorkout } from "@/context/workoutContext";

import * as Localization from "expo-localization";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import AntDesign from "@expo/vector-icons/AntDesign";

import { AppButton } from "@/components/button";
import { AddExercise } from "./addExercise";
import ExerciseListItem from "./exerciseListItem";
import { workoutService } from "@/services/workoutService";
import { ExerciseType } from "@/types/interfaces/types";
import { CreateWorkoutForm, Exercise, Workout } from "@/types/type";

import { useBlurOnKeyboardHide } from "@/hooks/useBlurOnKeyboardClose";

// Helper function to get current date in user's timezone
const getCurrentDateInLocalTimezone = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const DEFAULT_TIME = "12:00";
const getDatePart = (dateTime: string) =>
  dateTime && dateTime.includes(" ") ? dateTime.split(" ")[0] : dateTime;
const getTimePart = (dateTime: string) => {
  if (!dateTime) return DEFAULT_TIME;
  if (dateTime.includes(" ")) return dateTime.split(" ")[1].slice(0, 5);
  const candidate = dateTime.slice(0, 5);
  return /\d{2}:\d{2}/.test(candidate) ? candidate : DEFAULT_TIME;
};
const combineDateTime = (datePart: string, timePart: string) =>
  `${datePart} ${timePart}`;

const parseDateInLocalTimezone = (dateString: string) => {
  const datePart = getDatePart(dateString) || getCurrentDateInLocalTimezone();
  const timePart = getTimePart(dateString) || DEFAULT_TIME;
  return new Date(`${datePart} ${timePart}:00`);
};

export function CreateWorkoutContainer() {
  const { user } = useAuth();
  const { theme } = useColorTheme();
  const { date } = useLocalSearchParams();
  const [workoutType, setWorkoutType] =
    useState<ExerciseType>("Select workout");
  const [isFocused, setIsFocused] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [isFocusedNameInput, setIsFocusedNameInput] = useState(false);
  const [isFocusedDescriptionInput, setIsFocusedDescriptionInput] =
    useState(false);
  const { workouts, setWorkouts, exercises } = useWorkout();

  const { bottom } = useSafeAreaInsets();

  const methods = useForm<Workout>({
    defaultValues: {
      id: Crypto.randomUUID(),
      name: "",
      description: "",
      duration: 0,
      scheduled_datetime: (() => {
        const initialDatePart =
          (date as string) || getCurrentDateInLocalTimezone();
        return combineDateTime(initialDatePart, DEFAULT_TIME);
      })(),
      workoutType: "Select workout",
      exercises: [],
      isCompleted: false,
      completed_at: null,
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = methods;

  const [mode, setMode] = useState<"date" | "time">("date");
  const [show, setShow] = useState(false);
  const userLocale = Localization.getLocales()[0]?.languageTag || "en-US";
  const userTimeZone = Localization.getCalendars()[0]?.timeZone;

  const openDatePicker = () => {
    setMode("date");
    setShow(true);
  };

  useEffect(() => {
    methods.register("scheduled_datetime");
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        reset({
          id: "",
          name: "",
          description: "",
          duration: 0,
          scheduled_datetime: combineDateTime(
            (date as string) || getCurrentDateInLocalTimezone(),
            DEFAULT_TIME,
          ),
          workoutType: "Select workout",
          exercises: [],
          isCompleted: false,
          completed_at: null,
        });
      };
    }, []),
  );

  useEffect(() => {
    if (date) {
      setValue(
        "scheduled_datetime",
        combineDateTime(date as string, DEFAULT_TIME),
        { shouldDirty: true, shouldValidate: false, shouldTouch: false },
      );
    }
  }, [date]);

  const workoutExerciseListUpdate = useWatch({ control, name: "exercises" });
  const scheduledDateTime = useWatch({ control, name: "scheduled_datetime" });

  const onSubmit = async (data: Workout) => {
    if (user?.id) {
      const result = await workoutService.insertWorkout(
        { ...data, user_id: user.id } as Workout,
        user.id,
      );
      if (result.success) {
        if (result.data) setWorkouts([...workouts, result.data]);
        reset();
        router.back();
      } else {
        console.error("Failed to insert workout:", result.error);
      }
    }
  };

  useBlurOnKeyboardHide();

  return (
    <FormProvider {...methods}>
      <View style={{ flex: 1, backgroundColor: theme.color.background }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollViewContainer,
            {
              gap: theme.spacing.lg,
              paddingVertical: theme.spacing.screenPadding,
              paddingHorizontal: theme.spacing.screenPadding,
            },
          ]}
          nestedScrollEnabled
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <View style={{ gap: theme.spacing.label }}>
            <Text
              style={[styles.fieldLabel, { color: theme.color.textSecondary }]}
            >
              NAME
            </Text>
            <Controller
              name="name"
              control={control}
              rules={{ required: true }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  placeholder="Workout name..."
                  placeholderTextColor={theme.color.placeholderColor}
                  value={value.toString()}
                  onFocus={() => setIsFocusedNameInput(true)}
                  onBlur={() => {
                    setIsFocusedNameInput(false);
                    onBlur();
                  }}
                  onChangeText={onChange}
                  style={[
                    styles.textInput,
                    {
                      height: theme.spacing.inputHeight,
                      paddingHorizontal: theme.spacing.lg,
                      color: theme.color.textPrimary,
                      backgroundColor: theme.color.input,
                      borderColor: isFocusedNameInput
                        ? theme.color.accentActive
                        : theme.color.border,
                    },
                  ]}
                />
              )}
            />
            {errors.name && (
              <Text style={[styles.errorText, { color: theme.color.danger }]}>
                Workout name is required
              </Text>
            )}
          </View>

          {/* Workout Type */}
          <View style={{ gap: theme.spacing.label }}>
            <Text
              style={[styles.fieldLabel, { color: theme.color.textSecondary }]}
            >
              WORKOUT TYPE
            </Text>
            <View
              style={[
                styles.pickerWrapper,
                {
                  borderColor: isFocused
                    ? theme.color.accentActive
                    : theme.color.border,
                  backgroundColor: theme.color.input,
                },
              ]}
            >
              <Controller
                name="workoutType"
                control={control}
                rules={{
                  required: true,
                  validate: (value) => value !== "Select workout",
                }}
                render={({ field: { onChange, value } }) => (
                  <Picker
                    mode="dialog"
                    selectionColor={theme.color.textPrimary}
                    dropdownIconColor={theme.color.accent}
                    style={{
                      backgroundColor: theme.color.input,
                      color: theme.color.textPrimary,
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    selectedValue={value}
                    onValueChange={(val) => {
                      setWorkoutType(val);
                      onChange(val);
                    }}
                  >
                    {[
                      "Select workout",
                      "strength",
                      "cardio",
                      "mobility",
                      "circuit",
                    ].map((item, index) => (
                      <Picker.Item
                        key={`workout-type-${index}`}
                        label={
                          item === "Select workout"
                            ? item
                            : item.charAt(0).toUpperCase() + item.slice(1)
                        }
                        value={item}
                        style={{
                          backgroundColor: theme.color.input,
                          color: theme.color.textPrimary,
                        }}
                      />
                    ))}
                  </Picker>
                )}
              />
            </View>
            {errors.workoutType && (
              <Text style={[styles.errorText, { color: theme.color.danger }]}>
                Select a workout type
              </Text>
            )}
          </View>

          {/* Description */}
          <View style={{ gap: theme.spacing.label }}>
            <Text
              style={[styles.fieldLabel, { color: theme.color.textSecondary }]}
            >
              DESCRIPTION
            </Text>
            <Controller
              name="description"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  placeholder="Add a description..."
                  placeholderTextColor={theme.color.placeholderColor}
                  value={value.toString()}
                  onFocus={() => setIsFocusedDescriptionInput(true)}
                  onBlur={() => {
                    setIsFocusedDescriptionInput(false);
                    onBlur();
                  }}
                  onChangeText={onChange}
                  multiline
                  style={[
                    styles.areaTextInput,
                    {
                      padding: theme.spacing.lg,
                      backgroundColor: theme.color.input,
                      color: theme.color.textPrimary,
                      borderColor: isFocusedDescriptionInput
                        ? theme.color.accentActive
                        : theme.color.border,
                    },
                  ]}
                />
              )}
            />
          </View>

          {/* Add Exercise */}
          <AppButton
            title="Add Exercise"
            onPress={() => setShowExerciseModal(true)}
            style={{
              backgroundColor: theme.color.accent,
              borderColor: theme.color.border,
              height: theme.spacing.buttonHeight,
              borderWidth: 1,
              marginVertical: 0,
            }}
            textStyle={{ color: theme.color.textPrimary }}
          />

          {/* Exercise list */}
          {workoutExerciseListUpdate.length > 0 &&
            workoutExerciseListUpdate.map((exercise, index) => (
              <ExerciseListItem
                key={index}
                index={index}
                exercise={exercise}
                setValue={setValue}
                getValues={getValues}
              />
            ))}

          {/* Duration */}
          <View style={{ gap: theme.spacing.label }}>
            <Text
              style={[styles.fieldLabel, { color: theme.color.textSecondary }]}
            >
              DURATION
            </Text>
            <DurationWheelPicker />
          </View>

          <Modal
            animationType="slide"
            transparent={false}
            visible={showExerciseModal}
            onRequestClose={() => setShowExerciseModal(false)}
            statusBarTranslucent={true}
          >
            <AddExercise setShowExerciseModal={setShowExerciseModal} />
          </Modal>

          {/* Date & Time */}
          <View style={{ gap: theme.spacing.label }}>
            <Text
              style={[styles.fieldLabel, { color: theme.color.textSecondary }]}
            >
              DATE & TIME
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.dateButton,
                {
                  backgroundColor: pressed
                    ? theme.color.surface2
                    : theme.color.input,
                  borderColor: theme.color.border,
                  height: theme.spacing.buttonHeight,
                },
              ]}
              onPress={openDatePicker}
            >
              <View style={styles.dateButtonLeft}>
                <AntDesign
                  name="calendar"
                  size={18}
                  color={theme.color.accent}
                />
                <Text
                  style={[
                    styles.fieldLabel,
                    { color: theme.color.textSecondary },
                  ]}
                >
                  {mode.toUpperCase()}
                </Text>
              </View>
              <View style={styles.dateButtonRight}>
                <Text
                  style={[styles.dateValue, { color: theme.color.textPrimary }]}
                >
                  {parseDateInLocalTimezone(
                    scheduledDateTime,
                  ).toLocaleDateString(userLocale, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    timeZone: userTimeZone || undefined,
                  })}
                </Text>
                <Text
                  style={[styles.dateValue, { color: theme.color.textPrimary }]}
                >
                  {parseDateInLocalTimezone(
                    scheduledDateTime,
                  ).toLocaleTimeString(userLocale, {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                    timeZone: userTimeZone || undefined,
                  })}
                </Text>
              </View>
            </Pressable>
          </View>

          {show && (
            <Controller
              name="scheduled_datetime"
              control={control}
              render={({ field: { onChange, value } }) => (
                <DateTimePicker
                  value={parseDateInLocalTimezone(value)}
                  mode={mode}
                  is24Hour={false}
                  display="default"
                  onChange={(_, selectedDate) => {
                    if (selectedDate) {
                      if (mode === "date") {
                        const yyyy = selectedDate.getFullYear();
                        const mm = String(selectedDate.getMonth() + 1).padStart(
                          2,
                          "0",
                        );
                        const dd = String(selectedDate.getDate()).padStart(
                          2,
                          "0",
                        );
                        onChange(
                          combineDateTime(
                            `${yyyy}-${mm}-${dd}`,
                            getTimePart(value) || DEFAULT_TIME,
                          ),
                        );
                        setMode("time");
                      } else {
                        const hh = String(selectedDate.getHours()).padStart(
                          2,
                          "0",
                        );
                        const min = String(selectedDate.getMinutes()).padStart(
                          2,
                          "0",
                        );
                        onChange(
                          combineDateTime(
                            getDatePart(value) ||
                              getCurrentDateInLocalTimezone(),
                            `${hh}:${min}`,
                          ),
                        );
                        setMode("date");
                        setShow(false);
                      }
                    }
                  }}
                />
              )}
            />
          )}
        </ScrollView>

        <AppButton
          title="Create Workout"
          onPress={() => handleSubmit(onSubmit)()}
          style={{
            height: theme.spacing.buttonHeight,
            marginHorizontal: theme.spacing.md,
            marginBottom: bottom + 16,
          }}
          textStyle={{ color: theme.color.textPrimary }}
        />
      </View>
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 2,
  },
  pickerWrapper: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    height: 40,
    justifyContent: "center",
  },
  pickerContainer: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  scrollViewContainer: {},
  textInput: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  areaTextInput: {
    borderWidth: 1,
    minHeight: 80,
    fontSize: 16,
    textAlignVertical: "top",
    borderRadius: 8,
  },
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  dateButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateButtonRight: {
    flexDirection: "row",
    gap: 8,
  },
  dateValue: {
    fontSize: 14,
  },
});
