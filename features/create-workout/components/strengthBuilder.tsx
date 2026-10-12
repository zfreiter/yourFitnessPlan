import { View, Text, Pressable, StyleSheet } from "react-native";
import React, { useState } from "react";
import { useColorTheme } from "@/context/colorThemeContext";
import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { CreateWorkoutForm } from "@/types/interfaces/types";
import { useWorkout } from "@/context/workoutContext";
import { Dropdown } from "react-native-element-dropdown";
import { AddExerciseModal } from "./addExerciseModal";
import { ExerciseCard } from "./exerciseCard";
import { useWorkoutExercisesFieldArray } from "@/hooks/useCreateWorkoutExercisesFieldArray";

interface StrengthBuilderProps {
  activeSave?: () => Promise<void>;
}

export function StrengthBuilder({ activeSave }: StrengthBuilderProps) {
  const [selected, setSelected] = useState("Straight");
  const { control } = useFormContext<CreateWorkoutForm>();
  const { theme } = useColorTheme();

  const {
    fields: workoutExercises,
    remove: removeExercise,
    append: appendExercise,
  } = useWorkoutExercisesFieldArray();

  const watchedExercises = useWatch({
    control,
    name: "exercises",
  });

  return (
    <View style={{ flex: 1 }}>
      <AddExerciseModal
        WorkoutControl={control}
        appendExercise={appendExercise}
      />
      <View
        style={{
          marginTop: workoutExercises.length > 0 ? theme.spacing.lg : 0,
          gap: theme.spacing.lg,
        }}
      >
        {workoutExercises.map((field, index) => {
          const exercise = watchedExercises?.[index];

          if (!exercise) return null;

          return (
            <ExerciseCard
              key={field.id} // keep stable key from fields
              exercise={exercise} // use live form value
              exerciseOrder={index}
              onDelete={() => removeExercise(index)}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  segmentDivider: {
    width: 4,
  },
});
