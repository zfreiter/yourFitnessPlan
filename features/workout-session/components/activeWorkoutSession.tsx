import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Workout, Exercise, ExerciseType } from "@/types/type";
import {
  useForm,
  FormProvider,
  Controller,
  useFormContext,
  useWatch,
} from "react-hook-form";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Picker } from "@react-native-picker/picker";
import { Dispatch, SetStateAction, useState, memo, useCallback } from "react";
import { WorkoutUpdateFormValues } from "@/features/create-workout/types/type";
import AddExercise from "./addExercise";
import { AppButton } from "@/components/button";
import ExerciseCard from "./exerciseCard";
import ReorderableExerciseList from "./reorderableExerciseList";

export default function ActiveWorkoutSession({
  workout,
}: {
  workout: Workout;
}) {
  //console.log("workout in ActiveWorkoutSession", workout);
  const methods = useForm<WorkoutUpdateFormValues>({
    defaultValues: {
      id: workout.id,
      name: workout.name,
      description: workout.description,
      type: workout.workoutType,
      date: new Date(workout.date + " " + workout.time),
      duration: workout.duration,
      exercises: workout.exercises,
      isCompleted: workout.isCompleted,
    },
  });

  const {
    control,
    getValues,
    formState: { errors },
  } = methods;
  const [mode, setMode] = useState<"date" | "time">("time");
  const [show, setShow] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [workoutType, setWorkoutType] = useState(workout.workoutType);
  const openDatePicker = () => {
    setMode("date");
    setShow(true);
  };

  const exercises = useWatch({
    control,
    name: "exercises",
  });

  // Memoized header component
  const MyListHeaderComponent = memo(function MyListHeaderComponent({
    setWorkoutType,
    workoutType,
    setShowExerciseModal,
    showExerciseModal,
  }: {
    setWorkoutType: Dispatch<SetStateAction<ExerciseType>>;
    workoutType: ExerciseType;
    setShowExerciseModal: Dispatch<SetStateAction<boolean>>;
    showExerciseModal: boolean;
  }) {
    return (
      <View style={{ flexDirection: "column", gap: 10, marginBottom: 10 }}>
        <WorkoutTypePicker
          setWorkoutType={setWorkoutType}
          items={[
            "Select workout",
            "strength",
            "cardio",
            "mobility",
            "circuit",
          ]}
          name="type"
          workoutType={workoutType}
        />
        <AppButton
          title="Add exercise"
          onPress={() => setShowExerciseModal(true)}
        />
        <Modal
          animationType="slide"
          transparent={false}
          visible={showExerciseModal}
          onRequestClose={() => {
            setShowExerciseModal(!showExerciseModal);
          }}
        >
          <AddExercise setShowExerciseModal={setShowExerciseModal} />
        </Modal>
      </View>
    );
  });

  const renderHeader = useCallback(
    () => (
      <MyListHeaderComponent
        setWorkoutType={setWorkoutType}
        workoutType={workoutType}
        setShowExerciseModal={setShowExerciseModal}
        showExerciseModal={showExerciseModal}
      />
    ),
    [setWorkoutType, workoutType, setShowExerciseModal, showExerciseModal]
  );

  const renderFooter = useCallback(
    () => (
      <View style={{ flexDirection: "column", gap: 10, marginBottom: 10 }}>
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
                {getValues().date.toLocaleDateString()}
              </Text>
              <Text style={{ margin: 5 }}>
                {getValues().date.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
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
                value={value}
                mode={mode}
                is24Hour={false}
                display="default"
                onChange={(___, selectedDate) => {
                  onChange(selectedDate);
                  if (mode === "date") {
                    setMode("time");
                  } else {
                    setMode("date");
                    setShow(false);
                  }
                }}
              />
            )}
          />
        )}

        <GenericTextInput
          name="duration"
          placeholder="Workout Duration(minutes)"
          keyboardType="number-pad"
        />
        <GenericTextInput
          name="name"
          placeholder="Workout Name"
          keyboardType="default"
        />

        <Controller
          name="description"
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              placeholder="Workout Description"
              value={value}
              onChangeText={onChange}
              editable
              multiline
              numberOfLines={4}
              style={styles.areaTextInput}
            />
          )}
        />
      </View>
    ),
    [openDatePicker, mode, show, getValues, control]
  );

  return (
    <FormProvider {...methods}>
      <ReorderableExerciseList
        workout={workout}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
      />
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 10,
    borderColor: "black",
    borderWidth: 1,
    borderRadius: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: "medium",
  },
  textError: {
    fontSize: 16,
    fontWeight: "semibold",
    color: "red",
  },
  textInput: {
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
  pickerContainer: {
    width: "100%",
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 8,
    overflow: "hidden",
    padding: 0,
    height: 40,
    justifyContent: "center",
  },
  picker: {
    width: "100%",
  },
});

export function WorkoutTypePicker({
  setWorkoutType,
  workoutType,
  items,
  name,
}: {
  setWorkoutType: Dispatch<SetStateAction<ExerciseType>>;
  workoutType: ExerciseType;
  items: string[];
  name: string;
}) {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  return (
    <View>
      <Text style={[styles.text]}>Select Workout Type:</Text>

      <View style={styles.pickerContainer}>
        <Controller
          name={name}
          control={control}
          rules={{
            required: true,
            validate: (value) => value !== "Select workout",
          }}
          render={({ field: { onChange, onBlur } }) => (
            <Picker
              mode="dialog"
              style={[{ backgroundColor: "white", padding: 0 }]}
              selectedValue={workoutType}
              onValueChange={(value) => {
                setWorkoutType(value);
                onChange(value);
              }}
            >
              {items.map((item, index) => (
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
        {errors.type && <Text style={styles.textError}>Select workout</Text>}
      </View>
    </View>
  );
}

export function GenericTextInput({
  name,
  placeholder,
  keyboardType = "default",
}: {
  name: string;
  placeholder: string;
  keyboardType?:
    | "default"
    | "number-pad"
    | "decimal-pad"
    | "email-address"
    | "phone-pad"
    | "url";
}) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, onBlur, value } }) => (
        <TextInput
          placeholder={placeholder}
          keyboardType={keyboardType}
          value={String(value || "")}
          onChangeText={(text) => {
            // Only apply numeric filtering for number-pad keyboard type
            if (
              keyboardType === "number-pad" ||
              keyboardType === "decimal-pad"
            ) {
              const numericValue = text.replace(/[^0-9]/g, "");
              onChange(numericValue);
            } else {
              onChange(text);
            }
          }}
          style={styles.textInput}
        />
      )}
    />
  );
}
