import {
  AccessibilityInfo,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  Modal,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorTheme } from "@/context/colorThemeContext";
import React, { useCallback, useEffect, useRef, useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  Control,
  Controller,
  FieldValues,
  Form,
  FormProvider,
  useFieldArray,
  UseFieldArrayAppend,
  useForm,
  useFormContext,
} from "react-hook-form";
import { LoggingStyleSelector } from "./loggingStyleSelector";
import { ExerciseLibraryModal } from "./exerciseLibraryModal";
import {
  AddExerciseForm,
  CreateWorkoutForm,
  WorkoutExercise,
} from "@/types/interfaces/types";

import { AddExerciseButton } from "./addExerciseButton";
import { EntryMethodSelector } from "./EntryMethodSelector";
import { SetBuilder } from "./setBuilder";

interface AddExerciseModalProps {
  WorkoutControl: Control<CreateWorkoutForm, any, CreateWorkoutForm>;

  appendExercise: UseFieldArrayAppend<CreateWorkoutForm, "exercises">;
}

export function AddExerciseModal({
  WorkoutControl,
  appendExercise,
}: AddExerciseModalProps) {
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const [selectedLoggingStyle, setSelectedLoggingStyle] = useState<
    "regular" | "superset" | "compound_set"
  >("regular");
  const [entryMethodSelector, setEntryMethodSelector] = useState<
    "quick_add" | "manual" | "auto_fill"
  >("quick_add");

  const methods = useFormContext<CreateWorkoutForm>();
  const workoutId = methods.getValues("id");
  const exerciseCount = methods.getValues("exercises")?.length;
  const { theme } = useColorTheme();

  const addExerciseMethods = useForm<AddExerciseForm>({
    defaultValues: {
      logging_style: "straight",
      exercises: [],
    },
  });

  const {
    fields: exerciseFields,
    append,
    remove,
  } = useFieldArray({
    control: addExerciseMethods.control,
    name: "exercises",
  });

  useEffect(() => {
    // Reset when logging style changes
    remove();
    setEntryMethodSelector("quick_add");
  }, [selectedLoggingStyle]);

  useEffect(() => {
    if (!modalVisible) {
      // cleanup when modal closes
      remove();
      setEntryMethodSelector("quick_add");
      setSelectedLoggingStyle("regular");
    }
  }, [modalVisible]);

  return (
    <FormProvider {...addExerciseMethods}>
      <View style={{ flex: 1 }}>
        <Pressable
          onPress={() => setModalVisible(true)}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
            {
              height: theme.spacing.buttonHeight,
              backgroundColor: theme.color.accent,
              borderColor: theme.color.border,
            },
          ]}
        >
          <Text>+ Exercise</Text>
        </Pressable>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          statusBarTranslucent={true}
          onRequestClose={() => {
            setModalVisible(false);
          }}
        >
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
              <Pressable onPress={() => setModalVisible(false)}>
                <MaterialIcons
                  name="cancel"
                  size={30}
                  style={{ marginTop: 10, alignSelf: "flex-end" }}
                  color={theme.color.accent}
                />
              </Pressable>
              <LoggingStyleSelector
                selectedLoggingStyle={selectedLoggingStyle}
                setSelectedLoggingStyle={setSelectedLoggingStyle}
              />
              <ExerciseLibraryModal
                selectedLoggingStyle={selectedLoggingStyle}
                remove={remove}
                append={append}
                workoutId={workoutId}
                exerciseCount={exerciseCount}
              />

              {exerciseFields.length > 0 && (
                <EntryMethodSelector
                  exercisesTotal={exerciseFields.length}
                  entryMethodSelector={entryMethodSelector}
                  setEntryMethodSelector={setEntryMethodSelector}
                />
              )}

              {exerciseFields.length > 0 && (
                <SetBuilder
                  entryMethodSelector={entryMethodSelector}
                  selectedLoggingStyle={selectedLoggingStyle}
                  control={addExerciseMethods.control}
                  exerciseFields={exerciseFields}
                />
              )}
              <AddExerciseButton
                setModalVisible={setModalVisible}
                appendExercise={appendExercise}
              />
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
