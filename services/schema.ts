export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    username TEXT,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    age INTEGER CHECK(age IS NULL OR (age >= 0 AND age <= 120)),
    current_weight REAL CHECK(current_weight IS NULL OR (current_weight > 0 AND current_weight < 500)),
    current_height REAL CHECK(current_height IS NULL OR (current_height >= 0 AND current_height <= 250)),
    gender TEXT CHECK(gender IS NULL OR gender IN ('male', 'female', 'other')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    theme TEXT DEFAULT 'light' CHECK(theme IN ('light', 'dark')),
    unit_system TEXT DEFAULT 'us' CHECK(unit_system IN ('us', 'metric')),
    set_progression_style TEXT DEFAULT 'straight' CHECK(set_progression_style IN ('straight', 'ramp', 'custom')),
    rm_formula TEXT DEFAULT 'epley' CHECK(rm_formula IN ('epley', 'brzycki', 'lombardi')),
    weight_rounding TEXT DEFAULT '5' CHECK(weight_rounding IN ('2.5', '5', '10', 'none')),
    allow_analytics INTEGER DEFAULT 0 CHECK(allow_analytics IN (0, 1)),
    default_workout_visibility TEXT DEFAULT 'private' CHECK(default_workout_visibility IN ('private', 'shareable')),
    allow_friend_requests INTEGER DEFAULT 0 CHECK(allow_friend_requests IN (0, 1)),
    who_can_send_workouts TEXT DEFAULT 'everyone' CHECK(who_can_send_workouts IN ('everyone', 'friends', 'none')),
    notifications_enabled INTEGER DEFAULT 0 CHECK(notifications_enabled IN (0, 1)),
    email_product_updates INTEGER DEFAULT 0 CHECK(email_product_updates IN (0, 1)),
    email_tips INTEGER DEFAULT 0 CHECK(email_tips IN (0, 1)),
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS training_max_history (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    exercise_name TEXT NOT NULL,
    one_rep_max REAL NOT NULL,
    tested_date TEXT,
    created_at TEXT,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS weight_history (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    weight REAL NOT NULL,
    recorded_at TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT CHECK(operation IN ('insert', 'update', 'upsert', 'delete')),
    data TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    synced INTEGER DEFAULT 0
  )`,

  // ---------- EXERCISES (STATIC DATA) ----------

  `CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    difficulty TEXT CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
    no_weight INTEGER DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS exercise_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id TEXT,
    type TEXT CHECK(type IN ('strength', 'cardio', 'circuit', 'open')),
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    UNIQUE(exercise_id, type)
  )`,

  `CREATE TABLE IF NOT EXISTS exercise_muscles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id TEXT,
    muscle TEXT,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    UNIQUE(exercise_id, muscle)
  )`,

  `CREATE TABLE IF NOT EXISTS exercise_equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id TEXT,
    equipment TEXT,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    UNIQUE(exercise_id, equipment)
  )`,

  `CREATE TABLE IF NOT EXISTS exercise_valid_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit TEXT CHECK(unit IN ('reps', 'weight', 'time', 'distance')),
    UNIQUE(unit)
  )`,

  `CREATE TABLE IF NOT EXISTS exercise_unit_combinations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id TEXT,
    unit_combination TEXT,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    UNIQUE(exercise_id, unit_combination)
  )`,

  // ---------- WORKOUTS ----------

  `CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK(type IN ('strength', 'cardio', 'circuit', 'open')),
    scheduled_datetime TEXT NOT NULL,
    duration INTEGER,
    perceived_effort TEXT CHECK(perceived_effort IN ('easy', 'moderate', 'hard')),
    is_completed INTEGER DEFAULT 0,
    completed_at TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS workout_exercises (
  id TEXT PRIMARY KEY,
  workout_id TEXT,
  exercise_id TEXT,
  exercise_name TEXT NOT NULL,

  valid_units TEXT NOT NULL DEFAULT '[]',

  muscles_targeted TEXT,
  equipment TEXT,
  description TEXT,

  exercise_order INTEGER NOT NULL DEFAULT 1,

  group_id TEXT DEFAULT NULL,
  group_type TEXT
    CHECK(group_type IN ('superset', 'compound_set', 'circuit'))
    DEFAULT NULL,

  round_number INTEGER DEFAULT NULL,
  circuit_id TEXT DEFAULT NULL,

  FOREIGN KEY (workout_id)
    REFERENCES workouts(id)
    ON DELETE CASCADE,

  FOREIGN KEY (exercise_id)
    REFERENCES exercises(id),

  FOREIGN KEY (circuit_id)
    REFERENCES circuit_rounds(id)
    ON DELETE SET NULL
);`,

  `CREATE TABLE IF NOT EXISTS exercise_sets (
    id TEXT PRIMARY KEY,
    workout_exercise_id TEXT,
    reps INTEGER,
    weight REAL,
    time INTEGER,
    distance REAL,
    is_warmup INTEGER DEFAULT 0,
    is_max INTEGER DEFAULT 0,
    set_order INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
  )`,

  // ---------- CARDIO ----------

  `CREATE TABLE IF NOT EXISTS cardio_entries (
    id TEXT PRIMARY KEY,
    workout_id TEXT,
    activity TEXT CHECK(activity IN ('run', 'sprint', 'bike', 'row', 'swim', 'jump_rope', 'hike', 'walk')),
    mode TEXT CHECK(mode IN ('simple', 'intervals')) DEFAULT 'simple',
    duration INTEGER,
    distance REAL,
    calories INTEGER,
    heart_rate_avg INTEGER,
    heart_rate_zone TEXT CHECK(heart_rate_zone IN ('z1', 'z2', 'z3', 'z4', 'z5')),
    is_finisher INTEGER DEFAULT 0,
    entry_order INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS cardio_intervals (
    id TEXT PRIMARY KEY,
    cardio_entry_id TEXT,
    interval_order INTEGER NOT NULL DEFAULT 1,
    work_duration INTEGER,
    rest_duration INTEGER,
    distance REAL,
    calories INTEGER,
    notes TEXT,
    FOREIGN KEY (cardio_entry_id) REFERENCES cardio_entries(id) ON DELETE CASCADE
  )`,

  // ---------- CIRCUIT ----------

  `CREATE TABLE IF NOT EXISTS circuit_rounds (
    id TEXT PRIMARY KEY,
    workout_id TEXT,
    round_number INTEGER NOT NULL,
    rest_after_round INTEGER NOT NULL DEFAULT 90,
    notes TEXT,
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
  )`,
];
