import { useState, useRef } from "react";
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
  const { getValues, control } = useFormContext();
  const { markDirty, trackWorkoutUpdate } = useWorkoutSession();
  const { theme } = useColorTheme();

  const NameInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);

  const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);
  const workoutId = getValues("id");

  useBlurOnKeyboardClose(NameInputRef);
  useBlurOnKeyboardClose(descriptionInputRef);

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <GenericTextInput
        name="name"
        inputRef={NameInputRef}
        placeholder="Workout Name"
        title="Workout Name"
        keyboardType="default"
      />

      <WorkoutTypePicker
        items={["strength", "cardio", "mobility", "circuit"]}
        name="type"
        workoutType={getValues().type}
        workoutId={workoutId}
      />

      <View style={{ gap: theme.spacing.label }}>
        <Text style={[styles.fieldLabel, { color: theme.color.textSecondary }]}>
          DESCRIPTION
        </Text>
        <Controller
          name="description"
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              placeholder="Add a description..."
              value={value}
              ref={descriptionInputRef}
              placeholderTextColor={theme.color.placeholderColor}
              onChangeText={(text) => {
                onChange(text);
                trackWorkoutUpdate({ description: text });
              }}
              onFocus={() => setIsDescriptionFocused(true)}
              onBlur={() => {
                setIsDescriptionFocused(false);
                onBlur();
              }}
              editable
              multiline
              numberOfLines={4}
              style={[
                styles.descriptionInput,
                {
                  borderColor: isDescriptionFocused
                    ? theme.color.accentActive
                    : theme.color.border,
                  backgroundColor: theme.color.input,
                  color: theme.color.textPrimary,
                },
              ]}
            />
          )}
        />
      </View>

      <AppButton
        title="Add Exercise"
        style={styles.addButton}
        onPress={handleAddExercise}
      />

      <Modal
        animationType="slide"
        transparent={false}
        visible={showExerciseModal}
        onRequestClose={handleCloseExerciseModal}
        statusBarTranslucent={true}
      >
        <AddExercise setShowExerciseModal={handleCloseExerciseModal} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: "top",
  },
  addButton: {
    marginTop: 0,
    marginBottom: 0,
  },
});
