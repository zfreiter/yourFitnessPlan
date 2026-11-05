import { workoutDeletionReceiptKey, workoutDeletionReceiptValue } from "./workoutDeletionOwnership";
import { traceWorkoutSync, syncErrorCode } from "@/utils/workoutSyncDiagnostics";
import { serializeScheduledDate, parseScheduledDate } from "@/utils/scheduledDate";
import NetInfo from "@react-native-community/netinfo";
import { SupabaseClient } from "@supabase/supabase-js";
import { getDB } from "./database";
import { getMeta, META_KEYS } from "@/utils/appMeta";
import { SQLiteDatabase } from "expo-sqlite";
import { withLocalTransaction } from "./localTransaction";

interface SyncQueueItem {
  id: number;
  user_id: string;
  table_name: string;
  record_id: string;
  operation: "insert" | "update" | "delete";
  data: string;
  created_at: string;
  synced: number;
}

const TABLE_PRIMARY_KEYS: Record<string, string> = {
  workouts: "id",
  workout_exercises: "id",
  exercise_sets: "id",
  cardio_entries: "id",
  cardio_intervals: "id",
  circuit_rounds: "id",
  user_preferences: "user_id",
};

// All public workout operations use one FIFO per user. Internal stages never
// acquire the coordinator again, so sync -> push cannot deadlock or reject itself.
let authenticatedOwner: string | null | undefined;
const syncGenerations = new Map<string, number>();
class SyncCancelled extends Error {
  constructor() { super("Synchronization cancelled because the session changed"); }
}
type CheckSession = () => void;
const keepSession: CheckSession = () => {};
const operationTails = new Map<string, Promise<void>>();
const queuedOperations = new Map<string, Promise<unknown>>();
const operationCounts = new Map<string, number>();
const activityListeners = new Set<(userId: string, active: boolean) => void>();
function coordinate<T>(userId: string, kind: string, operation: (checkSession: CheckSession) => Promise<T>): Promise<T> {
  const generation = syncGenerations.get(userId) ?? 0;
  const checkSession = () => {
    if ((authenticatedOwner !== undefined && authenticatedOwner !== userId) || (syncGenerations.get(userId) ?? 0) !== generation) throw new SyncCancelled();
  };
  const key = `${userId}:${generation}:${kind}`;
  const queued = queuedOperations.get(key);
  // Requests received before this operation starts share its fresh snapshot.
  // Requests during execution schedule at most one subsequent run per kind.
  if (queued) return queued as Promise<T>;
  operationCounts.set(userId, (operationCounts.get(userId) ?? 0) + 1);
  activityListeners.forEach(listener => listener(userId, true));
  const previous = operationTails.get(userId) ?? Promise.resolve();
  const result = previous.then(() => {
    queuedOperations.delete(key);
    checkSession();
    traceWorkoutSync("sync-started", { tableName: "workouts", recordId: kind, userId });
    return operation(checkSession).then(result => {
      traceWorkoutSync("sync-completed", { tableName: "workouts", recordId: kind, userId });
      return result;
    });
  });
  queuedOperations.set(key, result);
  const tail = result.then(() => {}, () => {}).then(() => {
    const count = (operationCounts.get(userId) ?? 1) - 1;
    if (count) operationCounts.set(userId, count);
    else operationCounts.delete(userId);
    if (operationTails.get(userId) === tail) operationTails.delete(userId);
    activityListeners.forEach(listener => listener(userId, count > 0));
  });
  operationTails.set(userId, tail);
  return result;
}

function isPostgrestErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === code
  );
}

function workoutsSyncedAtKey(userId: string): string {
  return `${META_KEYS.WORKOUTS_SYNCED_AT}:${userId}`;
}

function valuesMatchForQueuedInsert(
  key: string,
  expected: unknown,
  actual: unknown,
): boolean {
  if (expected === actual) return true;
  if (key === "scheduled_datetime" && typeof expected === "string" && typeof actual === "string") {
    // PostgreSQL emits explicit UTC offsets and pads seconds on timezone-less inputs.
    const asInstant = (value: string) => parseScheduledDate(
      /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value.replace(" ", "T")}Z`,
    )?.getTime();
    const expectedTime = asInstant(expected);
    return expectedTime !== undefined && expectedTime === asInstant(actual);
  }
  if (["is_completed", "is_warmup", "is_max", "is_finisher"].includes(key)) {
    const asBoolean = (value: unknown) => value === true || value === 1;
    if (
      (expected === false || expected === true || expected === 0 || expected === 1) &&
      (actual === false || actual === true || actual === 0 || actual === 1)
    ) {
      return asBoolean(expected) === asBoolean(actual);
    }
  }
  if (Array.isArray(expected) && Array.isArray(actual)) {
    return expected.length === actual.length && expected.every((value, index) =>
      valuesMatchForQueuedInsert(key, value, actual[index]),
    );
  }
  if (
    typeof expected === "object" && expected !== null &&
    typeof actual === "object" && actual !== null &&
    !Array.isArray(expected) && !Array.isArray(actual)
  ) {
    const expectedEntries = Object.entries(expected);
    return expectedEntries.length === Object.keys(actual).length &&
      expectedEntries.every(([childKey, value]) =>
        valuesMatchForQueuedInsert(childKey, value, (actual as Record<string, unknown>)[childKey]),
      );
  }
  return false;
}

async function verifyDuplicateInsert(
  supabase: SupabaseClient,
  tableName: string,
  primaryKey: string,
  payload: Record<string, unknown>,
): Promise<{ matches: boolean; reason?: string }> {
  const recordId = payload[primaryKey];
  if (typeof recordId !== "string" || recordId.length === 0) {
    return { matches: false, reason: `Insert payload has no ${primaryKey}` };
  }

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq(primaryKey, recordId)
      .limit(1);
    if (error) return { matches: false, reason: `Could not verify duplicate: ${String(error)}` };
    if (!Array.isArray(data) || data.length !== 1) {
      return { matches: false, reason: "No unique matching remote row was found" };
    }

    const remoteRow = data[0] as Record<string, unknown>;
    const matches = Object.entries(payload).every(([key, value]) =>
      valuesMatchForQueuedInsert(key, value, remoteRow[key]),
    );
    return matches
      ? { matches: true }
      : { matches: false, reason: "The existing remote row differs from the queued payload" };
  } catch (error) {
    return {
      matches: false,
      reason: error instanceof Error ? error.message : "Duplicate verification request failed",
    };
  }
}

type RemoteRow = Record<string, unknown>;

interface PulledWorkout {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  type: string;
  scheduled_datetime: string;
  duration: number | null;
  perceived_effort: string | null;
  is_completed: number;
  completed_at: string | null;
  workout_exercises: PulledWorkoutExercise[];
  cardio_entries: PulledCardioEntry[];
  circuit_rounds: PulledCircuitRound[];
}

interface PulledWorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string | null;
  exercise_name: string;
  valid_units: string;
  muscles_targeted: string | null;
  equipment: string | null;
  description: string | null;
  exercise_order: number;
  group_id: string | null;
  group_type: string | null;
  round_number: number | null;
  circuit_id: string | null;
  exercise_sets: PulledExerciseSet[];
}

interface PulledExerciseSet {
  id: string;
  workout_exercise_id: string;
  reps: number | null;
  weight: number | null;
  time: number | null;
  distance: number | null;
  is_warmup: number;
  is_max: number;
  set_order: number;
}

interface PulledCardioEntry {
  id: string;
  workout_id: string;
  activity: string;
  mode: string;
  duration: number | null;
  distance: number | null;
  calories: number | null;
  heart_rate_avg: number | null;
  heart_rate_zone: string | null;
  is_finisher: number;
  entry_order: number;
  notes: string | null;
  cardio_intervals: PulledCardioInterval[];
}

interface PulledCardioInterval {
  id: string;
  cardio_entry_id: string;
  interval_order: number;
  work_duration: number | null;
  rest_duration: number | null;
  distance: number | null;
  calories: number | null;
  notes: string | null;
}

interface PulledCircuitRound {
  id: string;
  workout_id: string;
  round_number: number;
  rest_after_round: number;
  notes: string | null;
}

function asRow(value: unknown, path: string): RemoteRow {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Invalid Supabase row at ${path}`);
  }
  return value as RemoteRow;
}

function asRows(value: unknown, path: string): RemoteRow[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(`Invalid Supabase relation at ${path}`);
  return value.map((row, index) => asRow(row, `${path}[${index}]`));
}

function requiredString(row: RemoteRow, key: string, path: string): string {
  const value = row[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing or invalid ${path}.${key}`);
  }
  return value;
}

function nullableString(row: RemoteRow, key: string, path: string): string | null {
  const value = row[key];
  if (value == null) return null;
  if (typeof value !== "string") throw new Error(`Invalid ${path}.${key}`);
  return value;
}

function nullableNumber(row: RemoteRow, key: string, path: string): number | null {
  const value = row[key];
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid ${path}.${key}`);
  }
  return value;
}

function numberOrDefault(row: RemoteRow, key: string, fallback: number, path: string): number {
  return nullableNumber(row, key, path) ?? fallback;
}

function booleanAsInteger(row: RemoteRow, key: string, path: string): number {
  const value = row[key];
  if (value == null) return 0;
  if (value === true || value === 1) return 1;
  if (value === false || value === 0) return 0;
  throw new Error(`Invalid ${path}.${key}`);
}

function arrayAsJson(value: unknown, path: string): string {
  if (value == null) return "[]";
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch {
      // A plain comma-separated local representation is also accepted.
    }
    return JSON.stringify(value ? value.split(",") : []);
  }
  throw new Error(`Invalid ${path}`);
}

function arrayAsDelimitedText(value: unknown, path: string): string | null {
  if (value == null) return null;
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value.join(",");
  }
  if (typeof value === "string") return value;
  throw new Error(`Invalid ${path}`);
}

function validateAndMapWorkoutData(raw: unknown, userId: string): PulledWorkout[] {
  const seenIds: Record<string, Set<string>> = {
    workouts: new Set(),
    workout_exercises: new Set(),
    exercise_sets: new Set(),
    cardio_entries: new Set(),
    cardio_intervals: new Set(),
    circuit_rounds: new Set(),
  };
  const uniqueId = (table: string, row: RemoteRow, path: string) => {
    const id = requiredString(row, "id", path);
    if (seenIds[table].has(id)) throw new Error(`Duplicate ${table} id ${id}`);
    seenIds[table].add(id);
    return id;
  };

  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new Error("Invalid workouts response from Supabase");

    return raw.map((value, workoutIndex) => {
    const path = `workouts[${workoutIndex}]`;
    const row = asRow(value, path);
    const id = uniqueId("workouts", row, path);
    const remoteUserId = requiredString(row, "user_id", path);
    if (remoteUserId !== userId) throw new Error(`Unexpected owner for workout ${id}`);

    const exercises = asRows(row.workout_exercises, `${path}.workout_exercises`).map(
      (exerciseRow, exerciseIndex): PulledWorkoutExercise => {
        const exercisePath = `${path}.workout_exercises[${exerciseIndex}]`;
        const exerciseId = uniqueId("workout_exercises", exerciseRow, exercisePath);
        const exerciseWorkoutId = requiredString(exerciseRow, "workout_id", exercisePath);
        if (exerciseWorkoutId !== id) throw new Error(`Invalid workout parent for exercise ${exerciseId}`);

        const sets = asRows(exerciseRow.exercise_sets, `${exercisePath}.exercise_sets`).map(
          (setRow, setIndex): PulledExerciseSet => {
            const setPath = `${exercisePath}.exercise_sets[${setIndex}]`;
            const setId = uniqueId("exercise_sets", setRow, setPath);
            const parentId = requiredString(setRow, "workout_exercise_id", setPath);
            if (parentId !== exerciseId) throw new Error(`Invalid exercise parent for set ${setId}`);
            return {
              id: setId,
              workout_exercise_id: parentId,
              reps: nullableNumber(setRow, "reps", setPath),
              weight: nullableNumber(setRow, "weight", setPath),
              time: nullableNumber(setRow, "time", setPath),
              distance: nullableNumber(setRow, "distance", setPath),
              is_warmup: booleanAsInteger(setRow, "is_warmup", setPath),
              is_max: booleanAsInteger(setRow, "is_max", setPath),
              set_order: numberOrDefault(setRow, "set_order", 1, setPath),
            };
          },
        );

        return {
          id: exerciseId,
          workout_id: exerciseWorkoutId,
          exercise_id: nullableString(exerciseRow, "exercise_id", exercisePath),
          exercise_name: requiredString(exerciseRow, "exercise_name", exercisePath),
          valid_units: arrayAsJson(exerciseRow.valid_units, `${exercisePath}.valid_units`),
          muscles_targeted: arrayAsDelimitedText(exerciseRow.muscles_targeted, `${exercisePath}.muscles_targeted`),
          equipment: arrayAsDelimitedText(exerciseRow.equipment, `${exercisePath}.equipment`),
          description: nullableString(exerciseRow, "description", exercisePath),
          exercise_order: numberOrDefault(exerciseRow, "exercise_order", 1, exercisePath),
          group_id: nullableString(exerciseRow, "group_id", exercisePath),
          group_type: nullableString(exerciseRow, "group_type", exercisePath),
          round_number: nullableNumber(exerciseRow, "round_number", exercisePath),
          circuit_id: nullableString(exerciseRow, "circuit_id", exercisePath),
          exercise_sets: sets,
        };
      },
    );

    const cardioEntries = asRows(row.cardio_entries, `${path}.cardio_entries`).map(
      (entryRow, entryIndex): PulledCardioEntry => {
        const entryPath = `${path}.cardio_entries[${entryIndex}]`;
        const entryId = uniqueId("cardio_entries", entryRow, entryPath);
        const entryWorkoutId = requiredString(entryRow, "workout_id", entryPath);
        if (entryWorkoutId !== id) throw new Error(`Invalid workout parent for cardio entry ${entryId}`);

        const intervals = asRows(entryRow.cardio_intervals, `${entryPath}.cardio_intervals`).map(
          (intervalRow, intervalIndex): PulledCardioInterval => {
            const intervalPath = `${entryPath}.cardio_intervals[${intervalIndex}]`;
            const intervalId = uniqueId("cardio_intervals", intervalRow, intervalPath);
            const parentId = requiredString(intervalRow, "cardio_entry_id", intervalPath);
            if (parentId !== entryId) throw new Error(`Invalid cardio parent for interval ${intervalId}`);
            return {
              id: intervalId,
              cardio_entry_id: parentId,
              interval_order: numberOrDefault(intervalRow, "interval_order", 1, intervalPath),
              work_duration: nullableNumber(intervalRow, "work_duration", intervalPath),
              rest_duration: nullableNumber(intervalRow, "rest_duration", intervalPath),
              distance: nullableNumber(intervalRow, "distance", intervalPath),
              calories: nullableNumber(intervalRow, "calories", intervalPath),
              notes: nullableString(intervalRow, "notes", intervalPath),
            };
          },
        );

        return {
          id: entryId,
          workout_id: entryWorkoutId,
          activity: requiredString(entryRow, "activity", entryPath),
          mode: requiredString(entryRow, "mode", entryPath),
          duration: nullableNumber(entryRow, "duration", entryPath),
          distance: nullableNumber(entryRow, "distance", entryPath),
          calories: nullableNumber(entryRow, "calories", entryPath),
          heart_rate_avg: nullableNumber(entryRow, "heart_rate_avg", entryPath),
          heart_rate_zone: nullableString(entryRow, "heart_rate_zone", entryPath),
          is_finisher: booleanAsInteger(entryRow, "is_finisher", entryPath),
          entry_order: numberOrDefault(entryRow, "entry_order", 1, entryPath),
          notes: nullableString(entryRow, "notes", entryPath),
          cardio_intervals: intervals,
        };
      },
    );

    const circuitRounds = asRows(row.circuit_rounds, `${path}.circuit_rounds`).map(
      (roundRow, roundIndex): PulledCircuitRound => {
        const roundPath = `${path}.circuit_rounds[${roundIndex}]`;
        const roundId = uniqueId("circuit_rounds", roundRow, roundPath);
        const roundWorkoutId = requiredString(roundRow, "workout_id", roundPath);
        if (roundWorkoutId !== id) throw new Error(`Invalid workout parent for circuit round ${roundId}`);
        return {
          id: roundId,
          workout_id: roundWorkoutId,
          round_number: numberOrDefault(roundRow, "round_number", 1, roundPath),
          rest_after_round: numberOrDefault(roundRow, "rest_after_round", 90, roundPath),
          notes: nullableString(roundRow, "notes", roundPath),
        };
      },
    );

    const circuitRoundIds = new Set(circuitRounds.map((round) => round.id));
    for (const exercise of exercises) {
      if (exercise.circuit_id && !circuitRoundIds.has(exercise.circuit_id)) {
        throw new Error(
          `Circuit exercise ${exercise.id} references a missing round ${exercise.circuit_id}`,
        );
      }
    }

    return {
      id,
      user_id: remoteUserId,
      name: requiredString(row, "name", path),
      description: nullableString(row, "description", path),
      type: requiredString(row, "type", path),
      scheduled_datetime: serializeScheduledDate(requiredString(row, "scheduled_datetime", path)),
      duration: nullableNumber(row, "duration", path),
      perceived_effort: nullableString(row, "perceived_effort", path),
      is_completed: booleanAsInteger(row, "is_completed", path),
      completed_at: nullableString(row, "completed_at", path),
      workout_exercises: exercises,
      cardio_entries: cardioEntries,
      circuit_rounds: circuitRounds,
    };
  });
}

async function insertPulledWorkouts(
  transaction: SQLiteDatabase,
  workouts: PulledWorkout[],
): Promise<void> {
  for (const workout of workouts) {
    await transaction.runAsync(
      `INSERT OR IGNORE INTO workouts
       (id, user_id, name, description, type, scheduled_datetime, duration, perceived_effort, is_completed, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [workout.id, workout.user_id, workout.name, workout.description, workout.type,
        workout.scheduled_datetime, workout.duration, workout.perceived_effort,
        workout.is_completed, workout.completed_at],
    );

    // circuit_id is an FK to circuit_rounds, so insert rounds before exercises.
    for (const round of workout.circuit_rounds) {
      await transaction.runAsync(
        `INSERT OR IGNORE INTO circuit_rounds
         (id, workout_id, round_number, rest_after_round, notes) VALUES (?, ?, ?, ?, ?)`,
        [round.id, round.workout_id, round.round_number, round.rest_after_round, round.notes],
      );
    }

    for (const exercise of workout.workout_exercises) {
      await transaction.runAsync(
        `INSERT OR IGNORE INTO workout_exercises
         (id, workout_id, exercise_id, exercise_name, valid_units, muscles_targeted,
          equipment, description, exercise_order, group_id, group_type, round_number, circuit_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [exercise.id, exercise.workout_id, exercise.exercise_id, exercise.exercise_name,
          exercise.valid_units, exercise.muscles_targeted, exercise.equipment,
          exercise.description, exercise.exercise_order, exercise.group_id,
          exercise.group_type, exercise.round_number, exercise.circuit_id],
      );
      for (const set of exercise.exercise_sets) {
        await transaction.runAsync(
          `INSERT OR IGNORE INTO exercise_sets
           (id, workout_exercise_id, reps, weight, time, distance, is_warmup, is_max, set_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [set.id, set.workout_exercise_id, set.reps, set.weight, set.time,
            set.distance, set.is_warmup, set.is_max, set.set_order],
        );
      }
    }

    for (const entry of workout.cardio_entries) {
      await transaction.runAsync(
        `INSERT OR IGNORE INTO cardio_entries
         (id, workout_id, activity, mode, duration, distance, calories, heart_rate_avg,
          heart_rate_zone, is_finisher, entry_order, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [entry.id, entry.workout_id, entry.activity, entry.mode, entry.duration,
          entry.distance, entry.calories, entry.heart_rate_avg, entry.heart_rate_zone,
          entry.is_finisher, entry.entry_order, entry.notes],
      );
      for (const interval of entry.cardio_intervals) {
        await transaction.runAsync(
          `INSERT OR IGNORE INTO cardio_intervals
           (id, cardio_entry_id, interval_order, work_duration, rest_duration, distance, calories, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [interval.id, interval.cardio_entry_id, interval.interval_order,
            interval.work_duration, interval.rest_duration, interval.distance,
            interval.calories, interval.notes],
        );
      }
    }
  }
}

async function deletePulledWorkoutsForUser(
  transaction: SQLiteDatabase,
  userId: string,
): Promise<void> {
  const workoutIds = `SELECT id FROM workouts WHERE user_id = ?`;
  await transaction.runAsync(
    `DELETE FROM exercise_sets WHERE workout_exercise_id IN
     (SELECT id FROM workout_exercises WHERE workout_id IN (${workoutIds}))`, [userId],
  );
  await transaction.runAsync(
    `DELETE FROM cardio_intervals WHERE cardio_entry_id IN
     (SELECT id FROM cardio_entries WHERE workout_id IN (${workoutIds}))`, [userId],
  );
  await transaction.runAsync(
    `DELETE FROM cardio_entries WHERE workout_id IN (${workoutIds})`, [userId],
  );
  await transaction.runAsync(
    `DELETE FROM workout_exercises WHERE workout_id IN (${workoutIds})`, [userId],
  );
  await transaction.runAsync(
    `DELETE FROM circuit_rounds WHERE workout_id IN (${workoutIds})`, [userId],
  );
  await transaction.runAsync(`DELETE FROM workouts WHERE user_id = ?`, [userId]);
}

async function getPendingWorkoutQueueCount(
  db: SQLiteDatabase,
  userId: string,
): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM sync_queue
     WHERE user_id = ? AND synced = 0
       AND table_name IN (
         'workouts', 'workout_exercises', 'exercise_sets',
         'cardio_entries', 'cardio_intervals', 'circuit_rounds'
       )`,
    [userId],
  );
  return result?.count ?? 0;
}

async function setWorkoutSyncTimestamp(
  transaction: SQLiteDatabase,
  userId: string,
  timestamp: string,
): Promise<void> {
  await transaction.runAsync(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`,
    [workoutsSyncedAtKey(userId), timestamp],
  );
}

async function fetchWorkoutsFromSupabase(
  supabase: SupabaseClient,
  userId: string,
  checkSession: CheckSession = keepSession,
): Promise<PulledWorkout[]> {
  const pageSize = 500;
  const rawWorkouts: unknown[] = [];
  for (let from = 0; ; from += pageSize) {
    checkSession();
    const { data, error } = await supabase
      .from("workouts")
      .select(`
        *,
        workout_exercises (*, exercise_sets (*)),
        cardio_entries (*, cardio_intervals (*)),
        circuit_rounds (*)
      `)
      .eq("user_id", userId)
      .order("scheduled_datetime", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    checkSession();

    if (error) throw error;
    if (data == null) break;
    if (!Array.isArray(data)) throw new Error("Invalid workouts response from Supabase");
    rawWorkouts.push(...data);
    if (data.length < pageSize) break;
  }

  return validateAndMapWorkoutData(rawWorkouts, userId);
}

// Resolve both the existing record and any new parent in an update. Never infer
// ownership from the current login or repair legacy queue labels automatically.
async function validateUploadOwner(db: SQLiteDatabase, supabase: SupabaseClient,
  item: SyncQueueItem, data: Record<string, unknown>, userId: string, check: CheckSession) {
  const relations: Record<string, [string, string]> = {
    workout_exercises: ["workouts", "workout_id"], circuit_rounds: ["workouts", "workout_id"],
    cardio_entries: ["workouts", "workout_id"], exercise_sets: ["workout_exercises", "workout_exercise_id"],
    cardio_intervals: ["cardio_entries", "cardio_entry_id"],
  };
  async function localOwner(table: string, id: unknown): Promise<string | undefined> {
    if (typeof id !== "string") return undefined;
    const row = await db.getFirstAsync<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (!row) return undefined;
    if (table === "workouts") return row.user_id as string;
    const parent = relations[table];
    return parent ? localOwner(parent[0], row[parent[1]]) : undefined;
  }
  if (item.table_name === "user_preferences") {
    if (data.user_id !== userId) throw new Error("Queue payload owner mismatch");
    return;
  }
  const existingOwner = await localOwner(item.table_name, item.record_id);
  if (existingOwner !== undefined && existingOwner !== userId) throw new Error("Local record owner mismatch");
  if (data.user_id !== undefined && data.user_id !== userId) throw new Error("Queue payload owner mismatch");
  if (item.operation === "delete") {
    // Deleted local rows have no trustworthy parent chain. Verify the remote
    // relationship, including for legacy ID-only tombstones, before deleting.
    let relation = "user_id";
    let table = item.table_name;
    const path: string[] = [];
    while (relations[table]) { table = relations[table][0]; path.push(table); }
    for (const parent of [...path].reverse()) relation = `${parent}!inner(${relation})`;
    check();
    const { data: rows, error } = await supabase.from(item.table_name).select(relation).eq("id", item.record_id).limit(1);
    check();
    if (error) throw error;
    if (!Array.isArray(rows)) throw new Error("Could not verify deleted record ownership");
    if (!rows.length) {
      if (item.table_name === "workouts") {
        const receipt = await db.getFirstAsync<{ value: string }>(
          "SELECT value FROM app_meta WHERE key = ?", [workoutDeletionReceiptKey(item.id)],
        );
        if (receipt?.value === workoutDeletionReceiptValue(userId, item.record_id)) return "already-absent";
      }
      throw new Error("Remote delete ownership is unavailable; operation retained for review");
    }
    let row: unknown = rows[0];
    for (const parent of path) {
      row = typeof row === "object" && row !== null ? (row as Record<string, unknown>)[parent] : undefined;
    }
    if (typeof row !== "object" || row === null || (row as Record<string, unknown>).user_id !== userId) throw new Error("Remote delete owner mismatch");
    if (item.table_name === "workouts") {
      // Recover legacy ID-only deletions from an authenticated remote owner read.
      // Persist before the request so a lost response can be retried idempotently.
      await withLocalTransaction(async transaction => {
        check();
        await transaction.runAsync("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)", [
          workoutDeletionReceiptKey(item.id), workoutDeletionReceiptValue(userId, item.record_id),
        ]);
        check();
      });
    }
    return;
  }
  const parent = relations[item.table_name];
  if (parent) {
    const existing = await db.getFirstAsync<Record<string, unknown>>(`SELECT * FROM ${item.table_name} WHERE id = ?`, [item.record_id]);
    const owner = await localOwner(parent[0], data[parent[1]] ?? existing?.[parent[1]]);
    if (owner !== userId) throw new Error("Missing local parent or parent owner mismatch");
  } else if (existingOwner !== userId) throw new Error("Missing local workout or owner mismatch");
  if (typeof data.circuit_id === "string") {
    const round = await db.getFirstAsync<{ workout_id: string }>("SELECT workout_id FROM circuit_rounds WHERE id = ?", [data.circuit_id]);
    if (!round || round.workout_id !== data.workout_id || await localOwner("workouts", round.workout_id) !== userId)
      throw new Error("Circuit round owner or workout mismatch");
  }
}

const syncStages = {
  isOnline: async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return !!state.isConnected && !!state.isInternetReachable;
  },

  addToSyncQueue: async (
    userId: string,
    tableName: string,
    recordId: string,
    operation: "insert" | "update" | "delete",
    data: object,
  ): Promise<void> => {
    const db = await getDB();
    await db.runAsync(
      `INSERT INTO sync_queue (user_id, table_name, record_id, operation, data, synced)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [userId, tableName, recordId, operation, JSON.stringify(data)],
    );
    traceWorkoutSync("queue-committed", { tableName, recordId, operation });
  },

  addToSyncQueueInTransaction: async (
    transaction: SQLiteDatabase,
    userId: string,
    tableName: string,
    recordId: string,
    operation: "insert" | "update" | "delete",
    data: object,
  ): Promise<void> => {
    await transaction.runAsync(
      `INSERT INTO sync_queue (user_id, table_name, record_id, operation, data, synced)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [userId, tableName, recordId, operation, JSON.stringify(data)],
    );
    traceWorkoutSync("queue-staged", { tableName, recordId, operation });
  },

  purgeOrphanedQueueItems: async (userId: string, workoutId: string): Promise<void> => {
    const db = await getDB();
    const result = await db.runAsync(
      `DELETE FROM sync_queue 
     WHERE table_name = 'exercise_sets' 
     AND user_id = ?
     AND synced = 0
     AND record_id IN (
       SELECT id FROM exercise_sets WHERE workout_exercise_id IN (
         SELECT we.id FROM workout_exercises we
         JOIN workouts w ON w.id = we.workout_id
         WHERE we.workout_id = ? AND w.user_id = ?
       )
     )`,
      [userId, workoutId, userId],
    );
    console.log(
      `Purged ${result.changes} orphaned exercise_sets queue items for workout ${workoutId}`,
    );
    const result2 = await db.runAsync(
      `DELETE FROM sync_queue 
     WHERE table_name = 'workout_exercises' 
     AND user_id = ?
     AND synced = 0
     AND record_id IN (
       SELECT we.id FROM workout_exercises we
       JOIN workouts w ON w.id = we.workout_id
       WHERE we.workout_id = ? AND w.user_id = ?
     )`,
      [userId, workoutId, userId],
    );
    console.log(
      `Purged ${result2.changes} orphaned workout_exercises queue items for workout ${workoutId}`,
    );
  },

  purgeOrphanedQueueItemsInTransaction: async (
    transaction: SQLiteDatabase,
    userId: string,
    workoutId: string,
  ): Promise<void> => {
    const workoutExercises = await transaction.getAllAsync<{ id: string }>(
      `SELECT id FROM workout_exercises WHERE workout_id = ?`,
      [workoutId],
    );
    const cardioEntries = await transaction.getAllAsync<{ id: string }>(
      `SELECT id FROM cardio_entries WHERE workout_id = ?`,
      [workoutId],
    );
    const circuitRounds = await transaction.getAllAsync<{ id: string }>(
      `SELECT id FROM circuit_rounds WHERE workout_id = ?`,
      [workoutId],
    );

    const pendingItems = await transaction.getAllAsync<SyncQueueItem>(
      `SELECT id, user_id, table_name, record_id, operation, data, created_at, synced
       FROM sync_queue
       WHERE user_id = ? AND synced = 0
         AND table_name IN (
           'workout_exercises', 'exercise_sets', 'cardio_entries',
           'cardio_intervals', 'circuit_rounds'
         )`,
      [userId],
    );

    const workoutExerciseIds = new Set(workoutExercises.map(({ id }) => id));
    const cardioEntryIds = new Set(cardioEntries.map(({ id }) => id));
    const targetIds: Record<string, Set<string>> = {
      workout_exercises: workoutExerciseIds,
      exercise_sets: new Set(),
      cardio_entries: cardioEntryIds,
      cardio_intervals: new Set(),
      circuit_rounds: new Set(circuitRounds.map(({ id }) => id)),
    };
    const parsedItems = pendingItems.map((item) => {
      try {
        return { item, data: JSON.parse(item.data) as Record<string, unknown> };
      } catch {
        return { item, data: {} as Record<string, unknown> };
      }
    });

    // Pending inserts retain the parent IDs after a child has already been
    // deleted locally, so use both local rows and queue payloads to find them.
    for (const { item, data } of parsedItems) {
      if (
        item.table_name === "workout_exercises" &&
        data.workout_id === workoutId
      ) {
        workoutExerciseIds.add(item.record_id);
      } else if (
        item.table_name === "cardio_entries" &&
        data.workout_id === workoutId
      ) {
        cardioEntryIds.add(item.record_id);
      } else if (
        item.table_name === "circuit_rounds" &&
        data.workout_id === workoutId
      ) {
        targetIds.circuit_rounds.add(item.record_id);
      }
    }

    const localSets = await transaction.getAllAsync<{ id: string }>(
      `SELECT es.id FROM exercise_sets es
       JOIN workout_exercises we ON we.id = es.workout_exercise_id
       WHERE we.workout_id = ?`,
      [workoutId],
    );
    const localIntervals = await transaction.getAllAsync<{ id: string }>(
      `SELECT ci.id FROM cardio_intervals ci
       JOIN cardio_entries ce ON ce.id = ci.cardio_entry_id
       WHERE ce.workout_id = ?`,
      [workoutId],
    );
    for (const { id } of localSets) targetIds.exercise_sets.add(id);
    for (const { id } of localIntervals) targetIds.cardio_intervals.add(id);

    for (const { item, data } of parsedItems) {
      if (
        item.table_name === "exercise_sets" &&
        typeof data.workout_exercise_id === "string" &&
        workoutExerciseIds.has(data.workout_exercise_id)
      ) {
        targetIds.exercise_sets.add(item.record_id);
      } else if (
        item.table_name === "cardio_intervals" &&
        typeof data.cardio_entry_id === "string" &&
        cardioEntryIds.has(data.cardio_entry_id)
      ) {
        targetIds.cardio_intervals.add(item.record_id);
      }
    }

    for (const item of pendingItems) {
      if (targetIds[item.table_name]?.has(item.record_id)) {
        await transaction.runAsync(`DELETE FROM sync_queue WHERE id = ? AND user_id = ?`, [
          item.id,
          userId,
        ]);
      }
    }
  },

  refreshWorkouts: async (
    supabase: SupabaseClient,
    userId: string,
    checkSession: CheckSession = keepSession,
  ): Promise<{ success: boolean; error?: string }> => {
    const db = await getDB();
    try {
      checkSession();
      const online = await syncService.isOnline();
      if (!online) return { success: false, error: "No internet connection" };

      const pushResult = await drainUploads(userId, supabase, checkSession);
      if (!pushResult.success) {
        throw new Error(pushResult.error ?? "Could not push pending workout changes");
      }

      if ((await getPendingWorkoutQueueCount(db, userId)) > 0) {
        throw new Error("Refresh cancelled because workout changes are still pending sync");
      }

      // Fetch and validate before the transaction so network failures leave
      // the existing local workout dataset untouched.
      const remoteWorkouts = await fetchWorkoutsFromSupabase(supabase, userId, checkSession);

      // Replace the complete dataset and timestamp atomically.
      await withLocalTransaction(async (transaction) => {
        checkSession();
        if ((await getPendingWorkoutQueueCount(transaction, userId)) > 0) {
          throw new Error("Refresh cancelled because workout changes became pending during fetch");
        }
        await deletePulledWorkoutsForUser(transaction, userId);
        await insertPulledWorkouts(transaction, remoteWorkouts);
        checkSession();
        await setWorkoutSyncTimestamp(transaction, userId, new Date().toISOString());
      });

      return { success: true };
    } catch (error) {
      if (error instanceof SyncCancelled) throw error;
      traceWorkoutSync("upload-failed", { tableName: "workouts", recordId: "refresh", errorCode: syncErrorCode(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to refresh workouts",
      };
    }
  },

  pushToSupabase: async (
    userId: string,
    supabase: SupabaseClient,
    checkSession: CheckSession = keepSession,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const db = await getDB();

      const pendingItems = await db.getAllAsync<SyncQueueItem>(
        `SELECT * FROM sync_queue WHERE synced = 0 AND user_id = ?
       ORDER BY 
         CASE table_name
           WHEN 'workouts' THEN 1
           WHEN 'circuit_rounds' THEN 2
           WHEN 'workout_exercises' THEN 3
           WHEN 'exercise_sets' THEN 4
           WHEN 'cardio_entries' THEN 5
           WHEN 'cardio_intervals' THEN 6
           ELSE 7
         END,
         created_at ASC, id ASC`,
        [userId],
      );

      traceWorkoutSync("queue-selected", { tableName: "workouts", recordId: "batch", userId, pendingCount: pendingItems.length });
      if (pendingItems.length === 0) return { success: true };

      // A terminal deletion supersedes earlier writes for that workout. Keep
      // them pending until the deletion itself is authorized and acknowledged.
      const terminalDeletes = new Map<string, number>();
      for (const item of pendingItems) {
        if (item.table_name === "workouts" && item.operation === "delete") {
          try {
            if (JSON.parse(item.data)?.id === item.record_id)
              terminalDeletes.set(item.record_id, Math.max(terminalDeletes.get(item.record_id) ?? 0, item.id));
          } catch { /* Malformed tombstones cannot supersede valid operations. */ }
        }
      }
      const superseded = (item: SyncQueueItem) => item.table_name === "workouts" &&
        item.id < (terminalDeletes.get(item.record_id) ?? 0);
      const failures: string[] = [];
      const pendingParents = new Map<string, number>();
      for (const item of pendingItems) {
        if (item.operation !== "delete") {
          const key = `${item.table_name}:${item.record_id}`;
          pendingParents.set(key, (pendingParents.get(key) ?? 0) + 1);
        }
      }
      const blockedRecords = new Set<string>();
      const acknowledge = async (item: SyncQueueItem) => {
        checkSession();
        if (item.table_name === "workouts" && item.operation === "delete") {
          await withLocalTransaction(async transaction => {
            checkSession();
            await transaction.runAsync(
              `UPDATE sync_queue SET synced = 1 WHERE user_id = ? AND table_name = 'workouts'
               AND record_id = ? AND id <= ? AND synced = 0`, [userId, item.record_id, item.id],
            );
            // Remove receipts only for acknowledged operations of this owner.
            await transaction.runAsync(
              `DELETE FROM app_meta WHERE value = ? AND key IN (
                 SELECT 'workout-delete-owner:' || id FROM sync_queue
                 WHERE user_id = ? AND table_name = 'workouts' AND record_id = ? AND id <= ? AND synced = 1
               )`, [workoutDeletionReceiptValue(userId, item.record_id), userId, item.record_id, item.id],
            );
            checkSession();
          });
        } else {
          await db.runAsync(`UPDATE sync_queue SET synced = 1 WHERE id = ? AND user_id = ? AND synced = 0`, [item.id, userId]);
        }
        const key = `${item.table_name}:${item.record_id}`;
        pendingParents.set(key, (pendingParents.get(key) ?? 1) - 1);
      };
      const parents: Record<string, [string, string]> = {
        circuit_rounds: ["workouts", "workout_id"],
        workout_exercises: ["workouts", "workout_id"],
        exercise_sets: ["workout_exercises", "workout_exercise_id"],
        cardio_entries: ["workouts", "workout_id"],
        cardio_intervals: ["cardio_entries", "cardio_entry_id"],
      };

      for (const item of pendingItems) {
        checkSession();
        if (superseded(item)) continue;
        const data = JSON.parse(item.data);
        const pk = TABLE_PRIMARY_KEYS[item.table_name] || "id";

        try {
          if (item.user_id !== userId || !TABLE_PRIMARY_KEYS[item.table_name] ||
              !data || data[pk] !== item.record_id) throw new Error("Invalid queue ownership or record identity");
          const validation = await validateUploadOwner(db, supabase, item, data, userId, checkSession);
          if (validation === "already-absent") {
            await acknowledge(item);
            traceWorkoutSync("delete-already-absent", { tableName: item.table_name, recordId: item.record_id, operation: item.operation, queueId: item.id, userId, queueUserId: item.user_id });
            continue;
          }
          const recordKey = `${item.table_name}:${item.record_id}`;
          if (blockedRecords.has(recordKey)) throw new Error("An earlier operation for this record is still pending");
          if (item.operation !== "delete") {
            const parent = parents[item.table_name];
            if (parent && (pendingParents.get(`${parent[0]}:${data[parent[1]]}`) ?? 0) > 0) {
              throw new Error(`Parent ${parent[0]} ${data[parent[1]]} is still pending`);
            }
            if (item.table_name === "workout_exercises" && typeof data.circuit_id === "string" &&
                (pendingParents.get(`circuit_rounds:${data.circuit_id}`) ?? 0) > 0) {
              throw new Error(`Circuit round ${data.circuit_id} is still pending`);
            }
            // Missing local parents are errors, not successfully synchronized records.
            if (parent && !await db.getFirstAsync(`SELECT id FROM ${parent[0]} WHERE id = ?`, [data[parent[1]]])) {
              throw new Error(`Missing local parent ${parent[0]} ${data[parent[1]]}`);
            }
            if (item.table_name === "workouts" && data.scheduled_datetime !== undefined) {
              data.scheduled_datetime = serializeScheduledDate(data.scheduled_datetime);
            }
          }

          checkSession();
          traceWorkoutSync("upload-attempt", { tableName: item.table_name, recordId: item.record_id, operation: item.operation, queueId: item.id, userId, queueUserId: item.user_id });
          switch (item.operation) {
            case "insert": {
              // Inserts are retried safely by verifying duplicate rows below.
              const { error } = await supabase
                .from(item.table_name)
                .insert(data);

              if (error) throw error;

              break;
            }

            case "update": {
              const { error } = await supabase
                .from(item.table_name)
                .update(data)
                .eq(pk, data[pk]);

              if (error) throw error;

              break;
            }

            case "delete": {
              if (item.table_name === "workouts") {
                const { data: deleted, error } = await supabase.from("workouts").delete()
                  .eq("id", item.record_id).eq("user_id", userId).select("id");
                if (error) throw error;
                if (!Array.isArray(deleted) || !deleted.some(row => row.id === item.record_id))
                  throw new Error("Workout deletion was not confirmed; operation remains pending");
              } else {
                const { error } = await supabase.from(item.table_name).delete().eq(pk, data[pk]);
                if (error) throw error;
              }

              break;
            }

            default:
              throw new Error(`Unknown sync operation: ${item.operation}`);
          }

          // Only mark synced after Supabase succeeds
          await acknowledge(item);

          traceWorkoutSync("upload-succeeded", { tableName: item.table_name, recordId: item.record_id, operation: item.operation, queueId: item.id, userId, queueUserId: item.user_id });
        } catch (error) {
          checkSession();
          // A duplicate-key error on insert means the row already made it
          // to Supabase (e.g. from a prior/overlapping run) - treat as
          // synced rather than retrying forever.
          if (
            item.operation === "insert" &&
            isPostgrestErrorCode(error, "23505")
          ) {
            const verification = await verifyDuplicateInsert(
              supabase,
              item.table_name,
              pk,
              data as Record<string, unknown>,
            );
            if (verification.matches) {
              await acknowledge(item);
              traceWorkoutSync("upload-succeeded", { tableName: item.table_name, recordId: item.record_id, operation: item.operation, queueId: item.id, userId, queueUserId: item.user_id });
              continue;
            }
            error = new Error(`Could not verify duplicate ${item.table_name} ${item.record_id}: ${verification.reason ?? "remote data mismatch"}`);
          }

          blockedRecords.add(`${item.table_name}:${item.record_id}`);
          const detail = error instanceof Error ? error.message :
            typeof error === "object" && error !== null && "message" in error ? String(error.message) : String(error);
          failures.push(`${item.table_name} ${item.record_id}: ${detail}`);
          traceWorkoutSync("upload-failed", { tableName: item.table_name, recordId: item.record_id, operation: item.operation, queueId: item.id, userId, queueUserId: item.user_id, errorCode: syncErrorCode(error) });

          // Leave item unsynced so it retries later
        }
      }

      // Cleanup old synced items
      checkSession();
      await db.runAsync(
        `DELETE FROM sync_queue 
       WHERE synced = 1 
       AND user_id = ?
       AND created_at < datetime('now', '-7 days')`,
        [userId],
      );

      if (failures.length) {
        return { success: false, error: failures.join("; ") };
      }
      return { success: true };
    } catch (error) {
      if (error instanceof SyncCancelled) throw error;
      traceWorkoutSync("upload-failed", { tableName: "workouts", recordId: "batch", errorCode: syncErrorCode(error) });

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to push to Supabase",
      };
    }
  },

  fetchWorkoutsFromSupabase: async (
    supabase: SupabaseClient,
    userId: string,
  ): Promise<PulledWorkout[]> => fetchWorkoutsFromSupabase(supabase, userId),

  // Pull the complete local cache on first sync or a newly linked device.
  pullFromSupabase: async (
    supabase: SupabaseClient,
    userId: string,
    checkSession: CheckSession = keepSession,
  ): Promise<void> => {
    checkSession();
    const workouts = await fetchWorkoutsFromSupabase(supabase, userId, checkSession);
    await withLocalTransaction(async (transaction) => {
      checkSession();
      if ((await getPendingWorkoutQueueCount(transaction, userId)) > 0) {
        throw new Error("Pull cancelled because workout changes became pending during fetch");
      }
      await insertPulledWorkouts(transaction, workouts);
      checkSession();
      await setWorkoutSyncTimestamp(transaction, userId, new Date().toISOString());
    });
    console.log("Pull from Supabase complete");
  },

  // Clean up old local workouts (keep last, current, next month only)
  cleanupOldWorkouts: async (userId: string): Promise<void> => {
    const db = await getDB();
    try {
      await db.runAsync(
        `DELETE FROM workouts 
         WHERE user_id = ?
         AND scheduled_datetime < date('now', 'start of month', '-1 month')
         AND is_completed = 1`,
        [userId],
      );
    } catch (error) {
      console.error("Error cleaning up old workouts:", error);
    }
  },

  // Main sync function - call this on app launch
  sync: async (supabase: SupabaseClient, userId: string, checkSession: CheckSession = keepSession): Promise<void> => {
    checkSession();
    try {
      const online = await syncService.isOnline();
      if (!online) {
        console.log("Offline - skipping sync");
        if ((await getPendingWorkoutQueueCount(await getDB(), userId)) > 0) {
          throw new Error("Offline: workout changes remain pending sync");
        }
        return;
      }

      console.log("Online - starting sync");

      // Always push pending local changes first
      const pushResult = await drainUploads(userId, supabase, checkSession);
      if (!pushResult.success) {
        throw new Error(pushResult.error ?? "Failed to push pending changes");
      }

      // Only pull on first install or new device login
      const lastSynced = await getMeta(workoutsSyncedAtKey(userId));
      console.log("Last synced at ", lastSynced);
      if (!lastSynced) {
        const pendingWorkoutRows = await getPendingWorkoutQueueCount(
          await getDB(),
          userId,
        );
        if (pendingWorkoutRows > 0) {
          console.warn("Initial workout pull deferred until local workout changes sync");
          throw new Error("Workout changes are still pending sync");
        }
        console.log("First sync - pulling from Supabase in syncService...");
        await syncService.pullFromSupabase(supabase, userId, checkSession);
      }

      // Clean up old local data
      checkSession();
      await syncService.cleanupOldWorkouts(userId);

      if ((await getPendingWorkoutQueueCount(await getDB(), userId)) > 0) {
        throw new Error("Workout changes are still pending sync");
      }
      console.log("Sync complete");
    } catch (error) {
      if (error instanceof SyncCancelled) throw error;
      traceWorkoutSync("upload-failed", { tableName: "workouts", recordId: "batch", errorCode: syncErrorCode(error) });
      throw error;
    }
  },
};

// A successful snapshot may have missed commits made while uploading. Drain
// fresh snapshots, but stop immediately on failure: failed rows wait for a new
// explicit request rather than triggering an automatic retry loop.
async function drainUploads(userId: string, supabase: SupabaseClient, checkSession: CheckSession = keepSession) {
  while (true) {
    checkSession();
    if (!await syncService.isOnline()) return { success: false, error: "No internet connection" };
    const result = await syncStages.pushToSupabase(userId, supabase, checkSession);
    if (!result.success) return result;
    const db = await getDB();
    const pending = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sync_queue WHERE user_id = ? AND synced = 0", [userId],
    );
    if (!pending?.count) return result;
  }
}

export const syncService = {
  ...syncStages,
  setAuthenticatedUser: (userId: string | null) => {
    if (authenticatedOwner && authenticatedOwner !== userId) syncService.invalidateUserSync(authenticatedOwner);
    authenticatedOwner = userId;
  },
  invalidateUserSync: (userId: string) => {
    syncGenerations.set(userId, (syncGenerations.get(userId) ?? 0) + 1);
    // Keep the tail until an already-sent request settles. Releasing it early
    // would let a new session race that request on the same queue records.
  },
  isSyncActive: (userId: string) => (operationCounts.get(userId) ?? 0) > 0,
  subscribeSyncActivity: (listener: (userId: string, active: boolean) => void) => {
    activityListeners.add(listener);
    return () => { activityListeners.delete(listener); };
  },
  sync: (supabase: SupabaseClient, userId: string) =>
    coordinate(userId, "sync", check => syncStages.sync(supabase, userId, check)),
  pushToSupabase: (userId: string, supabase: SupabaseClient) =>
    coordinate(userId, "push", check => drainUploads(userId, supabase, check)),
  refreshWorkouts: (supabase: SupabaseClient, userId: string) =>
    coordinate(userId, "refresh", check => syncStages.refreshWorkouts(supabase, userId, check)),
};
