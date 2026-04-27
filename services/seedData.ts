import { SCHEMA_STATEMENTS } from "./schema";

// Sample exercises data

const exercises = [
  {
    name: "A-Skip",
    description:
      "Skipping drill with high knee drive, sprint mechanics practice.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["cardio"],
    muscles: ["quads", "hip flexors", "calves"],
    equipment: ["none"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "Agility Ladder",
    description:
      "Quick footwork patterns through ladder rungs, various patterns available.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["cardio"],
    muscles: ["quads", "calves"],
    equipment: ["agility ladder"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "Back Squat",
    description:
      "Barbell squat with bar on upper back, primary lower body strength exercise.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["quads", "glutes", "hamstrings", "core"],
    equipment: ["barbell", "squat rack"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Balance Ball Squat",
    description:
      "Wall squat with stability ball between back and wall, builds quad endurance.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["strength"],
    muscles: ["quads"],
    equipment: ["stability ball"],
    validUnits: [["reps"]],
  },
  {
    name: "Band Dislocation",
    description:
      "Wide grip band rotated overhead and behind back, shoulder mobility.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["mobility"],
    muscles: ["shoulders"],
    equipment: ["resistance band"],
    validUnits: [["reps"]],
  },
  {
    name: "Band Pull-Apart",
    description:
      "Resistance band pulled apart at chest level, shoulder health exercise.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["mobility"],
    muscles: ["shoulders", "upper back"],
    equipment: ["resistance band"],
    validUnits: [["reps"]],
  },
  {
    name: "Barbell Shrugs",
    description: "Shoulder elevation exercise targeting trapezius muscles.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["traps", "upper back"],
    equipment: ["barbell"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Bench Press",
    description:
      "Horizontal pressing movement targeting chest, shoulders, and triceps.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["chest", "shoulders", "triceps"],
    equipment: ["barbell", "bench"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Box Back Squat",
    description:
      "Back squat where athlete sits back to a box, reinforces proper depth and hip hinge pattern.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["quads", "glutes", "hamstrings", "core"],
    equipment: ["barbell", "squat rack", "box"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Box Jump",
    description: "Explosive jump onto elevated box, builds lower body power.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["strength"],
    muscles: ["quads", "glutes", "calves"],
    equipment: ["box"],
    validUnits: [["reps"]],
  },
  {
    name: "Broad Jump",
    description: "Standing horizontal jump for maximum distance.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["strength"],
    muscles: ["quads", "glutes", "hamstrings", "calves"],
    equipment: ["none"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "Broad Jump to Sprint",
    description:
      "Broad jump immediately followed by sprint, trains power to speed transition.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["strength"],
    muscles: ["quads", "glutes", "hamstrings", "calves"],
    equipment: ["none"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "Build-Up",
    description:
      "Gradual acceleration from jog to 75-90% sprint over distance.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["cardio"],
    muscles: ["quads", "hamstrings", "glutes", "calves"],
    equipment: ["none"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "Bulgarian Split Squat",
    description:
      "Single-leg squat with rear foot elevated, targets quads and glutes.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["strength"],
    muscles: ["quads", "glutes", "hamstrings"],
    equipment: ["bench"],
    validUnits: [["reps"], ["reps", "weight"]],
  },
  {
    name: "Bunny Hop",
    description: "Two-foot forward hops up stairs, builds bilateral leg power.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["strength"],
    muscles: ["quads", "glutes", "calves"],
    equipment: ["stairs"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "Butt Kicks",
    description: "Running forward kicking heels to glutes.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["cardio"],
    muscles: ["hamstrings", "quads"],
    equipment: ["none"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "Cable Row",
    description:
      "Seated rowing movement using cable machine, targets mid-back and lats.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["lats", "upper back", "biceps"],
    equipment: ["cable machine"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Close Grip Bench Press",
    description: "Bench press with narrow grip, emphasizes triceps over chest.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["triceps", "chest", "shoulders"],
    equipment: ["barbell", "bench"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Curved Run",
    description:
      "Sprint in wide arc maintaining speed through direction change.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["cardio"],
    muscles: ["quads", "hamstrings", "glutes", "calves"],
    equipment: ["cones"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "Dead Bug",
    description:
      "Core stability exercise performed lying on back, alternating arm and leg movements.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["strength"],
    muscles: ["core"],
    equipment: ["none"],
    validUnits: [["reps"]],
  },
  {
    name: "Dead Hang",
    description:
      "Hanging from pull-up bar, builds grip endurance and shoulder stability.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["strength"],
    muscles: ["forearms", "lats", "shoulders"],
    equipment: ["pull-up bar"],
    validUnits: [["time"], ["time", "weight"]],
  },
  {
    name: "Dumbbell Bench Press",
    description:
      "Flat bench pressing with dumbbells, allows greater range of motion than barbell.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["chest", "shoulders", "triceps"],
    equipment: ["dumbbell", "bench"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Dumbbell Curl",
    description: "Elbow flexion exercise targeting biceps.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["biceps", "forearms"],
    equipment: ["dumbbell"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Dumbbell Fly",
    description:
      "Chest isolation exercise with dumbbells on flat bench, wide arc motion stretching and contracting pecs.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["chest", "shoulders"],
    equipment: ["dumbbell", "bench"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Dumbbell Front Raise",
    description:
      "Shoulder flexion exercise with dumbbells targeting front deltoids.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["shoulders"],
    equipment: ["dumbbell"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Dumbbell Incline Bench Press",
    description:
      "Incline bench pressing with dumbbells, targets upper chest with greater range of motion than barbell.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["chest", "shoulders", "triceps"],
    equipment: ["dumbbell", "bench"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Dumbbell Military Press",
    description:
      "Seated or standing overhead press with dumbbells, builds shoulder strength and stability with independent arm movement.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["shoulders", "triceps", "core"],
    equipment: ["dumbbell"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Dumbbell Row",
    description: "Single-arm rowing movement targeting back and biceps.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["lats", "upper back", "biceps"],
    equipment: ["dumbbell", "bench"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Face Pull",
    description:
      "Cable pull to face level targeting rear deltoids and upper back.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["shoulders", "upper back", "traps"],
    equipment: ["cable machine"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Farmer Carry",
    description:
      "Walking with heavy weights at sides, builds grip strength and core stability.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["forearms", "traps", "core"],
    equipment: ["dumbbell"],
    validUnits: [
      ["distance", "weight"],
      ["time", "weight"],
    ],
  },
  {
    name: "Flying Sprint",
    description:
      "Build-up acceleration zone then maximum velocity sprint through measured zone.",
    difficulty: "advanced",
    no_weight: 1,
    types: ["cardio"],
    muscles: ["quads", "hamstrings", "glutes", "calves"],
    equipment: ["none"],
    validUnits: [["reps"], ["reps", "distance"]],
  },

  {
    name: "Front Squat",
    description:
      "Barbell squat with bar on front shoulders, emphasizes quads and upper back.",
    difficulty: "advanced",
    no_weight: 0,
    types: ["strength"],
    muscles: ["quads", "glutes", "upper back", "core"],
    equipment: ["barbell", "squat rack"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Glute Bridge",
    description: "Hip extension exercise lying on back, activates glutes.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["strength"],
    muscles: ["glutes", "hamstrings"],
    equipment: ["none"],
    validUnits: [["reps"], ["reps", "weight"]],
  },
  {
    name: "Hamstring Curl",
    description: "Isolation exercise for hamstrings using machine.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["hamstrings"],
    equipment: ["machine"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Hang Power Clean",
    description:
      "Power clean variation starting from hanging position above knees, develops explosive hip extension.",
    difficulty: "advanced",
    no_weight: 0,
    types: ["strength"],
    muscles: ["hamstrings", "glutes", "upper back", "shoulders", "core"],
    equipment: ["barbell"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "High Clean",
    description:
      "Olympic lift variation pulling the barbell to chin height with elbows high, emphasizes upper pull and traps.",
    difficulty: "advanced",
    no_weight: 0,
    types: ["strength"],
    muscles: ["traps", "upper back", "shoulders", "hamstrings", "glutes"],
    equipment: ["barbell"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "High Knees",
    description: "Running in place or forward driving knees to hip height.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["cardio"],
    muscles: ["quads", "hip flexors"],
    equipment: ["none"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "Hip Abduction Machine",
    description:
      "Machine exercise pushing legs outward, isolates hip abductors and glutes.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["glutes", "hip abductors"],
    equipment: ["machine"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Hip Adduction Machine",
    description:
      "Machine exercise squeezing legs inward, isolates hip adductors and inner thighs.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["adductors"],
    equipment: ["machine"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Incline Bench Press",
    description:
      "Pressing movement on incline targeting upper chest and shoulders.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["chest", "shoulders", "triceps"],
    equipment: ["barbell", "bench"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Karaoke",
    description:
      "Lateral movement crossing feet in front and behind while moving sideways.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["mobility"],
    muscles: ["quads", "glutes", "hips"],
    equipment: ["none"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "L Drill (3-Cone)",
    description:
      "Multi-directional agility drill testing acceleration and direction changes.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["cardio"],
    muscles: ["quads", "hamstrings", "glutes", "calves"],
    equipment: ["cones"],
    validUnits: [["reps"], ["time"]],
  },
  {
    name: "Lat Pulldown",
    description: "Vertical pulling exercise targeting lats and upper back.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["lats", "biceps", "upper back"],
    equipment: ["cable machine"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Lateral Bound",
    description:
      "Single-leg lateral jump from one leg to other, builds lateral power.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["strength"],
    muscles: ["quads", "glutes", "calves"],
    equipment: ["none"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "Lateral Lunge",
    description: "Side lunge stretching adductors and activating glutes.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["mobility"],
    muscles: ["quads", "glutes", "adductors"],
    equipment: ["none"],
    validUnits: [["reps"]],
  },
  {
    name: "Dumbbell Lateral Raise",
    description: "Shoulder abduction exercise targeting lateral deltoids.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["shoulders"],
    equipment: ["dumbbell"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Lateral Shuffle to Sprint",
    description:
      "Lateral shuffle maintaining low position then explode into sprint.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["cardio"],
    muscles: ["quads", "glutes", "calves"],
    equipment: ["none"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "Lateral Stair Hop",
    description:
      "Two-foot lateral hops up stairs sideways, builds lateral explosiveness.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["strength"],
    muscles: ["quads", "glutes", "calves"],
    equipment: ["stairs"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "Leg Swing",
    description:
      "Dynamic leg swings forward/back or side-to-side, hip mobility.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["mobility"],
    muscles: ["hip flexors", "hamstrings"],
    equipment: ["none"],
    validUnits: [["reps"]],
  },
  {
    name: "Low Cable Row",
    description:
      "Seated rowing movement using cable machine at low angle, targets mid-back.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["lats", "upper back", "biceps"],
    equipment: ["cable machine"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Machine Pulldown",
    description:
      "Vertical pulling exercise using a plate-loaded or selectorized machine, targets lats and upper back.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["lats", "biceps", "upper back"],
    equipment: ["machine"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Machine Row",
    description:
      "Horizontal rowing movement using a chest-supported or plate-loaded machine, targets mid-back.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["lats", "upper back", "biceps"],
    equipment: ["machine"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Medicine Ball Chest Pass",
    description:
      "Explosive chest pass with medicine ball, builds upper body power.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["chest", "shoulders", "triceps"],
    equipment: ["medicine ball"],
    validUnits: [["reps"], ["reps", "weight"]],
  },
  {
    name: "Medicine Ball Slam",
    description:
      "Explosive overhead slam with medicine ball, total body power exercise.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["shoulders", "core", "lats"],
    equipment: ["medicine ball"],
    validUnits: [["reps"], ["reps", "weight"]],
  },
  {
    name: "Overhead Press",
    description:
      "Standing barbell press overhead, primary shoulder strength exercise.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["shoulders", "triceps", "core"],
    equipment: ["barbell"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Pallof Press",
    description: "Anti-rotation core exercise using cable resistance.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["core", "obliques"],
    equipment: ["cable machine"],
    validUnits: [
      ["reps", "weight"],
      ["reps", "time"],
    ],
  },
  {
    name: "Pause Bench Press",
    description:
      "Bench press with 1-2 second pause at chest to eliminate momentum and build strength.",
    difficulty: "advanced",
    no_weight: 0,
    types: ["strength"],
    muscles: ["chest", "shoulders", "triceps"],
    equipment: ["barbell", "bench"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Pogo Jump",
    description:
      "Rapid ankle bounces with stiff legs, develops reactive strength.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["strength"],
    muscles: ["calves", "ankles"],
    equipment: ["none"],
    validUnits: [["reps"]],
  },
  {
    name: "Power Clean",
    description:
      "Olympic lift explosively pulling barbell from floor to shoulders, builds total body power.",
    difficulty: "advanced",
    no_weight: 0,
    types: ["strength"],
    muscles: ["hamstrings", "glutes", "upper back", "shoulders", "core"],
    equipment: ["barbell"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Pro Agility (5-10-5)",
    description:
      "Sprint 5 yards right, 10 yards left, 5 yards back through start.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["cardio"],
    muscles: ["quads", "hamstrings", "glutes", "calves"],
    equipment: ["cones"],
    validUnits: [["reps"], ["time"]],
  },
  {
    name: "Pull-Up",
    description:
      "Vertical pulling bodyweight exercise targeting back and biceps.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["strength"],
    muscles: ["lats", "biceps", "upper back"],
    equipment: ["pull-up bar"],
    validUnits: [["reps"], ["reps", "weight"]],
  },
  {
    name: "Resisted Sprint Start",
    description: "Explosive sprint start against sled or band resistance.",
    difficulty: "advanced",
    no_weight: 1,
    types: ["strength"],
    muscles: ["quads", "hamstrings", "glutes"],
    equipment: ["sled"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "Romanian Deadlift (RDL)",
    description:
      "Hip hinge movement targeting hamstrings and glutes with slight knee bend.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["hamstrings", "glutes", "lower back"],
    equipment: ["barbell"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Rope Pushdown",
    description:
      "Cable tricep extension using rope attachment, allows wrists to rotate at bottom for full contraction.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["triceps"],
    equipment: ["cable machine"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Scap Push-Up",
    description: "Push-up position protracting and retracting shoulder blades.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["mobility"],
    muscles: ["shoulders", "upper back"],
    equipment: ["none"],
    validUnits: [["reps"]],
  },
  {
    name: "Seated Dumbbell Press",
    description:
      "Overhead pressing with dumbbells while seated, isolates shoulders.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["shoulders", "triceps"],
    equipment: ["dumbbell", "bench"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Single Arm Tricep Pushdown",
    description:
      "Unilateral cable tricep extension allowing independent arm training and greater range of motion.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["triceps"],
    equipment: ["cable machine"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Single-Leg Hop",
    description: "Continuous hopping on one leg for distance or height.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["strength"],
    muscles: ["quads", "glutes", "calves"],
    equipment: ["none"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "Single-Leg Stair Bound",
    description:
      "Bounding up stairs on single leg, extreme unilateral power exercise.",
    difficulty: "advanced",
    no_weight: 1,
    types: ["strength"],
    muscles: ["quads", "glutes", "hamstrings", "calves"],
    equipment: ["stairs"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "Skullcrusher",
    description:
      "Lying tricep extension exercise, can be done with barbell or dumbbells.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["triceps"],
    equipment: ["barbell"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Sprint",
    description: "Maximum effort running for specified distance.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["cardio"],
    muscles: ["quads", "hamstrings", "glutes", "calves"],
    equipment: ["none"],
    validUnits: [["reps"], ["reps", "distance"], ["time", "distance"]],
  },
  {
    name: "Stair Bound",
    description:
      "Bounding up stadium stairs taking multiple steps at once, builds power endurance.",
    difficulty: "advanced",
    no_weight: 1,
    types: ["strength"],
    muscles: ["quads", "glutes", "hamstrings", "calves"],
    equipment: ["stairs"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "Stair Drop Jump",
    description:
      "Jump up stairs far, hop back one stair, repeat pattern moving up.",
    difficulty: "advanced",
    no_weight: 1,
    types: ["strength"],
    muscles: ["quads", "glutes", "hamstrings", "calves"],
    equipment: ["stairs"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "Stair Sprint",
    description: "Maximum effort sprint up stadium stairs.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["cardio"],
    muscles: ["quads", "glutes", "hamstrings", "calves"],
    equipment: ["stairs"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
  {
    name: "Step-Up",
    description: "Stepping onto elevated surface, unilateral leg exercise.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["strength"],
    muscles: ["quads", "glutes"],
    equipment: ["box"],
    validUnits: [["reps"], ["reps", "weight"]],
  },
  {
    name: "Trap Bar Deadlift",
    description:
      "Deadlift variation using trap bar, more quad dominant than conventional deadlift.",
    difficulty: "intermediate",
    no_weight: 0,
    types: ["strength"],
    muscles: ["quads", "hamstrings", "glutes", "lower back"],
    equipment: ["trap bar"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Tricep Pushdown",
    description: "Cable extension exercise isolating triceps.",
    difficulty: "beginner",
    no_weight: 0,
    types: ["strength"],
    muscles: ["triceps"],
    equipment: ["cable machine"],
    validUnits: [["reps", "weight"]],
  },
  {
    name: "Tuck Jump",
    description:
      "Vertical jump bringing knees to chest, builds explosive power.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["strength"],
    muscles: ["quads", "glutes", "calves", "core"],
    equipment: ["none"],
    validUnits: [["reps"]],
  },
  {
    name: "Vertical Jump",
    description: "Maximum effort vertical jump, builds explosive power.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["strength"],
    muscles: ["quads", "glutes", "calves"],
    equipment: ["none"],
    validUnits: [["reps"]],
  },
  {
    name: "W Drill",
    description:
      "Forward sprint, backpedal, angled sprint pattern forming W shape.",
    difficulty: "intermediate",
    no_weight: 1,
    types: ["cardio"],
    muscles: ["quads", "hamstrings", "glutes", "calves"],
    equipment: ["cones"],
    validUnits: [["reps"], ["time"]],
  },
  {
    name: "Walking Lunge",
    description: "Forward lunges while walking, dynamic lower body warm-up.",
    difficulty: "beginner",
    no_weight: 1,
    types: ["mobility"],
    muscles: ["quads", "glutes", "hamstrings"],
    equipment: ["none"],
    validUnits: [["reps"], ["reps", "distance"]],
  },
];

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
      "''",
    )}', '${exercise.description.replace(/'/g, "''")}', '${
      exercise.difficulty
    }', ${exercise.no_weight});

${exercise.types
  .map(
    (type) => `
INSERT INTO exercise_types (exercise_id, type)
VALUES (${index + 1}, '${type}');
`,
  )
  .join("\n")}

${exercise.muscles
  .map(
    (muscle) => `
INSERT INTO exercise_muscles (exercise_id, muscle)
VALUES (${index + 1}, '${muscle}');
`,
  )
  .join("\n")}

${exercise.equipment
  .map(
    (equipment) => `
INSERT INTO exercise_equipment (exercise_id, equipment)
VALUES (${index + 1}, '${equipment}');
`,
  )
  .join("\n")}

${exercise.validUnits
  .map(
    (unitCombo) => `
INSERT INTO exercise_unit_combinations (exercise_id, unit_combination)
VALUES (${index + 1}, '${unitCombo.join("||")}');
`,
  )
  .join("\n")}
`,
  )
  .join("\n")}
`;
