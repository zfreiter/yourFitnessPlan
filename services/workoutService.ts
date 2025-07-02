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
}

// Helper function to transform database results
const transformWorkout = (rows: WorkoutRow[]): Workout | null => {
  if (!rows.length) return null;

  // Group exercises and their sets
  const exercisesMap = new Map<number, Exercise>();

  rows.forEach((row) => {
    if (!row.exercise_id) return; // Skip if no exercise

    if (!exercisesMap.has(row.exercise_id)) {
      exercisesMap.set(row.exercise_id, {
        exercise_id: row.exercise_id,
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
      });
    }

    if (row.set_id) {
      const exercise = exercisesMap.get(row.exercise_id)!;
      exercise.sets.push({
        id: row.set_id,
        reps: row.reps,
        weight: row.weight,
        duration: row.set_duration,
        distance: row.distance,
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
          we.exercise_id,
          we.exercise_name,
          we.track_reps,
          we.track_weight,
          we.track_time,
          we.track_distance,
          e.description as exercise_description,
          e.difficulty as exercise_difficulty,
          es.id as set_id,
          es.reps,
          es.weight,
          es.time as set_duration,
          es.distance,
          GROUP_CONCAT(euc.unit_combination) as valid_units
        FROM workouts w
        LEFT JOIN workout_exercises we ON w.id = we.workout_id
        LEFT JOIN exercises e ON we.exercise_id = e.id
        LEFT JOIN exercise_sets es ON we.id = es.workout_exercise_id
        LEFT JOIN exercise_unit_combinations euc ON we.exercise_id = euc.exercise_id
        GROUP BY w.id, we.id, es.id
        ORDER BY w.date, w.time, we.id, es.id
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
            exercise_id: exerciseRow.exercise_id,
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
              reps: set.reps,
              weight: set.weight,
              duration: set.time,
              distance: set.distance,
            })),
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
                exercise_id: exerciseRow.exercise_id,
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
                  reps: set.reps,
                  weight: set.weight,
                  duration: set.time,
                  distance: set.distance,
                })),
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
    // console.log(
    //   "createWorkout in insertWorkout",
    //   createWorkout,
    //   JSON.stringify(createWorkout.exercises[0], null, 2)
    // );
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
      //console.log("data in insertWorkout", date, time);
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
          INSERT INTO workout_exercises (workout_id, exercise_id, exercise_name, chosen_unit_combination, track_reps, track_weight, track_time, track_distance)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
            ]
          );

          // insert exercise_sets part (now using workout_exercise_id)
          for (const set of sets) {
            const { reps = 0, weight = 0, duration = 0, distance = 0 } = set;
            const setId = await db.runAsync(
              `INSERT INTO exercise_sets (workout_exercise_id, reps, weight, time, distance)
               VALUES (?, ?, ?, ?, ?)`,
              [
                workoutExerciseId.lastInsertRowId,
                reps,
                weight,
                duration,
                distance,
              ]
            );
            // console.log("setId in insertWorkout", setId);
          }
        }
      });

      //console.log("Workout inserted successfully ", insertedWorkoutId);

      //get the workout with the id
      const workout = await workoutService.getWorkoutById(
        db,
        insertedWorkoutId
      );

      // console.log(
      //   "workout in insertWorkout after getWorkoutById",
      //   JSON.stringify(workout, null, 2)
      // );
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
};
