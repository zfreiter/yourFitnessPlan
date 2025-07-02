import { SCHEMA } from "./schema";

// Sample exercises data
const exercises = [
  {
    name: "Bench Press",
    description:
      "A compound exercise targeting the chest, shoulders, and triceps.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["chest", "triceps", "shoulders"],
    equipment: ["barbell", "bench"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Deadlift",
    description: "A compound exercise targeting the posterior chain.",
    difficulty: "advanced",
    no_weight: 0,
    types: ["strength"],
    muscles: ["hamstrings", "glutes", "lower back"],
    equipment: ["barbell"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Squat",
    description:
      "A compound exercise targeting the quads, hamstrings, and glutes.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["quads", "hamstrings", "glutes"],
    equipment: ["barbell"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Pull-Ups",
    description: "A bodyweight exercise targeting the back and biceps.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength", "circuit"],
    muscles: ["lats", "biceps"],
    equipment: ["pull-up bar"],
    validUnits: [["reps"], ["reps", "weight"], ["time"]],
  },
  {
    name: "Overhead Press",
    description: "A compound exercise targeting the shoulders and triceps.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["shoulders", "triceps"],
    equipment: ["barbell"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Lunges",
    description:
      "A unilateral exercise targeting the quads, hamstrings, and glutes.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["quads", "hamstrings", "glutes"],
    equipment: ["dumbbells"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Bicep Curls",
    description: "An isolation exercise targeting the biceps.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["biceps"],
    equipment: ["dumbbells"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Plank",
    description: "A core exercise to improve stability and strength.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["mobility", "circuit"],
    muscles: ["core"],
    equipment: [],
    validUnits: [["time"]],
  },
  {
    name: "Burpees",
    description: "A full-body cardio exercise.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["cardio", "circuit"],
    muscles: ["full body"],
    equipment: [],
    validUnits: [["reps"], ["time"]],
  },
  {
    name: "Romanian Deadlift",
    description: "A compound exercise targeting the hamstrings and glutes.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["hamstrings", "glutes"],
    equipment: ["barbell"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Push-Ups",
    description:
      "A bodyweight exercise targeting the chest, shoulders, and triceps.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["strength", "circuit"],
    muscles: ["chest", "triceps", "shoulders"],
    equipment: [],
    validUnits: [["reps"]],
  },
  {
    name: "Dumbbell Rows",
    description: "An exercise targeting the back and biceps.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["lats", "biceps"],
    equipment: ["dumbbells"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Leg Press",
    description: "A machine-based exercise targeting the quads and glutes.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["quads", "glutes"],
    equipment: ["leg press machine"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Mountain Climbers",
    description: "A cardio exercise targeting the core and lower body.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["cardio", "circuit"],
    muscles: ["core", "legs"],
    equipment: [],
    validUnits: [["reps"], ["time"]],
  },
  {
    name: "Tricep Dips",
    description: "A bodyweight exercise targeting the triceps and shoulders.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["strength", "circuit"],
    muscles: ["triceps", "shoulders"],
    equipment: ["parallel bars"],
    validUnits: [["reps"]],
  },
  {
    name: "Chest Fly",
    description: "An isolation exercise targeting the chest muscles.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["chest"],
    equipment: ["dumbbells", "bench"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Seated Row",
    description: "A machine-based exercise targeting the back and biceps.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["lats", "biceps"],
    equipment: ["rowing machine"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Lat Pulldown",
    description: "A machine-based exercise targeting the lats and biceps.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["lats", "biceps"],
    equipment: ["lat pulldown machine"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Cable Tricep Pushdown",
    description: "An isolation exercise targeting the triceps.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["triceps"],
    equipment: ["cable machine"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Russian Twists",
    description: "A core exercise to improve rotational strength.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["mobility", "circuit"],
    muscles: ["core"],
    equipment: ["medicine ball"],
    validUnits: [["reps"], ["time"]],
  },
  {
    name: "Farmer's Walk",
    description:
      "A functional exercise targeting grip strength and core stability.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["grip", "core"],
    equipment: ["dumbbells", "kettlebells"],
    validUnits: [["time"], ["distance"], ["time", "distance"]],
  },
  {
    name: "Kettlebell Swing",
    description: "A dynamic exercise targeting the posterior chain and core.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength", "circuit"],
    muscles: ["hamstrings", "glutes", "core"],
    equipment: ["kettlebell"],
    validUnits: [["reps"], ["time"]],
  },
  {
    name: "Side Plank",
    description: "A core exercise to improve lateral stability.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["mobility", "circuit"],
    muscles: ["core", "obliques"],
    equipment: [],
    validUnits: [["time"]],
  },
  {
    name: "Step-Ups",
    description: "A unilateral exercise targeting the legs and glutes.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["quads", "glutes"],
    equipment: ["bench", "dumbbells"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Incline Bench Press",
    description: "A compound exercise targeting the upper chest and shoulders.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["chest", "shoulders", "triceps"],
    equipment: ["barbell", "bench"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Hanging Leg Raises",
    description: "A core exercise targeting the lower abs.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["mobility", "circuit"],
    muscles: ["core"],
    equipment: ["pull-up bar"],
    validUnits: [["reps"], ["time"]],
  },
  {
    name: "Glute Bridge",
    description: "An exercise targeting the glutes and hamstrings.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["strength"],
    muscles: ["glutes", "hamstrings"],
    equipment: [],
    validUnits: [["reps"], ["time"]],
  },
  {
    name: "Box Jumps",
    description: "A plyometric exercise to improve explosive power.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["cardio", "circuit"],
    muscles: ["quads", "glutes", "calves"],
    equipment: ["plyo box"],
    validUnits: [["reps"], ["time"]],
  },
  {
    name: "Arnold Press",
    description: "A shoulder exercise with a rotational movement.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["shoulders", "triceps"],
    equipment: ["dumbbells"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Face Pulls",
    description: "An exercise targeting the rear delts and traps.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["rear delts", "traps"],
    equipment: ["cable machine"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Hip Thrusts",
    description: "An exercise targeting the glutes and hamstrings.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["glutes", "hamstrings"],
    equipment: ["barbell", "bench"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Jump Rope",
    description: "A cardio exercise to improve endurance and coordination.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["cardio"],
    muscles: ["full body"],
    equipment: ["jump rope"],
    validUnits: [["time"], ["reps"]],
  },
  {
    name: "Wall Sit",
    description: "A static exercise targeting the quads and core.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["mobility", "circuit"],
    muscles: ["quads", "core"],
    equipment: [],
    validUnits: [["time"]],
  },
  {
    name: "Reverse Fly",
    description: "An isolation exercise targeting the rear delts.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["rear delts"],
    equipment: ["dumbbells"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Calf Raises",
    description: "An exercise targeting the calves.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["calves"],
    equipment: ["dumbbells"],
    validUnits: [["reps", "weight"]],
  },
];

// Generate May workouts
const generateMayWorkouts = () => {
  return [
    {
      name: "Push Day",
      description: "A workout focused on chest, shoulders, and triceps.",
      type: "strength",
      date: "2025-05-01",
      time: "08:00:00",
      duration: 3600,
      is_completed: 0,
      exercises: [
        {
          exercise_id: 1,
          exercise_name: "Bench Press",
          track_reps: 1,
          track_weight: 1,
          track_time: 0,
          track_distance: 0,
          sets: [
            { reps: 8, weight: 80 },
            { reps: 8, weight: 90 },
            { reps: 6, weight: 100 },
          ],
        },
        {
          exercise_id: 5,
          exercise_name: "Overhead Press",
          track_reps: 1,
          track_weight: 1,
          track_time: 0,
          track_distance: 0,
          sets: [
            { reps: 8, weight: 40 },
            { reps: 8, weight: 50 },
            { reps: 6, weight: 60 },
          ],
        },
      ],
    },
    {
      name: "Pull Day",
      description: "A workout focused on back and biceps.",
      type: "strength",
      date: "2025-05-02",
      time: "09:00:00",
      duration: 3600,
      is_completed: 0,
      exercises: [
        {
          exercise_id: 4,
          exercise_name: "Pull-Ups",
          track_reps: 1,
          track_weight: 0,
          track_time: 0,
          track_distance: 0,
          sets: [{ reps: 10 }, { reps: 8 }, { reps: 6 }],
        },
        {
          exercise_id: 12,
          exercise_name: "Dumbbell Rows",
          track_reps: 1,
          track_weight: 1,
          track_time: 0,
          track_distance: 0,
          sets: [
            { reps: 10, weight: 20 },
            { reps: 8, weight: 25 },
            { reps: 6, weight: 30 },
          ],
        },
      ],
    },
    {
      name: "Leg Day",
      description: "A workout focused on lower body strength.",
      type: "strength",
      date: "2025-05-03",
      time: "07:30:00",
      duration: 3600,
      is_completed: 0,
      exercises: [
        {
          exercise_id: 3,
          exercise_name: "Squat",
          track_reps: 1,
          track_weight: 1,
          track_time: 0,
          track_distance: 0,
          sets: [
            { reps: 10, weight: 60 },
            { reps: 8, weight: 80 },
            { reps: 6, weight: 100 },
          ],
        },
        {
          exercise_id: 6,
          exercise_name: "Lunges",
          track_reps: 1,
          track_weight: 1,
          track_time: 0,
          track_distance: 0,
          sets: [
            { reps: 12, weight: 20 },
            { reps: 12, weight: 25 },
            { reps: 10, weight: 30 },
          ],
        },
      ],
    },
    {
      name: "Cardio Blast",
      description: "A high-intensity cardio workout.",
      type: "cardio",
      date: "2025-05-04",
      time: "18:00:00",
      duration: 1800,
      is_completed: 0,
      exercises: [
        {
          exercise_id: 9,
          exercise_name: "Burpees",
          track_reps: 1,
          track_weight: 0,
          track_time: 0,
          track_distance: 0,
          sets: [{ reps: 15 }, { reps: 12 }, { reps: 10 }],
        },
        {
          exercise_id: 14,
          exercise_name: "Mountain Climbers",
          track_reps: 1,
          track_weight: 0,
          track_time: 0,
          track_distance: 0,
          sets: [{ reps: 20 }, { reps: 18 }, { reps: 15 }],
        },
      ],
    },
    {
      name: "Core Strength",
      description: "A workout focused on core stability and strength.",
      type: "mobility",
      date: "2025-05-05",
      time: "10:00:00",
      duration: 1800,
      is_completed: 0,
      exercises: [
        {
          exercise_id: 8,
          exercise_name: "Plank",
          track_reps: 0,
          track_weight: 0,
          track_time: 1,
          track_distance: 0,
          sets: [{ time: 60 }, { time: 90 }, { time: 120 }],
        },
        {
          exercise_id: 14,
          exercise_name: "Mountain Climbers",
          track_reps: 1,
          track_weight: 0,
          track_time: 0,
          track_distance: 0,
          sets: [{ reps: 20 }, { reps: 18 }, { reps: 15 }],
        },
      ],
    },
    {
      name: "Upper Body Strength",
      description: "A workout focused on building upper body strength.",
      type: "strength",
      date: "2025-05-23",
      time: "08:00:00",
      duration: 3600,
      is_completed: 0,
      exercises: [
        {
          exercise_id: 2,
          exercise_name: "Deadlift",
          track_reps: 1,
          track_weight: 1,
          track_time: 0,
          track_distance: 0,
          sets: [
            { reps: 8, weight: 100 },
            { reps: 6, weight: 120 },
            { reps: 4, weight: 140 },
          ],
        },
        {
          exercise_id: 7,
          exercise_name: "Bicep Curls",
          track_reps: 1,
          track_weight: 1,
          track_time: 0,
          track_distance: 0,
          sets: [
            { reps: 12, weight: 15 },
            { reps: 10, weight: 20 },
            { reps: 8, weight: 25 },
          ],
        },
      ],
    },
    {
      name: "Endurance Cardio",
      description: "A workout focused on improving cardiovascular endurance.",
      type: "cardio",
      date: "2025-05-23",
      time: "10:00:00",
      duration: 1800,
      is_completed: 0,
      exercises: [
        {
          exercise_id: 32,
          exercise_name: "Jump Rope",
          track_reps: 0,
          track_weight: 0,
          track_time: 1,
          track_distance: 0,
          sets: [{ time: 120 }, { time: 150 }, { time: 180 }],
        },
        {
          exercise_id: 28,
          exercise_name: "Box Jumps",
          track_reps: 1,
          track_weight: 0,
          track_time: 0,
          track_distance: 0,
          sets: [{ reps: 15 }, { reps: 12 }, { reps: 10 }],
        },
      ],
    },
    {
      name: "Flexibility and Core",
      description:
        "A workout focused on improving flexibility and core strength.",
      type: "mobility",
      date: "2025-05-23",
      time: "18:00:00",
      duration: 1800,
      is_completed: 0,
      exercises: [
        {
          exercise_id: 23,
          exercise_name: "Side Plank",
          track_reps: 0,
          track_weight: 0,
          track_time: 1,
          track_distance: 0,
          sets: [{ time: 30 }, { time: 45 }, { time: 60 }],
        },
        {
          exercise_id: 27,
          exercise_name: "Glute Bridge",
          track_reps: 1,
          track_weight: 0,
          track_time: 0,
          track_distance: 0,
          sets: [{ reps: 15 }, { reps: 15 }, { reps: 12 }],
        },
      ],
    },
  ];
};

export const seedData = {
  exercises,
  workouts: generateMayWorkouts(),
};

// SQL statements to insert the seed data
export const seedDataSQL = `
-- Insert valid units
INSERT INTO exercise_valid_units (unit) VALUES ('reps');
INSERT INTO exercise_valid_units (unit) VALUES ('weight');
INSERT INTO exercise_valid_units (unit) VALUES ('time');
INSERT INTO exercise_valid_units (unit) VALUES ('distance');

-- Insert exercises
${exercises
  .map(
    (exercise, index) => `
INSERT INTO exercises (id, name, description, difficulty, no_weight)
VALUES (${index + 1}, '${exercise.name.replace(
      /'/g,
      "''"
    )}', '${exercise.description.replace(/'/g, "''")}', '${
      exercise.difficulty
    }', ${exercise.no_weight});

${exercise.types
  .map(
    (type) => `
INSERT INTO exercise_types (exercise_id, type)
VALUES (${index + 1}, '${type}');
`
  )
  .join("\n")}

${exercise.muscles
  .map(
    (muscle) => `
INSERT INTO exercise_muscles (exercise_id, muscle)
VALUES (${index + 1}, '${muscle}');
`
  )
  .join("\n")}

${exercise.equipment
  .map(
    (equipment) => `
INSERT INTO exercise_equipment (exercise_id, equipment)
VALUES (${index + 1}, '${equipment}');
`
  )
  .join("\n")}

${exercise.validUnits
  .map(
    (unitCombo) => `
INSERT INTO exercise_unit_combinations (exercise_id, unit_combination)
VALUES (${index + 1}, '${unitCombo.join("||")}');
`
  )
  .join("\n")}
`
  )
  .join("\n")}

-- Insert workouts and their exercises
${seedData.workouts
  .map(
    (workout, workoutIndex) => `
INSERT INTO workouts (id, name, description, type, date, time, duration, is_completed)
VALUES (${workoutIndex + 1}, '${workout.name.replace(
      /'/g,
      "''"
    )}', '${workout.description.replace(/'/g, "''")}', '${workout.type}', '${
      workout.date
    }', '${workout.time}', ${workout.duration}, ${workout.is_completed});

${workout.exercises
  .map((exercise, exerciseIndex) => {
    // Calculate the workout_exercise_id based on the position
    const workoutExerciseId = workoutIndex * 100 + exerciseIndex + 1;

    return `
INSERT INTO workout_exercises (id, workout_id, exercise_id, exercise_name, track_reps, track_weight, track_time, track_distance)
VALUES (${workoutExerciseId}, ${workoutIndex + 1}, ${
      exercise.exercise_id
    }, '${exercise.exercise_name.replace(/'/g, "''")}', ${
      exercise.track_reps
    }, ${exercise.track_weight}, ${exercise.track_time}, ${
      exercise.track_distance
    });

${exercise.sets
  .map(
    (set, setIndex) => `
INSERT INTO exercise_sets (workout_exercise_id, reps, weight, time, distance)
VALUES (${workoutExerciseId}, 
  ${"reps" in set ? set.reps : "NULL"}, 
  ${"weight" in set ? set.weight : "NULL"}, 
  ${"time" in set ? set.time : "NULL"}, 
  ${"distance" in set ? set.distance : "NULL"});
`
  )
  .join("\n")}
`;
  })
  .join("\n")}
`
  )
  .join("\n")}
`;
