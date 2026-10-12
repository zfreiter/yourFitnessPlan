import { useColorTheme } from "@/context/colorThemeContext";
import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import * as Crypto from "expo-crypto";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import {
  WorkoutTypeOptions,
  CreateWorkoutForm,
} from "@/types/interfaces/types";
import { WorkoutTypePicker } from "@/features/create-workout/components/workoutTypePicker";
import { NameInput } from "@/features/create-workout/components/nameInput";
import { DescriptionInput } from "@/features/create-workout/components/descriptionInput";
import { DateTimePickerInput } from "@/features/create-workout/components/dateTimePicker";
import { StrengthBuilder } from "@/features/create-workout/components/strengthBuilder";
import { OpenBuilder } from "@/features/create-workout/components/openBuilder";
import { CardioBuilder } from "@/features/create-workout/components/cardioBuilder";
import { CircuitBuilder } from "@/features/create-workout/components/circuitBuilder";
import { CreateWorkoutButton } from "@/features/create-workout/components/createWorkoutButton";
import { PerceivedEffortInput } from "@/features/create-workout/components/perceivedEffort";
import { CompleteWorkoutButton } from "@/features/create-workout/components/complete";
import DurationWheelPicker from "@/features/create-workout/components/durationWheelPicker";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateWorkout() {
  const [workoutType, setWorkoutType] =
    useState<WorkoutTypeOptions>("Select workout");

  const { theme } = useColorTheme();

  const getWorkoutDefaults = (type: WorkoutTypeOptions): CreateWorkoutForm => ({
    id: Crypto.randomUUID(),
    name: "",
    workoutType: type,
    duration: 0,
    scheduled_datetime: new Date().toISOString(),
    perceived_effort: "easy",
    is_completed: 0,
    exercises: [],
    cardio_entries: [],
    circuit_rounds: [],
  });

  const methods = useForm<CreateWorkoutForm>({
    defaultValues: getWorkoutDefaults(workoutType),
  });

  const {
    control,
    formState: { errors },
  } = methods;

  const nameValue = useWatch({ control, name: "name" });
  const exerciseCount = useWatch({ control, name: "exercises" })?.length;

  return (
    <FormProvider {...methods}>
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
              backgroundColor: theme.color.background,
              paddingHorizontal: theme.spacing.screenPadding,
            }}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                gap: theme.spacing.lg,
                paddingVertical: theme.spacing.screenPadding,
              }}
              nestedScrollEnabled
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
            >
              {/* Workout Type */}
              <WorkoutTypePicker
                errors={errors}
                onTypeChange={(type: WorkoutTypeOptions) => {
                  setWorkoutType(type);
                }}
              />

              {workoutType !== "Select workout" && (
                <View style={{ gap: theme.spacing.lg }}>
                  {/* Name */}

                  <NameInput />

                  {/* Date & Time */}
                  <DateTimePickerInput />
                </View>
              )}

              <View style={{ gap: theme.spacing.lg }}>
                {workoutType === "strength" && (
                  <View style={{ gap: theme.spacing.lg }}>
                    <StrengthBuilder />
                    <CardioBuilder isFinisher={true} />
                  </View>
                )}
                {workoutType === "circuit" && <CircuitBuilder />}
                {workoutType === "cardio" && <CardioBuilder />}
                {workoutType === "open" && <OpenBuilder />}
              </View>

              {workoutType !== "Select workout" && (
                <View style={{ gap: theme.spacing.lg }}>
                  <DescriptionInput />

                  <DurationWheelPicker />

                  <PerceivedEffortInput />

                  <CompleteWorkoutButton />
                </View>
              )}
            </ScrollView>

            <CreateWorkoutButton />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
