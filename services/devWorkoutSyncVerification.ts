/** Development-only verification of workout pull and refresh behavior. */
import * as Crypto from "expo-crypto";
import { SupabaseClient } from "@supabase/supabase-js";
import { SQLiteDatabase } from "expo-sqlite";
import { Workout } from "@/types/interfaces/types";
import { getDB } from "@/services/database";
import { META_KEYS } from "@/utils/appMeta";
import { syncService } from "@/services/syncService";
import { workoutService } from "@/services/workoutService";

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
  writeError?: (table: string, operation: string, payload: unknown) => unknown;
  writes?: Array<{ table: string; operation: string; payload: unknown }>;
}

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
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
      const builder: any = {
        select() {
          operation = "select";
          return builder;
        },
        eq() {
          return builder;
        },
        order() {
          return builder;
        },
        range() {
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
            return Promise.resolve({
              data: options.rows ?? [],
              error: options.fetchError ?? null,
            }).then(resolve, reject);
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

async function setMeta(db: SQLiteDatabase, value: string | null): Promise<void> {
  if (value == null) {
    await db.runAsync(`DELETE FROM app_meta WHERE key = ?`, [META_KEYS.WORKOUTS_SYNCED_AT]);
  } else {
    await db.runAsync(
      `INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)`,
      [META_KEYS.WORKOUTS_SYNCED_AT, value],
    );
  }
}

async function getMeta(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_meta WHERE key = ?`,
    [META_KEYS.WORKOUTS_SYNCED_AT],
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
    await setMeta(database, timestamp);
    let failed = false;
    try {
      await syncService.pullFromSupabase(fakeSupabase({ fetchError: new Error("forced fetch failure") }), f.userId);
    } catch {
      failed = true;
    }
    ensure(failed, "Network fetch error was swallowed.");
    ensure(JSON.stringify(await localRows(database, f)) === JSON.stringify(before), "Local rows changed after failed fetch.");
    ensure((await getMeta(database)) === timestamp, "Timestamp changed after failed fetch.");
  }));

  results.push(await runCase("SYNC 3 — invalid parent mapping fails before local writes", async (database, f) => {
    const before = await localRows(database, f);
    const timestamp = `sync-fixture-before-${f.userId}`;
    await setMeta(database, timestamp);
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
    ensure((await getMeta(database)) === timestamp, "Timestamp changed after mapping failure.");
  }));

  results.push(await runCase("SYNC 4 — failed local write rolls back the pull and timestamp", async (database, f) => {
    const before = await localRows(database, f);
    const timestamp = `sync-fixture-before-${f.userId}`;
    await setMeta(database, timestamp);
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
    ensure((await getMeta(database)) === timestamp, "Timestamp changed after failed local write.");
  }));

  results.push(await runCase("SYNC 5 — empty successful pull records completion", async (database, f) => {
    const sentinel = `sync-fixture-before-${f.userId}`;
    await setMeta(database, sentinel);
    await syncService.pullFromSupabase(fakeSupabase({ rows: [] }), f.userId);
    ensure((await localRows(database, f)).length === 1, "Empty pull changed the existing local workout.");
    const timestamp = await getMeta(database);
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
    await setMeta(database, timestamp);
    const result = await syncService.refreshWorkouts(fakeSupabase({ fetchError: new Error("forced refresh fetch failure") }), f.userId);
    ensure(!result.success, "Refresh succeeded despite a failed fetch.");
    ensure(result.error?.includes("forced refresh fetch failure"), `Refresh failed for an unexpected reason: ${result.error ?? "unknown error"}`);
    ensure(JSON.stringify(await localRows(database, f)) === JSON.stringify(beforeRows), "Failed refresh changed local workout data.");
    ensure((await getMeta(database)) === timestamp, "Failed refresh changed the timestamp.");
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
    } as Workout);
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

  return results;
}
