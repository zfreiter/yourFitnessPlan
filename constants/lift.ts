import { Exercise } from "@/types/interfaces/types";

export const lifts: Exercise[] = [
  {
    id: "1",
    name: "Bench Press",
    description:
      "A compound exercise targeting the chest, shoulders, and triceps.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Bench Press uses reps and weight
    musclesTargeted: ["chest", "triceps", "shoulders"],
    equipment: ["barbell", "bench"],
    difficulty: "intermediate",
    noWeight: false,
  },
  {
    id: "2",
    name: "Deadlift",
    description: "A compound exercise targeting the posterior chain.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Deadlift uses reps and weight
    musclesTargeted: ["hamstrings", "glutes", "lower back"],
    equipment: ["barbell"],
    difficulty: "advanced",
    noWeight: false,
  },
  {
    id: "3",
    name: "Squat",
    description:
      "A compound exercise targeting the quads, hamstrings, and glutes.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Squat uses reps and weight
    musclesTargeted: ["quads", "hamstrings", "glutes"],
    equipment: ["barbell"],
    difficulty: "intermediate",
    noWeight: false,
  },
  {
    id: "4",
    name: "Pull-Ups",
    description: "A bodyweight exercise targeting the back and biceps.",
    types: ["strength", "circuit"],
    validUnits: [["reps"], ["reps", "weight"], ["time"]], // Pull-Ups can use reps, reps + weight, or time
    musclesTargeted: ["lats", "biceps"],
    equipment: ["pull-up bar"],
    difficulty: "intermediate",
    noWeight: false,
  },
  {
    id: "5",
    name: "Overhead Press",
    description: "A compound exercise targeting the shoulders and triceps.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Overhead Press uses reps and weight
    musclesTargeted: ["shoulders", "triceps"],
    equipment: ["barbell"],
    difficulty: "intermediate",
    noWeight: false,
  },
  {
    id: "6",
    name: "Lunges",
    description:
      "A unilateral exercise targeting the quads, hamstrings, and glutes.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Lunges use reps and weight
    musclesTargeted: ["quads", "hamstrings", "glutes"],
    equipment: ["dumbbells"],
    difficulty: "beginner",
    noWeight: false,
  },
  {
    id: "7",
    name: "Bicep Curls",
    description: "An isolation exercise targeting the biceps.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Bicep Curls use reps and weight
    musclesTargeted: ["biceps"],
    equipment: ["dumbbells"],
    difficulty: "beginner",
    noWeight: false,
  },
  {
    id: "8",
    name: "Plank",
    description: "A core exercise to improve stability and strength.",
    types: ["mobility", "circuit"],
    validUnits: [["time"]], // Plank only uses time
    musclesTargeted: ["core"],
    equipment: [],
    difficulty: "beginner",
    noWeight: true,
  },
  {
    id: "9",
    name: "Burpees",
    description: "A full-body cardio exercise.",
    types: ["cardio", "circuit"],
    validUnits: [["reps"], ["time"]], // Burpees can use reps or time
    musclesTargeted: ["full body"],
    equipment: [],
    difficulty: "intermediate",
    noWeight: true,
  },
  {
    id: "10",
    name: "Romanian Deadlift",
    description: "A compound exercise targeting the hamstrings and glutes.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Romanian Deadlift uses reps and weight
    musclesTargeted: ["hamstrings", "glutes"],
    equipment: ["barbell"],
    difficulty: "intermediate",
    noWeight: false,
  },
  {
    id: "11",
    name: "Push-Ups",
    description:
      "A bodyweight exercise targeting the chest, shoulders, and triceps.",
    types: ["strength", "circuit"],
    validUnits: [["reps"]], // Push-Ups only use reps
    musclesTargeted: ["chest", "triceps", "shoulders"],
    equipment: [],
    difficulty: "beginner",
    noWeight: true, // Push-Ups never use weight
  },
  {
    id: "12",
    name: "Dumbbell Rows",
    description: "An exercise targeting the back and biceps.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Dumbbell Rows use reps and weight
    musclesTargeted: ["lats", "biceps"],
    equipment: ["dumbbells"],
    difficulty: "intermediate",
    noWeight: false,
  },
  {
    id: "13",
    name: "Leg Press",
    description: "A machine-based exercise targeting the quads and glutes.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Leg Press uses reps and weight
    musclesTargeted: ["quads", "glutes"],
    equipment: ["leg press machine"],
    difficulty: "beginner",
    noWeight: false,
  },
  {
    id: "14",
    name: "Mountain Climbers",
    description: "A cardio exercise targeting the core and lower body.",
    types: ["cardio", "circuit"],
    validUnits: [["reps"], ["time"]], // Mountain Climbers can use reps or time
    musclesTargeted: ["core", "legs"],
    equipment: [],
    difficulty: "beginner",
    noWeight: true,
  },
  {
    id: "15",
    name: "Tricep Dips",
    description: "A bodyweight exercise targeting the triceps and shoulders.",
    types: ["strength", "circuit"],
    validUnits: [["reps"]], // Tricep Dips only use reps
    musclesTargeted: ["triceps", "shoulders"],
    equipment: ["parallel bars"],
    difficulty: "intermediate",
    noWeight: true, // Tricep Dips never use weight
  },
  {
    id: "16",
    name: "Chest Fly",
    description: "An isolation exercise targeting the chest muscles.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Chest Fly uses reps and weight
    musclesTargeted: ["chest"],
    equipment: ["dumbbells", "bench"],
    difficulty: "beginner",
    noWeight: false,
  },
  {
    id: "17",
    name: "Seated Row",
    description: "A machine-based exercise targeting the back and biceps.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Seated Row uses reps and weight
    musclesTargeted: ["lats", "biceps"],
    equipment: ["rowing machine"],
    difficulty: "beginner",
    noWeight: false,
  },
  {
    id: "18",
    name: "Lat Pulldown",
    description: "A machine-based exercise targeting the lats and biceps.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Lat Pulldown uses reps and weight
    musclesTargeted: ["lats", "biceps"],
    equipment: ["lat pulldown machine"],
    difficulty: "beginner",
    noWeight: false,
  },
  {
    id: "19",
    name: "Cable Tricep Pushdown",
    description: "An isolation exercise targeting the triceps.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Cable Tricep Pushdown uses reps and weight
    musclesTargeted: ["triceps"],
    equipment: ["cable machine"],
    difficulty: "beginner",
    noWeight: false,
  },
  {
    id: "20",
    name: "Russian Twists",
    description: "A core exercise to improve rotational strength.",
    types: ["mobility", "circuit"],
    validUnits: [["reps"], ["time"]], // Russian Twists can use reps or time
    musclesTargeted: ["core"],
    equipment: ["medicine ball"],
    difficulty: "beginner",
    noWeight: true,
  },
  {
    id: "21",
    name: "Farmer's Walk",
    description:
      "A functional exercise targeting grip strength and core stability.",
    types: ["strength"],
    validUnits: [["time"], ["distance"], ["time", "distance"]], // Farmer's Walk can use time, distance, or both
    musclesTargeted: ["grip", "core"],
    equipment: ["dumbbells", "kettlebells"],
    difficulty: "intermediate",
    noWeight: false,
  },
  {
    id: "22",
    name: "Kettlebell Swing",
    description: "A dynamic exercise targeting the posterior chain and core.",
    types: ["strength", "circuit"],
    validUnits: [["reps"], ["time"]], // Kettlebell Swing can use reps or time
    musclesTargeted: ["hamstrings", "glutes", "core"],
    equipment: ["kettlebell"],
    difficulty: "intermediate",
    noWeight: false,
  },
  {
    id: "23",
    name: "Side Plank",
    description: "A core exercise to improve lateral stability.",
    types: ["mobility", "circuit"],
    validUnits: [["time"]], // Side Plank only uses time
    musclesTargeted: ["core", "obliques"],
    equipment: [],
    difficulty: "beginner",
    noWeight: true,
  },
  {
    id: "24",
    name: "Step-Ups",
    description: "A unilateral exercise targeting the legs and glutes.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Step-Ups use reps and weight
    musclesTargeted: ["quads", "glutes"],
    equipment: ["bench", "dumbbells"],
    difficulty: "beginner",
    noWeight: false,
  },
  {
    id: "25",
    name: "Incline Bench Press",
    description: "A compound exercise targeting the upper chest and shoulders.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Incline Bench Press uses reps and weight
    musclesTargeted: ["chest", "shoulders", "triceps"],
    equipment: ["barbell", "bench"],
    difficulty: "intermediate",
    noWeight: false,
  },
  {
    id: "26",
    name: "Hanging Leg Raises",
    description: "A core exercise targeting the lower abs.",
    types: ["mobility", "circuit"],
    validUnits: [["reps"], ["time"]], // Hanging Leg Raises can use reps or time
    musclesTargeted: ["core"],
    equipment: ["pull-up bar"],
    difficulty: "intermediate",
    noWeight: true,
  },
  {
    id: "27",
    name: "Glute Bridge",
    description: "An exercise targeting the glutes and hamstrings.",
    types: ["strength"],
    validUnits: [["reps"], ["time"]], // Glute Bridge can use reps or time
    musclesTargeted: ["glutes", "hamstrings"],
    equipment: [],
    difficulty: "beginner",
    noWeight: true,
  },
  {
    id: "28",
    name: "Box Jumps",
    description: "A plyometric exercise to improve explosive power.",
    types: ["cardio", "circuit"],
    validUnits: [["reps"], ["time"]], // Box Jumps can use reps or time
    musclesTargeted: ["quads", "glutes", "calves"],
    equipment: ["plyo box"],
    difficulty: "intermediate",
    noWeight: true,
  },
  {
    id: "29",
    name: "Arnold Press",
    description: "A shoulder exercise with a rotational movement.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Arnold Press uses reps and weight
    musclesTargeted: ["shoulders", "triceps"],
    equipment: ["dumbbells"],
    difficulty: "intermediate",
    noWeight: false,
  },
  {
    id: "30",
    name: "Face Pulls",
    description: "An exercise targeting the rear delts and traps.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Face Pulls use reps and weight
    musclesTargeted: ["rear delts", "traps"],
    equipment: ["cable machine"],
    difficulty: "beginner",
    noWeight: false,
  },
  {
    id: "31",
    name: "Hip Thrusts",
    description: "An exercise targeting the glutes and hamstrings.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Hip Thrusts use reps and weight
    musclesTargeted: ["glutes", "hamstrings"],
    equipment: ["barbell", "bench"],
    difficulty: "intermediate",
    noWeight: false,
  },
  {
    id: "32",
    name: "Jump Rope",
    description: "A cardio exercise to improve endurance and coordination.",
    types: ["cardio"],
    validUnits: [["time"], ["reps"]], // Jump Rope can use time or reps
    musclesTargeted: ["full body"],
    equipment: ["jump rope"],
    difficulty: "beginner",
    noWeight: true,
  },
  {
    id: "33",
    name: "Wall Sit",
    description: "A static exercise targeting the quads and core.",
    types: ["mobility", "circuit"],
    validUnits: [["time"]], // Wall Sit only uses time
    musclesTargeted: ["quads", "core"],
    equipment: [],
    difficulty: "beginner",
    noWeight: true,
  },
  {
    id: "34",
    name: "Reverse Fly",
    description: "An isolation exercise targeting the rear delts.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Reverse Fly uses reps and weight
    musclesTargeted: ["rear delts"],
    equipment: ["dumbbells"],
    difficulty: "beginner",
    noWeight: false,
  },
  {
    id: "35",
    name: "Calf Raises",
    description: "An exercise targeting the calves.",
    types: ["strength"],
    validUnits: [["reps", "weight"]], // Calf Raises use reps and weight
    musclesTargeted: ["calves"],
    equipment: ["dumbbells"],
    difficulty: "beginner",
    noWeight: false,
  },
];
