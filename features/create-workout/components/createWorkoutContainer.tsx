import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useCallback, useState } from "react";
import { AddExercise } from "./addExercise";
import { router, useFocusEffect } from "expo-router";
import { useForm, Controller, useWatch, FormProvider } from "react-hook-form";
import { ExerciseType, ValidUnit, Difficulty } from "@/types/interfaces/types";
import { Exercise, CreateWorkoutForm } from "@/types/type";
import { workoutService } from "@/services/workoutService";
import { AppButton } from "@/components/button";
import { useWorkout } from "@/context/workoutContent";
import { useDatabase } from "@/context/databaseContext";
import ExerciseListItem from "./exerciseListItem";
import AntDesign from "@expo/vector-icons/AntDesign";

// Helper function to get current date in user's timezone
const getCurrentDateInLocalTimezone = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper function to get current time in user's timezone
const getCurrentTimeInLocalTimezone = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

// Helper function to parse date string in local timezone
const parseDateInLocalTimezone = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
};

type CreateWorkoutContainerProps = {
  exerciseList: Exercise[];
};

export function CreateWorkoutContainer({
  exerciseList,
}: CreateWorkoutContainerProps) {
  const [workoutType, setWorkoutType] =
    useState<ExerciseType>("Select workout");
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const { workouts, setWorkouts } = useWorkout();
  const { db } = useDatabase();
  // Form state
  const methods = useForm<CreateWorkoutForm>({
    defaultValues: {
      name: "",
      description: "",
      duration: undefined,
      date: getCurrentDateInLocalTimezone(),
      time: getCurrentTimeInLocalTimezone(),
      workoutType: "Select workout",
      exercises: [],
      isCompleted: false,
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
  const openDatePicker = () => {
    setMode("date");
    setShow(true);
  };

  useFocusEffect(
    useCallback(() => {
      return () => {
        console.log("Resetting state.");
        reset();
      };
    }, [])
  );

  const workoutExerciseListUpdate = useWatch({
    control,
    name: "exercises",
  });

  const onSubmit = async (data: CreateWorkoutForm) => {
    //console.log("data in onSubmit", data.date, data.time);

    if (db) {
      const result = await workoutService.insertWorkout(db, data);
      //console.log("result in onSubmit", result);
      if (result.success) {
        console.log(
          "Workout inserted successfully ",
          JSON.stringify(result.data?.exercises[0], null, 2)
        );
        if (result.data) {
          setWorkouts([...workouts, result.data]);
          // console.log(
          //   "result.data in onSubmit",
          //   result.data.date,
          //   result.data.time
          // );
        }
        reset();
        router.replace("/calendar");
      } else {
        console.error("Failed to insert workout:", result.error);
        // console.log("Failed to insert workout:");
      }
    }
  };
  // console.log(
  //   "test ",
  //   new Date().toISOString().split("T")[0],
  //   new Date().toLocaleTimeString([], {
  //     hour: "2-digit",
  //     minute: "2-digit",
  //   })
  // );
  // console.log(
  //   "time ",
  //   parseDateInLocalTimezone(getValues().date).toLocaleDateString()
  // );
  return (
    <TouchableWithoutFeedback //onPress={Keyboard.dismiss} web issues going to need to create a wrapper
      accessible={false}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingViewContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <FormProvider {...methods}>
          <ScrollView
            contentContainerStyle={styles.scrollViewContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View>
              <Text style={[styles.text, { marginTop: 10, marginLeft: 10 }]}>
                Select Workout Type:
              </Text>

              <View style={styles.pickerContainer}>
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
                      style={[{ backgroundColor: "white", padding: 0 }]}
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
                          style={styles.picker}
                        />
                      ))}
                    </Picker>
                  )}
                />
              </View>
              {errors.workoutType && (
                <Text style={styles.textError}>Select workout</Text>
              )}
            </View>

            {workout !== "Select workout" && (
              <AppButton
                title="Add exercise"
                onPress={() => setShowExerciseModal(true)}
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
                  style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                >
                  <AntDesign name="calendar" size={24} color="black" />
                  <Text style={{ textAlign: "center" }}>{mode}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 5 }}>
                  <Text style={{ margin: 5 }}>
                    {parseDateInLocalTimezone(
                      getValues().date
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                  <Text style={{ margin: 5 }}>
                    {getValues().time &&
                      new Date(
                        `1970-01-01T${getValues().time}`
                      ).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                  </Text>
                </View>
              </View>
            </Pressable>

            {show && (
              <Controller
                name="date"
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
                          // Update date field
                          const dateString =
                            selectedDate.toLocaleDateString("en-CA");
                          onChange(dateString);
                          setMode("time");
                        } else {
                          // Update time field
                          const timeString = selectedDate.toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            }
                          );
                          setValue("time", timeString);
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
                  keyboardType="number-pad"
                  value={value?.toString()}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, "");
                    onChange(numericValue);
                  }}
                  style={styles.textInput}
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
                  value={value.toString()}
                  onChangeText={onChange}
                  editable
                  style={styles.textInput}
                />
              )}
            />
            {errors.name && (
              <Text style={styles.textError}>Workout name is required</Text>
            )}
            <Controller
              name="description"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  placeholder="Workout Description"
                  value={value.toString()}
                  onChangeText={onChange}
                  editable
                  multiline
                  numberOfLines={4}
                  style={styles.areaTextInput}
                />
              )}
            />

            <AppButton
              title="Create workout"
              onPress={() => handleSubmit(onSubmit)()}
              style={styles.createWorkoutButton}
            />
          </ScrollView>
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
    margin: 10,
  },
  scrollViewContainer: {
    gap: 10,
  },
  textInput: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "white",
    borderColor: "black",
    borderWidth: 1,
    borderRadius: 8,
  },
  areaTextInput: {
    borderWidth: 1,
    borderColor: "black",
    minHeight: 80,
    textAlignVertical: "top",
    backgroundColor: "white",
    borderRadius: 8,
  },
  button: {
    marginTop: 10,
    padding: 10,
    borderColor: "black",
    borderWidth: 1,
    borderRadius: 8,
  },
  createWorkoutButton: {
    backgroundColor: "#0FBD83",
  },
});
