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

// Interface for raw database row (used in old approach)
interface WorkoutRow {
  id: number;
  name: string;
  description: string;
  type: string;
  date: string;
  time: string;
  duration: number;
  is_completed: number;
  workout_exercise_id: number; // Add this field
  exercise_id: number;
  exercise_name: string;
  track_reps: number;
  track_weight: number;
  track_time: number;
  track_distance: number;
  exercise_description?: string;
  exercise_difficulty?: string;
  set_id?: number;
  reps?: number;
  weight?: number;
  set_duration?: number;
  distance?: number;
  valid_units?: string;
  exercise_order?: number; // <-- add this line
  set_order?: number; // <-- add this line for set ordering
}

// Interface for workout rows from workouts table
interface WorkoutDataRow {
  id: number;
  name: string;
  description: string;
  type: string;
  date: string;
  time: string;
  duration: number;
  is_completed: number;
}

// Interface for exercise rows from workout_exercises
interface ExerciseRow {
  id: number;
  workout_id: number;
  exercise_id: number;
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

// Interface for set rows from exercise_sets (updated to reference workout_exercise_id)
interface SetRow {
  id: number;
  workout_exercise_id: number;
  reps: number;
  weight: number;
  time: number;
  distance: number;
  set_order: number;
}

// Helper function to transform database results
const transformWorkout = (rows: WorkoutRow[]): Workout | null => {
  if (!rows.length) return null;

  // Group exercises and their sets
  const exercisesMap = new Map<number, Exercise>();

  rows.forEach((row) => {
    if (!row.exercise_id) return; // Skip if no exercise

    if (!exercisesMap.has(row.workout_exercise_id)) {
      exercisesMap.set(row.workout_exercise_id, {
        id: row.workout_exercise_id, // Use workout_exercise_id instead of row.id
        exercise_id: row.exercise_id,
        workout_id: row.id, // Add workout_id from the workout row
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
                units.split("+").map((unit) => unit.trim() as ValidUnit)
              )
          : [],
        sets: [],
        exercise_order: row.exercise_order ?? 0, // <-- add this line
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

  // Create the workout object
  const workout = {
    id: rows[0].id,
    name: rows[0].name,
    description: rows[0].description,
    workoutType: rows[0].type as ExerciseType,
    date: rows[0].date,
    time: rows[0].time,
    duration: rows[0].duration,
    exercises: Array.from(exercisesMap.values()),
    isCompleted: !!rows[0].is_completed,
  };

  return workout;
};

export const workoutService = {
  getAllWorkouts: async (db: SQLite.SQLiteDatabase): Promise<Workout[]> => {
    try {
      const workouts = await db.getAllAsync<WorkoutRow>(`
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
        GROUP BY w.id, we.id, es.id
        ORDER BY w.date, w.time, we.exercise_order, es.set_order
      `);

      // Group rows by workout
      const workoutMap = new Map<number, WorkoutRow[]>();
      workouts.forEach((row) => {
        if (!workoutMap.has(row.id)) {
          workoutMap.set(row.id, []);
        }
        workoutMap.get(row.id)!.push(row);
      });

      // Transform each workout's rows
      const transformedWorkouts = Array.from(workoutMap.values())
        .map((rows) => transformWorkout(rows))
        .filter((workout): workout is Workout => workout !== null);

      return transformedWorkouts;
    } catch (error) {
      console.error("Error fetching all workouts:", error);
      throw new Error("Failed to fetch workouts");
    }
  },

  getWorkoutById: async (
    db: SQLite.SQLiteDatabase,
    id: number
  ): Promise<Workout | null> => {
    try {
      // Get the workout details
      const workoutRows = await db.getAllAsync<WorkoutDataRow>(
        `SELECT * FROM workouts WHERE id = ?`,
        [id]
      );

      if (!workoutRows.length) {
        return null;
      }

      const workout = workoutRows[0];

      // Get workout exercises
      const exerciseRows = await db.getAllAsync<ExerciseRow>(
        `SELECT 
          we.*,
          e.description as exercise_description,
          e.difficulty as exercise_difficulty
        FROM workout_exercises we
        LEFT JOIN exercises e ON we.exercise_id = e.id
        WHERE we.workout_id = ?
        ORDER BY we.id`,
        [id]
      );

      // Get sets for each exercise instance
      const exercises = await Promise.all(
        exerciseRows.map(async (exerciseRow) => {
          const sets = await db.getAllAsync<SetRow>(
            `SELECT * FROM exercise_sets 
             WHERE workout_exercise_id = ?
             ORDER BY id`,
            [exerciseRow.id]
          );

          return {
            id: exerciseRow.id,
            exercise_id: exerciseRow.exercise_id,
            workout_id: id, // Add workout_id from the function parameter
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
                    units.split("+").map((unit) => unit.trim() as ValidUnit)
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
            exercise_order: exerciseRow.exercise_order, // <-- add this line
          };
        })
      );

      return {
        id: workout.id,
        name: workout.name,
        description: workout.description,
        workoutType: workout.type as ExerciseType,
        date: workout.date,
        time: workout.time,
        duration: workout.duration,
        exercises,
        isCompleted: !!workout.is_completed,
      };
    } catch (error) {
      console.error(`Error fetching workout with id ${id}:`, error);
      throw new Error("Failed to fetch workout");
    }
  },
  getWorkoutsByDate: async (
    db: SQLite.SQLiteDatabase,
    date: string
  ): Promise<Workout[]> => {
    try {
      // Get all workouts for the date
      const workoutRows = await db.getAllAsync<WorkoutDataRow>(
        `SELECT * FROM workouts WHERE date = ? ORDER BY time`,
        [date]
      );

      // Get exercises and sets for each workout
      const workouts = await Promise.all(
        workoutRows.map(async (workout) => {
          // Get workout exercises
          const exerciseRows = await db.getAllAsync<ExerciseRow>(
            `SELECT 
              we.*,
              e.description as exercise_description,
              e.difficulty as exercise_difficulty
            FROM workout_exercises we
            LEFT JOIN exercises e ON we.exercise_id = e.id
            WHERE we.workout_id = ?
            ORDER BY we.id`,
            [workout.id]
          );

          // Get sets for each exercise instance
          const exercises = await Promise.all(
            exerciseRows.map(async (exerciseRow) => {
              const sets = await db.getAllAsync<SetRow>(
                `SELECT * FROM exercise_sets 
                 WHERE workout_exercise_id = ?
                 ORDER BY id`,
                [exerciseRow.id]
              );

              return {
                id: exerciseRow.id,
                exercise_id: exerciseRow.exercise_id,
                workout_id: workout.id, // Add workout_id from the workout object
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
                        units.split("+").map((unit) => unit.trim() as ValidUnit)
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
                exercise_order: exerciseRow.exercise_order, // <-- add this line
              };
            })
          );

          return {
            id: workout.id,
            name: workout.name,
            description: workout.description,
            workoutType: workout.type as ExerciseType,
            date: workout.date,
            time: workout.time,
            duration: workout.duration,
            exercises,
            isCompleted: !!workout.is_completed,
          };
        })
      );

      return workouts;
    } catch (error) {
      console.error(`Error fetching workouts for date ${date}:`, error);
      throw new Error("Failed to fetch workouts by date");
    }
  },
  transformToAppFormat: (workouts: Workout[]): AppWorkout[] => {
    return workouts.map((workout) => ({
      id: workout.id?.toString() || "",
      name: workout.name,
      description: workout.description,
      type: workout.workoutType as ExerciseType,
      date: workout.date,
      time: workout.time,
      duration: workout.duration,
      exercises: workout.exercises.map((exercise) => ({
        exercise: {
          id: exercise.exercise_id.toString(),
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
    db: SQLite.SQLiteDatabase,
    createWorkout: CreateWorkoutForm
  ): Promise<{ success: boolean; data?: Workout | null; error?: string }> => {
    try {
      const {
        exercises,
        name,
        description,
        workoutType,
        date,
        time,
        duration,
        isCompleted,
      } = createWorkout;

      let insertedWorkoutId: number = 0;

      await db.withTransactionAsync(async () => {
        const workoutId = await db.runAsync(
          `
        INSERT INTO workouts (name, description, type, date, time, duration, is_completed)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
          [
            name,
            description || "",
            workoutType,
            date.toString(),
            time,
            duration || 0,
            isCompleted ? 1 : 0,
          ]
        );
        insertedWorkoutId = workoutId.lastInsertRowId;

        for (const workoutExercise of exercises) {
          const {
            exercise_id,
            exercise_name,
            exercise_description,
            exercise_difficulty,
            track_reps,
            track_weight,
            track_time,
            track_distance,
            validUnits,
            musclesTargeted,
            equipment,
            sets,
          } = workoutExercise;

          // insert workout_exercises part
          const workoutExerciseId = await db.runAsync(
            `
          INSERT INTO workout_exercises (workout_id, exercise_id, exercise_name, chosen_unit_combination, track_reps, track_weight, track_time, track_distance, exercise_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
            [
              insertedWorkoutId,
              exercise_id,
              exercise_name,
              validUnits?.join(",") || "",
              track_reps ? 1 : 0,
              track_weight ? 1 : 0,
              track_time ? 1 : 0,
              track_distance ? 1 : 0,
              exercises.indexOf(workoutExercise) + 1,
            ]
          );

          // insert exercise_sets part (now using workout_exercise_id)
          for (const set of sets) {
            const { reps = 0, weight = 0, duration = 0, distance = 0 } = set;
            const setId = await db.runAsync(
              `INSERT INTO exercise_sets (workout_exercise_id, reps, weight, time, distance, set_order)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                workoutExerciseId.lastInsertRowId,
                reps,
                weight,
                duration,
                distance,
                sets.indexOf(set) + 1,
              ]
            );
          }
        }
      });

      //get the workout with the id
      const workout = await workoutService.getWorkoutById(
        db,
        insertedWorkoutId
      );

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
    db: SQLite.SQLiteDatabase,
    workoutId: number,
    exercise: ExerciseFormData
  ): Promise<{ success: boolean; data?: Exercise | null; error?: string }> => {
    try {
      // Check if the workout exists
      const foundWorkoutId = await db.getFirstAsync<WorkoutDataRow>(
        `SELECT id FROM workouts WHERE id = ?`,
        [workoutId]
      );
      if (!foundWorkoutId) {
        return { success: false, error: "Workout not found" };
      }

      // Check if the exercise exists
      const foundExerciseId = await db.getFirstAsync<ExerciseRow>(
        `SELECT id FROM exercises WHERE id = ?`,
        [exercise.exercise_id]
      );
      if (!foundExerciseId) {
        return { success: false, error: "Exercise not found" };
      }

      // create the new workout_exercises row
      let newWorkoutExerciseIdResult: number = -1;
      let newExerciseSetsIds: number[] = [];
      let newWorkoutExercise: ExerciseRow | null = null;
      let newExerciseSets: SetRow[] = [];
      // create the new workout_exercises row
      await db.withExclusiveTransactionAsync(async () => {
        const newWorkoutExerciseId = await db.runAsync(
          `INSERT INTO workout_exercises (workout_id, exercise_id, exercise_name, chosen_unit_combination, track_reps, track_weight, track_time, track_distance, exercise_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            workoutId,
            exercise.exercise_id,
            exercise.exercise_name,
            exercise.validUnits?.join(",") || "",
            exercise.track_reps ? 1 : 0,
            exercise.track_weight ? 1 : 0,
            exercise.track_time ? 1 : 0,
            exercise.track_distance ? 1 : 0,
            exercise.exercise_order ?? 1,
          ]
        );
        newWorkoutExerciseIdResult = newWorkoutExerciseId.lastInsertRowId;
        // create the new exercise_sets rows
        for (const set of exercise.sets) {
          const { reps, weight, duration, distance } = set;
          const newExerciseSetId = await db.runAsync(
            `INSERT INTO exercise_sets (workout_exercise_id, reps, weight, time, distance, set_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
            [
              newWorkoutExerciseId.lastInsertRowId,
              reps ?? null,
              weight ?? null,
              duration ?? null,
              distance ?? null,
              exercise.sets.indexOf(set) + 1,
            ]
          );
          newExerciseSetsIds.push(newExerciseSetId.lastInsertRowId);
        }
      });

      // get the new workout_exercise and exercise_sets rows to return
      if (!newWorkoutExerciseIdResult) {
        return { success: false, error: "Failed to insert workout exercise" };
      }
      newWorkoutExercise = await db.getFirstAsync<ExerciseRow>(
        `SELECT * FROM workout_exercises WHERE id = ?`,
        [newWorkoutExerciseIdResult as number]
      );

      newExerciseSets = await db.getAllAsync<SetRow>(
        `SELECT * FROM exercise_sets WHERE workout_exercise_id = ?`,
        [newWorkoutExerciseIdResult as number]
      );

      const newExercise = {
        id: newWorkoutExercise?.id!,
        exercise_id: newWorkoutExercise?.exercise_id!,
        workout_id: workoutId, // Add workout_id from the function parameter
        exercise_name: newWorkoutExercise?.exercise_name || "",
        exercise_description: newWorkoutExercise?.exercise_description || "",
        exercise_difficulty:
          newWorkoutExercise?.exercise_difficulty as Difficulty,
        track_reps: newWorkoutExercise?.track_reps || 0,
        track_weight: newWorkoutExercise?.track_weight || 0,
        track_time: newWorkoutExercise?.track_time || 0,
        track_distance: newWorkoutExercise?.track_distance || 0,
        validUnits: newWorkoutExercise?.chosen_unit_combination
          ? newWorkoutExercise.chosen_unit_combination
              .split(",")
              .map((units) =>
                units.split("+").map((unit) => unit.trim() as ValidUnit)
              )
          : [],
        sets: newExerciseSets.map((set) => ({
          id: set.id,
          workout_exercise_id: newWorkoutExercise?.id!,
          reps: set.reps,
          weight: set.weight,
          time: set.time,
          distance: set.distance,
          set_order: set.set_order, // <-- add this line
        })),
        exercise_order: newWorkoutExercise?.exercise_order ?? 0, // <-- add this line
      };

      return { success: true, data: newExercise };
    } catch (error) {
      console.error("Error updating workout with new exercise:", error);
      return { success: false, error: "Failed to update workout" };
    }
  },
  updateExerciseOrder: async (
    db: SQLite.SQLiteDatabase,
    exerciseIds: { id: number; newOrder: number }[]
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // update the exercise order in the database
      await db.withExclusiveTransactionAsync(async () => {
        for (const exercise of exerciseIds) {
          await db.runAsync(
            `UPDATE workout_exercises SET exercise_order = ? WHERE id = ?`,
            [exercise.newOrder, exercise.id]
          );
        }
      });
      return { success: true };
    } catch (error) {
      console.error("Error updating exercise order:", error);
      return { success: false, error: "Failed to update exercise order" };
    }
  },
};
