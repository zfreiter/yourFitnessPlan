/**
 * Temporary, development-only verification of local SQLite/outbox atomicity.
 * This module uses fixture-scoped SQLite triggers and never starts sync.
 */
import * as Crypto from "expo-crypto";
import { SQLiteDatabase } from "expo-sqlite";
import { workoutService } from "@/services/workoutService";
import { WorkoutChanges } from "@/utils/workoutChangeUtils";
import { getDB } from "@/services/database";

const TRIGGER_PREFIX = "dev_txn_verify_";

interface Fixture {
  userId: string;
  workoutId: string;
  exerciseId: string;
  setId: string;
  cardioId: string;
  intervalId: string;
  roundId: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  detail: string;
}

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function sameRows(first: unknown[], second: unknown[]): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function changes(overrides: Partial<WorkoutChanges>): WorkoutChanges {
  return {
    exercisesToInsert: [],
    exercisesToUpdate: [],
    exerciseIdsToDelete: [],
    setsToInsert: [],
    setsToUpdate: [],
    setIdsToDelete: [],
    cardioEntriesToInsert: [],
    cardioEntriesToUpdate: [],
    cardioEntryIdsToDelete: [],
    cardioIntervalsToInsert: [],
    cardioIntervalsToUpdate: [],
    cardioIntervalIdsToDelete: [],
    circuitRoundsToInsert: [],
    circuitRoundsToUpdate: [],
    circuitRoundIdsToDelete: [],
    ...overrides,
  };
}

function createFixture(): Fixture {
  const token = Crypto.randomUUID().replace(/-/g, "");
  return {
    userId: `dev-txn-user-${token}`,
    workoutId: `dev-txn-workout-${token}`,
    exerciseId: `dev-txn-exercise-${token}`,
    setId: `dev-txn-set-${token}`,
    cardioId: `dev-txn-cardio-${token}`,
    intervalId: `dev-txn-interval-${token}`,
    roundId: `dev-txn-round-${token}`,
  };
}

async function seedFixture(
  db: SQLiteDatabase,
  fixture: Fixture,
): Promise<void> {
  await db.runAsync(`INSERT INTO profiles (id) VALUES (?)`, [fixture.userId]);
  await db.runAsync(
    `INSERT INTO workouts
      (id, user_id, name, description, type, scheduled_datetime, duration)
     VALUES (?, ?, ?, ?, 'strength', '2035-01-01T09:00:00.000Z', 30)`,
    [fixture.workoutId, fixture.userId, "Transaction fixture", "before"],
  );
  await db.runAsync(
    `INSERT INTO workout_exercises
      (id, workout_id, exercise_name, valid_units, exercise_order)
     VALUES (?, ?, 'Fixture exercise', '[]', 1)`,
    [fixture.exerciseId, fixture.workoutId],
  );
  await db.runAsync(
    `INSERT INTO exercise_sets
      (id, workout_exercise_id, reps, weight, set_order)
     VALUES (?, ?, 5, 20, 1)`,
    [fixture.setId, fixture.exerciseId],
  );
  await db.runAsync(
    `INSERT INTO cardio_entries
      (id, workout_id, activity, mode, entry_order)
     VALUES (?, ?, 'run', 'intervals', 1)`,
    [fixture.cardioId, fixture.workoutId],
  );
  await db.runAsync(
    `INSERT INTO cardio_intervals
      (id, cardio_entry_id, interval_order, work_duration, rest_duration)
     VALUES (?, ?, 1, 60, 30)`,
    [fixture.intervalId, fixture.cardioId],
  );
  await db.runAsync(
    `INSERT INTO circuit_rounds
      (id, workout_id, round_number, rest_after_round)
     VALUES (?, ?, 1, 90)`,
    [fixture.roundId, fixture.workoutId],
  );
}

async function seedPendingChildQueue(
  db: SQLiteDatabase,
  fixture: Fixture,
): Promise<void> {
  const pending = [
    [
      "workout_exercises",
      fixture.exerciseId,
      { id: fixture.exerciseId, workout_id: fixture.workoutId },
    ],
    [
      "exercise_sets",
      fixture.setId,
      { id: fixture.setId, workout_exercise_id: fixture.exerciseId },
    ],
    [
      "cardio_entries",
      fixture.cardioId,
      { id: fixture.cardioId, workout_id: fixture.workoutId },
    ],
    [
      "cardio_intervals",
      fixture.intervalId,
      { id: fixture.intervalId, cardio_entry_id: fixture.cardioId },
    ],
    [
      "circuit_rounds",
      fixture.roundId,
      { id: fixture.roundId, workout_id: fixture.workoutId },
    ],
  ] as const;

  for (const [tableName, recordId, data] of pending) {
    await db.runAsync(
      `INSERT INTO sync_queue (user_id, table_name, record_id, operation, data, synced)
       VALUES (?, ?, ?, 'insert', ?, 0)`,
      [fixture.userId, tableName, recordId, JSON.stringify(data)],
    );
  }
}

async function installFailureTrigger(
  db: SQLiteDatabase,
  fixture: Fixture,
  tableName: string,
  recordId: string,
  operation: "insert" | "update" | "delete",
): Promise<string> {
  const triggerName = `${TRIGGER_PREFIX}${Crypto.randomUUID().replace(/-/g, "")}`;
  // A main-schema trigger is required because Expo's exclusive transaction
  // runs on a separate SQLite connection; TEMP triggers are connection-local.
  await db.execAsync(`
    CREATE TRIGGER "${triggerName}"
    BEFORE INSERT ON sync_queue
    WHEN NEW.user_id = '${fixture.userId}'
      AND NEW.table_name = '${tableName}'
      AND NEW.record_id = '${recordId}'
      AND NEW.operation = '${operation}'
    BEGIN
      SELECT RAISE(ABORT, 'forced development transaction verification failure');
    END;
  `);
  return triggerName;
}

async function dropVerificationTriggers(db: SQLiteDatabase): Promise<void> {
  const triggers = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master
     WHERE type = 'trigger' AND name LIKE '${TRIGGER_PREFIX}%'`,
  );
  for (const { name } of triggers) {
    // Names are generated by this module from a fixed prefix and UUID hex.
    await db.execAsync(`DROP TRIGGER IF EXISTS "${name}"`);
  }
}

async function cleanupFixture(
  db: SQLiteDatabase,
  fixture: Fixture,
): Promise<void> {
  await db.runAsync(`DELETE FROM sync_queue WHERE user_id = ?`, [
    fixture.userId,
  ]);
  await db.runAsync(`DELETE FROM profiles WHERE id = ?`, [fixture.userId]);
}

async function queueRowsForFixture(
  db: SQLiteDatabase,
  fixture: Fixture,
): Promise<Record<string, unknown>[]> {
  return db.getAllAsync<Record<string, unknown>>(
    `SELECT user_id, table_name, record_id, operation, data, synced
     FROM sync_queue WHERE user_id = ? ORDER BY table_name, record_id, operation, data`,
    [fixture.userId],
  );
}

async function localRowsForFixture(
  db: SQLiteDatabase,
  fixture: Fixture,
): Promise<Record<string, unknown>[]> {
  const workout = await db.getAllAsync<Record<string, unknown>>(
    `SELECT id, name, description, type, duration FROM workouts WHERE id = ?`,
    [fixture.workoutId],
  );
  const exercise = await db.getAllAsync<Record<string, unknown>>(
    `SELECT id, workout_id, exercise_name, exercise_order
     FROM workout_exercises WHERE id = ?`,
    [fixture.exerciseId],
  );
  const sets = await db.getAllAsync<Record<string, unknown>>(
    `SELECT id, workout_exercise_id, reps, weight, set_order
     FROM exercise_sets WHERE id = ?`,
    [fixture.setId],
  );
  const cardio = await db.getAllAsync<Record<string, unknown>>(
    `SELECT id, workout_id, activity, mode FROM cardio_entries WHERE id = ?`,
    [fixture.cardioId],
  );
  const intervals = await db.getAllAsync<Record<string, unknown>>(
    `SELECT id, cardio_entry_id, interval_order, work_duration, rest_duration
     FROM cardio_intervals WHERE id = ?`,
    [fixture.intervalId],
  );
  const rounds = await db.getAllAsync<Record<string, unknown>>(
    `SELECT id, workout_id, round_number, rest_after_round
     FROM circuit_rounds WHERE id = ?`,
    [fixture.roundId],
  );
  return [...workout, ...exercise, ...sets, ...cardio, ...intervals, ...rounds];
}

async function runCase(
  name: string,
  test: (db: SQLiteDatabase, fixture: Fixture) => Promise<void>,
): Promise<TestResult> {
  const db = await getDB();
  const fixture = createFixture();
  try {
    await seedFixture(db, fixture);
    await test(db, fixture);
    return { name, passed: true, detail: "All SQLite assertions passed." };
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    try {
      await dropVerificationTriggers(db);
    } finally {
      await cleanupFixture(db, fixture);
    }
  }
}

export async function runDevTransactionVerification(): Promise<TestResult[]> {
  if (!__DEV__)
    throw new Error("Transaction verification is development-only.");

  const db = await getDB();
  const results: TestResult[] = [];

  try {
    // Remove a matching trigger left behind if a prior development run was killed.
    await dropVerificationTriggers(db);

    const foreignKeyReport: Record<string, unknown> = {
      mainConnection: await db.getFirstAsync<{ foreign_keys: number }>(
        "PRAGMA foreign_keys",
      ),
    };
    const schemaForeignKeys: Record<string, unknown> = {};
    for (const table of [
      "workout_exercises",
      "exercise_sets",
      "cardio_entries",
      "cardio_intervals",
      "circuit_rounds",
    ]) {
      schemaForeignKeys[table] = await db.getAllAsync(
        `PRAGMA foreign_key_list(${table})`,
      );
    }
    foreignKeyReport.schema = schemaForeignKeys;

    await db.withExclusiveTransactionAsync(async (transaction) => {
      foreignKeyReport.exclusiveTransactionConnection =
        await transaction.getFirstAsync<{ foreign_keys: number }>(
          "PRAGMA foreign_keys",
        );
    });
    results.push({
      name: "SQLite foreign-key diagnostic (informational)",
      passed: true,
      detail: JSON.stringify(foreignKeyReport),
    });

    results.push(
      await runCase(
        "TEST 1 — successful workout update",
        async (database, fixture) => {
          const beforeLocal = await localRowsForFixture(database, fixture);
          const beforeQueue = await queueRowsForFixture(database, fixture);
          const result = await workoutService.updateWorkout(
            fixture.userId,
            fixture.workoutId,
            changes({
              workout: { name: "Committed fixture update" },
              exercisesToUpdate: [
                {
                  id: fixture.exerciseId,
                  workout_id: fixture.workoutId,
                  exercise_name: "Committed exercise update",
                  validUnits: [],
                  exercise_order: 1,
                  sets: [],
                } as never,
              ],
              setsToUpdate: [
                {
                  id: fixture.setId,
                  workout_exercise_id: fixture.exerciseId,
                  reps: 8,
                  weight: 20,
                  set_order: 1,
                  is_warmup: 0,
                  is_max: 0,
                },
              ],
            }),
          );
          ensure(
            result.success,
            `updateWorkout failed: ${result.error ?? "unknown error"}`,
          );

          const afterLocal = await localRowsForFixture(database, fixture);
          const afterQueue = await queueRowsForFixture(database, fixture);
          ensure(
            beforeLocal[0]?.name !== afterLocal[0]?.name,
            "Workout name did not commit.",
          );
          ensure(
            afterLocal[1]?.exercise_name === "Committed exercise update",
            "Exercise update did not commit.",
          );
          ensure(afterLocal[2]?.reps === 8, "Set update did not commit.");
          ensure(
            afterQueue.length - beforeQueue.length === 3,
            "Expected exactly three new queue rows.",
          );
          for (const [tableName, recordId] of [
            ["workouts", fixture.workoutId],
            ["workout_exercises", fixture.exerciseId],
            ["exercise_sets", fixture.setId],
          ]) {
            const rows = await database.getAllAsync<{ count: number }>(
              `SELECT COUNT(*) AS count FROM sync_queue
           WHERE user_id = ? AND table_name = ? AND record_id = ? AND operation = 'update' AND synced = 0`,
              [fixture.userId, tableName, recordId],
            );
            ensure(
              rows[0]?.count === 1,
              `Expected one queue row for ${tableName}/${recordId}.`,
            );
          }
          ensure(
            afterLocal.length === beforeLocal.length,
            "Unexpected local row count change.",
          );
        },
      ),
    );

    results.push(
      await runCase(
        "TEST 2 — workout queue failure rolls back local update",
        async (database, fixture) => {
          const beforeLocal = await localRowsForFixture(database, fixture);
          const beforeQueue = await queueRowsForFixture(database, fixture);
          const trigger = await installFailureTrigger(
            database,
            fixture,
            "workouts",
            fixture.workoutId,
            "update",
          );
          try {
            const result = await workoutService.updateWorkout(
              fixture.userId,
              fixture.workoutId,
              changes({ workout: { name: "Must roll back" } }),
            );
            ensure(
              !result.success,
              "updateWorkout unexpectedly succeeded despite the forced queue failure.",
            );
          } finally {
            await database.execAsync(`DROP TRIGGER IF EXISTS "${trigger}"`);
          }
          ensure(
            sameRows(await localRowsForFixture(database, fixture), beforeLocal),
            "Local rows changed after rollback.",
          );
          ensure(
            sameRows(await queueRowsForFixture(database, fixture), beforeQueue),
            "Queue rows changed after rollback.",
          );
        },
      ),
    );

    results.push(
      await runCase(
        "TEST 3 — later queue failure rolls back earlier writes",
        async (database, fixture) => {
          const beforeLocal = await localRowsForFixture(database, fixture);
          const beforeQueue = await queueRowsForFixture(database, fixture);
          const trigger = await installFailureTrigger(
            database,
            fixture,
            "exercise_sets",
            fixture.setId,
            "update",
          );
          try {
            const result = await workoutService.updateWorkout(
              fixture.userId,
              fixture.workoutId,
              changes({
                workout: { name: "Must all roll back" },
                exercisesToUpdate: [
                  {
                    id: fixture.exerciseId,
                    workout_id: fixture.workoutId,
                    exercise_name: "Must also roll back",
                    validUnits: [],
                    exercise_order: 2,
                    sets: [],
                  } as never,
                ],
                setsToUpdate: [
                  {
                    id: fixture.setId,
                    workout_exercise_id: fixture.exerciseId,
                    reps: 12,
                    weight: 20,
                    set_order: 1,
                    is_warmup: 0,
                    is_max: 0,
                  },
                ],
              }),
            );
            ensure(
              !result.success,
              "updateWorkout unexpectedly succeeded despite the later forced queue failure.",
            );
          } finally {
            await database.execAsync(`DROP TRIGGER IF EXISTS "${trigger}"`);
          }
          ensure(
            sameRows(await localRowsForFixture(database, fixture), beforeLocal),
            "One or more local changes escaped rollback.",
          );
          ensure(
            sameRows(await queueRowsForFixture(database, fixture), beforeQueue),
            "Earlier queue rows escaped rollback.",
          );
        },
      ),
    );

    results.push(
      await runCase(
        "TEST 4 — workout deletion commits purge and delete",
        async (database, fixture) => {
          await seedPendingChildQueue(database, fixture);
          const childQueueBefore = await queueRowsForFixture(database, fixture);
          const result = await workoutService.deleteWorkout(
            fixture.userId,
            fixture.workoutId,
          );
          ensure(
            result.success,
            `deleteWorkout failed: ${result.error ?? "unknown error"}`,
          );

          const localAfter = await localRowsForFixture(database, fixture);
          ensure(
            localAfter.length === 0,
            `Workout or child rows remain after deletion: ${JSON.stringify(localAfter)}`,
          );
          const queueAfter = await queueRowsForFixture(database, fixture);
          ensure(
            queueAfter.length === 1,
            "Expected only the workout delete queue row after child purge.",
          );
          ensure(
            queueAfter[0]?.table_name === "workouts" &&
              queueAfter[0]?.record_id === fixture.workoutId &&
              queueAfter[0]?.operation === "delete",
            "The remaining queue row is not the expected workout delete.",
          );
          ensure(
            childQueueBefore.length === 5,
            "Delete fixture did not seed all five child queue rows.",
          );
        },
      ),
    );

    results.push(
      await runCase(
        "TEST 5 — failed workout deletion rolls everything back",
        async (database, fixture) => {
          await seedPendingChildQueue(database, fixture);
          const beforeLocal = await localRowsForFixture(database, fixture);
          const beforeQueue = await queueRowsForFixture(database, fixture);
          const trigger = await installFailureTrigger(
            database,
            fixture,
            "workouts",
            fixture.workoutId,
            "delete",
          );
          try {
            const result = await workoutService.deleteWorkout(
              fixture.userId,
              fixture.workoutId,
            );
            ensure(
              !result.success,
              "deleteWorkout unexpectedly succeeded despite the forced queue failure.",
            );
          } finally {
            await database.execAsync(`DROP TRIGGER IF EXISTS "${trigger}"`);
          }
          ensure(
            sameRows(await localRowsForFixture(database, fixture), beforeLocal),
            "Workout or children were not restored after rollback.",
          );
          ensure(
            sameRows(await queueRowsForFixture(database, fixture), beforeQueue),
            "Pending queue cleanup was not rolled back.",
          );
        },
      ),
    );
  } finally {
    await dropVerificationTriggers(db);
  }

  return results;
}
