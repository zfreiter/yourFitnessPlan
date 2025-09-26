import { Exercise, ExerciseSet, Workout } from "@/types/type";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import SetCard from "./setCard";
import ExerciseControls from "./exerciseControls";
import CustomModal from "@/components/ui/customModal";
import { IconButton } from "@/components/ui/iconButton";
import { useFieldArray } from "react-hook-form";
import { useDatabase } from "@/context/databaseContext";
import { exerciseService } from "@/services/exerciseService";
import { useWorkout } from "@/context/workoutContent";
import AddSet from "./addSet";

export default function ExerciseManager({
  exercise,
  exerciseIndex,
}: {
  exercise: Exercise;
  exerciseIndex: number;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { control, watch } = useFormContext();
  const { db } = useDatabase();
  const { deleteWorkoutExercise, setWorkouts } = useWorkout();
  const { remove } = useFieldArray({
    name: "exercises",
  });
  const sets = watch(`exercises.${exerciseIndex}.sets`);
  const size = sets?.length || 0;

  const handleDeleteExercise = async () => {
    setIsUpdating(true);
    try {
      if (size >= 1 && db) {
        const response = await exerciseService.deleteExercise(db, exercise.id);
        if (response.success) {
          remove(exerciseIndex);
          deleteWorkoutExercise(exercise.id);
        }
      }
    } catch (error) {
      console.error("Error deleting exercise:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={[styles.ExerciseCardContainer]}>
      <Pressable
        disabled={isUpdating}
        delayLongPress={300}
        style={[
          styles.exerciseCardContent,
          {
            backgroundColor: isLongPressed ? "#E5E7EB" : "transparent",
            transform: [{ scale: isLongPressed ? 0.98 : 1 }],
          },
        ]}
        onLongPress={() => {
          setIsLongPressed(true);
          setIsModalVisible(true);
        }}
        onPressOut={() => {
          // setIsLongPressed(false);
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text>{exercise.exercise_name}</Text>
          <ExerciseControls exercise={exercise} exerciseIndex={exerciseIndex} />
        </View>
        <View style={styles.SetCardContainer}>
          {(sets || []).map((set: ExerciseSet, setIndex: number) => (
            <SetCard
              key={`exercise-${exerciseIndex}-set-${setIndex}`}
              set={set}
              exerciseIndex={exerciseIndex}
              setIndex={setIndex}
              options={{
                track_reps: exercise.track_reps,
                track_weight: exercise.track_weight,
                track_time: exercise.track_time,
                track_distance: exercise.track_distance,
              }}
            />
          ))}
          <AddSet setIndex={size} size={size} exerciseIndex={exerciseIndex} />
        </View>
      </Pressable>
      <CustomModal
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          setIsLongPressed(false);
        }}
        title={`Delete ${exercise.exercise_name} Exercise`}
        closeButtonText="Cancel"
      >
        <DeleteExerciseModal handleDeleteExercise={handleDeleteExercise} />
      </CustomModal>
    </View>
  );
}

function DeleteExerciseModal({
  handleDeleteExercise,
}: {
  handleDeleteExercise: () => void;
}) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 20 }}>
      <IconButton
        icon="trash-outline"
        style={[
          styles.iconButton,
          styles.deleteButton,
          { width: 70, height: 70, borderRadius: 70 },
        ]}
        size={50}
        color="white"
        onPress={handleDeleteExercise}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ExerciseCardContainer: {
    padding: 0,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "black",
    backgroundColor: "white",
    borderRadius: 10,
    minHeight: 60, // Ensure minimum height to prevent layout issues
    width: "100%",
  },
  exerciseCardContent: {
    padding: 10,
    borderRadius: 10,
  },
  SetCardContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    paddingTop: 10,
    alignItems: "flex-start", // Ensure proper alignment
  },
  activeItem: {
    borderColor: "blue",
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    backgroundColor: "gray",
  },
  deleteButton: {
    backgroundColor: "red",
  },
  addButton: {
    backgroundColor: "green",
  },
  moveButton: {
    backgroundColor: "#007AFF",
  },
  disabledButton: {
    backgroundColor: "#8E8E93",
  },
  modalContent: {
    padding: 20,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "black",
  },
});
