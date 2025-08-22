import { Workout, Exercise, ExerciseType } from "@/types/type";
import { useEffect, useState } from "react";
import { useWorkout } from "@/context/workoutContent";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import ExerciseCard from "./exerciseManager";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { useFormContext } from "react-hook-form";
import { useDatabase } from "@/context/databaseContext";
import { exerciseService } from "@/services/exerciseService";

export default function ReorderableExerciseList({
  workout,
  ListHeaderComponent,
  ListFooterComponent,
}: {
  workout: Workout;
  ListHeaderComponent?: () => React.ReactNode;
  ListFooterComponent?: () => React.ReactNode;
}) {
  const { setWorkouts, setExercises } = useWorkout();
  const [exerciseOrder, setExerciseOrder] = useState<Exercise[]>(
    workout.exercises
  );
  const { db } = useDatabase();
  const methods = useFormContext();
  const { setValue } = methods;

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Exercise>) => {
    return (
      <View style={[styles.itemContainer, isActive && styles.activeItem]}>
        <TouchableOpacity
          style={[styles.touchableItem, isActive && styles.activeTouchable]}
          onLongPress={drag}
          disabled={isActive}
        >
          <ExerciseCard
            exercise={item}
            exerciseIndex={item.exercise_order - 1}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const handleDragEnd = async ({ data }: { data: Exercise[] }) => {
    const { updatedExercises, exercisesToUpdate } = reorderExercises(data);

    if (db) {
      const response = await exerciseService.updateExerciseOrder(
        db,
        exercisesToUpdate
      );

      if (response.success) {
        setExercises(updatedExercises);
        setWorkouts((prevWorkouts) =>
          prevWorkouts.map((prevWorkout) => {
            if (prevWorkout.id === workout.id) {
              return { ...prevWorkout, exercises: updatedExercises };
            }
            return prevWorkout;
          })
        );

        // Update form data and re-register all nested fields
        setValue("exercises", updatedExercises);

        // Re-register all nested form fields after reordering
        updatedExercises.forEach((exercise, exerciseIndex) => {
          if (exercise.sets) {
            exercise.sets.forEach((set, setIndex) => {
              setValue(
                `exercises.${exerciseIndex}.sets.${setIndex}.reps`,
                set.reps || 0
              );
              setValue(
                `exercises.${exerciseIndex}.sets.${setIndex}.weight`,
                set.weight || 0
              );
              setValue(
                `exercises.${exerciseIndex}.sets.${setIndex}.duration`,
                set.duration || 0
              );
              setValue(
                `exercises.${exerciseIndex}.sets.${setIndex}.distance`,
                set.distance || 0
              );
            });
          }
        });
      } else {
        console.log("Error updating exercise order", response.error);
      }
    } else {
      console.log("No database found");
    }
  };

  return (
    <DraggableFlatList
      data={exerciseOrder}
      renderItem={renderItem}
      decelerationRate="fast"
      keyExtractor={(item) => `exercise-${item.exercise_order - 1}`}
      onDragEnd={handleDragEnd}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      containerStyle={styles.container}
    />
  );
}

function reorderExercises(data: Exercise[]): {
  updatedExercises: Exercise[];
  exercisesToUpdate: { id: number; exercise_order: number }[];
} {
  const exercisesToUpdate: { id: number; exercise_order: number }[] = [];
  const updatedExercises = data.map((exercise, index) => {
    if (exercise.exercise_order !== index + 1) {
      //console.log("new order", exercise.exercise_order, index + 1);
      exercisesToUpdate.push({ id: exercise.id, exercise_order: index + 1 });
    }
    return { ...exercise, exercise_order: index + 1 };
  });
  //console.log("exercisesToUpdate in reorderExercises", exercisesToUpdate);
  return { updatedExercises, exercisesToUpdate };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  itemContainer: {
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  activeItem: {
    elevation: 8,
    shadowOpacity: 0.44,
    shadowRadius: 4.44,
    zIndex: 1000,
  },
  touchableItem: {
    backgroundColor: "#fff",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
  },
  activeTouchable: {
    backgroundColor: "#bbdefb",
    // Remove the transform scale to prevent size changes
    // transform: [{ scale: 1.02 }],
  },
});
