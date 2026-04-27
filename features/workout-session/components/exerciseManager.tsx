import { Exercise, ExerciseSet, Workout } from "@/types/type";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useState } from "react";
import { useFormContext, UseFieldArrayRemove } from "react-hook-form";
import SetCard from "./setCard";
import ExerciseControls from "./exerciseControls";
import { IconButton } from "@/components/ui/iconButton";
import { useFieldArray } from "react-hook-form";
import { useWorkout } from "@/context/workoutContext";
import AddSet from "./addSet";
import { useColorTheme } from "@/context/colorThemeContext";
import { DeleteSet } from "./DeleteSet";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { Alert } from "react-native";
import { useWorkoutSession } from "@/context/WorkoutSessionContext";
import { useAuth } from "@/context/authContext";
import React from "react";

function ExerciseManager({
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
  const { user } = useAuth();
  const { deleteWorkoutExercise, setWorkouts } = useWorkout();
  const { remove } = useFieldArray({
    name: "exercises",
  });

  const sets = watch(`exercises.${exerciseIndex}.sets`);
  const size = sets?.length || 0;

  const handleDeleteExercise = () => {
    Alert.alert(
      `Delete ${exercise.exercise_name}?`,
      `This will remove the exercise and all ${size} set${size !== 1 ? "s" : ""}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setIsUpdating(true);
            // remove exercise from the form
            remove(exerciseIndex);

            // Update local -> delete sets and exercise. Delete exercise in sync. Update context.
            deleteWorkoutExercise(user?.id!, exercise.id);

            setIsUpdating(false);
          },
        },
      ],
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
          {/* Header row */}
          <View style={[styles.exerciseHeader]}>
            <ExerciseControls
              exercise={exercise}
              exerciseIndex={exerciseIndex}
            />
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.exerciseName,
                {
                  textAlign: "center",
                  width: 140,
                  color: theme.color.textPrimary,
                },
              ]}
            >
              {exercise.exercise_name}
            </Text>
            <View style={[styles.headerActions]}>
              <AddSet
                setIndex={size}
                size={size}
                exerciseIndex={exerciseIndex}
              />
              <DeleteSet exerciseIndex={exerciseIndex} />
            </View>
          </View>

          {/* Column labels row — only show if there are sets */}
          {size > 0 && (
            <View style={styles.columnLabelsRow}>
              <Text
                style={[
                  styles.columnLabelSet,
                  { color: theme.color.textSecondary },
                ]}
              />
              {/* Spacer to match SET label width */}
              <View style={styles.columnLabelsRight}>
                {/* These mirror the input columns in SetInputs */}
              </View>
            </View>
          )}

          {/* Sets list */}
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
          </View>
        </View>
      </View>
    </Swipeable>
  );
}

export default React.memo(ExerciseManager);

const styles = StyleSheet.create({
  ExerciseCardContainer: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 60,
    width: "100%",
  },
  exerciseCardContent: {
    padding: 10,
    borderRadius: 10,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: -40,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  columnLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  columnLabelSet: {
    width: 44,
    fontSize: 11,
  },
  columnLabelsRight: {
    flexDirection: "row",
    gap: 8,
  },
  SetCardContainer: {
    flexDirection: "column",
    gap: 2,
    paddingTop: 4,
  },
  deleteSwipeAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    marginTop: 16,
  },
  deleteSwipeText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
});
