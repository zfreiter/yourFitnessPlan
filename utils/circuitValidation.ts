import { CircuitRound, WorkoutExercise } from "@/types/interfaces/types";

export const EMPTY_CIRCUIT_MESSAGE = "Add at least one exercise to each empty circuit, or delete the empty circuit before saving.";

export function emptyCircuitMessages(exercises: WorkoutExercise[] = [], circuits: CircuitRound[] = []): string[] {
  const populated = new Set(exercises.filter(exercise => exercise.group_type === "circuit" &&
    exercise.circuit_id === exercise.group_id).map(exercise => exercise.circuit_id));
  // CircuitBuilder numbers populated circuits in exercise order, followed by
  // empty metadata records. Match those visible labels, including after moves.
  const populatedCount = circuits.filter(circuit => populated.has(circuit.id)).length;
  return circuits.filter(circuit => !populated.has(circuit.id)).map((_, index) =>
    `Circuit ${populatedCount + index + 1} has no exercises. Add an exercise or delete the circuit to save your workout.`);
}

export function assertNoEmptyCircuits(exercises: WorkoutExercise[] = [], circuits: CircuitRound[] = []) {
  if (emptyCircuitMessages(exercises, circuits).length) {
    throw new Error(EMPTY_CIRCUIT_MESSAGE);
  }
}
