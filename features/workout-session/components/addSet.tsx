import { useDatabase } from "@/context/databaseContext";
import { useWorkout } from "@/context/workoutContent";
import { setService } from "@/services/setService";
import { Exercise, Workout } from "@/types/type";
import { useFieldArray, useFormContext } from "react-hook-form";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { ExerciseSet } from "@/types/type";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function AddSet({
  setIndex,
  size,
  exerciseIndex,
}: {
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
    <View style={styles.SetCardInputContainer}>
      <Pressable
        style={({ pressed }) => [
          {
            backgroundColor: pressed ? "#E5E7EB" : "transparent",
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        onPress={handleAddSet}
      >
        <Text>Add Set</Text>
        <View style={styles.addIconContainer}>
          <Ionicons name="add" size={20} color="green" />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  SetCardInputContainer: {
    padding: 10,
    borderWidth: 1,
    borderColor: "black",
    backgroundColor: "white",
    borderRadius: 5,
    minWidth: 50,
    maxWidth: 118,
  },
  addIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
});
