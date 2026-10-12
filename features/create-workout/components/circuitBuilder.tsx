import { View, StyleSheet } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import { useFormContext, useForm, useWatch } from "react-hook-form";
import { CreateCircuitForm, CreateWorkoutForm } from "@/types/interfaces/types";
import { AddCircuitModal } from "./addCircuitModal";
import { useWorkoutExercisesFieldArray } from "@/hooks/useCreateWorkoutExercisesFieldArray";
import { ExerciseCard } from "./exerciseCard";
import { useEffect } from "react";

export function CircuitBuilder() {
  const { theme } = useColorTheme();
  const { control } = useFormContext<CreateWorkoutForm>();
  const {
    fields: workoutExercises,
    remove: removeExercise,
    append: appendExercise,
  } = useWorkoutExercisesFieldArray();

  const watchedExercises = useWatch({
    control,
    name: "exercises",
  });

  const {
    control: circuitControl,
    reset,
    getValues,
  } = useForm<CreateCircuitForm>({
    defaultValues: {
      rounds: 3,
      restAfterRound: 30,
      notes: "",
      exercises: [],
    },
  });

  useEffect(() => {
    console.log("fields changed", workoutExercises);
  }, [workoutExercises]);

  return (
    <View style={{ flex: 1 }}>
      <AddCircuitModal
        control={circuitControl}
        reset={reset}
        getCircuitValues={getValues}
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
