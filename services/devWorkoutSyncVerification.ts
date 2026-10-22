/** Development-only verification of workout pull and refresh behavior. */
import * as Crypto from "expo-crypto";
import { SupabaseClient } from "@supabase/supabase-js";
import { SQLiteDatabase } from "expo-sqlite";
import { ExerciseSet, Workout, WorkoutExercise } from "@/types/interfaces/types";
import { WorkoutChanges } from "@/utils/workoutChangeUtils";
import { getDB } from "@/services/database";
import { META_KEYS } from "@/utils/appMeta";
import { syncService } from "@/services/syncService";
import { workoutService } from "@/services/workoutService";
import { exerciseService } from "@/services/exerciseService";
import { setService } from "@/services/setService";
import { cardioService } from "@/services/cardioService";
import { circuitService } from "@/services/circuitService";
import { withLocalTransaction } from "@/services/localTransaction";

const TRIGGER_PREFIX = "dev_workout_sync_verify_";
interface Fixture {
  userId: string;
  catalogExerciseId: string;
  workoutId: string;
  exerciseId: string;
  setId: string;
  cardioId: string;
  intervalId: string;
  roundId: string;
}

export interface WorkoutSyncVerificationResult {
  name: string;
  passed: boolean;
  detail: string;
}

interface FakeOptions {
  rows?: unknown[];
  fetchError?: unknown;
  onFetch?: () => Promise<void>;
  fetchCalls?: number;
  verificationRows?: Record<string, Record<string, unknown>>;
  verificationError?: unknown;
  writeError?: (table: string, operation: string, payload: unknown) => unknown;
  writes?: Array<{ table: string; operation: string; payload: unknown }>;
}

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function emptyChanges(overrides: Partial<WorkoutChanges> = {}): WorkoutChanges {
  return {
    exercisesToInsert: [], exercisesToUpdate: [], exerciseIdsToDelete: [],
    setsToInsert: [], setsToUpdate: [], setIdsToDelete: [],
    cardioEntriesToInsert: [], cardioEntriesToUpdate: [], cardioEntryIdsToDelete: [],
    cardioIntervalsToInsert: [], cardioIntervalsToUpdate: [], cardioIntervalIdsToDelete: [],
    circuitRoundsToInsert: [], circuitRoundsToUpdate: [], circuitRoundIdsToDelete: [],
    ...overrides,
  };
}

function fixture(): Fixture {
  const token = Crypto.randomUUID().replace(/-/g, "");
  return {
    userId: `dev-sync-user-${token}`,
    catalogExerciseId: `dev-sync-catalog-${token}`,
    workoutId: `dev-sync-workout-${token}`,
    exerciseId: `dev-sync-exercise-${token}`,
    setId: `dev-sync-set-${token}`,
    cardioId: `dev-sync-cardio-${token}`,
    intervalId: `dev-sync-interval-${token}`,
    roundId: `dev-sync-round-${token}`,
  };
}

function remoteWorkoutRows(f: Fixture): unknown[] {
  return [
    {
      id: f.workoutId,
      user_id: f.userId,
      name: "Pulled fixture workout",
      description: "remote fixture",
      type: "circuit",
      scheduled_datetime: "2035-02-03T10:00:00.000Z",
      duration: 45,
      perceived_effort: "moderate",
      is_completed: false,
      completed_at: null,
      workout_exercises: [
        {
          id: f.exerciseId,
          workout_id: f.workoutId,
          exercise_id: null,
          exercise_name: "Pulled fixture exercise",
          valid_units: ["reps", "weight"],
          muscles_targeted: ["legs"],
          equipment: ["barbell"],
          description: "fixture exercise description",
          exercise_order: 1,
          group_id: f.roundId,
          group_type: "circuit",
          round_number: 1,
          circuit_id: f.roundId,
          exercise_sets: [
            {
              id: f.setId,
              workout_exercise_id: f.exerciseId,
              reps: 8,
              weight: 30,
              time: null,
              distance: null,
              is_warmup: false,
              is_max: false,
              set_order: 1,
            },
          ],
        },
      ],
      cardio_entries: [
        {
          id: f.cardioId,
          workout_id: f.workoutId,
          activity: "run",
          mode: "intervals",
          duration: null,
          distance: 2.5,
          calories: 120,
          heart_rate_avg: 140,
          heart_rate_zone: "z3",
          is_finisher: true,
          entry_order: 1,
          notes: "cardio fixture",
          cardio_intervals: [
            {
              id: f.intervalId,
              cardio_entry_id: f.cardioId,
              interval_order: 1,
              work_duration: 60,
              rest_duration: 30,
              distance: 0.2,
              calories: 15,
              notes: "interval fixture",
            },
          ],
        },
      ],
      circuit_rounds: [
        {
          id: f.roundId,
          workout_id: f.workoutId,
          round_number: 1,
          rest_after_round: 90,
          notes: "round fixture",
        },
      ],
    },
  ];
}

function fakeSupabase(options: FakeOptions): SupabaseClient {
  const fake = {
    from(table: string) {
      let operation = "select";
      let payload: unknown;
      let selectColumns = "";
      const filters: Record<string, unknown> = {};
      const builder: any = {
        select(columns = "") {
          operation = "select";
          selectColumns = columns;
          return builder;
        },
        eq(column: string, value: unknown) {
          filters[column] = value;
          return builder;
        },
        order() {
          return builder;
        },
        range() {
          return builder;
        },
        limit() {
          return builder;
        },
        insert(data: unknown) {
          operation = "insert";
          payload = data;
          return builder;
        },
        update(data: unknown) {
          operation = "update";
          payload = data;
          return builder;
        },
        delete() {
          operation = "delete";
          return builder;
        },
        then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
          if (operation === "select") {
            if (selectColumns.trim() === "*") {
              const row = options.verificationRows?.[table];
              const matchesFilter = row && Object.entries(filters).every(
                ([key, value]) => row[key] === value,
              );
              return Promise.resolve({
                data: matchesFilter ? [row] : [],
                error: options.verificationError ?? null,
              }).then(resolve, reject);
            }
            options.fetchCalls = (options.fetchCalls ?? 0) + 1;
            const pendingFetch = options.onFetch?.();
            return Promise.resolve({
              data: options.rows ?? [],
              error: options.fetchError ?? null,
            }).then(async (result) => {
              await pendingFetch;
              return resolve(result);
            }, reject);
          }

          options.writes?.push({ table, operation, payload });
          return Promise.resolve({
            data: null,
            error: options.writeError?.(table, operation, payload) ?? null,
          }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  return fake as unknown as SupabaseClient;
}

async function seedFixture(db: SQLiteDatabase, f: Fixture): Promise<void> {
  await db.runAsync(`INSERT INTO profiles (id) VALUES (?)`, [f.userId]);
  await db.runAsync(
    `INSERT INTO exercises (id, name) VALUES (?, 'Development fixture exercise')`,
    [f.catalogExerciseId],
  );
  await db.runAsync(
    `INSERT INTO workouts (id, user_id, name, type, scheduled_datetime, duration)
     VALUES (?, ?, 'Pre-existing local workout', 'strength', '2035-01-01T09:00:00.000Z', 20)`,
    [f.workoutId, f.userId],
  );
}

async function localRows(db: SQLiteDatabase, f: Fixture): Promise<unknown[]> {
  const workout = await db.getAllAsync(
    `SELECT id, name, type, duration FROM workouts WHERE id = ?`,
    [f.workoutId],
  );
  const exercises = await db.getAllAsync(
    `SELECT id, workout_id, exercise_name, valid_units, muscles_targeted,
            equipment, group_id, group_type, round_number, circuit_id
     FROM workout_exercises WHERE workout_id = ? ORDER BY id`,
    [f.workoutId],
  );
  const sets = await db.getAllAsync(
    `SELECT id, workout_exercise_id, reps, weight, is_warmup, is_max, set_order
     FROM exercise_sets WHERE workout_exercise_id IN
       (SELECT id FROM workout_exercises WHERE workout_id = ?) ORDER BY id`,
    [f.workoutId],
  );
  const cardio = await db.getAllAsync(
    `SELECT id, workout_id, activity, mode FROM cardio_entries WHERE workout_id = ? ORDER BY id`,
    [f.workoutId],
  );
  const intervals = await db.getAllAsync(
    `SELECT id, cardio_entry_id, interval_order, work_duration, rest_duration
     FROM cardio_intervals WHERE cardio_entry_id IN
       (SELECT id FROM cardio_entries WHERE workout_id = ?) ORDER BY id`,
    [f.workoutId],
  );
  const rounds = await db.getAllAsync(
    `SELECT id, workout_id, round_number, rest_after_round
     FROM circuit_rounds WHERE workout_id = ? ORDER BY id`,
    [f.workoutId],
  );
  return [...workout, ...exercises, ...sets, ...cardio, ...intervals, ...rounds];
}

async function queueRows(db: SQLiteDatabase, f: Fixture): Promise<unknown[]> {
  return db.getAllAsync(
    `SELECT table_name, record_id, operation, data, synced FROM sync_queue
     WHERE user_id = ? ORDER BY table_name, record_id, operation, data`,
    [f.userId],
  );
}

function scopedSyncKey(userId: string): string {
  return `${META_KEYS.WORKOUTS_SYNCED_AT}:${userId}`;
}

async function setMeta(
  db: SQLiteDatabase,
  value: string | null,
  key: string = META_KEYS.WORKOUTS_SYNCED_AT,
): Promise<void> {
  if (value == null) {
    await db.runAsync(`DELETE FROM app_meta WHERE key = ?`, [key]);
  } else {
    await db.runAsync(
      `INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`,
      [key, value],
    );
  }
}

async function getMeta(
  db: SQLiteDatabase,
  key: string = META_KEYS.WORKOUTS_SYNCED_AT,
): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_meta WHERE key = ?`,
    [key],
  );
  return row?.value ?? null;
}

async function dropTriggers(db: SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'trigger'
     AND name LIKE '${TRIGGER_PREFIX}%'`,
  );
  for (const row of rows) {
    await db.execAsync(`DROP TRIGGER IF EXISTS "${row.name}"`);
  }
}

async function runCase(
  name: string,
  test: (db: SQLiteDatabase, f: Fixture) => Promise<void>,
): Promise<WorkoutSyncVerificationResult> {
  const db = await getDB();
  const f = fixture();
  const previousTimestamp = await getMeta(db);
  const previousScopedTimestamp = await getMeta(db, scopedSyncKey(f.userId));
  try {
    await seedFixture(db, f);
    await test(db, f);
    return { name, passed: true, detail: "All SQLite assertions passed." };
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    try {
      await dropTriggers(db);
    } finally {
      await db.runAsync(`DELETE FROM sync_queue WHERE user_id = ?`, [f.userId]);
      await db.runAsync(`DELETE FROM profiles WHERE id = ?`, [f.userId]);
      await db.runAsync(`DELETE FROM exercises WHERE id = ?`, [f.catalogExerciseId]);
      await setMeta(db, previousTimestamp);
      await setMeta(db, previousScopedTimestamp, scopedSyncKey(f.userId));
    }
  }
}

export async function runDevWorkoutSyncVerification(): Promise<WorkoutSyncVerificationResult[]> {
  if (!__DEV__) throw new Error("Workout sync verification is development-only.");

  const db = await getDB();
  await dropTriggers(db);
  const results: WorkoutSyncVerificationResult[] = [];

  results.push(await runCase("SYNC 1 — pull maps strength, cardio, intervals, and circuit rows", async (database, f) => {
    await syncService.pullFromSupabase(fakeSupabase({ rows: remoteWorkoutRows(f) }), f.userId);
    const rows = await localRows(database, f);
    ensure(rows.length === 6, `Expected six fixture rows, found ${rows.length}.`);
    const exercise = await database.getFirstAsync<{ valid_units: string; circuit_id: string }>(
      `SELECT valid_units, circuit_id FROM workout_exercises WHERE id = ?`, [f.exerciseId],
    );
    ensure(exercise?.valid_units === '["reps","weight"]', "valid_units was not mapped to local JSON text.");
    ensure(exercise?.circuit_id === f.roundId, "circuit_id relationship was not preserved.");
    const interval = await database.getFirstAsync<{ cardio_entry_id: string }>(
      `SELECT cardio_entry_id FROM cardio_intervals WHERE id = ?`, [f.intervalId],
    );
    ensure(interval?.cardio_entry_id === f.cardioId, "Cardio interval parent was not preserved.");
    const set = await database.getFirstAsync<{ workout_exercise_id: string }>(
      `SELECT workout_exercise_id FROM exercise_sets WHERE id = ?`, [f.setId],
    );
    ensure(set?.workout_exercise_id === f.exerciseId, "Set parent was not preserved.");
  }));

  results.push(await runCase("SYNC 2 — failed network pull preserves rows and timestamp", async (database, f) => {
    const before = await localRows(database, f);
    const timestamp = `sync-fixture-before-${f.userId}`;
    await setMeta(database, timestamp, scopedSyncKey(f.userId));
    let failed = false;
    try {
      await syncService.pullFromSupabase(fakeSupabase({ fetchError: new Error("forced fetch failure") }), f.userId);
    } catch {
      failed = true;
    }
    ensure(failed, "Network fetch error was swallowed.");
    ensure(JSON.stringify(await localRows(database, f)) === JSON.stringify(before), "Local rows changed after failed fetch.");
    ensure((await getMeta(database, scopedSyncKey(f.userId))) === timestamp, "Timestamp changed after failed fetch.");
  }));

  results.push(await runCase("SYNC 3 — invalid parent mapping fails before local writes", async (database, f) => {
    const before = await localRows(database, f);
    const timestamp = `sync-fixture-before-${f.userId}`;
    await setMeta(database, timestamp, scopedSyncKey(f.userId));
    const rows = remoteWorkoutRows(f) as Array<{
      workout_exercises: Array<{ workout_id: string }>;
    }>;
    rows[0].workout_exercises[0].workout_id = "unexpected-workout-id";
    let failed = false;
    try {
      await syncService.pullFromSupabase(fakeSupabase({ rows }), f.userId);
    } catch {
      failed = true;
    }
    ensure(failed, "Invalid parent mapping was accepted.");
    ensure(JSON.stringify(await localRows(database, f)) === JSON.stringify(before), "Local rows changed after mapping failure.");
    ensure((await getMeta(database, scopedSyncKey(f.userId))) === timestamp, "Timestamp changed after mapping failure.");
  }));

  results.push(await runCase("SYNC 4 — failed local write rolls back the pull and timestamp", async (database, f) => {
    const before = await localRows(database, f);
    const timestamp = `sync-fixture-before-${f.userId}`;
    await setMeta(database, timestamp, scopedSyncKey(f.userId));
    const trigger = `${TRIGGER_PREFIX}${Crypto.randomUUID().replace(/-/g, "")}`;
    await database.execAsync(`
      CREATE TRIGGER "${trigger}" BEFORE INSERT ON cardio_intervals
      WHEN NEW.id = '${f.intervalId}' BEGIN
        SELECT RAISE(ABORT, 'forced local pull failure');
      END;
    `);
    let failed = false;
    try {
      await syncService.pullFromSupabase(fakeSupabase({ rows: remoteWorkoutRows(f) }), f.userId);
    } catch {
      failed = true;
    } finally {
      await database.execAsync(`DROP TRIGGER IF EXISTS "${trigger}"`);
    }
    ensure(failed, "Local insert error was swallowed.");
    ensure(JSON.stringify(await localRows(database, f)) === JSON.stringify(before), "Partial pull rows escaped rollback.");
    ensure((await getMeta(database, scopedSyncKey(f.userId))) === timestamp, "Timestamp changed after failed local write.");
  }));

  results.push(await runCase("SYNC 5 — empty successful pull records completion", async (database, f) => {
    const sentinel = `sync-fixture-before-${f.userId}`;
    await setMeta(database, sentinel, scopedSyncKey(f.userId));
    await syncService.pullFromSupabase(fakeSupabase({ rows: [] }), f.userId);
    ensure((await localRows(database, f)).length === 1, "Empty pull changed the existing local workout.");
    const timestamp = await getMeta(database, scopedSyncKey(f.userId));
    ensure(!!timestamp && timestamp !== sentinel, "Empty successful pull did not update the timestamp.");
  }));

  results.push(await runCase("SYNC 6 — repeated pull does not duplicate fixture rows", async (database, f) => {
    const client = fakeSupabase({ rows: remoteWorkoutRows(f) });
    await syncService.pullFromSupabase(client, f.userId);
    const firstRows = await localRows(database, f);
    await syncService.pullFromSupabase(client, f.userId);
    const secondRows = await localRows(database, f);
    ensure(JSON.stringify(secondRows) === JSON.stringify(firstRows), "Repeated pull changed or duplicated local rows.");
  }));

  results.push(await runCase("SYNC 7 — refresh aborts when a workout queue write remains pending", async (database, f) => {
    await database.runAsync(
      `INSERT INTO sync_queue (user_id, table_name, record_id, operation, data, synced)
       VALUES (?, 'workouts', ?, 'update', ?, 0)`,
      [f.userId, f.workoutId, JSON.stringify({ id: f.workoutId, name: "pending" })],
    );
    const beforeRows = await localRows(database, f);
    const beforeQueue = await queueRows(database, f);
    const result = await syncService.refreshWorkouts(fakeSupabase({
      rows: remoteWorkoutRows(f),
      writeError: () => new Error("forced push failure"),
    }), f.userId);
    ensure(!result.success, "Refresh succeeded with a failed pending queue write.");
    ensure(result.error?.includes("still pending sync"), `Refresh failed for an unexpected reason: ${result.error ?? "unknown error"}`);
    ensure(JSON.stringify(await localRows(database, f)) === JSON.stringify(beforeRows), "Refresh deleted local rows despite pending queue work.");
    ensure(JSON.stringify(await queueRows(database, f)) === JSON.stringify(beforeQueue), "Refresh changed the pending queue row.");
  }));

  results.push(await runCase("SYNC 8 — failed refresh fetch preserves the local dataset", async (database, f) => {
    const beforeRows = await localRows(database, f);
    const timestamp = `sync-fixture-before-${f.userId}`;
    await setMeta(database, timestamp, scopedSyncKey(f.userId));
    const result = await syncService.refreshWorkouts(fakeSupabase({ fetchError: new Error("forced refresh fetch failure") }), f.userId);
    ensure(!result.success, "Refresh succeeded despite a failed fetch.");
    ensure(result.error?.includes("forced refresh fetch failure"), `Refresh failed for an unexpected reason: ${result.error ?? "unknown error"}`);
    ensure(JSON.stringify(await localRows(database, f)) === JSON.stringify(beforeRows), "Failed refresh changed local workout data.");
    ensure((await getMeta(database, scopedSyncKey(f.userId))) === timestamp, "Failed refresh changed the timestamp.");
  }));

  results.push(await runCase("SYNC 9 — successful refresh atomically replaces all workout types", async (database, f) => {
    const result = await syncService.refreshWorkouts(fakeSupabase({ rows: remoteWorkoutRows(f) }), f.userId);
    ensure(result.success, `Refresh failed: ${result.error ?? "unknown error"}`);
    const rows = await localRows(database, f);
    ensure(rows.length === 6, `Expected six replacement rows, found ${rows.length}.`);
    const oldWorkout = await database.getFirstAsync<{ id: string; name: string }>(
      `SELECT id, name FROM workouts WHERE id = ?`, [f.workoutId],
    );
    ensure(oldWorkout?.id === f.workoutId, "Expected fixture workout to be present after refresh.");
    ensure(oldWorkout?.name === "Pulled fixture workout", "Refresh did not replace the workout contents.");
  }));

  results.push(await runCase("SYNC 10 — circuit round is pushed before linked exercise", async (database, f) => {
    const createdWorkoutId = `dev-sync-created-${Crypto.randomUUID().replace(/-/g, "")}`;
    const trigger = `${TRIGGER_PREFIX}${Crypto.randomUUID().replace(/-/g, "")}`;
    await database.execAsync(`
      CREATE TRIGGER "${trigger}" BEFORE INSERT ON workout_exercises
      WHEN NEW.circuit_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM circuit_rounds WHERE id = NEW.circuit_id)
      BEGIN
        SELECT RAISE(ABORT, 'circuit round must be inserted before its exercise');
      END;
    `);
    const created = await workoutService.insertWorkout({
      id: createdWorkoutId,
      user_id: f.userId,
      name: "Circuit dependency fixture",
      workoutType: "circuit",
      scheduled_datetime: "2035-03-01T09:00:00.000Z",
      duration: 30,
      perceived_effort: "moderate",
      is_completed: 0,
      exercises: [
        {
          id: f.exerciseId,
          workout_id: createdWorkoutId,
          exercise_id: f.catalogExerciseId,
          exercise_name: "Fixture circuit exercise",
          validUnits: ["reps"],
          exercise_order: 1,
          group_id: f.roundId,
          group_type: "circuit",
          round_number: 1,
          sets: [
            {
              id: f.setId,
              workout_exercise_id: f.exerciseId,
              reps: 8,
              is_warmup: 0,
              is_max: 0,
              set_order: 1,
            },
          ],
        },
      ],
      cardio_entries: [],
      circuit_rounds: [
        {
          id: f.roundId,
          workout_id: createdWorkoutId,
          round_number: 1,
          rest_after_round: 90,
        },
      ],
    } as Workout, f.userId);
    ensure(created.success, `Circuit fixture insert failed: ${created.error ?? "unknown error"}`);
    const writes: Array<{ table: string; operation: string; payload: unknown }> = [];
    const result = await syncService.pushToSupabase(f.userId, fakeSupabase({ writes }));
    ensure(result.success, `Queue push failed: ${result.error ?? "unknown error"}`);
    const roundIndex = writes.findIndex((write) => write.table === "circuit_rounds");
    const exerciseIndex = writes.findIndex((write) => write.table === "workout_exercises");
    ensure(roundIndex >= 0 && exerciseIndex >= 0 && roundIndex < exerciseIndex, "Circuit round was not pushed before its exercise.");
    const payload = writes[exerciseIndex]?.payload as Record<string, unknown>;
    ensure(payload.circuit_id === f.roundId, "Exercise push omitted its circuit_id relationship.");
    const pending = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM sync_queue WHERE user_id = ? AND synced = 0`, [f.userId],
    );
    ensure((pending?.count ?? 0) === 0, "Circuit fixture queue rows were not marked synced.");
  }));

  results.push(await runCase("SYNC 11 - pull defers when a queue change appears during fetch", async (database, f) => {
    const timestamp = `sync-fixture-before-${f.userId}`;
    await setMeta(database, timestamp, scopedSyncKey(f.userId));
    const beforeRows = await localRows(database, f);
    let insertedQueueRow = false;
    let failed = false;
    try {
      await syncService.pullFromSupabase(fakeSupabase({
        rows: remoteWorkoutRows(f),
        onFetch: async () => {
          await database.runAsync(
            `INSERT INTO sync_queue (user_id, table_name, record_id, operation, data, synced)
             VALUES (?, 'workouts', ?, 'update', ?, 0)`,
            [f.userId, f.workoutId, JSON.stringify({ id: f.workoutId, name: "pending local edit" })],
          );
          insertedQueueRow = true;
        },
      }), f.userId);
    } catch {
      failed = true;
    }
    ensure(insertedQueueRow && failed, "Pull did not detect the queue change made during fetch.");
    ensure(JSON.stringify(await localRows(database, f)) === JSON.stringify(beforeRows), "Deferred pull changed local workout data.");
    ensure((await getMeta(database, scopedSyncKey(f.userId))) === timestamp, "Deferred pull changed the successful-pull timestamp.");
    const queued = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM sync_queue WHERE user_id = ? AND synced = 0`, [f.userId],
    );
    ensure((queued?.count ?? 0) === 1, "Queue change made during fetch was lost.");
  }));

  results.push(await runCase("SYNC 12 - mismatched duplicate insert remains pending", async (database, f) => {
    const queuedPayload = {
      id: f.workoutId,
      user_id: f.userId,
      name: "Intended local workout",
      type: "strength",
      scheduled_datetime: "2035-01-01T09:00:00.000Z",
      duration: 20,
    };
    await database.runAsync(
      `INSERT INTO sync_queue (user_id, table_name, record_id, operation, data, synced)
       VALUES (?, 'workouts', ?, 'insert', ?, 0)`,
      [f.userId, f.workoutId, JSON.stringify(queuedPayload)],
    );
    const client = fakeSupabase({
      writes: [],
      writeError: (table, operation) => table === "workouts" && operation === "insert"
        ? { code: "23505", message: "duplicate key" }
        : null,
      verificationRows: {
        workouts: { ...queuedPayload, name: "Different remote workout" },
      },
    });
    const result = await syncService.pushToSupabase(f.userId, client);
    ensure(!result.success && result.error?.includes("Could not verify duplicate"), "Duplicate mismatch was not reported to the caller.");
    const pending = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM sync_queue
       WHERE user_id = ? AND table_name = 'workouts' AND record_id = ? AND synced = 0`,
      [f.userId, f.workoutId],
    );
    ensure((pending?.count ?? 0) === 1, "Mismatched remote data was incorrectly marked synced.");
  }));

  results.push(await runCase("SYNC 13 - failed circuit round blocks linked exercise upload", async (database, f) => {
    const roundPayload = {
      id: f.roundId,
      workout_id: f.workoutId,
      round_number: 1,
      rest_after_round: 90,
      notes: null,
    };
    const exercisePayload = {
      id: f.exerciseId,
      workout_id: f.workoutId,
      exercise_name: "Dependent fixture exercise",
      circuit_id: f.roundId,
    };
    await database.runAsync(
      `INSERT INTO sync_queue (user_id, table_name, record_id, operation, data, synced)
       VALUES (?, 'circuit_rounds', ?, 'insert', ?, 0)`,
      [f.userId, f.roundId, JSON.stringify(roundPayload)],
    );
    await database.runAsync(
      `INSERT INTO sync_queue (user_id, table_name, record_id, operation, data, synced)
       VALUES (?, 'workout_exercises', ?, 'insert', ?, 0)`,
      [f.userId, f.exerciseId, JSON.stringify(exercisePayload)],
    );
    const writes: Array<{ table: string; operation: string; payload: unknown }> = [];
    const result = await syncService.pushToSupabase(f.userId, fakeSupabase({
      writes,
      writeError: (table, operation) => table === "circuit_rounds" && operation === "insert"
        ? new Error("forced circuit round upload failure")
        : null,
    }));
    ensure(result.success, `Queue processing failed unexpectedly: ${result.error ?? "unknown error"}`);
    ensure(writes.some((write) => write.table === "circuit_rounds"), "Circuit round upload was not attempted.");
    ensure(!writes.some((write) => write.table === "workout_exercises"), "Dependent exercise upload was attempted after its round failed.");
    const pending = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM sync_queue
       WHERE user_id = ? AND synced = 0 AND record_id IN (?, ?)`,
      [f.userId, f.roundId, f.exerciseId],
    );
    ensure((pending?.count ?? 0) === 2, "Failed round and dependent exercise must remain pending.");
  }));

  results.push(await runCase("SYNC 14 - a new account pulls despite another account's metadata", async (database, f) => {
    const otherUserId = `dev-sync-other-${Crypto.randomUUID().replace(/-/g, "")}`;
    const otherKey = scopedSyncKey(otherUserId);
    const previousOtherTimestamp = await getMeta(database, otherKey);
    try {
      await setMeta(database, "legacy-account-sync-marker");
      await setMeta(database, "other-account-sync-marker", otherKey);
      ensure((await getMeta(database, scopedSyncKey(f.userId))) == null, "Fixture account unexpectedly has a prior pull timestamp.");
      const clientOptions: FakeOptions = {
        rows: remoteWorkoutRows(f),
        fetchCalls: 0,
      };
      await syncService.sync(fakeSupabase(clientOptions), f.userId);
      ensure(clientOptions.fetchCalls === 1, "New account skipped its initial remote pull.");
      ensure(!!(await getMeta(database, scopedSyncKey(f.userId))), "New account pull timestamp was not recorded.");
      ensure((await getMeta(database, otherKey)) === "other-account-sync-marker", "Another account's timestamp was changed.");
    } finally {
      await setMeta(database, previousOtherTimestamp, otherKey);
    }
  }));

  results.push(await runCase("READ 1 - workout and child reads are scoped to the owner", async (database, f) => {
    const token = Crypto.randomUUID().replace(/-/g, "");
    const otherUserId = `dev-read-user-${token}`;
    const otherWorkoutId = `dev-read-workout-${token}`;
    const otherExerciseId = `dev-read-exercise-${token}`;
    const otherSetId = `dev-read-set-${token}`;
    const otherCardioId = `dev-read-cardio-${token}`;
    const otherIntervalId = `dev-read-interval-${token}`;
    const otherRoundId = `dev-read-round-${token}`;
    try {
      await database.runAsync(`INSERT INTO profiles (id) VALUES (?)`, [otherUserId]);
      await database.runAsync(
        `INSERT INTO workouts (id, user_id, name, type, scheduled_datetime, duration)
         VALUES (?, ?, 'Other user fixture', 'circuit', '2035-01-01T09:00:00.000Z', 25)`,
        [otherWorkoutId, otherUserId],
      );
      await database.runAsync(
        `INSERT INTO circuit_rounds (id, workout_id, round_number, rest_after_round)
         VALUES (?, ?, 1, 60)`,
        [otherRoundId, otherWorkoutId],
      );
      await database.runAsync(
        `INSERT INTO workout_exercises
         (id, workout_id, exercise_id, exercise_name, valid_units, exercise_order, group_id, group_type, circuit_id)
         VALUES (?, ?, ?, 'Other user exercise', '["reps"]', 1, ?, 'circuit', ?)`,
        [otherExerciseId, otherWorkoutId, f.catalogExerciseId, otherRoundId, otherRoundId],
      );
      await database.runAsync(
        `INSERT INTO exercise_sets (id, workout_exercise_id, reps, is_warmup, is_max, set_order)
         VALUES (?, ?, 10, 0, 0, 1)`,
        [otherSetId, otherExerciseId],
      );
      await database.runAsync(
        `INSERT INTO cardio_entries (id, workout_id, activity, mode, entry_order)
         VALUES (?, ?, 'bike', 'simple', 1)`,
        [otherCardioId, otherWorkoutId],
      );
      await database.runAsync(
        `INSERT INTO cardio_intervals (id, cardio_entry_id, interval_order, work_duration)
         VALUES (?, ?, 1, 30)`,
        [otherIntervalId, otherCardioId],
      );

      ensure(await workoutService.getWorkoutById(f.userId, otherWorkoutId) === null, "Non-owner fetched another user's workout by ID.");
      const byDate = await workoutService.getWorkoutsByDate(f.userId, "2035-01-01");
      ensure(byDate.every((workout) => workout.user_id === f.userId), "Date query returned another user's workout.");
      ensure(!byDate.some((workout) => workout.id === otherWorkoutId), "Date query exposed the other user's workout.");

      ensure((await exerciseService.getWorkoutExercises(f.userId, otherWorkoutId, database)).length === 0, "Non-owner fetched another user's workout exercises.");
      ensure((await setService.getWorkoutSets(f.userId, otherExerciseId, database)).length === 0, "Non-owner fetched another user's sets by exercise ID.");
      ensure((await setService.getSetsByWorkout(f.userId, otherWorkoutId)).length === 0, "Non-owner fetched another user's sets by workout ID.");
      ensure((await setService.getSetsByExercise(f.userId, f.catalogExerciseId)).length === 0, "Non-owner fetched another user's sets by catalog exercise ID.");
      ensure((await setService.getSetsByWorkoutExercise(f.userId, otherExerciseId)).length === 0, "Non-owner fetched another user's sets by workout-exercise ID.");
      ensure((await cardioService.getWorkoutCardioEntries(f.userId, otherWorkoutId, database)).length === 0, "Non-owner fetched another user's cardio entries or intervals.");
      ensure((await circuitService.getWorkoutCircuitRounds(f.userId, otherWorkoutId, database)).length === 0, "Non-owner fetched another user's circuit rounds.");

      const ownerWorkout = await workoutService.getWorkoutById(otherUserId, otherWorkoutId);
      ensure(ownerWorkout?.exercises?.[0]?.sets?.[0]?.id === otherSetId, "Owner could not retrieve the fixture exercise and set.");
      ensure(ownerWorkout?.cardio_entries?.[0]?.intervals?.[0]?.id === otherIntervalId, "Owner could not retrieve the fixture cardio interval.");
      ensure(ownerWorkout?.circuit_rounds?.[0]?.id === otherRoundId, "Owner could not retrieve the fixture circuit round.");
    } finally {
      await database.runAsync(`DELETE FROM exercise_sets WHERE id = ?`, [otherSetId]);
      await database.runAsync(`DELETE FROM cardio_intervals WHERE id = ?`, [otherIntervalId]);
      await database.runAsync(`DELETE FROM cardio_entries WHERE id = ?`, [otherCardioId]);
      await database.runAsync(`DELETE FROM workout_exercises WHERE id = ?`, [otherExerciseId]);
      await database.runAsync(`DELETE FROM circuit_rounds WHERE id = ?`, [otherRoundId]);
      await database.runAsync(`DELETE FROM workouts WHERE id = ?`, [otherWorkoutId]);
      await database.runAsync(`DELETE FROM profiles WHERE id = ?`, [otherUserId]);
    }
  }));

  results.push(await runCase("OWNERSHIP 1 - cross-user mutations are denied and owner mutations succeed", async (database, f) => {
    const token = Crypto.randomUUID().replace(/-/g, "");
    const otherUserId = `dev-owner-user-${token}`;
    const otherWorkoutId = `dev-owner-workout-${token}`;
    const otherExerciseId = `dev-owner-exercise-${token}`;
    const otherExercise2Id = `dev-owner-exercise2-${token}`;
    const otherSetId = `dev-owner-set-${token}`;
    const otherCardioId = `dev-owner-cardio-${token}`;
    const otherIntervalId = `dev-owner-interval-${token}`;
    const otherRoundId = `dev-owner-round-${token}`;
    const ownExerciseId = `dev-owner-local-exercise-${token}`;
    const otherExercise: WorkoutExercise = {
      id: otherExerciseId, workout_id: otherWorkoutId, exercise_id: f.catalogExerciseId, exercise_name: "Other exercise",
      validUnits: ["reps"], exercise_order: 1, sets: [],
    };
    const otherExercise2: WorkoutExercise = {
      ...otherExercise, id: otherExercise2Id, exercise_order: 2,
    };
    const otherSet: ExerciseSet = {
      id: otherSetId, workout_exercise_id: otherExerciseId, reps: 8,
      is_warmup: 0, is_max: 0, set_order: 1,
    };
    const otherCardio = {
      id: otherCardioId, workout_id: otherWorkoutId, activity: "run", mode: "simple",
      entry_order: 1, intervals: [],
    } as any;
    const otherInterval = {
      id: otherIntervalId, cardio_entry_id: otherCardioId, interval_order: 1,
    } as any;
    const otherRound = {
      id: otherRoundId, workout_id: otherWorkoutId, round_number: 1, rest_after_round: 60,
    };

    const workoutSnapshot = async (workoutId: string) => localRows(database, { ...f, workoutId });
    const queueSnapshot = async () => database.getAllAsync(
      `SELECT user_id, table_name, record_id, operation, data, synced FROM sync_queue
       WHERE user_id IN (?, ?) ORDER BY user_id, table_name, record_id, operation, data`,
      [f.userId, otherUserId],
    );
    let beforeOwn: unknown[] = [];
    let beforeOther: unknown[] = [];
    let beforeQueue: unknown[] = [];
    const assertDeniedStateUnchanged = async (description: string) => {
      ensure(JSON.stringify(await workoutSnapshot(f.workoutId)) === JSON.stringify(beforeOwn), `${description} changed the caller's workout.`);
      ensure(JSON.stringify(await workoutSnapshot(otherWorkoutId)) === JSON.stringify(beforeOther), `${description} changed the other user's workout.`);
      ensure(JSON.stringify(await queueSnapshot()) === JSON.stringify(beforeQueue), `${description} created or changed sync queue rows.`);
    };

    try {
      await database.runAsync(`INSERT INTO profiles (id) VALUES (?)`, [otherUserId]);
      await database.runAsync(
        `INSERT INTO workouts (id, user_id, name, type, scheduled_datetime, duration)
         VALUES (?, ?, 'Other owner workout', 'circuit', '2035-04-01T09:00:00.000Z', 25)`,
        [otherWorkoutId, otherUserId],
      );
      await database.runAsync(
        `INSERT INTO workout_exercises (id, workout_id, exercise_name, valid_units, exercise_order)
         VALUES (?, ?, 'Other exercise', '["reps"]', 1), (?, ?, 'Other exercise 2', '["reps"]', 2)`,
        [otherExerciseId, otherWorkoutId, otherExercise2Id, otherWorkoutId],
      );
      await database.runAsync(
        `INSERT INTO exercise_sets (id, workout_exercise_id, reps, is_warmup, is_max, set_order)
         VALUES (?, ?, 8, 0, 0, 1)`, [otherSetId, otherExerciseId],
      );
      await database.runAsync(
        `INSERT INTO cardio_entries (id, workout_id, activity, mode, entry_order)
         VALUES (?, ?, 'run', 'simple', 1)`, [otherCardioId, otherWorkoutId],
      );
      await database.runAsync(
        `INSERT INTO cardio_intervals (id, cardio_entry_id, interval_order, work_duration)
         VALUES (?, ?, 1, 30)`, [otherIntervalId, otherCardioId],
      );
      await database.runAsync(
        `INSERT INTO circuit_rounds (id, workout_id, round_number, rest_after_round)
         VALUES (?, ?, 1, 60)`, [otherRoundId, otherWorkoutId],
      );
      await database.runAsync(
        `INSERT INTO workout_exercises (id, workout_id, exercise_name, valid_units, exercise_order, group_type, group_id, circuit_id)
         VALUES (?, ?, 'Circuit exercise', '["reps"]', 3, 'circuit', ?, ?)`,
        [`${otherExerciseId}-circuit`, otherWorkoutId, otherRoundId, otherRoundId],
      );
      await database.runAsync(
        `INSERT INTO workout_exercises (id, workout_id, exercise_name, valid_units, exercise_order)
         VALUES (?, ?, 'Caller exercise', '["reps"]', 1)`, [ownExerciseId, f.workoutId],
      );

      beforeOwn = await workoutSnapshot(f.workoutId);
      beforeOther = await workoutSnapshot(otherWorkoutId);
      beforeQueue = await queueSnapshot();

      const deniedCreate = await workoutService.insertWorkout({
        id: `dev-wrong-owner-workout-${token}`, user_id: otherUserId,
        name: "Wrong owner create", workoutType: "strength",
        scheduled_datetime: "2035-04-02T09:00:00.000Z", duration: 20,
        is_completed: 0, exercises: [], cardio_entries: [], circuit_rounds: [],
      } as Workout, f.userId);
      ensure(!deniedCreate.success, "Workout creation accepted a payload for another user.");

      const deniedWorkoutUpdate = await workoutService.updateWorkout(
        f.userId, otherWorkoutId, emptyChanges({ workout: { name: "Unauthorized" } }),
      );
      ensure(!deniedWorkoutUpdate.success, "Cross-account workout update was accepted.");
      const deniedWorkoutDelete = await workoutService.deleteWorkout(f.userId, otherWorkoutId);
      ensure(!deniedWorkoutDelete.success, "Cross-account workout deletion was accepted.");
      const deniedType = await workoutService.updateWorkoutType(f.userId, otherWorkoutId, "cardio");
      const deniedField = await workoutService.updateWorkoutField(f.userId, otherWorkoutId, "name", "Unauthorized");
      const deniedOwnerField = await workoutService.updateWorkoutField(f.userId, f.workoutId, "user_id", otherUserId);
      const deniedBase = await workoutService.updateBaseWorkoutFields(f.userId, { name: "Unauthorized" }, otherWorkoutId);
      const deniedCompleted = await workoutService.updateCompleted(f.userId, otherWorkoutId, true, new Date().toISOString());
      const deniedDetails = await workoutService.updateWorkoutDetails(f.userId, otherWorkoutId, { name: "Unauthorized", description: "x" });
      ensure(!deniedType.success && !deniedField.success && !deniedOwnerField.success && !deniedBase.success && !deniedCompleted.success && !deniedDetails.success,
        "A cross-account workout field mutation was accepted.");

      const deniedNewExercise = await workoutService.updateWorkoutNewExercise(f.userId, otherWorkoutId, otherExercise);
      ensure(!deniedNewExercise.success, "Cross-account exercise insertion was accepted.");
      const deniedReorder = await workoutService.reorderWorkoutExercise(f.userId, [otherExercise, otherExercise2], 0, "down");
      const deniedExerciseOrder = await exerciseService.updateExerciseOrder(f.userId, [{ id: otherExerciseId, exercise_order: 2 }]);
      const deniedExerciseDelete = await workoutService.deleteWorkoutExercise(f.userId, otherExerciseId);
      const deniedExerciseDelete2 = await exerciseService.deleteExercise(f.userId, otherExerciseId);
      ensure(!deniedReorder.success && !deniedExerciseOrder.success && !deniedExerciseDelete.success && !deniedExerciseDelete2.success,
        "A cross-account exercise mutation was accepted.");

      const rejectedAddSet = await setService.addSet(f.userId, { ...otherSet, id: undefined } as any).then(() => false, () => true);
      const deniedSetInsert = await setService.insertSet(f.userId, { ...otherSet, id: `${otherSetId}-new` });
      const deniedSetUpdate = await setService.updateSet(f.userId, { ...otherSet, reps: 99 });
      const deniedSetUpdates = await setService.updateSets(f.userId, [{ ...otherSet, reps: 100 }]);
      const deniedSetDelete = await setService.deleteSet(f.userId, otherSetId);
      const deniedSetReorder = await setService.deleteSetAndUpdateOrder(f.userId, otherSetId, otherExerciseId, true, 1);
      ensure(rejectedAddSet && !deniedSetInsert.success && !deniedSetUpdate.success && !deniedSetUpdates.success && !deniedSetDelete.success && !deniedSetReorder.success,
        "A cross-account set mutation was accepted.");

      const deniedCardio = await workoutService.updateWorkout(f.userId, f.workoutId, emptyChanges({ cardioEntriesToUpdate: [otherCardio] }));
      const deniedInterval = await workoutService.updateWorkout(f.userId, f.workoutId, emptyChanges({ cardioIntervalsToUpdate: [otherInterval] }));
      const deniedRound = await workoutService.updateWorkout(f.userId, f.workoutId, emptyChanges({ circuitRoundsToUpdate: [otherRound] }));
      const deniedCardioDelete = await workoutService.updateWorkout(f.userId, f.workoutId, emptyChanges({ cardioEntryIdsToDelete: [otherCardioId] }));
      const deniedIntervalDelete = await workoutService.updateWorkout(f.userId, f.workoutId, emptyChanges({ cardioIntervalIdsToDelete: [otherIntervalId] }));
      const deniedRoundDelete = await workoutService.updateWorkout(f.userId, f.workoutId, emptyChanges({ circuitRoundIdsToDelete: [otherRoundId] }));
      const rejectedCardioDirect = await withLocalTransaction((tx) => cardioService.updateWorkoutCardioEntry(otherCardio, tx, f.userId)).then(() => false, () => true);
      const rejectedIntervalDirect = await withLocalTransaction((tx) => cardioService.updateWorkoutCardioInterval(otherInterval, tx, f.userId)).then(() => false, () => true);
      const rejectedRoundDirect = await withLocalTransaction((tx) => circuitService.updateWorkoutCircuitRound(otherRound, tx, f.userId)).then(() => false, () => true);
      ensure(!deniedCardio.success && !deniedInterval.success && !deniedRound.success &&
        !deniedCardioDelete.success && !deniedIntervalDelete.success && !deniedRoundDelete.success &&
        rejectedCardioDirect && rejectedIntervalDirect && rejectedRoundDirect,
        "A cross-account cardio or circuit mutation was accepted.");

      const deniedMixed = await workoutService.updateWorkout(
        f.userId,
        f.workoutId,
        emptyChanges({
          workout: { name: "Should roll back" },
          exercisesToUpdate: [{ ...otherExercise, workout_id: otherWorkoutId }],
        }),
      );
      ensure(!deniedMixed.success, "Mixed owned and foreign child mutation was accepted.");
      await assertDeniedStateUnchanged("Denied cross-account mutation");

      const authorizedWorkout = await workoutService.updateWorkout(
        f.userId, f.workoutId, emptyChanges({ workout: { name: "Authorized owner update" } }),
      );
      ensure(authorizedWorkout.success, `Authorized workout update failed: ${authorizedWorkout.error ?? "unknown"}`);
      const authorizedSet = await setService.insertSet(f.userId, {
        id: `${ownExerciseId}-set`, workout_exercise_id: ownExerciseId, reps: 5,
        is_warmup: 0, is_max: 0, set_order: 1,
      });
      ensure(authorizedSet.success, `Authorized set insert failed: ${authorizedSet.error ?? "unknown"}`);
      const queueAfterAuthorized = await database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM sync_queue WHERE user_id = ? AND synced = 0`, [f.userId],
      );
      ensure((queueAfterAuthorized?.count ?? 0) === 2, "Authorized mutations did not create exactly their expected queue rows.");
      const authorizedWorkoutRow = await database.getFirstAsync<{ name: string }>(
        `SELECT name FROM workouts WHERE id = ? AND user_id = ?`, [f.workoutId, f.userId],
      );
      ensure(authorizedWorkoutRow?.name === "Authorized owner update", "Authorized owner mutation did not commit.");
    } finally {
      await database.runAsync(`DELETE FROM sync_queue WHERE user_id = ?`, [otherUserId]);
      await database.runAsync(`DELETE FROM exercise_sets WHERE workout_exercise_id IN (?, ?, ?)`, [otherExerciseId, otherExercise2Id, ownExerciseId]);
      await database.runAsync(`DELETE FROM cardio_intervals WHERE cardio_entry_id = ?`, [otherCardioId]);
      await database.runAsync(`DELETE FROM cardio_entries WHERE id = ?`, [otherCardioId]);
      await database.runAsync(`DELETE FROM workout_exercises WHERE workout_id IN (?, ?)`, [otherWorkoutId, f.workoutId]);
      await database.runAsync(`DELETE FROM circuit_rounds WHERE id = ?`, [otherRoundId]);
      await database.runAsync(`DELETE FROM workouts WHERE id = ?`, [otherWorkoutId]);
      await database.runAsync(`DELETE FROM profiles WHERE id = ?`, [otherUserId]);
      await database.runAsync(`DELETE FROM sync_queue WHERE user_id = ?`, [f.userId]);
    }
  }));

  results.push(await runCase("OWNERSHIP 2 - workout queue cleanup is scoped to its owner", async (database, f) => {
    const token = Crypto.randomUUID().replace(/-/g, "");
    const otherUserId = `dev-purge-user-${token}`;
    const childId = `dev-purge-child-${token}`;
    try {
      await database.runAsync(`INSERT INTO profiles (id) VALUES (?)`, [otherUserId]);
      await database.runAsync(
        `INSERT INTO workout_exercises (id, workout_id, exercise_name, valid_units, exercise_order)
         VALUES (?, ?, 'Purge fixture exercise', '[]', 1)`, [childId, f.workoutId],
      );
      for (const userId of [f.userId, otherUserId]) {
        await database.runAsync(
          `INSERT INTO sync_queue (user_id, table_name, record_id, operation, data, synced)
           VALUES (?, 'workout_exercises', ?, 'insert', ?, 0)`,
          [userId, childId, JSON.stringify({ id: childId, workout_id: f.workoutId })],
        );
      }
      const deleted = await workoutService.deleteWorkout(f.userId, f.workoutId);
      ensure(deleted.success, `Owner workout delete failed: ${deleted.error ?? "unknown"}`);
      const ownerChildQueue = await database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM sync_queue WHERE user_id = ? AND table_name = 'workout_exercises' AND record_id = ?`,
        [f.userId, childId],
      );
      const otherChildQueue = await database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM sync_queue WHERE user_id = ? AND table_name = 'workout_exercises' AND record_id = ?`,
        [otherUserId, childId],
      );
      ensure((ownerChildQueue?.count ?? 0) === 0, "Owner's pending child queue row was not purged.");
      ensure((otherChildQueue?.count ?? 0) === 1, "Another user's queue row was purged.");
      const workout = await database.getFirstAsync(`SELECT id FROM workouts WHERE id = ?`, [f.workoutId]);
      ensure(!workout, "Owned workout remained after delete.");
    } finally {
      await database.runAsync(`DELETE FROM sync_queue WHERE user_id IN (?, ?)`, [f.userId, otherUserId]);
      await database.runAsync(`DELETE FROM workout_exercises WHERE id = ?`, [childId]);
      await database.runAsync(`DELETE FROM workouts WHERE id = ?`, [f.workoutId]);
      await database.runAsync(`DELETE FROM profiles WHERE id = ?`, [otherUserId]);
    }
  }));

  return results;
}
