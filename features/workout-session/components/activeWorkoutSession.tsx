import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { Workout } from "@/types/interfaces/types";
import { useColorTheme } from "@/context/colorThemeContext";
import {
  useWorkoutSession,
  WorkoutSessionProvider,
} from "@/context/WorkoutSessionContext";

import { NameInput } from "@/features/create-workout/components/nameInput";
import { DateTimePickerInput } from "@/features/create-workout/components/dateTimePicker";
import { DescriptionInput } from "@/features/create-workout/components/descriptionInput";
import DurationWheelPicker from "@/features/create-workout/components/durationWheelPicker";
import { PerceivedEffortInput } from "@/features/create-workout/components/perceivedEffort";
import { CompleteWorkoutButton } from "@/features/create-workout/components/complete";
import { StrengthBuilder } from "@/features/create-workout/components/strengthBuilder";
import { CardioBuilder } from "@/features/create-workout/components/cardioBuilder";
import { CircuitBuilder } from "@/features/create-workout/components/circuitBuilder";
import UpdateManagerFabButton from "./updateManagerFabButton";

interface ActiveWorkoutSessionProps {
  workout: Workout;
}

function ActiveWorkoutSessionContent() {
  const { theme } = useColorTheme();
  const { isUpdateNeeded } = useWorkoutSession();
  const workoutType = useWatch<Workout>({
    name: "workoutType",
  });

  return (
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
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            gap: theme.spacing.lg,
            paddingVertical: theme.spacing.screenPadding,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.typeWrapper,
              {
                gap: theme.spacing.label,
                backgroundColor: theme.color.input,
                borderColor: theme.color.border,
              },
            ]}
          >
            <Text
              style={[
                styles.fieldLabel,
                {
                  color: theme.color.textSecondary,
                  paddingLeft: 8,
                },
              ]}
            >
              WORKOUT TYPE:
            </Text>

            <Text style={{ color: theme.color.textPrimary }}>
              {` ${workoutType}`}
            </Text>
          </View>

          <NameInput />

          <DateTimePickerInput />

          <DescriptionInput />

          {workoutType === "strength" && (
            <View style={{ gap: theme.spacing.lg }}>
              <StrengthBuilder />
              <CardioBuilder isFinisher />
            </View>
          )}

          {workoutType === "circuit" && <CircuitBuilder />}

          {workoutType === "cardio" && <CardioBuilder />}

          <DurationWheelPicker />

          <PerceivedEffortInput />

          <CompleteWorkoutButton />
        </ScrollView>
        {isUpdateNeeded && <UpdateManagerFabButton />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function ActiveWorkoutSession({
  workout,
}: ActiveWorkoutSessionProps) {
  const methods = useForm<Workout>({
    defaultValues: {
      id: workout.id,
      user_id: workout.user_id,
      name: workout.name,
      description: workout.description ?? "",
      workoutType: workout.workoutType,
      scheduled_datetime:
        workout.scheduled_datetime ?? new Date().toISOString(),
      duration: workout.duration,
      perceived_effort: workout.perceived_effort,
      is_completed: workout.is_completed,
      completed_at: workout.completed_at ?? null,
      exercises: workout.exercises ?? [],
      cardio_entries: workout.cardio_entries ?? [],
      circuit_rounds: workout.circuit_rounds ?? [],
    },
  });

  return (
    <FormProvider {...methods}>
      <WorkoutSessionProvider workout={workout}>
        <ActiveWorkoutSessionContent />
      </WorkoutSessionProvider>
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  typeWrapper: {
    flexDirection: "row",
    width: "100%",
    borderWidth: 1,
    borderRadius: 8,
    height: 40,
    alignItems: "center",
  },
});
