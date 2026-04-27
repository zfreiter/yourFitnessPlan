// Unused currently
import { IconButton } from "@/components/ui/iconButton";
import { useWorkout } from "@/context/workoutContext";
import { useFieldArray, useFormContext } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { ExerciseSet } from "@/types/type";

export default function SetControls({
  set,
  setIndex,
  size,
  exerciseIndex,
}: {
  set: ExerciseSet;
  setIndex: number;
  size: number;
  exerciseIndex: number;
}) {
  const { watch } = useFormContext();
  const { setWorkouts } = useWorkout();
  const { append } = useFieldArray({
    name: `exercises.${exerciseIndex}.sets`,
  });
  const exercise = watch(`exercises.${exerciseIndex}`);

  const handleAddSet = async () => {
    const newSet: ExerciseSet = {
      id: "",
      workout_exercise_id: exercise.id,
      reps: exercise.track_reps ? 0 : undefined,
      weight: exercise.track_weight ? 0 : undefined,
      duration: exercise.track_time ? 0 : undefined,
      distance: exercise.track_distance ? 0 : undefined,
      set_order: (exercise.sets?.length || 0) + 1,
    };
  };

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text>Set {setIndex + 1}</Text>
      {size === setIndex + 1 ? (
        <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
          <IconButton
            icon="add"
            style={[styles.iconButton, styles.addButton]}
            size={16}
            color="white"
            onPress={handleAddSet}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 25,
    height: 25,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    backgroundColor: "green",
  },
});
