// Unused currently
import { IconButton } from "@/components/ui/iconButton";
import { useDatabase } from "@/context/databaseContext";
import { useWorkout } from "@/context/workoutContent";
import { setService } from "@/services/setService";
import { Exercise, Workout } from "@/types/type";
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
  const { db } = useDatabase();

  const handleAddSet = async () => {
    if (db) {
      const newSet: ExerciseSet = {
        id: -1,
        workout_exercise_id: exercise.id,
        reps: exercise.track_reps ? 0 : undefined,
        weight: exercise.track_weight ? 0 : undefined,
        duration: exercise.track_time ? 0 : undefined,
        distance: exercise.track_distance ? 0 : undefined,
        set_order: (exercise.sets?.length || 0) + 1,
      };
      const response = await setService.createSet(db, newSet);
      if (response.success && response.rowId) {
        newSet.id = response.rowId ?? -1;

        append(newSet);
        setWorkouts((prevWorkouts: Workout[]) =>
          prevWorkouts.map((workout: Workout) => {
            if (workout.id === exercise.workout_id) {
              workout.exercises.map((ex: Exercise) => {
                if (ex.id === exercise.id) {
                  ex.sets.push(newSet);
                }
                return ex;
              });
            }
            return workout;
          })
        );
      } else {
        throw new Error("Set not created");
      }
    }
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
