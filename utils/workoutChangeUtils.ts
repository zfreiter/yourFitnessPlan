import {
  CardioEntry,
  CardioInterval,
  CircuitRound,
  ExerciseSet,
  Workout,
  WorkoutExercise,
} from "@/types/interfaces/types";

export interface WorkoutChanges {
  workout?: Partial<
    Pick<
      Workout,
      | "name"
      | "description"
      | "workoutType"
      | "scheduled_datetime"
      | "duration"
      | "perceived_effort"
      | "is_completed"
      | "completed_at"
    >
  >;

  exercisesToInsert: WorkoutExercise[];
  exercisesToUpdate: WorkoutExercise[];
  exerciseIdsToDelete: string[];

  setsToInsert: ExerciseSet[];
  setsToUpdate: ExerciseSet[];
  setIdsToDelete: string[];

  cardioEntriesToInsert: CardioEntry[];
  cardioEntriesToUpdate: CardioEntry[];
  cardioEntryIdsToDelete: string[];

  cardioIntervalsToInsert: CardioInterval[];
  cardioIntervalsToUpdate: CardioInterval[];
  cardioIntervalIdsToDelete: string[];

  circuitRoundsToInsert: CircuitRound[];
  circuitRoundsToUpdate: CircuitRound[];
  circuitRoundIdsToDelete: string[];
}

function normalizeDateTime(value?: string | null): string | null {
  if (!value) return null;

  return new Date(value.replace(" ", "T")).toISOString();
}

function getRecordChanges<T extends { id: string }>(
  oldRecords: T[] | undefined,
  newRecords: T[] | undefined,
): {
  toInsert: T[];
  toUpdate: T[];
  idsToDelete: string[];
} {
  const oldList = oldRecords ?? [];
  const newList = newRecords ?? [];

  const oldMap = new Map(oldList.map((record) => [record.id, record]));

  const newMap = new Map(newList.map((record) => [record.id, record]));

  const toInsert: T[] = [];
  const toUpdate: T[] = [];
  const idsToDelete: string[] = [];

  for (const newRecord of newList) {
    const oldRecord = oldMap.get(newRecord.id);

    if (!oldRecord) {
      toInsert.push(newRecord);
      continue;
    }

    if (!areEqual(oldRecord, newRecord)) {
      toUpdate.push(newRecord);
    }
  }

  for (const oldRecord of oldList) {
    if (!newMap.has(oldRecord.id)) {
      idsToDelete.push(oldRecord.id);
    }
  }

  return {
    toInsert,
    toUpdate,
    idsToDelete,
  };
}

function areEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function getExerciseComparable(exercise: WorkoutExercise) {
  const { sets, ...exerciseFields } = exercise;

  return exerciseFields;
}

function getExerciseChanges(
  oldExercises: WorkoutExercise[],
  newExercises: WorkoutExercise[],
): {
  toInsert: WorkoutExercise[];
  toUpdate: WorkoutExercise[];
  idsToDelete: string[];
} {
  const oldMap = new Map(
    oldExercises.map((exercise) => [exercise.id, exercise]),
  );

  const newMap = new Map(
    newExercises.map((exercise) => [exercise.id, exercise]),
  );

  const toInsert: WorkoutExercise[] = [];
  const toUpdate: WorkoutExercise[] = [];
  const idsToDelete: string[] = [];

  for (const newExercise of newExercises) {
    const oldExercise = oldMap.get(newExercise.id);

    if (!oldExercise) {
      toInsert.push(newExercise);
      continue;
    }

    const oldComparable = getExerciseComparable(oldExercise);
    const newComparable = getExerciseComparable(newExercise);

    if (!areEqual(oldComparable, newComparable)) {
      toUpdate.push(newExercise);
    }
  }

  for (const oldExercise of oldExercises) {
    if (!newMap.has(oldExercise.id)) {
      idsToDelete.push(oldExercise.id);
    }
  }

  return {
    toInsert,
    toUpdate,
    idsToDelete,
  };
}

function getBaseWorkoutChanges(
  oldWorkout: Workout,
  newWorkout: Workout,
): WorkoutChanges["workout"] {
  const changes: NonNullable<WorkoutChanges["workout"]> = {};

  if (oldWorkout.name !== newWorkout.name) {
    changes.name = newWorkout.name;
  }

  if (oldWorkout.description !== newWorkout.description) {
    changes.description = newWorkout.description;
  }

  if (oldWorkout.workoutType !== newWorkout.workoutType) {
    changes.workoutType = newWorkout.workoutType;
  }

  if (
    normalizeDateTime(oldWorkout.scheduled_datetime) !==
    normalizeDateTime(newWorkout.scheduled_datetime)
  ) {
    changes.scheduled_datetime = newWorkout.scheduled_datetime;
  }

  if (oldWorkout.duration !== newWorkout.duration) {
    changes.duration = newWorkout.duration;
  }

  if (oldWorkout.perceived_effort !== newWorkout.perceived_effort) {
    changes.perceived_effort = newWorkout.perceived_effort;
  }

  if (oldWorkout.is_completed !== newWorkout.is_completed) {
    changes.is_completed = newWorkout.is_completed;
  }

  if (oldWorkout.completed_at !== newWorkout.completed_at) {
    changes.completed_at = newWorkout.completed_at;
  }

  return Object.keys(changes).length > 0 ? changes : undefined;
}

function getWorkoutSets(workout: Workout): ExerciseSet[] {
  return (workout.exercises ?? []).flatMap((exercise) => exercise.sets ?? []);
}

function getWorkoutIntervals(workout: Workout): CardioInterval[] {
  return (workout.cardio_entries ?? []).flatMap(
    (entry) => entry.intervals ?? [],
  );
}
export function buildWorkoutChanges(
  oldWorkout: Workout,
  newWorkout: Workout,
): WorkoutChanges {
  const exerciseChanges = getExerciseChanges(
    oldWorkout.exercises ?? [],
    newWorkout.exercises ?? [],
  );

  const setChanges = getRecordChanges(
    getWorkoutSets(oldWorkout),
    getWorkoutSets(newWorkout),
  );

  const cardioEntryChanges = getRecordChanges(
    oldWorkout.cardio_entries ?? [],
    newWorkout.cardio_entries ?? [],
  );

  const intervalChanges = getRecordChanges(
    getWorkoutIntervals(oldWorkout),
    getWorkoutIntervals(newWorkout),
  );

  const circuitChanges = getRecordChanges(
    oldWorkout.circuit_rounds ?? [],
    newWorkout.circuit_rounds ?? [],
  );

  // New exercises are inserted with their sets already included.
  // Remove those sets from the separate set insert list.
  const newExerciseIds = new Set(
    exerciseChanges.toInsert.map((exercise) => exercise.id),
  );

  const setsToInsert = setChanges.toInsert.filter(
    (set) => !newExerciseIds.has(set.workout_exercise_id),
  );

  // New cardio entries are inserted with their intervals already included.
  // Remove those intervals from the separate interval insert list.
  const newCardioEntryIds = new Set(
    cardioEntryChanges.toInsert.map((entry) => entry.id),
  );

  const cardioIntervalsToInsert = intervalChanges.toInsert.filter(
    (interval) => !newCardioEntryIds.has(interval.cardio_entry_id),
  );

  return {
    workout: getBaseWorkoutChanges(oldWorkout, newWorkout),

    exercisesToInsert: exerciseChanges.toInsert,
    exercisesToUpdate: exerciseChanges.toUpdate,
    exerciseIdsToDelete: exerciseChanges.idsToDelete,

    setsToInsert,
    setsToUpdate: setChanges.toUpdate,
    setIdsToDelete: setChanges.idsToDelete,

    cardioEntriesToInsert: cardioEntryChanges.toInsert,
    cardioEntriesToUpdate: cardioEntryChanges.toUpdate,
    cardioEntryIdsToDelete: cardioEntryChanges.idsToDelete,

    cardioIntervalsToInsert,
    cardioIntervalsToUpdate: intervalChanges.toUpdate,
    cardioIntervalIdsToDelete: intervalChanges.idsToDelete,

    circuitRoundsToInsert: circuitChanges.toInsert,
    circuitRoundsToUpdate: circuitChanges.toUpdate,
    circuitRoundIdsToDelete: circuitChanges.idsToDelete,
  };
}
export function hasWorkoutChanges(changes: WorkoutChanges): boolean {
  return Boolean(
    changes.workout ||
    changes.exercisesToInsert.length ||
    changes.exercisesToUpdate.length ||
    changes.exerciseIdsToDelete.length ||
    changes.setsToInsert.length ||
    changes.setsToUpdate.length ||
    changes.setIdsToDelete.length ||
    changes.cardioEntriesToInsert.length ||
    changes.cardioEntriesToUpdate.length ||
    changes.cardioEntryIdsToDelete.length ||
    changes.cardioIntervalsToInsert.length ||
    changes.cardioIntervalsToUpdate.length ||
    changes.cardioIntervalIdsToDelete.length ||
    changes.circuitRoundsToInsert.length ||
    changes.circuitRoundsToUpdate.length ||
    changes.circuitRoundIdsToDelete.length,
  );
}
