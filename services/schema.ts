// services/schema.sql
export const SCHEMA = `
-- Exercises table
CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    difficulty TEXT CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
    no_weight INTEGER DEFAULT 0
);

-- Exercise types
CREATE TABLE IF NOT EXISTS exercise_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id INTEGER,
    type TEXT CHECK(type IN ('strength', 'cardio', 'mobility', 'circuit')),
    FOREIGN KEY (exercise_id) REFERENCES exercises(id),
    UNIQUE(exercise_id, type)
);

-- Exercise muscles
CREATE TABLE IF NOT EXISTS exercise_muscles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id INTEGER,
    muscle TEXT,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id),
    UNIQUE(exercise_id, muscle)
);

-- Exercise equipment
CREATE TABLE IF NOT EXISTS exercise_equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id INTEGER,
    equipment TEXT,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id),
    UNIQUE(exercise_id, equipment)
);

-- Exercise valid units
CREATE TABLE IF NOT EXISTS exercise_valid_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit TEXT CHECK(unit IN ('reps', 'weight', 'time', 'distance')),
    UNIQUE(unit)
);

-- Exercise unit combinations
CREATE TABLE IF NOT EXISTS exercise_unit_combinations (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id INTEGER,
    unit_combination TEXT,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id),
    UNIQUE(exercise_id, unit_combination)
);

-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK(type IN ('strength', 'cardio', 'mobility', 'circuit')),
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    duration INTEGER,
    is_completed INTEGER DEFAULT 0
);

-- Workout exercises junction table (removed unique constraint to allow multiple instances)
CREATE TABLE IF NOT EXISTS workout_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER,
    exercise_id INTEGER,
    exercise_name TEXT NOT NULL,
    chosen_unit_combination TEXT,
    track_reps INTEGER DEFAULT 0,
    track_weight INTEGER DEFAULT 0,
    track_time INTEGER DEFAULT 0,
    track_distance INTEGER DEFAULT 0,
    FOREIGN KEY (workout_id) REFERENCES workouts(id),
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

-- Exercise sets (now references workout_exercises.id instead of composite key)
CREATE TABLE IF NOT EXISTS exercise_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_exercise_id INTEGER,
    reps INTEGER,
    weight REAL,
    time INTEGER,
    distance REAL,
    FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id)
);
`;
