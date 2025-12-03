import { useCallback, useEffect, useState } from "react";
import { useColorTheme } from "@/context/colorThemeContext";
import {
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import * as Localization from "expo-localization";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { AppButton } from "@/components/button";
import { useDatabase } from "@/context/databaseContext";
import { useWorkout } from "@/context/workoutContext";
import { workoutService } from "@/services/workoutService";
import { ExerciseType } from "@/types/interfaces/types";
import { CreateWorkoutForm, Exercise } from "@/types/type";
import { AddExercise } from "./addExercise";
import ExerciseListItem from "./exerciseListItem";
import { useRouter } from "expo-router";
// Helper function to get current date in user's timezone
const getCurrentDateInLocalTimezone = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Date/time helpers to ensure consistent combined value: YYYY-MM-DDTHH:MM
const DEFAULT_TIME = "12:00";
const getDatePart = (dateTime: string) =>
  dateTime && dateTime.includes(" ") ? dateTime.split(" ")[0] : dateTime;
const getTimePart = (dateTime: string) => {
  if (!dateTime) return DEFAULT_TIME;
  if (dateTime.includes(" ")) return dateTime.split(" ")[1].slice(0, 5);
  // If only time is present (e.g., "08:30"), normalize to HH:MM
  const candidate = dateTime.slice(0, 5);
  return /\d{2}:\d{2}/.test(candidate) ? candidate : DEFAULT_TIME;
};
const combineDateTime = (datePart: string, timePart: string) =>
  `${datePart} ${timePart}`;

// Helper function to parse date/time string safely in local timezone
const parseDateInLocalTimezone = (dateString: string) => {
  const datePart = getDatePart(dateString) || getCurrentDateInLocalTimezone();
  const timePart = getTimePart(dateString) || DEFAULT_TIME;
  // Add seconds to avoid platform quirks, construct ISO-like local string
  return new Date(`${datePart} ${timePart}:00`);
};

type CreateWorkoutContainerProps = {
  exerciseList: Exercise[];
};

export function CreateWorkoutContainer({
  exerciseList,
}: CreateWorkoutContainerProps) {
  //const router = useRouter();
  const { theme } = useColorTheme();
  const { date } = useLocalSearchParams();
  const [workoutType, setWorkoutType] =
    useState<ExerciseType>("Select workout");
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [isFocusedDurationInput, setIsFocusedDurationInput] = useState(false);
  const [isFocusedNameInput, setIsFocusedNameInput] = useState(false);
  const [isFocusedDescriptionInput, setIsFocusedDescriptionInput] =
    useState(false);
  const { workouts, setWorkouts } = useWorkout();
  const { db } = useDatabase();
  const currentDate = new Date();
  currentDate.setHours(12, 0, 0, 0);

  // Form state
  const methods = useForm<CreateWorkoutForm>({
    defaultValues: {
      name: "",
      description: "",
      duration: undefined,
      scheduled_datetime: (() => {
        const initialDatePart = (date as string)
          ? (date as string)
          : getCurrentDateInLocalTimezone();
        const initialTimePart = DEFAULT_TIME;
        return combineDateTime(initialDatePart, initialTimePart);
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
  const [workout, setWorkout] = useState(getValues().workoutType);
  const [mode, setMode] = useState<"date" | "time">("date");
  const [show, setShow] = useState(false);
  const userLocale = Localization.getLocales()[0]?.languageTag || "en-US";
  const userTimeZone = Localization.getCalendars()[0]?.timeZone;
  const openDatePicker = () => {
    setMode("date");
    setShow(true);
  };

  // Ensure field is registered so programmatic updates are tracked by RHF
  useEffect(() => {
    methods.register("scheduled_datetime");
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        reset({
          name: "",
          description: "",
          duration: undefined,
          scheduled_datetime: (() => {
            const initialDatePart = (date as string)
              ? (date as string)
              : getCurrentDateInLocalTimezone();
            const initialTimePart = DEFAULT_TIME;
            return combineDateTime(initialDatePart, initialTimePart);
          })(),
          workoutType: "Select workout",
          exercises: [],
          isCompleted: false,
          completed_at: null,
        });
      };
    }, [])
  );

  useEffect(() => {
    if (date) {
      setValue(
        "scheduled_datetime",
        combineDateTime(date as string, DEFAULT_TIME),
        { shouldDirty: true, shouldValidate: false, shouldTouch: false }
      );
    }
  }, [date]);

  const workoutExerciseListUpdate = useWatch({
    control,
    name: "exercises",
  });
  const scheduledDateTime = useWatch({
    control,
    name: "scheduled_datetime",
  });
  const isCompleted = useWatch({ control, name: "isCompleted" });

  const onSubmit = async (data: CreateWorkoutForm) => {
    if (db) {
      const result = await workoutService.insertWorkout(db, data);
      if (result.success) {
        console.log(
          "Workout inserted successfully ",
          JSON.stringify(result.data?.exercises[0], null, 2)
        );
        if (result.data) {
          setWorkouts([...workouts, result.data]);
        }
        reset();
        router.back();
      } else {
        console.error("Failed to insert workout:", result.error);
      }
    }
  };

  return (
    <TouchableWithoutFeedback //onPress={Keyboard.dismiss} web issues going to need to create a wrapper
      accessible={false}
      onPress={Keyboard.dismiss}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[
          styles.keyboardAvoidingViewContainer,
          { backgroundColor: theme.background },
        ]}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <FormProvider {...methods}>
          <ScrollView
            contentContainerStyle={[styles.scrollViewContainer]}
            keyboardShouldPersistTaps="handled"
          >
            <View>
              <Text
                style={[
                  styles.text,
                  { marginTop: 10, marginBottom: 4, color: theme.textPrimary },
                ]}
              >
                Select Workout Type:
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
                  name="workoutType"
                  control={control}
                  rules={{
                    required: true,
                    validate: (value) => value !== "Select workout",
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Picker
                      mode="dialog"
                      selectionColor={theme.textPrimary}
                      style={[
                        {
                          height: 50,
                          backgroundColor: theme.surface,
                          color: theme.textPrimary,

                          marginLeft: 5,
                        },
                      ]}
                      selectedValue={value}
                      onValueChange={(value) => {
                        setWorkout(value);
                        onChange(value);
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
                          label={item}
                          value={item}
                          color="#0B1A17"
                          style={[
                            styles.picker,
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
              {errors.workoutType && (
                <Text style={[styles.textError, { color: theme.danger }]}>
                  Select workout
                </Text>
              )}
            </View>

            {workout !== "Select workout" && (
              <AppButton
                title="Add exercise"
                onPress={() => setShowExerciseModal(true)}
                style={{
                  backgroundColor: theme.surface,
                  borderColor: theme.accent,

                  height: 50,
                  borderWidth: 1,
                  marginVertical: 0,
                }}
                textStyle={{ color: theme.textPrimary }}
              />
            )}

            {workoutExerciseListUpdate.length > 0 &&
              workoutExerciseListUpdate.map((exercise, index) => (
                <ExerciseListItem
                  key={index}
                  exercise={exercise}
                  setValue={setValue}
                  getValues={getValues}
                />
              ))}

            <Modal
              animationType="slide"
              transparent={false}
              visible={showExerciseModal}
              onRequestClose={() => {
                setShowExerciseModal(!showExerciseModal);
              }}
            >
              <AddExercise
                workoutType={workoutType}
                exerciseList={exerciseList}
                setShowExerciseModal={setShowExerciseModal}
              />
            </Modal>

            <Pressable
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? "gray" : "white",
                },
                styles.button,
                {
                  backgroundColor: theme.surface,
                  height: 50,
                  borderWidth: 1,
                  borderColor: theme.accentStrong,
                },
              ]}
              onPress={openDatePicker}
            >
              <View
                style={{
                  flexDirection: "row",
                  gap: 5,
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    paddingLeft: 5,
                    flexDirection: "row",
                    alignItems: "baseline",
                    justifyContent: "flex-start",
                    gap: 5,
                  }}
                >
                  <AntDesign
                    name="calendar"
                    size={24}
                    color={theme.accentStrong}
                  />
                  <Text
                    style={[
                      {
                        fontSize: 16,
                        color: theme.textPrimary,
                      },
                    ]}
                  >
                    {mode}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 5 }}>
                  <Text style={[{ margin: 5, color: theme.textPrimary }]}>
                    {parseDateInLocalTimezone(
                      scheduledDateTime
                    ).toLocaleDateString(userLocale, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      timeZone: userTimeZone || undefined,
                    })}
                  </Text>
                  <Text style={[{ margin: 5, color: theme.textPrimary }]}>
                    {parseDateInLocalTimezone(
                      scheduledDateTime
                    ).toLocaleTimeString(userLocale, {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                      timeZone: userTimeZone || undefined,
                    })}
                  </Text>
                </View>
              </View>
            </Pressable>

            {show && (
              <Controller
                name="scheduled_datetime"
                control={control}
                render={({ field: { onChange, onBlur, value } }) => (
                  <DateTimePicker
                    value={parseDateInLocalTimezone(value)}
                    mode={mode}
                    is24Hour={false}
                    display="default"
                    onChange={(___, selectedDate) => {
                      if (selectedDate) {
                        if (mode === "date") {
                          // Update date part and preserve time
                          const yyyy = selectedDate.getFullYear();

                          const mm = String(
                            selectedDate.getMonth() + 1
                          ).padStart(2, "0");
                          const dd = String(selectedDate.getDate()).padStart(
                            2,
                            "0"
                          );
                          const dateString = `${yyyy}-${mm}-${dd}`;
                          const timePart = getTimePart(value) || DEFAULT_TIME;
                          onChange(combineDateTime(dateString, timePart));
                          setMode("time");
                        } else {
                          // Update time part and preserve date

                          const hh = String(selectedDate.getHours()).padStart(
                            2,
                            "0"
                          );
                          const min = String(
                            selectedDate.getMinutes()
                          ).padStart(2, "0");
                          const timeString = `${hh}:${min}`;
                          const datePart =
                            getDatePart(value) ||
                            getCurrentDateInLocalTimezone();
                          onChange(combineDateTime(datePart, timeString));

                          setMode("date");
                          setShow(false);
                        }
                      }
                    }}
                  />
                )}
              />
            )}

            <Controller
              name="duration"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  placeholder="Workout Duration(minutes)"
                  placeholderTextColor={theme.placeholderColor}
                  keyboardType="number-pad"
                  value={value?.toString()}
                  onFocus={() => setIsFocusedDurationInput(true)}
                  onBlur={() => {
                    setIsFocusedDurationInput(false);
                    onBlur();
                  }}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, "");
                    onChange(numericValue);
                  }}
                  style={[
                    styles.textInput,
                    {
                      height: 50,
                      color: theme.textPrimary,
                      backgroundColor: theme.surface,
                      borderColor: isFocusedDurationInput
                        ? theme.accentStrong
                        : theme.border,
                    },
                  ]}
                />
              )}
            />

            <Controller
              name="name"
              control={control}
              rules={{ required: true }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  placeholder="Workout Name"
                  placeholderTextColor={theme.placeholderColor}
                  value={value.toString()}
                  onFocus={() => setIsFocusedNameInput(true)}
                  onBlur={() => {
                    setIsFocusedNameInput(false);
                    onBlur();
                  }}
                  onChangeText={onChange}
                  editable
                  style={[
                    styles.textInput,
                    {
                      height: 50,
                      backgroundColor: theme.surface,
                      color: theme.textPrimary,
                      borderColor: isFocusedNameInput
                        ? theme.accentStrong
                        : theme.border,
                    },
                  ]}
                />
              )}
            />
            {errors.name && (
              <Text style={[styles.textError, { color: theme.danger }]}>
                Workout name is required
              </Text>
            )}
            <Controller
              name="description"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  placeholder="Workout Description"
                  placeholderTextColor={theme.placeholderColor}
                  value={value.toString()}
                  onFocus={() => setIsFocusedDescriptionInput(true)}
                  onBlur={() => {
                    setIsFocusedDescriptionInput(false);
                    onBlur();
                  }}
                  onChangeText={onChange}
                  editable
                  multiline
                  //numberOfLines={4}
                  style={[
                    styles.areaTextInput,
                    {
                      minHeight: 120,
                      backgroundColor: theme.surface,
                      color: theme.textPrimary,
                      borderColor: isFocusedDescriptionInput
                        ? theme.accentStrong
                        : theme.border,
                    },
                  ]}
                />
              )}
            />
          </ScrollView>
          <AppButton
            title="Create workout"
            onPress={() => handleSubmit(onSubmit)()}
            style={[styles.createWorkoutButton, { height: 50 }]}
            textStyle={{ color: theme.textPrimary }}
          />
        </FormProvider>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
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
    color: "red",
  },
  pickerContainer: {
    width: "100%",
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 8,
    overflow: "hidden",
    padding: 0,
  },
  picker: {
    width: "100%",
  },
  keyboardAvoidingViewContainer: {
    flex: 1,
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  scrollViewContainer: {
    gap: 20,
    marginBottom: 50,
  },
  textInput: {
    padding: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
    borderColor: "black",
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  areaTextInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "black",
    minHeight: 80,
    fontSize: 16,
    textAlignVertical: "top",
    borderRadius: 8,
  },
  button: {
    padding: 10,
    borderColor: "black",
    borderWidth: 1,
    borderRadius: 8,
  },
  createWorkoutButton: {
    backgroundColor: "#0FBD83",
    marginVertical: 40,
  },
});
