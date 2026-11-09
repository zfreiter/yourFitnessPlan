import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useColorTheme } from "@/context/colorThemeContext";
import {
  Control,
  useFieldArray,
  UseFieldArrayAppend,
  useFormContext,
  UseFormGetValues,
  UseFormReset,
} from "react-hook-form";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { CircuitRound, CreateCircuitForm, CreateWorkoutForm } from "@/types/interfaces/types";
import { CircuitSettings } from "./circuitSettings";
import { CircuitExercisePicker } from "./circuitExercisePicker";
import { ExerciseSetFields } from "./exerciseSetFields";
import { AddCircuitButton } from "./addCircuitButton";
import { Notes } from "./notes";

interface AddcircuitModalProps {
  control: Control<CreateCircuitForm>;
  reset: UseFormReset<CreateCircuitForm>;
  getCircuitValues: UseFormGetValues<CreateCircuitForm>;
  appendExercise: UseFieldArrayAppend<CreateWorkoutForm, "exercises">;
  emptyCircuit?: CircuitRound;
  onClosed?: () => void;
}

export function AddCircuitModal({
  control,
  reset,
  getCircuitValues,
  appendExercise,
  emptyCircuit,
  onClosed,
}: AddcircuitModalProps) {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const { theme } = useColorTheme();
  const { getValues } = useFormContext<CreateWorkoutForm>();
  const {
    fields: exerciseFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "exercises",
  });
  const workoutId = getValues("id");

  const [currentRound, setCurrentRound] = useState(1);

  useEffect(() => {
    if (!emptyCircuit) return;
    reset({ rounds: emptyCircuit.round_number, restAfterRound: emptyCircuit.rest_after_round, notes: emptyCircuit.notes ?? "", exercises: [] });
    setModalVisible(true);
  }, [emptyCircuit, reset]);

  const closeModal = () => {
    reset();
    setModalVisible(false);
    onClosed?.();
  };

  return (
    <View style={{ flex: 1, gap: 0 }}>
      <Pressable
        onPress={() => {
          reset(emptyCircuit ? { rounds: emptyCircuit.round_number, restAfterRound: emptyCircuit.rest_after_round, notes: emptyCircuit.notes ?? "", exercises: [] } : undefined);
          setModalVisible(true);
        }}
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
        <Text>+ Circuit</Text>
      </Pressable>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={closeModal}>
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: theme.color.background,
          }}
          edges={["top", "bottom"]}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View
              style={{
                flex: 1,
                paddingHorizontal: theme.spacing.screenPadding,
              }}
            >
              <Pressable
                style={{ alignSelf: "flex-end", marginTop: 10 }}
                onPress={closeModal}
              >
                <MaterialIcons
                  name="cancel"
                  size={30}
                  color={theme.color.accent}
                />
              </Pressable>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  gap: 20,
                  paddingBottom: 40,
                }}
              >
                <CircuitSettings control={control} />

                <CircuitExercisePicker
                  append={append}
                  workoutId={workoutId}
                  roundNumber={currentRound}
                  exerciseCount={exerciseFields.length}
                />

                <ExerciseSetFields
                  exerciseFields={exerciseFields}
                  control={control}
                  remove={remove}
                />

                <Notes control={control} />
              </ScrollView>

              <AddCircuitButton
                control={control}
                setModalVisible={visible => {
                  setModalVisible(visible);
                  if (visible === false) onClosed?.();
                }}
                reset={reset}
                modalVisible={modalVisible}
                getValues={getCircuitValues}
                workoutId={workoutId}
                appendExercise={appendExercise}
                circuitId={emptyCircuit?.id}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
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
    marginTop: 0,
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
