import { Workout, Exercise, ExerciseType } from "@/types/type";
import { useEffect, useState } from "react";
import { useWorkout } from "@/context/workoutContent";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import ExerciseCard from "./exerciseCard";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";

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

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Exercise>) => {
    return (
      <View style={[styles.itemContainer, isActive && styles.activeItem]}>
        <TouchableOpacity
          style={[styles.touchableItem, isActive && styles.activeTouchable]}
          onLongPress={drag}
          disabled={isActive}
        >
          <ExerciseCard exercise={item} isActive={isActive} />
        </TouchableOpacity>
      </View>
    );
  };

  const handleDragEnd = ({ data }: { data: Exercise[] }) => {
    const { updatedExercises } = reorderExercises(data);
    setExercises(updatedExercises);
    setWorkouts((prevWorkouts) =>
      prevWorkouts.map((prevWorkout) => {
        if (prevWorkout.id === workout.id) {
          return { ...prevWorkout, exercises: updatedExercises };
        }
        return prevWorkout;
      })
    );
  };

  return (
    <DraggableFlatList
      data={workout.exercises}
      renderItem={renderItem}
      decelerationRate="fast"
      keyExtractor={(item) => `exercise-${item.exercise_order}`}
      onDragEnd={handleDragEnd}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      containerStyle={styles.container}
    />
  );
}

function reorderExercises(data: Exercise[]) {
  const updatedExercises = data.map((exercise, index) => {
    if (exercise.exercise_order !== index) {
    }
    return { ...exercise, exercise_order: index };
  });
  return { updatedExercises };
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
