import { useEffect, useState, useRef } from "react";
import { Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton } from "../../../components/button";
import { WorkoutTypePicker } from "./WorkoutTypePicker";
import AddExercise from "./addExercise";
import { Controller, useFormContext } from "react-hook-form";
import { GenericTextInput } from "@/components/ui/GenericTextInput";
import { useColorTheme } from "@/context/colorThemeContext";
import { useBlurOnKeyboardClose } from "@/hooks/useBlurOnKeyboardClose";
import { useWorkoutSession } from "@/context/WorkoutSessionContext";

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
  const { markDirty } = useWorkoutSession();

  const { theme } = useColorTheme();

  const NameInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);

  const [isDescriptionFocused, setIsDescriptionFocused] =
    useState<boolean>(false);
  const workoutId = getValues("id");

  useBlurOnKeyboardClose(NameInputRef);
  useBlurOnKeyboardClose(descriptionInputRef);

  return (
    <View style={{ gap: theme.spacing.lg }}>
      {/* Updates the current form but does not save to context or database */}
      <GenericTextInput
        name="name"
        inputRef={NameInputRef}
        placeholder="Workout Name"
        title="Workout Name"
        keyboardType="default"
      />

      {/* Updates on change */}
      <WorkoutTypePicker
        items={["Select workout", "strength", "cardio", "mobility", "circuit"]}
        name="type"
        workoutType={getValues().type}
        workoutId={workoutId}
      />

      <View style={{ gap: theme.spacing.label }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "bold",
            color: theme.color.textPrimary,
          }}
        >
          Workout Description
        </Text>
        <Controller
          name="description"
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              placeholder="Workout Description..."
              value={value}
              ref={descriptionInputRef}
              placeholderTextColor={theme.color.placeholderColor}
              onChangeText={(text) => {
                onChange(text);
                // Mark form as needing update and add field to update list
                markDirty("description");
              }}
              onFocus={() => setIsDescriptionFocused(true)}
              onBlur={() => {
                setIsDescriptionFocused(false);
                onBlur();
              }}
              editable
              multiline
              numberOfLines={4}
              style={{
                borderWidth: 1,
                padding: 10,
                borderColor: isDescriptionFocused
                  ? theme.color.accent
                  : theme.color.border,
                minHeight: 80,
                textAlignVertical: "top",
                backgroundColor: theme.color.surface,
                color: theme.color.textPrimary,
                borderRadius: 8,
              }}
            />
          )}
        />
      </View>

      <AppButton
        title="Add exercise"
        style={{
          marginBottom: 0,
          marginTop: 0,
        }}
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
  container: {},
});
