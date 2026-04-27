import * as SQLite from "expo-sqlite";
import {
  ValidUnit,
  ExerciseType,
  Difficulty,
  Workout as AppWorkout,
  SubmitNewWorkout,
} from "@/types/interfaces/types";
import {
  Workout,
  Exercise,
  CreateWorkoutForm,
  BaseWorkout,
  ExerciseFormData,
} from "@/types/type";
import * as Crypto from "expo-crypto";
import { syncService } from "@/services/syncService";
import { getDB } from "./database";

// Interface for raw database row
interface WorkoutRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  type: string;
  scheduled_datetime: string;
  duration: number;
  is_completed: number;
  workout_exercise_id: string;
  exercise_id: string;
  exercise_name: string;
  track_reps: number;
  track_weight: number;
  track_time: number;
  track_distance: number;
  exercise_description?: string;
  exercise_difficulty?: string;
  set_id?: string;
  reps?: number;
  weight?: number;
  set_duration?: number;
  distance?: number;
  valid_units?: string;
  exercise_order?: number;
  set_order?: number;
  completed_at?: string | null;
}

interface WorkoutDataRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  type: string;
  scheduled_datetime: string;
  duration: number;
  is_completed: number;
  completed_at?: string | null;
}

interface ExerciseRow {
  id: string;
  workout_id: string;
  exercise_id: string;
  exercise_name: string;
  chosen_unit_combination: string;
  track_reps: number;
  track_weight: number;
  track_time: number;
  track_distance: number;
  exercise_order: number;
  exercise_description?: string;
  exercise_difficulty?: string;
}

interface SetRow {
  id: string;
  workout_exercise_id: string;
  reps: number;
  weight: number;
  time: number;
  distance: number;
  set_order: number;
}

const transformWorkout = (rows: WorkoutRow[]): Workout | null => {
  if (!rows.length) return null;

  const exercisesMap = new Map<string, Exercise>();

  rows.forEach((row) => {
    if (!row.exercise_id) return;

    if (!exercisesMap.has(row.workout_exercise_id)) {
      exercisesMap.set(row.workout_exercise_id, {
        id: row.workout_exercise_id,
        exercise_id: row.exercise_id,
        workout_id: row.id,
        exercise_name: row.exercise_name,
        exercise_description: row.exercise_description,
        exercise_difficulty: row.exercise_difficulty as Difficulty,
        track_reps: row.track_reps,
        track_weight: row.track_weight,
        track_time: row.track_time,
        track_distance: row.track_distance,
        validUnits: row.valid_units
          ? row.valid_units
              .split(",")
              .map((units) =>
                units.split("+").map((unit) => unit.trim() as ValidUnit),
              )
          : [],
        sets: [],
        exercise_order: row.exercise_order ?? 0,
      });
    }

    if (row.set_id) {
      const exercise = exercisesMap.get(row.workout_exercise_id)!;
      exercise.sets.push({
        id: row.set_id,
        workout_exercise_id: row.workout_exercise_id,
        reps: row.reps,
        weight: row.weight,
        duration: row.set_duration,
        distance: row.distance,
        set_order: row.set_order!,
      });
    }
  });

  return {
    id: rows[0].id,
    user_id: rows[0].user_id,
    name: rows[0].name,
    description: rows[0].description,
    workoutType: rows[0].type as ExerciseType,
    scheduled_datetime: rows[0].scheduled_datetime,
    duration: rows[0].duration,
    exercises: Array.from(exercisesMap.values()),
    isCompleted: !!rows[0].is_completed,
    completed_at: rows[0].completed_at ?? null,
  };
};

export const workoutService = {
  getAllWorkouts: async (userId: string): Promise<Workout[]> => {
    const db = await getDB();
    try {
      const t = await db.getAllAsync(`SELECT * FROM workouts`);

      const workouts = await db.getAllAsync<WorkoutRow>(
        `
  SELECT 
    w.*,
    we.id as workout_exercise_id,
    we.exercise_id,
    we.exercise_name,
    we.track_reps,
    we.track_weight,
    we.track_time,
    we.track_distance,
    we.exercise_order as exercise_order,
    e.description as exercise_description,
    e.difficulty as exercise_difficulty,
    es.id as set_id,
    es.reps,
    es.weight,
    es.time as set_duration,
    es.distance,
    es.set_order,
    GROUP_CONCAT(euc.unit_combination) as valid_units
  FROM workouts w
  LEFT JOIN workout_exercises we ON w.id = we.workout_id
  LEFT JOIN exercises e ON we.exercise_id = e.id
  LEFT JOIN exercise_sets es ON we.id = es.workout_exercise_id
  LEFT JOIN exercise_unit_combinations euc ON we.exercise_id = euc.exercise_id
  WHERE w.user_id = ?
  GROUP BY w.id, we.id, es.id
  ORDER BY w.scheduled_datetime, we.exercise_order, es.set_order
`,
        [userId],
      );

      const workoutMap = new Map<string, WorkoutRow[]>();
      workouts.forEach((row) => {
        if (!workoutMap.has(row.id)) {
          workoutMap.set(row.id, []);
        }
        workoutMap.get(row.id)!.push(row);
      });

      const transformedWorkouts = Array.from(workoutMap.values())
        .map((rows) => transformWorkout(rows))
        .filter((workout): workout is Workout => workout !== null);

      return transformedWorkouts;
    } catch (error) {
      console.error("Error fetching all workouts:", error);
      throw new Error("Failed to fetch workouts");
    }
  },

  getWorkoutById: async (id: string): Promise<Workout | null> => {
    const db = await getDB();
    try {
      const workoutRows = await db.getAllAsync<WorkoutDataRow>(
        `SELECT * FROM workouts WHERE id = ?`,
        [id],
      );

      if (!workoutRows.length) return null;

      const workout = workoutRows[0];

      const exerciseRows = await db.getAllAsync<ExerciseRow>(
        `SELECT 
          we.*,
          e.description as exercise_description,
          e.difficulty as exercise_difficulty
        FROM workout_exercises we
        LEFT JOIN exercises e ON we.exercise_id = e.id
        WHERE we.workout_id = ?
        ORDER BY we.exercise_order`,
        [id],
      );

      const exercises = await Promise.all(
        exerciseRows.map(async (exerciseRow) => {
          const sets = await db.getAllAsync<SetRow>(
            `SELECT * FROM exercise_sets 
             WHERE workout_exercise_id = ?
             ORDER BY set_order`,
            [exerciseRow.id],
          );

          return {
            id: exerciseRow.id,
            exercise_id: exerciseRow.exercise_id,
            workout_id: id,
            exercise_name: exerciseRow.exercise_name,
            exercise_description: exerciseRow.exercise_description,
            exercise_difficulty: exerciseRow.exercise_difficulty as Difficulty,
            track_reps: exerciseRow.track_reps,
            track_weight: exerciseRow.track_weight,
            track_time: exerciseRow.track_time,
            track_distance: exerciseRow.track_distance,
            validUnits: exerciseRow.chosen_unit_combination
              ? exerciseRow.chosen_unit_combination
                  .split(",")
                  .map((units) =>
                    units.split("+").map((unit) => unit.trim() as ValidUnit),
                  )
              : [],
            sets: sets.map((set) => ({
              id: set.id,
              workout_exercise_id: set.workout_exercise_id,
              reps: set.reps,
              weight: set.weight,
              duration: set.time,
              distance: set.distance,
              set_order: set.set_order,
            })),
            exercise_order: exerciseRow.exercise_order,
          };
        }),
      );

      return {
        id: workout.id,
        user_id: workout.user_id,
        name: workout.name,
        description: workout.description,
        workoutType: workout.type as ExerciseType,
        scheduled_datetime: workout.scheduled_datetime,
        duration: workout.duration,
        exercises,
        isCompleted: !!workout.is_completed,
        completed_at: workout.completed_at ?? null,
      };
    } catch (error) {
      console.error(`Error fetching workout with id ${id}:`, error);
      throw new Error("Failed to fetch workout");
    }
  },

  getWorkoutsByDate: async (date: string): Promise<Workout[]> => {
    const db = await getDB();
    try {
      const workoutRows = await db.getAllAsync<WorkoutDataRow>(
        `SELECT * FROM workouts WHERE DATE(scheduled_datetime) = ? ORDER BY scheduled_datetime`,
        [date],
      );

      const workouts = await Promise.all(
        workoutRows.map(async (workout) => {
          const exerciseRows = await db.getAllAsync<ExerciseRow>(
            `SELECT 
              we.*,
              e.description as exercise_description,
              e.difficulty as exercise_difficulty
            FROM workout_exercises we
            LEFT JOIN exercises e ON we.exercise_id = e.id
            WHERE we.workout_id = ?
            ORDER BY we.exercise_order`,
            [workout.id],
          );

          const exercises = await Promise.all(
            exerciseRows.map(async (exerciseRow) => {
              const sets = await db.getAllAsync<SetRow>(
                `SELECT * FROM exercise_sets 
                 WHERE workout_exercise_id = ?
                 ORDER BY set_order`,
                [exerciseRow.id],
              );

              return {
                id: exerciseRow.id,
                exercise_id: exerciseRow.exercise_id,
                workout_id: workout.id,
                exercise_name: exerciseRow.exercise_name,
                exercise_description: exerciseRow.exercise_description,
                exercise_difficulty:
                  exerciseRow.exercise_difficulty as Difficulty,
                track_reps: exerciseRow.track_reps,
                track_weight: exerciseRow.track_weight,
                track_time: exerciseRow.track_time,
                track_distance: exerciseRow.track_distance,
                validUnits: exerciseRow.chosen_unit_combination
                  ? exerciseRow.chosen_unit_combination
                      .split(",")
                      .map((units) =>
                        units
                          .split("+")
                          .map((unit) => unit.trim() as ValidUnit),
                      )
                  : [],
                sets: sets.map((set) => ({
                  id: set.id,
                  workout_exercise_id: set.workout_exercise_id,
                  reps: set.reps,
                  weight: set.weight,
                  duration: set.time,
                  distance: set.distance,
                  set_order: set.set_order,
                })),
                exercise_order: exerciseRow.exercise_order,
              };
            }),
          );

          return {
            id: workout.id,
            user_id: workout.user_id,
            name: workout.name,
            description: workout.description,
            workoutType: workout.type as ExerciseType,
            scheduled_datetime: workout.scheduled_datetime,
            duration: workout.duration,
            exercises,
            isCompleted: !!workout.is_completed,
            completed_at: workout.completed_at ?? null,
          };
        }),
      );

      return workouts;
    } catch (error) {
      console.error(`Error fetching workouts for date ${date}:`, error);
      throw new Error("Failed to fetch workouts by date");
    }
  },

  transformToAppFormat: (workouts: Workout[]): AppWorkout[] => {
    return workouts.map((workout) => ({
      id: workout.id,
      user_id: workout.user_id,
      name: workout.name,
      description: workout.description,
      type: workout.workoutType as ExerciseType,
      scheduled_datetime: workout.scheduled_datetime,
      duration: workout.duration,
      exercises: workout.exercises.map((exercise) => ({
        exercise: {
          id: exercise.exercise_id,
          name: exercise.exercise_name,
          description: exercise.exercise_description || "",
          types: [workout.workoutType as ExerciseType],
          validUnits: exercise.validUnits || [],
          musclesTargeted: exercise.musclesTargeted || [],
          equipment: exercise.equipment || [],
          difficulty:
            (exercise.exercise_difficulty as Difficulty) || "beginner",
          noWeight: false,
        },
        chosenUnitCombination: [
          ...(exercise.track_reps ? ["reps" as ValidUnit] : []),
          ...(exercise.track_weight ? ["weight" as ValidUnit] : []),
          ...(exercise.track_time ? ["time" as ValidUnit] : []),
          ...(exercise.track_distance ? ["distance" as ValidUnit] : []),
        ],
        sets: exercise.sets.map((set) => ({
          reps: set.reps,
          weight: set.weight,
          time: set.duration,
          distance: set.distance,
        })),
      })),
      isCompleted: workout.isCompleted,
    }));
  },

  insertWorkout: async (
    createWorkout: Workout,
    userId: string,
  ): Promise<{ success: boolean; data?: Workout | null; error?: string }> => {
    const db = await getDB();
    console.log("userId in insertWorkout: ", userId);
    try {
      const {
        id: workoutId,
        exercises,
        name,
        description,
        workoutType,
        scheduled_datetime,
        duration,
        isCompleted,
      } = createWorkout;

      if (!db) throw new Error("No database connection");

      // 1. Write all data in a single transaction
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO workouts (id, user_id, name, description, type, scheduled_datetime, duration, is_completed)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            workoutId,
            userId,
            name,
            description || "",
            workoutType,
            scheduled_datetime.replace(" ", "T"),
            duration || 0,
            isCompleted ? 1 : 0,
          ],
        );

        for (const workoutExercise of exercises) {
          const {
            id: exerciseId,
            exercise_id,
            exercise_name,
            track_reps,
            track_weight,
            track_time,
            track_distance,
            validUnits,
            sets,
          } = workoutExercise;

          await db.runAsync(
            `INSERT INTO workout_exercises (id, workout_id, exercise_id, exercise_name, chosen_unit_combination, track_reps, track_weight, track_time, track_distance, exercise_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              exerciseId,
              workoutId,
              exercise_id,
              exercise_name,
              validUnits?.join(",") || "",
              track_reps ? 1 : 0,
              track_weight ? 1 : 0,
              track_time ? 1 : 0,
              track_distance ? 1 : 0,
              exercises.indexOf(workoutExercise) + 1,
            ],
          );

          for (const set of sets) {
            const {
              id: setId,
              reps = 0,
              weight = 0,
              duration = 0,
              distance = 0,
              set_order = 0,
            } = set;

            await db.runAsync(
              `INSERT INTO exercise_sets (id, workout_exercise_id, reps, weight, time, distance, set_order)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [setId, exerciseId, reps, weight, duration, distance, set_order],
            );
          }
        }
      });

      // 2. Queue sync items after transaction succeeds
      await syncService.addToSyncQueue(
        userId,
        "workouts",
        workoutId,
        "insert",
        {
          id: workoutId,
          user_id: userId,
          name,
          description: description || "",
          type: workoutType,
          scheduled_datetime: scheduled_datetime.replace(" ", "T"),
          duration: duration || 0,
          is_completed: isCompleted ? true : false,
        },
      );

      for (const workoutExercise of exercises) {
        const {
          id: exerciseId,
          exercise_id,
          exercise_name,
          track_reps,
          track_weight,
          track_time,
          track_distance,
          validUnits,
          sets,
        } = workoutExercise;

        await syncService.addToSyncQueue(
          userId,
          "workout_exercises",
          exerciseId,
          "insert",
          {
            id: exerciseId,
            workout_id: workoutId,
            exercise_id,
            exercise_name,
            chosen_unit_combination: validUnits?.join(",") || "",
            track_reps: track_reps ? true : false,
            track_weight: track_weight ? true : false,
            track_time: track_time ? true : false,
            track_distance: track_distance ? true : false,
            exercise_order: exercises.indexOf(workoutExercise) + 1,
          },
        );

        for (const set of sets) {
          const {
            id: setId,
            reps = 0,
            weight = 0,
            duration = 0,
            distance = 0,
            set_order = 0,
          } = set;

          await syncService.addToSyncQueue(
            userId,
            "exercise_sets",
            setId,
            "insert",
            {
              id: setId,
              workout_exercise_id: exerciseId,
              reps,
              weight,
              time: duration,
              distance,
              set_order,
            },
          );
        }
      }

      const workout = await workoutService.getWorkoutById(workoutId);
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

  updateWorkoutNewExercise: async (
    userId: string,
    workoutId: string,
    exercise: Exercise,
  ): Promise<{ success: boolean; error?: string }> => {
    const db = await getDB();
    try {
      const foundWorkoutId = await db.getFirstAsync<WorkoutDataRow>(
        `SELECT id FROM workouts WHERE id = ?`,
        [workoutId],
      );
      if (!foundWorkoutId) {
        return { success: false, error: "Workout not found" };
      }

      const {
        id,
        workout_id,
        exercise_id,
        exercise_name,
        validUnits,
        track_reps,
        track_weight,
        track_time,
        track_distance,
        exercise_order,
        sets,
      } = exercise;

      // 1. Write all data in a single transaction
      await db.withExclusiveTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO workout_exercises (id, workout_id, exercise_id, exercise_name, chosen_unit_combination, track_reps, track_weight, track_time, track_distance, exercise_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            workout_id,
            exercise_id,
            exercise_name,
            validUnits?.join(",") || "",
            track_reps ? 1 : 0,
            track_weight ? 1 : 0,
            track_time ? 1 : 0,
            track_distance ? 1 : 0,
            exercise_order ?? 1,
          ],
        );

        for (const set of sets) {
          const {
            id: setId,
            workout_exercise_id,
            reps,
            weight,
            duration,
            distance,
          } = set;

          await db.runAsync(
            `INSERT INTO exercise_sets (id, workout_exercise_id, reps, weight, time, distance, set_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              setId,
              workout_exercise_id,
              reps ?? 0,
              weight ?? 0,
              duration ?? 0,
              distance ?? 0,
              exercise.sets.indexOf(set) + 1,
            ],
          );
        }
      });

      // 2. Queue sync items after transaction succeeds
      await syncService.addToSyncQueue(
        userId,
        "workout_exercises",
        id,
        "insert",
        {
          id,
          workout_id: workoutId,
          exercise_id,
          exercise_name,
          chosen_unit_combination: validUnits?.join(",") || "",
          track_reps: track_reps ? true : false,
          track_weight: track_weight ? true : false,
          track_time: track_time ? true : false,
          track_distance: track_distance ? true : false,
          exercise_order: exercise_order ?? 1,
        },
      );

      for (const set of sets) {
        const {
          id: setId,
          workout_exercise_id,
          reps,
          weight,
          duration,
          distance,
        } = set;

        await syncService.addToSyncQueue(
          userId,
          "exercise_sets",
          setId,
          "insert",
          {
            id: setId,
            workout_exercise_id,
            reps: reps ?? null,
            weight: weight ?? null,
            time: duration ?? null,
            distance: distance ?? null,
            set_order: exercise.sets.indexOf(set) + 1,
          },
        );
      }

      return { success: true };
    } catch (error) {
      console.error("Error updating workout with new exercise:", error);
      return { success: false, error: "Failed to update workout" };
    }
  },

  reorderWorkoutExercise: async (
    userId: string,
    exercises: Exercise[],
    currentIndex: number,
    direction: "up" | "down",
  ): Promise<{ success: boolean; error?: string }> => {
    const db = await getDB();
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    const current = exercises[currentIndex];
    const swap = exercises[swapIndex];

    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          "UPDATE workout_exercises SET exercise_order = ? WHERE id = ?",
          [swap.exercise_order, current.id],
        );
        await db.runAsync(
          "UPDATE workout_exercises SET exercise_order = ? WHERE id = ?",
          [current.exercise_order, swap.id],
        );
      });

      await syncService.addToSyncQueue(
        userId,
        "workout_exercises",
        current.id,
        "update",
        { exercise_order: current.exercise_order },
      );

      await syncService.addToSyncQueue(
        userId,
        "workout_exercises",
        swap.id,
        "update",
        { exercise_order: swap.exercise_order },
      );

      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to reorder exercises" };
    }
  },

  updateWorkoutType: async (
    userId: string,
    workoutId: string,
    workoutType: ExerciseType,
  ): Promise<{ success: boolean; error?: string }> => {
    const db = await getDB();
    try {
      await db.withExclusiveTransactionAsync(async () => {
        await db.runAsync(`UPDATE workouts SET type = ? WHERE id = ?`, [
          workoutType,
          workoutId,
        ]);
      });

      await syncService.addToSyncQueue(
        userId,
        "workouts",
        workoutId,
        "update",
        { id: workoutId, type: workoutType },
      );

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
    const db = await getDB();
    try {
      if (details.name && details.description) {
        await db.runAsync(
          `UPDATE workouts SET name = ?, description = ? WHERE id = ?`,
          [details.name, details.description, workoutId],
        );

        await syncService.addToSyncQueue(
          userId,
          "workouts",
          workoutId,
          "update",
          {
            id: workoutId,
            name: details.name,
            description: details.description,
          },
        );
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
    const db = await getDB();
    try {
      await db.runAsync(`UPDATE workouts SET ${fieldName} = ? WHERE id = ?`, [
        value,
        workoutId,
      ]);

      await syncService.addToSyncQueue(
        userId,
        "workouts",
        workoutId,
        "update",
        { id: workoutId, [fieldName]: value },
      );

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
    const db = await getDB();
    const { name, description, duration } = updatedWorkout;
    try {
      await db.runAsync(
        `UPDATE workouts SET name = ?, description = ?, duration = ? WHERE id = ?`,
        [name ?? "", description ?? "", duration ?? 0, workoutId],
      );

      await syncService.addToSyncQueue(
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
    const db = await getDB();
    try {
      await db.runAsync(
        "UPDATE workouts SET is_completed = ?, completed_at = ? WHERE id = ?",
        [isCompleted, completed_at, workoutId],
      );

      await syncService.addToSyncQueue(
        userId,
        "workouts",
        workoutId,
        "update",
        { id: workoutId, is_completed: isCompleted, completed_at },
      );

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
    const db = await getDB();
    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          "DELETE FROM exercise_sets WHERE workout_exercise_id = ?",
          [workout_exercise_id],
        );
        await db.runAsync("DELETE FROM workout_exercises WHERE id = ?", [
          workout_exercise_id,
        ]);
      });

      await syncService.addToSyncQueue(
        userId,
        "workout_exercises",
        workout_exercise_id,
        "delete",
        { id: workout_exercise_id },
      );

      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to delete workout exercise" };
    }
  },

  deleteWorkout: async (
    userId: string,
    workoutId: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const db = await getDB();
    try {
      // Purge orphaned children before queuing the workout delete
      await syncService.purgeOrphanedQueueItems(workoutId);

      await db.runAsync(`DELETE FROM workouts WHERE id = ?`, [workoutId]);

      await syncService.addToSyncQueue(
        userId,
        "workouts",
        workoutId,
        "delete",
        { id: workoutId },
      );

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

      const workouts = await db.getAllAsync<WorkoutRow>(
        `
SELECT 
  w.*,
  we.id as workout_exercise_id, 
  we.exercise_id,
  we.exercise_name,
  we.track_reps,
  we.track_weight,
  we.track_time,
  we.track_distance,
  we.exercise_order as exercise_order,
  e.description as exercise_description,
  e.difficulty as exercise_difficulty,
  es.id as set_id,
  es.reps,
  es.weight,
  es.time as set_duration,
  es.distance,
  es.set_order,
  GROUP_CONCAT(euc.unit_combination) as valid_units
FROM workouts w
LEFT JOIN workout_exercises we ON w.id = we.workout_id
LEFT JOIN exercises e ON we.exercise_id = e.id
LEFT JOIN exercise_sets es ON we.id = es.workout_exercise_id
LEFT JOIN exercise_unit_combinations euc ON we.exercise_id = euc.exercise_id
WHERE w.user_id = ? 
  AND DATE(w.scheduled_datetime) >= ? 
  AND DATE(w.scheduled_datetime) <= ?
GROUP BY w.id, we.id, es.id
ORDER BY w.scheduled_datetime ASC
`,
        [userId, startDate, endDate],
      );

      const workoutMap = new Map<string, WorkoutRow[]>();
      workouts.forEach((row) => {
        if (!workoutMap.has(row.id)) {
          workoutMap.set(row.id, []);
        }
        workoutMap.get(row.id)!.push(row);
      });

      const transformedWorkouts = Array.from(workoutMap.values())
        .map((rows) => transformWorkout(rows))
        .filter((workout): workout is Workout => workout !== null);

      return transformedWorkouts;
    } catch (error) {
      console.error("Error fetching workouts by month:", error);
      return [];
    }
  },
};
