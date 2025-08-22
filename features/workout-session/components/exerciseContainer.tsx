import { View, Text, FlatList, Button } from "react-native";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Exercise } from "@/types/common/workoutInterface";
import ExerciseManager from "./exerciseManager";

export default function ExerciseContainer() {
  const { watch, control, handleSubmit } = useFormContext();
  const exercises = watch("exercises");

  return (
    <View style={{ width: "100%", gap: 10 }}>
      {exercises.map((exercise: Exercise, index: number) => (
        <ExerciseManager
          key={exercise.id}
          exercise={exercise}
          exerciseIndex={index}
        />
      ))}
    </View>
  );
}
