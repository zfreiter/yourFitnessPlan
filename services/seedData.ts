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

// Utility to get datetime strings for September 2025 with offsets
type DateOffset = number; // days offset from September 1, 2025
function getDateTimeString(offset: DateOffset = 0, time: string = "08:00:00") {
  const d = new Date(2025, 8, 1); // September 1, 2025 (month is 0-indexed)
  d.setDate(d.getDate() + offset);

  // Set the time
  const [hours, minutes] = time.split(":");
  d.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  return d.toISOString().slice(0, 16); // Returns "2025-09-01T08:00"
}

// Generate dynamic workouts around September 2025
const generateDynamicWorkouts = () => {
  return [
    {
      name: "September 1st Full Body",
      description: "A full body workout for September 1st.",
      type: "strength",
      scheduled_datetime: "2025-10-04 08:00:00",
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
            { reps: 8, weight: 70 },
            { reps: 8, weight: 75 },
            { reps: 6, weight: 80 },
          ],
        },
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
          ],
        },
      ],
    },
    {
      name: "August 31st Cardio",
      description: "A cardio session from August 31st.",
      type: "cardio",
      scheduled_datetime: "2025-10-03 08:00:00",
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
          sets: [{ reps: 12 }, { reps: 10 }],
        },
        {
          exercise_id: 32,
          exercise_name: "Jump Rope",
          track_reps: 0,
          track_weight: 0,
          track_time: 1,
          track_distance: 0,
          sets: [{ time: 120 }, { time: 90 }],
        },
      ],
    },
    {
      name: "September 2nd Mobility",
      description: "A mobility workout for September 2nd.",
      type: "mobility",
      scheduled_datetime: "2025-10-02 08:00:00",
      duration: 1500,
      is_completed: 0,
      exercises: [
        {
          exercise_id: 8,
          exercise_name: "Plank",
          track_reps: 0,
          track_weight: 0,
          track_time: 1,
          track_distance: 0,
          sets: [{ time: 60 }, { time: 90 }],
        },
        {
          exercise_id: 23,
          exercise_name: "Side Plank",
          track_reps: 0,
          track_weight: 0,
          track_time: 1,
          track_distance: 0,
          sets: [{ time: 30 }, { time: 45 }],
        },
      ],
    },
    {
      name: "August 30th - Upper Body",
      description: "Upper body strength session from August 30th.",
      type: "strength",
      scheduled_datetime: "2025-10-01 08:00:00",
      duration: 3600,
      is_completed: 0,
      exercises: [
        {
          exercise_id: 5,
          exercise_name: "Overhead Press",
          track_reps: 1,
          track_weight: 1,
          track_time: 0,
          track_distance: 0,
          sets: [
            { reps: 8, weight: 35 },
            { reps: 6, weight: 40 },
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
            { reps: 10, weight: 12 },
            { reps: 8, weight: 15 },
          ],
        },
      ],
    },
    {
      name: "September 4th - HIIT",
      description: "A planned HIIT session for September 4th.",
      type: "cardio",
      scheduled_datetime: "2025-10-01 08:00:00",
      duration: 1800,
      is_completed: 0,
      exercises: [
        {
          exercise_id: 14,
          exercise_name: "Mountain Climbers",
          track_reps: 1,
          track_weight: 0,
          track_time: 0,
          track_distance: 0,
          sets: [{ reps: 20 }, { reps: 18 }],
        },
        {
          exercise_id: 28,
          exercise_name: "Box Jumps",
          track_reps: 1,
          track_weight: 0,
          track_time: 0,
          track_distance: 0,
          sets: [{ reps: 12 }, { reps: 10 }],
        },
      ],
    },
  ];
};

// Generate September workouts
const generateSeptemberWorkouts = () => {
  const septemberWorkouts = [
    {
      name: "Push Day",
      description: "A workout focused on chest, shoulders, and triceps.",
      type: "strength",
      scheduled_datetime: "2025-09-01 08:00:00",
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
      scheduled_datetime: "2025-09-02 09:00:00",
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
      scheduled_datetime: "2025-09-03 07:30:00",
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
      scheduled_datetime: "2025-09-04 18:00:00",
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
      scheduled_datetime: "2025-09-05 10:00:00",
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
      scheduled_datetime: "2025-09-23 08:00:00",
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
      scheduled_datetime: "2025-09-23 10:00:00",
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
      scheduled_datetime: "2025-09-23 18:00:00",
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
  // Add dynamic workouts around September 2025
  return [...septemberWorkouts, ...generateDynamicWorkouts()];
};

export const seedData = {
  exercises,
  workouts: generateSeptemberWorkouts(),
};

// SQL statements to insert the seed data
// Utility: format date to YYYY-MM-DDTHH:MM:SS in local time
function formatDateTimeLocal(date: Date, time: string = "18:00:00") {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day} ${time}`;
}

// Utility: get date string for a given date at end of day local time
function endOfDayDateString(date: Date): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return formatDateTimeLocal(d, "23:59:59");
}

// Generate one completed workout per day from a start date through today
function generateCompletedDailyWorkouts(startDateString: string) {
  const start = new Date(startDateString);
  const today = new Date();

  // If start is after today, return empty
  if (start > today) return [] as Array<any>;

  const days: Array<any> = [];
  const cursor = new Date(start);

  while (cursor <= today) {
    const scheduled_datetime = formatDateTimeLocal(cursor, "18:00:00");
    const completed_at = endOfDayDateString(cursor);

    days.push({
      name: `Completed Workout ${scheduled_datetime.slice(0, 10)}`,
      description: "Auto-generated completed daily workout.",
      type: "mobility",
      scheduled_datetime,
      duration: 1800,
      is_completed: 1,
      completed_at,
      exercises: [
        {
          exercise_id: 8, // Plank from seed exercises
          exercise_name: "Plank",
          track_reps: 0,
          track_weight: 0,
          track_time: 1,
          track_distance: 0,
          sets: [{ time: 60 }, { time: 90 }],
        },
      ],
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

// Extend workouts with completed daily workouts from 2025-10-04 to today
seedData.workouts = [
  ...seedData.workouts,
  ...generateCompletedDailyWorkouts("2025-10-04"),
];

// Add specific test workouts for 10/7, 10/8, 10/9 with completed_at timestamps
const testWorkouts = [
  {
    name: "Test Workout 10/7/2025",
    description: "Test workout for October 7th, 2025",
    type: "strength",
    scheduled_datetime: "2025-10-15 18:00:00",
    duration: 3600,
    is_completed: 1,
    completed_at: "2025-10-01 08:00:00",
    exercises: [
      {
        exercise_id: 1, // Bench Press
        exercise_name: "Bench Press",
        track_reps: 1,
        track_weight: 1,
        track_time: 0,
        track_distance: 0,
        sets: [
          { reps: 10, weight: 135 },
          { reps: 8, weight: 155 },
          { reps: 6, weight: 175 },
        ],
      },
    ],
  },
  {
    name: "Test Workout 10/8/2025",
    description: "Test workout for October 8th, 2025",
    type: "cardio",
    scheduled_datetime: "2025-10-14 07:00:00",
    duration: 1800,
    is_completed: 1,
    completed_at: "2025-10-14 07:00:00",
    exercises: [
      {
        exercise_id: 9, // Running
        exercise_name: "Running",
        track_reps: 0,
        track_weight: 0,
        track_time: 1,
        track_distance: 1,
        sets: [{ time: 1800, distance: 3.5 }],
      },
    ],
  },
  {
    name: "Test Workout 10/9/2025",
    description: "Test workout for October 9th, 2025",
    type: "mobility",
    scheduled_datetime: "2025-10-09 19:30:00",
    duration: 1500,
    is_completed: 1,
    completed_at: "2025-10-09 19:30:00",
    exercises: [
      {
        exercise_id: 8, // Plank
        exercise_name: "Plank",
        track_reps: 0,
        track_weight: 0,
        track_time: 1,
        track_distance: 0,
        sets: [{ time: 60 }, { time: 90 }, { time: 120 }],
      },
    ],
  },
  {
    name: `Test Workout ${new Date().toLocaleDateString()}`,
    description: `Test workout for today (${new Date().toLocaleDateString()})`,
    type: "strength",
    scheduled_datetime: "2025-10-07 17:00:00",
    duration: 2700,
    is_completed: 1,
    completed_at: "2025-10-07 17:00:00",
    exercises: [
      {
        exercise_id: 2, // Squat
        exercise_name: "Squat",
        track_reps: 1,
        track_weight: 1,
        track_time: 0,
        track_distance: 0,
        sets: [
          { reps: 12, weight: 95 },
          { reps: 10, weight: 115 },
          { reps: 8, weight: 135 },
          { reps: 6, weight: 155 },
        ],
      },
    ],
  },
];

// Add test workouts to the seed data
seedData.workouts = [...seedData.workouts, ...testWorkouts];

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
  .map((workout, workoutIndex) => {
    const hasCompletedAt = typeof (workout as any).completed_at === "string";
    const insertWorkout = hasCompletedAt
      ? `INSERT INTO workouts (id, name, description, type, scheduled_datetime, duration, is_completed, completed_at)
VALUES (${workoutIndex + 1}, '${workout.name.replace(
          /'/g,
          "''"
        )}', '${workout.description.replace(/'/g, "''")}', '${
          workout.type
        }', '${workout.scheduled_datetime}', ${workout.duration}, ${
          workout.is_completed
        }, '${(workout as any).completed_at}');`
      : `INSERT INTO workouts (id, name, description, type, scheduled_datetime, duration, is_completed)
VALUES (${workoutIndex + 1}, '${workout.name.replace(
          /'/g,
          "''"
        )}', '${workout.description.replace(/'/g, "''")}', '${
          workout.type
        }', '${workout.scheduled_datetime}', ${workout.duration}, ${
          workout.is_completed
        });`;

    const workoutExercisesSQL = workout.exercises
      .map((exercise, exerciseIndex) => {
        // Calculate the workout_exercise_id based on the position
        const workoutExerciseId = workoutIndex * 100 + exerciseIndex + 1;

        const insertExercise = `INSERT INTO workout_exercises (id, workout_id, exercise_id, exercise_name, track_reps, track_weight, track_time, track_distance, exercise_order)
VALUES (${workoutExerciseId}, ${workoutIndex + 1}, ${
          exercise.exercise_id
        }, '${exercise.exercise_name.replace(/'/g, "''")}', ${
          exercise.track_reps
        }, ${exercise.track_weight}, ${exercise.track_time}, ${
          exercise.track_distance
        }, ${exerciseIndex + 1});`;

        const insertSets = exercise.sets
          .map(
            (
              set,
              setIndex
            ) => `INSERT INTO exercise_sets (workout_exercise_id, reps, weight, time, distance, set_order)
VALUES (${workoutExerciseId}, ${"reps" in set ? set.reps : "NULL"}, ${
              "weight" in set ? set.weight : "NULL"
            }, ${"time" in set ? set.time : "NULL"}, ${
              "distance" in set ? set.distance : "NULL"
            }, ${setIndex + 1});`
          )
          .join("\n");

        return `${insertExercise}\n${insertSets}`;
      })
      .join("\n\n");

    return `${insertWorkout}\n\n${workoutExercisesSQL}`;
  })
  .join("\n")}
`;
