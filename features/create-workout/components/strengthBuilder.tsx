import { View, Text, Pressable } from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useColorTheme } from "@/context/colorThemeContext";
import { useFormContext, useWatch } from "react-hook-form";
import { CreateWorkoutForm } from "@/types/interfaces/types";
import { buildExerciseMovementBlocks, ExerciseMovementBlock } from "@/utils/exerciseOrdering";
import { AddExerciseModal } from "./addExerciseModal";
import { ExerciseCard } from "./exerciseCard";
import { useWorkoutExercisesFieldArray } from "@/hooks/useCreateWorkoutExercisesFieldArray";

interface StrengthBuilderProps {
  activeSave?: () => Promise<void>;
}

export function StrengthBuilder({ activeSave }: StrengthBuilderProps) {
  const { control } = useFormContext<CreateWorkoutForm>();
  const { theme } = useColorTheme();

  const {
    fields: workoutExercises,
    remove: removeExercise,
    append: appendExercise,
    moveStrengthBlock,
  } = useWorkoutExercisesFieldArray();

  const watchedExercises = useWatch({
    control,
    name: "exercises",
  });

  let blocks: ExerciseMovementBlock[] = [];
  let orderingError: string | undefined;
  try {
    blocks = buildExerciseMovementBlocks(watchedExercises ?? []);
  } catch (error) {
    orderingError = error instanceof Error ? error.message : "Invalid exercise grouping";
  }
  const blockStarts = new Map(blocks.map((block, index) => [block.exercises[0].id, index]));

  return (
    <View style={{ flex: 1 }}>
      <AddExerciseModal
        WorkoutControl={control}
        appendExercise={appendExercise}
      />
      <View
        style={{
          marginTop: workoutExercises.length > 0 ? theme.spacing.lg : 0,
          gap: theme.spacing.lg,
        }}
      >
        {orderingError && (
          <Text accessibilityRole="alert" style={{ color: theme.color.textSecondary }}>
            Exercise movement is unavailable: {orderingError}
          </Text>
        )}
        {workoutExercises.map((field, index) => {
          const exercise = watchedExercises?.[index];

          if (!exercise) return null;

          const blockIndex = blockStarts.get(exercise.id);
          const block = blockIndex === undefined ? undefined : blocks[blockIndex];
          const label = block?.exercises.map(member => member.exercise_name).join(" and ");

          return (
            <ExerciseCard
              key={field.id} // keep stable key from fields
              exercise={exercise} // use live form value
              exerciseOrder={index}
              onDelete={() => removeExercise(index)}
              movementControls={block && block.type !== "circuit" && blockIndex !== undefined ? (
                <>
                  {(["up", "down"] as const).map(direction => {
                    const target = blockIndex + (direction === "up" ? -1 : 1);
                    const disabled = !blocks[target] || blocks[target].type === "circuit";
                    return (
                      <Pressable
                        key={direction}
                        accessibilityRole="button"
                        accessibilityLabel={`Move ${label} ${direction}`}
                        accessibilityHint="Moves the whole exercise group"
                        accessibilityState={{ disabled }}
                        disabled={disabled}
                        onPress={() => moveStrengthBlock(blockIndex, direction)}
                        style={({ pressed }) => ({
                          minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center",
                          opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
                        })}
                      >
                        <Ionicons
                          name={direction === "up" ? "chevron-up-circle-outline" : "chevron-down-circle-outline"}
                          size={22}
                          color={theme.color.textPrimary}
                        />
                      </Pressable>
                    );
                  })}
                </>
              ) : undefined}
            />
          );
        })}
      </View>
    </View>
  );
}
