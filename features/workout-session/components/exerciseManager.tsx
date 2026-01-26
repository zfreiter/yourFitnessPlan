import { Exercise, ExerciseSet, Workout } from "@/types/type";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useState } from "react";
import { useFormContext, UseFieldArrayRemove } from "react-hook-form";
import SetCard from "./setCard";
import ExerciseControls from "./exerciseControls";
import CustomModal from "@/components/ui/customModal";
import { IconButton } from "@/components/ui/iconButton";
import { useFieldArray } from "react-hook-form";
import { useDatabase } from "@/context/databaseContext";
import { exerciseService } from "@/services/exerciseService";
import { useWorkout } from "@/context/workoutContext";
import AddSet from "./addSet";
import { useColorTheme } from "@/context/colorThemeContext";
import { DeleteSet } from "./DeleteSet";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { Alert } from "react-native";

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
  const { theme } = useColorTheme();
  const { db } = useDatabase();
  const { deleteWorkoutExercise, setWorkouts } = useWorkout();
  const { remove } = useFieldArray({
    name: "exercises",
  });
  const sets = watch(`exercises.${exerciseIndex}.sets`);
  const size = sets?.length || 0;

  const handleDeleteExercise = () => {
    Alert.alert(
      `Delete ${exercise.exercise_name}?`,
      `This will remove the exercise and all ${size} set${
        size !== 1 ? "s" : ""
      }.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setIsUpdating(true);
            remove(exerciseIndex);
            setIsUpdating(false);
          },
        },
      ]
    );
  };

  const renderRightActions = (progress: any, dragX: any) => {
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: dragX.value + 90 }],
      };
    });

    return (
      <Animated.View style={animatedStyle}>
        <Pressable
          style={[
            styles.deleteSwipeAction,
            {
              backgroundColor: theme.color.danger || "#FF3B30",
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              borderTopRightRadius: 10,
              borderBottomRightRadius: 10,
            },
          ]}
          onPress={handleDeleteExercise}
        >
          <IconButton
            icon="trash-outline"
            size={28}
            color="white"
            onPress={handleDeleteExercise}
          />
          <Text style={styles.deleteSwipeText}>Delete</Text>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <View
        style={[
          styles.ExerciseCardContainer,
          {
            borderColor: theme.color.border,
            backgroundColor: theme.color.surface,
            marginTop: theme.spacing.lg,
          },
        ]}
      >
        <View style={styles.exerciseCardContent}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <ExerciseControls
              exercise={exercise}
              exerciseIndex={exerciseIndex}
            />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                marginLeft: -40,
                color: theme.color.textPrimary,
              }}
            >
              {exercise.exercise_name}
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 15 }}
            >
              <AddSet
                setIndex={size}
                size={size}
                exerciseIndex={exerciseIndex}
              />
              <DeleteSet exerciseIndex={exerciseIndex} />
            </View>
          </View>
          <View style={[styles.SetCardContainer]}>
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
          </View>
        </View>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  ExerciseCardContainer: {
    borderWidth: 1,

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
  deleteSwipeAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    marginTop: 16, // Match the marginTop of ExerciseCardContainer
  },
  deleteSwipeText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
});
