import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "../../../components/button";
import { WorkoutTypePicker } from "./WorkoutTypePicker";
import AddExercise from "./addExercise";
import { Controller, useFormContext } from "react-hook-form";
import { GenericTextInput } from "@/components/ui/GenericTextInput";
import { useDebouncedFieldUpdate } from "@/hooks/useDebouncedFieldUpdate";
import { useWorkout } from "@/context/workoutContext";

interface WorkoutSessionHeaderProps {
  showExerciseModal: boolean;
  handleAddExercise: () => void;
  handleCloseExerciseModal: () => void;
}

export function WorkoutSessionHeader({
  showExerciseModal,
  handleAddExercise,
  handleCloseExerciseModal,
}: WorkoutSessionHeaderProps) {
  const { getValues, setValue, control, watch } = useFormContext();
  const { updateContextWorkoutField } = useWorkout();
  const watchName = watch("name");
  const [name, setName] = useState(watchName);
  const watchDescription = watch("description");
  const [description, setDescription] = useState(watchDescription);
  const workoutId = getValues("id");

  const debouncedUpdateName = useDebouncedFieldUpdate({
    fieldName: "name",
    workoutId,
    onSuccess: (workoutId, field, value) => {
      setValue("name", value);
      setName(value);
      updateContextWorkoutField(workoutId, "name", value);
    },
    onError: (field, error) => {
      setValue("name", watchName);
      setName(watchName);
      console.error("Error updating name:", error);
    },
  });

  const debouncedUpdateDescription = useDebouncedFieldUpdate({
    fieldName: "description",
    workoutId,
    onSuccess: (workoutId, field, value) => {
      setValue("description", value);
      setDescription(value);
      updateContextWorkoutField(workoutId, "description", value);
    },
    onError: (field, error) => {
      setValue("description", watchDescription);
      setDescription(watchDescription);
      console.error("Error updating description:", error);
    },
  });

  useEffect(() => {
    if (watchName !== name) {
      debouncedUpdateName(watchName);
    }
    if (watchDescription !== description) {
      debouncedUpdateDescription(watchDescription);
    }
  }, [watchName, watchDescription]);

  return (
    <View style={styles.container}>
      <GenericTextInput
        name="name"
        placeholder="Workout Name"
        title="Workout Name"
        keyboardType="default"
      />
      <WorkoutTypePicker
        items={["Select workout", "strength", "cardio", "mobility", "circuit"]}
        name="type"
        workoutType={getValues().type}
      />
      <View>
        <Text style={{ fontSize: 16, fontWeight: "bold" }}>
          Workout Description
        </Text>
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
              style={{
                borderWidth: 1,
                borderColor: "black",
                minHeight: 80,
                textAlignVertical: "top",
                backgroundColor: "white",
                borderRadius: 8,
              }}
            />
          )}
        />
      </View>

      <AppButton
        title="Add exercise"
        style={{ marginBottom: 10, marginTop: 0 }}
        onPress={handleAddExercise}
      />
      <Modal
        animationType="slide"
        transparent={false}
        visible={showExerciseModal}
        onRequestClose={handleCloseExerciseModal}
      >
        <AddExercise setShowExerciseModal={handleCloseExerciseModal} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
});
