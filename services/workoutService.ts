import {
  PerceivedEffort,
  Workout,
  WorkoutExercise,
  WorkoutType,
  CardioEntry,
  CardioInterval,
  CircuitRound,
  ExerciseSet,
} from "@/types/interfaces/types";
import { syncService } from "@/services/syncService";
import { getDB } from "./database";
import { SQLiteDatabase } from "expo-sqlite";
import { exerciseService } from "./exerciseService";
import { cardioService } from "./cardioService";
import { circuitService } from "./circuitService";
import { WorkoutChanges } from "@/utils/workoutChangeUtils";
import { setService } from "./setService";
import { withLocalTransaction } from "./localTransaction";
import {
  assertWorkoutChildDoesNotExist,
  assertWorkoutChildOwned,
  assertWorkoutOwned,
} from "./localOwnership";

interface WorkoutDataRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  type: WorkoutType;
  scheduled_datetime: string;
  duration: number | null;
  perceived_effort: PerceivedEffort | null;
  is_completed: number;
  completed_at: string | null;
}

const hydrateWorkout = async (
  row: WorkoutDataRow,
  db: SQLiteDatabase,
): Promise<Workout> => {
  const [exercises, cardio_entries, circuit_rounds] = await Promise.all([
    exerciseService.getWorkoutExercises(row.user_id, row.id, db),
    cardioService.getWorkoutCardioEntries(row.user_id, row.id, db),
    circuitService.getWorkoutCircuitRounds(row.user_id, row.id, db),
  ]);

  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    description: row.description ?? undefined,
    workoutType: row.type,
    scheduled_datetime: row.scheduled_datetime,
    duration: row.duration ?? undefined,
    perceived_effort: row.perceived_effort ?? undefined,
    is_completed: row.is_completed,
    completed_at: row.completed_at,
    exercises,
    cardio_entries,
    circuit_rounds,
  };
};

const hydrateWorkouts = async (
  rows: WorkoutDataRow[],
  db: SQLiteDatabase,
): Promise<Workout[]> => {
  return Promise.all(rows.map((row) => hydrateWorkout(row, db)));
};

type BaseWorkoutChanges = Partial<
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

const updateBaseWorkoutInDb = async (
  db: SQLiteDatabase,
  userId: string,
  workoutId: string,
  changes: BaseWorkoutChanges,
): Promise<void> => {
  const assignments: string[] = [];
  const values: Array<string | number | null> = [];

  if (changes.name !== undefined) {
    assignments.push("name = ?");
    values.push(changes.name.trim());
  }

  if (changes.description !== undefined) {
    assignments.push("description = ?");
    values.push(changes.description?.trim() ?? "");
  }

  if (changes.workoutType !== undefined) {
    assignments.push("type = ?");
    values.push(changes.workoutType);
  }

  if (changes.scheduled_datetime !== undefined) {
    assignments.push("scheduled_datetime = ?");
    values.push(changes.scheduled_datetime.replace(" ", "T"));
  }

  if (changes.duration !== undefined) {
    assignments.push("duration = ?");
    values.push(changes.duration ?? 0);
  }

  if (changes.perceived_effort !== undefined) {
    assignments.push("perceived_effort = ?");
    values.push(changes.perceived_effort ?? null);
  }

  if (changes.is_completed !== undefined) {
    assignments.push("is_completed = ?");
    values.push(changes.is_completed ? 1 : 0);
  }

  if (changes.completed_at !== undefined) {
    assignments.push("completed_at = ?");
    values.push(changes.completed_at ?? null);
  }

  if (assignments.length === 0) {
    return;
  }

  assignments.push("updated_at = ?");
  values.push(new Date().toISOString());

  values.push(workoutId, userId);

  await db.runAsync(
    `UPDATE workouts
     SET ${assignments.join(", ")}
     WHERE id = ? AND user_id = ?`,
    values,
  );
};

const workoutExerciseSyncData = (exercise: WorkoutExercise) => ({
  id: exercise.id,
  workout_id: exercise.workout_id,
  exercise_id: exercise.exercise_id ?? null,
  exercise_name: exercise.exercise_name,
  valid_units: exercise.validUnits ?? [],
  muscles_targeted: exercise.musclesTargeted ?? null,
  equipment: exercise.equipment ?? null,
  description: exercise.description ?? null,
  exercise_order: exercise.exercise_order ?? 1,
  group_id: exercise.group_id ?? null,
  group_type: exercise.group_type ?? null,
  round_number: exercise.round_number ?? null,
  circuit_id:
    exercise.circuit_id ??
    (exercise.group_type === "circuit" ? exercise.group_id ?? null : null),
});

const exerciseSetSyncData = (set: ExerciseSet) => ({
  id: set.id,
  workout_exercise_id: set.workout_exercise_id,
  reps: set.reps ?? null,
  weight: set.weight ?? null,
  time: set.time ?? null,
  distance: set.distance ?? null,
  is_warmup: set.is_warmup ?? 0,
  is_max: set.is_max ?? 0,
  set_order: set.set_order ?? 1,
});

const cardioEntrySyncData = (entry: CardioEntry) => ({
  id: entry.id,
  workout_id: entry.workout_id,
  activity: entry.activity,
  mode: entry.mode,
  duration: entry.duration ?? null,
  distance: entry.distance ?? null,
  calories: entry.calories ?? null,
  heart_rate_avg: entry.heart_rate_avg ?? null,
  heart_rate_zone: entry.heart_rate_zone ?? null,
  is_finisher: entry.is_finisher ?? 0,
  entry_order: entry.entry_order ?? 1,
  notes: entry.notes ?? null,
});

const cardioIntervalSyncData = (interval: CardioInterval) => ({
  id: interval.id,
  cardio_entry_id: interval.cardio_entry_id,
  interval_order: interval.interval_order ?? 1,
  work_duration: interval.work_duration ?? null,
  rest_duration: interval.rest_duration ?? null,
  distance: interval.distance ?? null,
  calories: interval.calories ?? null,
  notes: interval.notes ?? null,
});

const circuitRoundSyncData = (round: CircuitRound) => ({
  id: round.id,
  workout_id: round.workout_id,
  round_number: round.round_number,
  rest_after_round: round.rest_after_round,
  notes: round.notes ?? "",
});

export const workoutService = {
  getAllWorkouts: async (userId: string): Promise<Workout[]> => {
    const db = await getDB();

    try {
      const rows = await db.getAllAsync<WorkoutDataRow>(
        `SELECT
           id,
           user_id,
           name,
           description,
           type,
           scheduled_datetime,
           duration,
           perceived_effort,
           is_completed,
           completed_at
         FROM workouts
         WHERE user_id = ?
         ORDER BY scheduled_datetime`,
        [userId],
      );

      return hydrateWorkouts(rows, db);
    } catch (error) {
      console.error("Error fetching all workouts:", error);
      throw new Error("Failed to fetch workouts");
    }
  },

  getWorkoutById: async (userId: string, id: string): Promise<Workout | null> => {
    const db = await getDB();

    try {
      const row = await db.getFirstAsync<WorkoutDataRow>(
        `SELECT
           id,
           user_id,
           name,
           description,
           type,
           scheduled_datetime,
           duration,
           perceived_effort,
           is_completed,
           completed_at
         FROM workouts
         WHERE id = ? AND user_id = ?`,
        [id, userId],
      );

      if (!row) return null;

      return hydrateWorkout(row, db);
    } catch (error) {
      console.error(`Error fetching workout with id ${id}:`, error);
      throw new Error("Failed to fetch workout");
    }
  },

  getWorkoutsByDate: async (userId: string, date: string): Promise<Workout[]> => {
    const db = await getDB();

    try {
      const rows = await db.getAllAsync<WorkoutDataRow>(
        `SELECT
           id,
           user_id,
           name,
           description,
           type,
           scheduled_datetime,
           duration,
           perceived_effort,
           is_completed,
           completed_at
         FROM workouts
         WHERE user_id = ? AND DATE(scheduled_datetime) = ?
         ORDER BY scheduled_datetime`,
        [userId, date],
      );

      return hydrateWorkouts(rows, db);
    } catch (error) {
      console.error(`Error fetching workouts for date ${date}:`, error);
      throw new Error("Failed to fetch workouts by date");
    }
  },

  // Insert here --------------------------------------------------------
  insertWorkout: async (
    createWorkout: Workout,
    authenticatedUserId: string,
  ): Promise<{ success: boolean; data?: Workout | null; error?: string }> => {
    try {
      const {
        id: workoutId,
        user_id,
        name,
        description,
        workoutType,
        scheduled_datetime,
        duration,
        perceived_effort,
        is_completed,
        completed_at,
        exercises,
        cardio_entries,
        circuit_rounds,
      } = createWorkout;

      if (!authenticatedUserId || user_id !== authenticatedUserId) {
        throw new Error("Workout owner does not match authenticated user");
      }

      console.log("options ", cardio_entries, circuit_rounds);
      // 1. Write all data in a single transaction
      await withLocalTransaction(async (transaction) => {
        for (const exercise of exercises) {
          if (exercise.workout_id !== workoutId) throw new Error("Exercise belongs to a different workout");
          await assertWorkoutChildDoesNotExist(transaction, "workout_exercises", exercise.id);
          const circuitId = exercise.circuit_id ?? (exercise.group_type === "circuit" ? exercise.group_id : null);
          if (circuitId && !circuit_rounds.some((round) => round.id === circuitId && round.workout_id === workoutId)) {
            throw new Error("Circuit exercise references a round outside this workout");
          }
          for (const set of exercise.sets ?? []) {
            if (set.workout_exercise_id !== exercise.id) throw new Error("Set belongs to a different exercise");
            await assertWorkoutChildDoesNotExist(transaction, "exercise_sets", set.id);
          }
        }
        for (const entry of cardio_entries) {
          if (entry.workout_id !== workoutId) throw new Error("Cardio entry belongs to a different workout");
          await assertWorkoutChildDoesNotExist(transaction, "cardio_entries", entry.id);
          for (const interval of entry.intervals ?? []) {
            if (interval.cardio_entry_id !== entry.id) throw new Error("Cardio interval belongs to a different entry");
            await assertWorkoutChildDoesNotExist(transaction, "cardio_intervals", interval.id);
          }
        }
        for (const round of circuit_rounds) {
          if (round.workout_id !== workoutId) throw new Error("Circuit round belongs to a different workout");
          await assertWorkoutChildDoesNotExist(transaction, "circuit_rounds", round.id);
        }
        // Insert workout
        await transaction.runAsync(
          `INSERT INTO workouts (id, user_id, name, description, type, scheduled_datetime, duration, perceived_effort, is_completed, completed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            workoutId,
            user_id,
            name,
            description || "",
            workoutType,
            scheduled_datetime.replace(" ", "T"),
            duration || 0,
            perceived_effort || "easy",
            is_completed ? 1 : 0,
            completed_at || null,
          ],
        );

        // Circuit rounds are parents of exercises with circuit_id set.
        if (circuit_rounds.length > 0) {
          await circuitService.insertWorkoutCircuitRounds(circuit_rounds, transaction, authenticatedUserId);
        }

        // Insert exercises and sets after their possible circuit round parents.
        if (exercises.length > 0) {
          await exerciseService.insertWorkoutExercises(exercises, transaction, authenticatedUserId);
        }

        if (cardio_entries.length > 0) {
          await cardioService.insertWorkoutCardioEntries(cardio_entries, transaction, authenticatedUserId);
        }

        // Queue records in the same transaction as their local data.
        await syncService.addToSyncQueueInTransaction(
          transaction,
          user_id,
          "workouts",
          workoutId,
          "insert",
          {
            id: workoutId,
            user_id: user_id,
            name,
            description: description || "",
            type: workoutType,
            scheduled_datetime: scheduled_datetime.replace(" ", "T"),
            duration: duration || 0,
            perceived_effort: perceived_effort || "easy",
            is_completed: is_completed ? true : false,
            completed_at: completed_at || null,
          },
        );

      // --- Exercises + sets ---
      for (const workoutExercise of exercises) {
        const {
          id: exerciseId,
          workout_id,
          exercise_id,
          exercise_name,
          validUnits,
          exercise_order,
          group_id,
          group_type,
          round_number,
          musclesTargeted,
          equipment,
          description,
          sets,
        } = workoutExercise;

        await syncService.addToSyncQueueInTransaction(
          transaction,
          user_id,
          "workout_exercises",
          exerciseId,
          "insert",
          {
            ...(exerciseId ? { id: exerciseId } : {}),

            // Required
            workout_id,
            exercise_name,

            // Optional
            exercise_id: exercise_id ?? null,
            valid_units: validUnits ?? [],
            exercise_order: exercise_order ?? 1,
            group_id: group_id ?? null,
            group_type: group_type ?? null,
            round_number: round_number ?? null,
            circuit_id:
              workoutExercise.circuit_id ??
              (group_type === "circuit" ? workoutExercise.group_id ?? null : null),
            muscles_targeted: musclesTargeted ?? null,
            equipment: equipment ?? null,
            description: description ?? null,
          },
        );

        for (const set of sets) {
          const {
            id: setId,
            workout_exercise_id,
            reps = 0,
            weight = 0,
            time = 0,
            distance = 0,
            is_warmup = 0,
            is_max = 0,
            set_order = 0,
          } = set;

          await syncService.addToSyncQueueInTransaction(
            transaction,
            user_id,
            "exercise_sets",
            setId,
            "insert",
            {
              id: setId,
              workout_exercise_id,
              reps,
              weight,
              time,
              distance,
              is_warmup,
              is_max,
              set_order,
            },
          );
        }
      }

      // --- Cardio entries + intervals ---
      // Moved out of the exercises loop: these were previously nested inside
      // `for (const workoutExercise of exercises)`, so every exercise
      // re-queued the same cardio entries/intervals, producing duplicate
      // sync_queue rows for the same records.
      for (const cardioEntry of cardio_entries) {
        const {
          id: cardioEntryId,
          workout_id,
          activity,
          mode,
          duration: cardioDuration,
          distance: cardioDistance,
          calories,
          heart_rate_avg,
          heart_rate_zone,
          is_finisher,
          entry_order,
          notes,
          intervals,
        } = cardioEntry;

        await syncService.addToSyncQueueInTransaction(
          transaction,
          user_id,
          "cardio_entries",
          cardioEntryId,
          "insert",
          {
            id: cardioEntryId,
            // no user_id: table has no such column, ownership is via workout_id
            workout_id,
            activity,
            mode,
            duration: cardioDuration,
            distance: cardioDistance,
            calories,
            heart_rate_avg,
            heart_rate_zone,
            is_finisher,
            entry_order,
            notes,
          },
        );

        for (const cardioInterval of intervals) {
          const {
            id: cardioIntervalId,
            cardio_entry_id,
            interval_order,
            work_duration,
            rest_duration,
            distance,
            calories: intervalCalories,
            notes: intervalNotes,
          } = cardioInterval;

          await syncService.addToSyncQueueInTransaction(
            transaction,
            user_id,
            "cardio_intervals",
            cardioIntervalId,
            "insert",
            {
              id: cardioIntervalId,
              // no user_id: table has no such column, ownership is via cardio_entry_id
              cardio_entry_id,
              interval_order,
              work_duration,
              rest_duration,
              distance,
              calories: intervalCalories,
              notes: intervalNotes,
            },
          );
        }
      }

      // --- Circuit rounds ---
      // Also moved out of the exercises loop: same duplication bug applied here.
      for (const round of circuit_rounds) {
        const {
          id: roundId,
          workout_id,
          round_number,
          rest_after_round,
          notes,
        } = round;

        await syncService.addToSyncQueueInTransaction(
          transaction,
          user_id,
          "circuit_rounds",
          roundId,
          "insert",
          {
            id: roundId,
            workout_id,
            round_number,
            rest_after_round,
            notes,
          },
        );
      }

      });

      const workout = await workoutService.getWorkoutById(user_id, workoutId);
      return { success: true, data: workout };
    } catch (error) {
      console.error("Error inserting workout:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to insert workout",
      };
    }
  },
  updateWorkout: async (
    userId: string,
    workoutId: string,
    changes: WorkoutChanges,
  ): Promise<{
    success: boolean;
    data?: Workout | null;
    error?: string;
  }> => {
    try {
      await withLocalTransaction(async (transaction) => {
        await assertWorkoutOwned(transaction, userId, workoutId);
        for (const id of changes.exerciseIdsToDelete) await assertWorkoutChildOwned(transaction, userId, "workout_exercises", id, workoutId);
        for (const id of changes.setIdsToDelete) await assertWorkoutChildOwned(transaction, userId, "exercise_sets", id, workoutId);
        for (const id of changes.cardioEntryIdsToDelete) await assertWorkoutChildOwned(transaction, userId, "cardio_entries", id, workoutId);
        for (const id of changes.cardioIntervalIdsToDelete) await assertWorkoutChildOwned(transaction, userId, "cardio_intervals", id, workoutId);
        for (const id of changes.circuitRoundIdsToDelete) await assertWorkoutChildOwned(transaction, userId, "circuit_rounds", id, workoutId);
        for (const exercise of changes.exercisesToUpdate) await assertWorkoutChildOwned(transaction, userId, "workout_exercises", exercise.id, workoutId);
        for (const set of changes.setsToUpdate) await assertWorkoutChildOwned(transaction, userId, "exercise_sets", set.id, workoutId);
        for (const entry of changes.cardioEntriesToUpdate) await assertWorkoutChildOwned(transaction, userId, "cardio_entries", entry.id, workoutId);
        for (const interval of changes.cardioIntervalsToUpdate) await assertWorkoutChildOwned(transaction, userId, "cardio_intervals", interval.id, workoutId);
        for (const round of changes.circuitRoundsToUpdate) await assertWorkoutChildOwned(transaction, userId, "circuit_rounds", round.id, workoutId);
        for (const exercise of changes.exercisesToUpdate) {
          if (exercise.workout_id !== workoutId) throw new Error("Exercise belongs to a different workout");
          const circuitId = exercise.circuit_id ?? (exercise.group_type === "circuit" ? exercise.group_id : null);
          if (circuitId) await assertWorkoutChildOwned(transaction, userId, "circuit_rounds", circuitId, workoutId);
        }
        for (const exercise of changes.exercisesToInsert) {
          if (exercise.workout_id !== workoutId) throw new Error("Exercise belongs to a different workout");
          await assertWorkoutChildDoesNotExist(transaction, "workout_exercises", exercise.id);
          const circuitId = exercise.circuit_id ?? (exercise.group_type === "circuit" ? exercise.group_id : null);
          if (circuitId) {
            const isNewRound = changes.circuitRoundsToInsert.some((round) => round.id === circuitId && round.workout_id === workoutId);
            if (!isNewRound) await assertWorkoutChildOwned(transaction, userId, "circuit_rounds", circuitId, workoutId);
          }
          for (const set of exercise.sets ?? []) {
            if (set.workout_exercise_id !== exercise.id) throw new Error("Set belongs to a different exercise");
            await assertWorkoutChildDoesNotExist(transaction, "exercise_sets", set.id);
          }
        }
        for (const set of changes.setsToInsert) {
          await assertWorkoutChildOwned(transaction, userId, "workout_exercises", set.workout_exercise_id, workoutId);
          await assertWorkoutChildDoesNotExist(transaction, "exercise_sets", set.id);
        }
        for (const entry of changes.cardioEntriesToInsert) {
          if (entry.workout_id !== workoutId) throw new Error("Cardio entry belongs to a different workout");
          await assertWorkoutChildDoesNotExist(transaction, "cardio_entries", entry.id);
          for (const interval of entry.intervals ?? []) {
            if (interval.cardio_entry_id !== entry.id) throw new Error("Cardio interval belongs to a different entry");
            await assertWorkoutChildDoesNotExist(transaction, "cardio_intervals", interval.id);
          }
        }
        for (const interval of changes.cardioIntervalsToInsert) {
          await assertWorkoutChildOwned(transaction, userId, "cardio_entries", interval.cardio_entry_id, workoutId);
          await assertWorkoutChildDoesNotExist(transaction, "cardio_intervals", interval.id);
        }
        for (const round of changes.circuitRoundsToInsert) {
          if (round.workout_id !== workoutId) throw new Error("Circuit round belongs to a different workout");
          await assertWorkoutChildDoesNotExist(transaction, "circuit_rounds", round.id);
        }
        // Base workout fields
        if (changes.workout) {
          await updateBaseWorkoutInDb(transaction, userId, workoutId, changes.workout);
        }

        // Deletes: children first
        for (const setId of changes.setIdsToDelete) {
          await transaction.runAsync(`DELETE FROM exercise_sets WHERE id = ?`, [setId]);
        }

        for (const intervalId of changes.cardioIntervalIdsToDelete) {
          await transaction.runAsync(`DELETE FROM cardio_intervals WHERE id = ?`, [
            intervalId,
          ]);
        }

        for (const entryId of changes.cardioEntryIdsToDelete) {
          await transaction.runAsync(`DELETE FROM cardio_entries WHERE id = ?`, [
            entryId,
          ]);
        }

        for (const exerciseId of changes.exerciseIdsToDelete) {
          await transaction.runAsync(`DELETE FROM workout_exercises WHERE id = ?`, [
            exerciseId,
          ]);
        }

        for (const roundId of changes.circuitRoundIdsToDelete) {
          await transaction.runAsync(`DELETE FROM circuit_rounds WHERE id = ?`, [
            roundId,
          ]);
        }

        // Updates
        for (const exercise of changes.exercisesToUpdate) {
          await exerciseService.updateWorkoutExercise(exercise, transaction, userId);
        }

        for (const set of changes.setsToUpdate) {
          await setService.updateWorkoutSet(set, transaction, userId);
        }

        // Add equivalent updates for cardio/circuit.
        for (const entry of changes.cardioEntriesToUpdate) {
          await cardioService.updateWorkoutCardioEntry(entry, transaction, userId);
        }

        for (const interval of changes.cardioIntervalsToUpdate) {
          await cardioService.updateWorkoutCardioInterval(interval, transaction, userId);
        }

        for (const round of changes.circuitRoundsToUpdate) {
          await circuitService.updateWorkoutCircuitRound(round, transaction, userId);
        }
        // Inserts
        if (changes.circuitRoundsToInsert.length) {
          await circuitService.insertWorkoutCircuitRounds(
            changes.circuitRoundsToInsert,
            transaction,
            userId,
          );
        }

        if (changes.exercisesToInsert.length) {
          /*
           * Important: this method currently inserts
           * each exercise's sets too.
           *
           * Either:
           * 1. ensure exercisesToInsert contain their new sets and
           *    remove those sets from setsToInsert, or
           * 2. create a method that inserts exercises without sets.
           */
          await exerciseService.insertWorkoutExercises(
            changes.exercisesToInsert,
            transaction,
            userId,
          );
        }

        /*
         * Insert sets only for existing exercises.
         * Avoid reinserting sets already inserted with a new exercise.
         */
        if (changes.setsToInsert.length) {
          await setService.insertWorkoutSets(changes.setsToInsert, transaction, userId);
        }

        if (changes.cardioEntriesToInsert.length) {
          await cardioService.insertWorkoutCardioEntries(
            changes.cardioEntriesToInsert,
            transaction,
            userId,
          );
        }

        if (changes.cardioIntervalsToInsert.length) {
          await cardioService.insertWorkoutCardioIntervals(
            changes.cardioIntervalsToInsert,
            transaction,
            userId,
          );
        }

        if (changes.workout) {
          const workoutData: Record<string, unknown> = { id: workoutId };
          if (changes.workout.name !== undefined) {
            workoutData.name = changes.workout.name.trim();
          }
          if (changes.workout.description !== undefined) {
            workoutData.description = changes.workout.description?.trim() ?? "";
          }
          if (changes.workout.workoutType !== undefined) {
            workoutData.type = changes.workout.workoutType;
          }
          if (changes.workout.scheduled_datetime !== undefined) {
            workoutData.scheduled_datetime = changes.workout.scheduled_datetime.replace(" ", "T");
          }
          if (changes.workout.duration !== undefined) {
            workoutData.duration = changes.workout.duration ?? 0;
          }
          if (changes.workout.perceived_effort !== undefined) {
            workoutData.perceived_effort = changes.workout.perceived_effort ?? null;
          }
          if (changes.workout.is_completed !== undefined) {
            workoutData.is_completed = !!changes.workout.is_completed;
          }
          if (changes.workout.completed_at !== undefined) {
            workoutData.completed_at = changes.workout.completed_at ?? null;
          }
          if (Object.keys(workoutData).length > 1) {
            await syncService.addToSyncQueueInTransaction(
              transaction,
              userId,
              "workouts",
              workoutId,
              "update",
              workoutData,
            );
          }
        }

        for (const id of changes.setIdsToDelete) {
          await syncService.addToSyncQueueInTransaction(transaction, userId, "exercise_sets", id, "delete", { id });
        }
        for (const id of changes.cardioIntervalIdsToDelete) {
          await syncService.addToSyncQueueInTransaction(transaction, userId, "cardio_intervals", id, "delete", { id });
        }
        for (const id of changes.cardioEntryIdsToDelete) {
          await syncService.addToSyncQueueInTransaction(transaction, userId, "cardio_entries", id, "delete", { id });
        }
        for (const id of changes.exerciseIdsToDelete) {
          await syncService.addToSyncQueueInTransaction(transaction, userId, "workout_exercises", id, "delete", { id });
        }
        for (const id of changes.circuitRoundIdsToDelete) {
          await syncService.addToSyncQueueInTransaction(transaction, userId, "circuit_rounds", id, "delete", { id });
        }

        for (const exercise of changes.exercisesToUpdate) {
          await syncService.addToSyncQueueInTransaction(transaction, userId, "workout_exercises", exercise.id, "update", workoutExerciseSyncData(exercise));
        }
        for (const set of changes.setsToUpdate) {
          await syncService.addToSyncQueueInTransaction(transaction, userId, "exercise_sets", set.id, "update", exerciseSetSyncData(set));
        }
        for (const entry of changes.cardioEntriesToUpdate) {
          await syncService.addToSyncQueueInTransaction(transaction, userId, "cardio_entries", entry.id, "update", cardioEntrySyncData(entry));
        }
        for (const interval of changes.cardioIntervalsToUpdate) {
          await syncService.addToSyncQueueInTransaction(transaction, userId, "cardio_intervals", interval.id, "update", cardioIntervalSyncData(interval));
        }
        for (const round of changes.circuitRoundsToUpdate) {
          await syncService.addToSyncQueueInTransaction(transaction, userId, "circuit_rounds", round.id, "update", circuitRoundSyncData(round));
        }

        for (const exercise of changes.exercisesToInsert) {
          await syncService.addToSyncQueueInTransaction(transaction, userId, "workout_exercises", exercise.id, "insert", workoutExerciseSyncData(exercise));
          for (const set of exercise.sets ?? []) {
            await syncService.addToSyncQueueInTransaction(transaction, userId, "exercise_sets", set.id, "insert", exerciseSetSyncData(set));
          }
        }
        for (const set of changes.setsToInsert) {
          await syncService.addToSyncQueueInTransaction(transaction, userId, "exercise_sets", set.id, "insert", exerciseSetSyncData(set));
        }
        for (const entry of changes.cardioEntriesToInsert) {
          await syncService.addToSyncQueueInTransaction(transaction, userId, "cardio_entries", entry.id, "insert", cardioEntrySyncData(entry));
          for (const interval of entry.intervals ?? []) {
            await syncService.addToSyncQueueInTransaction(transaction, userId, "cardio_intervals", interval.id, "insert", cardioIntervalSyncData(interval));
          }
        }
        for (const interval of changes.cardioIntervalsToInsert) {
          await syncService.addToSyncQueueInTransaction(transaction, userId, "cardio_intervals", interval.id, "insert", cardioIntervalSyncData(interval));
        }
        for (const round of changes.circuitRoundsToInsert) {
          await syncService.addToSyncQueueInTransaction(transaction, userId, "circuit_rounds", round.id, "insert", circuitRoundSyncData(round));
        }
      });

      const updatedWorkout = await workoutService.getWorkoutById(userId, workoutId);

      return {
        success: true,
        data: updatedWorkout,
      };
    } catch (error) {
      console.error("Error updating workout:", error);

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update workout",
      };
    }
  },
  updateWorkoutNewExercise: async (
    userId: string,
    workoutId: string,
    exercise: WorkoutExercise,
  ): Promise<{ success: boolean; error?: string }> => {
    const db = await getDB();

    try {
      const foundWorkout = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM workouts WHERE id = ? AND user_id = ?`,
        [workoutId, userId],
      );

      if (!foundWorkout) {
        return { success: false, error: "Workout not found" };
      }

      const workoutExercise: WorkoutExercise = {
        ...exercise,
        workout_id: workoutId,
      };

      await withLocalTransaction(async (transaction) => {
        await assertWorkoutOwned(transaction, userId, workoutId);
        if (workoutExercise.workout_id !== workoutId) throw new Error("Exercise belongs to a different workout");
        for (const set of workoutExercise.sets ?? []) {
          if (set.workout_exercise_id !== workoutExercise.id) throw new Error("Set belongs to a different exercise");
        }
        await exerciseService.insertWorkoutExercises([workoutExercise], transaction, userId);
        await syncService.addToSyncQueueInTransaction(
          transaction,
          userId,
          "workout_exercises",
          workoutExercise.id,
          "insert",
          workoutExerciseSyncData(workoutExercise),
        );

        for (const set of workoutExercise.sets ?? []) {
          await syncService.addToSyncQueueInTransaction(
            transaction,
            userId,
            "exercise_sets",
            set.id,
            "insert",
            exerciseSetSyncData(set),
          );
        }
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating workout with new exercise:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update workout with new exercise",
      };
    }
  },

  reorderWorkoutExercise: async (
    userId: string,
    exercises: WorkoutExercise[],
    currentIndex: number,
    direction: "up" | "down",
  ): Promise<{ success: boolean; error?: string }> => {
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    const current = exercises[currentIndex];
    const swap = exercises[swapIndex];

    try {
      await withLocalTransaction(async (transaction) => {
        const ownerWorkoutId = await assertWorkoutChildOwned(transaction, userId, "workout_exercises", current.id);
        await assertWorkoutChildOwned(transaction, userId, "workout_exercises", swap.id, ownerWorkoutId);
        await transaction.runAsync(
          "UPDATE workout_exercises SET exercise_order = ? WHERE id = ?",
          [swap.exercise_order, current.id],
        );
        await transaction.runAsync(
          "UPDATE workout_exercises SET exercise_order = ? WHERE id = ?",
          [current.exercise_order, swap.id],
        );
        await syncService.addToSyncQueueInTransaction(
          transaction,
          userId,
          "workout_exercises",
          current.id,
          "update",
          { id: current.id, exercise_order: current.exercise_order },
        );
        await syncService.addToSyncQueueInTransaction(
          transaction,
          userId,
          "workout_exercises",
          swap.id,
          "update",
          { id: swap.id, exercise_order: swap.exercise_order },
        );
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to reorder exercises" };
    }
  },

  updateWorkoutType: async (
    userId: string,
    workoutId: string,
    workoutType: WorkoutType,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await withLocalTransaction(async (transaction) => {
        await assertWorkoutOwned(transaction, userId, workoutId);
        await transaction.runAsync(`UPDATE workouts SET type = ? WHERE id = ? AND user_id = ?`, [
          workoutType,
          workoutId,
          userId,
        ]);
        await syncService.addToSyncQueueInTransaction(
          transaction,
          userId,
          "workouts",
          workoutId,
          "update",
          { id: workoutId, type: workoutType },
        );
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating workout type:", error);
      return { success: false, error: "Failed to update workout type" };
    }
  },

  updateWorkoutDetails: async (
    userId: string,
    workoutId: string,
    details: { name?: string; description?: string },
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (details.name && details.description) {
        const { name, description } = details;
        await withLocalTransaction(async (transaction) => {
          await assertWorkoutOwned(transaction, userId, workoutId);
          await transaction.runAsync(
            `UPDATE workouts SET name = ?, description = ? WHERE id = ? AND user_id = ?`,
            [name, description, workoutId, userId],
          );

          await syncService.addToSyncQueueInTransaction(
            transaction,
            userId,
            "workouts",
            workoutId,
            "update",
            {
              id: workoutId,
              name,
              description,
            },
          );
        });
      }
      return { success: true };
    } catch (error) {
      console.error("Error updating workout field:", error);
      return { success: false, error: "Failed to update workout field" };
    }
  },

  updateWorkoutField: async (
    userId: string,
    workoutId: string,
    fieldName: string,
    value: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const allowedFields = new Set([
        "name", "description", "type", "scheduled_datetime", "duration",
        "perceived_effort", "is_completed", "completed_at",
      ]);
      if (!allowedFields.has(fieldName)) {
        return { success: false, error: "Workout field cannot be updated" };
      }
      await withLocalTransaction(async (transaction) => {
        await assertWorkoutOwned(transaction, userId, workoutId);
        await transaction.runAsync(`UPDATE workouts SET ${fieldName} = ? WHERE id = ? AND user_id = ?`, [
          value,
          workoutId,
          userId,
        ]);

        await syncService.addToSyncQueueInTransaction(
          transaction,
          userId,
          "workouts",
          workoutId,
          "update",
          { id: workoutId, [fieldName]: value },
        );
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating workout field:", error);
      return { success: false, error: "Failed to update workout field" };
    }
  },

  updateBaseWorkoutFields: async (
    userId: string,
    updatedWorkout: Partial<Workout>,
    workoutId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    console.log(
      "userId, workoutId in updateBaseWorkoutFields: ",
      userId,
      workoutId,
    );
    console.log(
      "Updating workout with fields in updateBaseWorkoutFields",
      updatedWorkout,
    );
    const { name, description, duration } = updatedWorkout;
    try {
      await withLocalTransaction(async (transaction) => {
        await assertWorkoutOwned(transaction, userId, workoutId);
        await transaction.runAsync(
          `UPDATE workouts SET name = ?, description = ?, duration = ? WHERE id = ? AND user_id = ?`,
          [name ?? "", description ?? "", duration ?? 0, workoutId, userId],
        );

        await syncService.addToSyncQueueInTransaction(
          transaction,
          userId,
          "workouts",
          workoutId,
          "update",
          {
            id: workoutId,
            name: name ?? "",
            description: description ?? "",
            duration: duration ?? 0,
          },
        );
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating workout field:", error);
      return { success: false, error: "Failed to update workout field" };
    }
  },

  updateCompleted: async (
    userId: string,
    workoutId: string,
    isCompleted: boolean,
    completed_at: string | null,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await withLocalTransaction(async (transaction) => {
        await assertWorkoutOwned(transaction, userId, workoutId);
        await transaction.runAsync(
          "UPDATE workouts SET is_completed = ?, completed_at = ? WHERE id = ? AND user_id = ?",
          [isCompleted, completed_at, workoutId, userId],
        );

        await syncService.addToSyncQueueInTransaction(
          transaction,
          userId,
          "workouts",
          workoutId,
          "update",
          { id: workoutId, is_completed: isCompleted, completed_at },
        );
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating workout field:", error);
      return { success: false, error: "Failed to update workout field" };
    }
  },

  deleteWorkoutExercise: async (
    userId: string,
    workout_exercise_id: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await withLocalTransaction(async (transaction) => {
        await assertWorkoutChildOwned(transaction, userId, "workout_exercises", workout_exercise_id);
        await transaction.runAsync(
          "DELETE FROM exercise_sets WHERE workout_exercise_id = ?",
          [workout_exercise_id],
        );
        await transaction.runAsync("DELETE FROM workout_exercises WHERE id = ?", [
          workout_exercise_id,
        ]);
        await syncService.addToSyncQueueInTransaction(
          transaction,
          userId,
          "workout_exercises",
          workout_exercise_id,
          "delete",
          { id: workout_exercise_id },
        );
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to delete workout exercise" };
    }
  },

  deleteWorkout: async (
    userId: string,
    workoutId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await withLocalTransaction(async (transaction) => {
        await assertWorkoutOwned(transaction, userId, workoutId);
        // Remove pending child operations before the workout is deleted.
        await syncService.purgeOrphanedQueueItemsInTransaction(
          transaction,
          userId,
          workoutId,
        );

        // Exclusive transactions use a separate SQLite connection, where
        // foreign-key enforcement may not be enabled. Delete children
        // explicitly so workout deletion has the same result on every DB
        // connection configuration.
        await transaction.runAsync(
          `DELETE FROM exercise_sets
           WHERE workout_exercise_id IN (
             SELECT id FROM workout_exercises WHERE workout_id = ?
           )`,
          [workoutId],
        );
        await transaction.runAsync(
          `DELETE FROM workout_exercises WHERE workout_id = ?`,
          [workoutId],
        );
        await transaction.runAsync(
          `DELETE FROM cardio_intervals
           WHERE cardio_entry_id IN (
             SELECT id FROM cardio_entries WHERE workout_id = ?
           )`,
          [workoutId],
        );
        await transaction.runAsync(
          `DELETE FROM cardio_entries WHERE workout_id = ?`,
          [workoutId],
        );
        await transaction.runAsync(
          `DELETE FROM circuit_rounds WHERE workout_id = ?`,
          [workoutId],
        );
        await transaction.runAsync(`DELETE FROM workouts WHERE id = ? AND user_id = ?`, [workoutId, userId]);

        await syncService.addToSyncQueueInTransaction(
          transaction,
          userId,
          "workouts",
          workoutId,
          "delete",
          { id: workoutId },
        );
      });

      return { success: true };
    } catch (error) {
      console.log("Error deleting workout ", error);
      return { success: false, error: "Failed to delete workout" };
    }
  },

  getWorkoutsByMonth: async (
    userId: string,
    startMonth: { month: string; year: string },
    endMonth: { month: string; year: string },
  ): Promise<Workout[]> => {
    const db = await getDB();

    try {
      const startDate = `${startMonth.year}-${startMonth.month}-01`;
      const endDate = `${endMonth.year}-${endMonth.month}-31`;

      const rows = await db.getAllAsync<WorkoutDataRow>(
        `SELECT
           id,
           user_id,
           name,
           description,
           type,
           scheduled_datetime,
           duration,
           perceived_effort,
           is_completed,
           completed_at
         FROM workouts
         WHERE user_id = ?
           AND DATE(scheduled_datetime) >= ?
           AND DATE(scheduled_datetime) <= ?
         ORDER BY scheduled_datetime ASC`,
        [userId, startDate, endDate],
      );

      return hydrateWorkouts(rows, db);
    } catch (error) {
      console.error("Error fetching workouts by month:", error);
      return [];
    }
  },
};
