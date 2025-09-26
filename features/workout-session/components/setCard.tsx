import { ExerciseSet } from "@/types/type";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFieldArray, useFormContext } from "react-hook-form";
import SetInputs from "./setInputs";
import { useState } from "react";
import CustomModal from "@/components/ui/customModal";
import { useDatabase } from "@/context/databaseContext";
import { setService } from "@/services/setService";
import { useWorkout } from "@/context/workoutContent";
import { IconButton } from "@/components/ui/iconButton";

export default function SetCard({
  set,
  exerciseIndex,
  setIndex,
  options,
}: {
  set: ExerciseSet;
  exerciseIndex: number;
  setIndex: number;
  options: {
    track_reps: number;
    track_weight: number;
    track_time: number;
    track_distance: number;
  };
}) {
  const { db } = useDatabase();
  const { deleteWorkoutExerciseSet } = useWorkout();
  const { watch } = useFormContext();
  const { remove } = useFieldArray({
    name: `exercises.${exerciseIndex}.sets`,
  });
  const exercise = watch(`exercises.${exerciseIndex}`);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const sets = watch(`exercises.${exerciseIndex}.sets`);
  const size = sets?.length || 0;

  const handleDeleteSet = async () => {
    const extraSet: boolean = size - set.set_order > 0;
    try {
      if (db) {
        const response = await setService.deleteSetAndUpdateOrder(
          db,
          set.id,
          exercise.id,
          extraSet,
          set.set_order!
        );

        if (response.success) {
          deleteWorkoutExerciseSet(
            exercise.workout_id,
            exercise.id,
            set.id,
            set.set_order!
          );

          remove(setIndex);
        } else {
          throw new Error("Set not deleted");
        }
      }
    } catch (error) {
      console.error("Error deleting set:", error);
    } finally {
      setIsModalVisible(false);
    }
  };

  return (
    <View
      style={[
        styles.SetCardInputContainer,
        {
          backgroundColor: isModalVisible
            ? "#FF686B"
            : isLongPressed
            ? "#FF686B"
            : "#E0E0E0",
        },
      ]}
    >
      <Pressable
        delayLongPress={300}
        style={[
          {
            backgroundColor: isModalVisible
              ? "#FF686B"
              : isLongPressed
              ? "#FF686B"
              : "#E0E0E0",
            transform: [{ scale: isLongPressed ? 0.98 : 1 }],
          },
        ]}
        onLongPress={() => {
          setIsLongPressed(true);
          setIsModalVisible(true);
        }}
        onPressOut={() => {
          setIsLongPressed(false);
        }}
      >
        <Text>Set {setIndex + 1}</Text>

        <SetInputs
          set={set}
          exerciseIndex={exerciseIndex}
          setIndex={setIndex}
          options={options}
        />
      </Pressable>
      <CustomModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title={`Delete Set`}
        closeButtonText="Cancel"
      >
        <DeleteSetModal handleDeleteSet={handleDeleteSet} />
      </CustomModal>
    </View>
  );
}

function DeleteSetModal({ handleDeleteSet }: { handleDeleteSet: () => void }) {
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
        onPress={handleDeleteSet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  SetCardInputContainer: {
    padding: 5,
    borderWidth: 1,
    borderColor: "black",
    backgroundColor: "white",
    borderRadius: 5,
    minWidth: 50, // Ensure minimum width for proper layout
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "red",
  },
});
