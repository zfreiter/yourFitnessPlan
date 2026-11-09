import { Alert, View, Text, Pressable, StyleSheet } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { buildExerciseMovementBlocks, ExerciseMovementBlock } from "@/utils/exerciseOrdering";
import { useColorTheme } from "@/context/colorThemeContext";
import { useFormContext, useForm, useWatch } from "react-hook-form";
import { CircuitRound, CreateCircuitForm, CreateWorkoutForm } from "@/types/interfaces/types";
import { AddCircuitModal } from "./addCircuitModal";
import { useWorkoutExercisesFieldArray } from "@/hooks/useCreateWorkoutExercisesFieldArray";
import { ExerciseCard } from "./exerciseCard";
import { circuitColor } from "@/utils/circuitColors";

export function CircuitBuilder() {
  const { theme } = useColorTheme();
  const { control, getValues: getWorkoutValues, setValue } = useFormContext<CreateWorkoutForm>();
  const [emptyCircuit, setEmptyCircuit] = useState<CircuitRound>();
  const {
    fields: workoutExercises,
    remove: removeExercise,
    append: appendExercise,
    moveCircuitBlock,
  } = useWorkoutExercisesFieldArray();

  const watchedExercises = useWatch({
    control,
    name: "exercises",
  });
  const watchedCircuits = useWatch({ control, name: "circuit_rounds" });
  const emptyCircuits = (watchedCircuits ?? []).filter(circuit => !(watchedExercises ?? []).some(exercise =>
    exercise.group_type === "circuit" && (exercise.circuit_id === circuit.id || exercise.group_id === circuit.id)));
  const deleteButton = (circuitId: string, label: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${label}`}
      style={({ pressed }) => [styles.action, { opacity: pressed ? 0.7 : 1 }]}
      onPress={() => Alert.alert(`Delete ${label}?`, "This removes the circuit and all its exercises and sets. Changes are saved when you save the workout.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete circuit", style: "destructive", onPress: () => {
          const indices = (getWorkoutValues("exercises") ?? []).flatMap((exercise, index) =>
            exercise.group_type === "circuit" && (exercise.circuit_id === circuitId || exercise.group_id === circuitId) ? [index] : []);
          if (indices.length) removeExercise(indices);
          setValue("circuit_rounds", (getWorkoutValues("circuit_rounds") ?? []).filter(circuit => circuit.id !== circuitId), { shouldDirty: true });
        } },
      ])}>
      <Ionicons name="trash-outline" size={20} color={theme.color.danger} />
    </Pressable>
  );
  let blocks: ExerciseMovementBlock[] = [];
  let orderingError: string | undefined;
  try {
    blocks = buildExerciseMovementBlocks(watchedExercises ?? []);
    for (const block of blocks) {
      if (block.type !== "circuit") continue;
      const circuit = watchedCircuits?.find(round => round.id === block.id);
      if (!circuit || circuit.workout_id !== block.exercises[0].workout_id ||
          circuit.round_number !== block.exercises[0].round_number) {
        throw new Error("Circuit exercises do not match their circuit settings");
      }
    }
  } catch (error) {
    blocks = [];
    orderingError = error instanceof Error ? error.message : "Invalid circuit grouping";
  }
  const circuitStarts = new Map<string, { blockIndex: number; label: string }>();
  blocks.forEach((block, blockIndex) => {
    if (block.type === "circuit") {
      circuitStarts.set(block.exercises[0].id, { blockIndex, label: `Circuit ${circuitStarts.size + 1}` });
    }
  });

  const {
    control: circuitControl,
    reset,
    getValues,
  } = useForm<CreateCircuitForm>({
    defaultValues: {
      rounds: 3,
      restAfterRound: 30,
      notes: "",
      exercises: [],
    },
  });

  return (
    <View style={{ flex: 1 }}>
      <AddCircuitModal
        control={circuitControl}
        reset={reset}
        getCircuitValues={getValues}
        appendExercise={appendExercise}
        emptyCircuit={emptyCircuit}
        onClosed={() => setEmptyCircuit(undefined)}
      />

      <View
        style={{
          marginTop: workoutExercises.length > 0 ? theme.spacing.lg : 0,
          gap: theme.spacing.lg,
        }}
      >
        {orderingError && (
          <Text accessibilityRole="alert" style={{ color: theme.color.textSecondary }}>
            Circuit movement is unavailable: {orderingError}
          </Text>
        )}
        {workoutExercises.map((field, index) => {
          const exercise = watchedExercises?.[index];

          if (!exercise) return null;
          const circuit = circuitStarts.get(exercise.id);

          return (
            <ExerciseCard
              key={field.id} // keep stable key from fields
              exercise={exercise} // use live form value
              exerciseOrder={index}
              onDelete={() => removeExercise(index)}
              groupHeader={circuit ? (
                <View style={styles.header}>
                  <Text accessibilityRole="header" numberOfLines={1} ellipsizeMode="tail"
                    style={[styles.heading, { color: circuitColor(exercise.circuit_id ?? exercise.group_id ?? exercise.id, theme.color.surface) }]}>
                    {circuit.label}
                  </Text>
                  <View style={styles.actions}>
                    {(["up", "down"] as const).map(direction => {
                      const target = circuit.blockIndex + (direction === "up" ? -1 : 1);
                      const disabled = blocks[target]?.type !== "circuit";
                      return (
                        <Pressable key={direction}
                          accessibilityRole="button"
                          accessibilityLabel={`Move ${circuit.label} ${direction}`}
                          accessibilityHint="Moves all exercises in this circuit together"
                          accessibilityState={{ disabled }}
                          disabled={disabled}
                          onPress={() => moveCircuitBlock(circuit.blockIndex, direction)}
                          style={({ pressed }) => [styles.action, { opacity: disabled ? 0.35 : pressed ? 0.7 : 1 }]}>
                          <Ionicons name={direction === "up" ? "chevron-up-circle-outline" : "chevron-down-circle-outline"}
                            size={22} color={theme.color.textPrimary} />
                        </Pressable>
                      );
                    })}
                    {deleteButton(exercise.circuit_id ?? exercise.group_id!, circuit.label)}
                  </View>
                </View>
              ) : undefined}
            />
          );
        })}
        {emptyCircuits.map((circuit, index) => {
          const label = `Circuit ${circuitStarts.size + index + 1}`;
          const color = circuitColor(circuit.id, theme.color.surface);
          return <View key={circuit.id} style={{ borderColor: color, borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 }}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={[styles.heading, { color }]}>{label} (empty)</Text>
              {deleteButton(circuit.id, label)}
            </View>
            <Text style={{ color: theme.color.textSecondary }}>{circuit.round_number} rounds · {circuit.rest_after_round}s rest. Add exercises or delete this circuit before saving.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Add exercises to ${label}`}
              style={{ minHeight: 44, justifyContent: "center" }} onPress={() => setEmptyCircuit(circuit)}>
              <Text style={{ color: theme.color.textPrimary }}>Add exercises</Text>
            </Pressable>
          </View>;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  heading: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    flexShrink: 0,
  },
  action: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
