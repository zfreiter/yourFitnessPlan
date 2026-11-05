import { inspectDevWorkoutDeletion } from "../devWorkoutDeletionInspection";
import NetInfo from "@react-native-community/netinfo";
import { createRequire } from "module";
import { inspectDevWorkoutSync, runDevWorkoutSyncVerification } from "../devWorkoutSyncVerification";
import { runDevTransactionVerification } from "../devTransactionVerification";
import { SCHEMA_STATEMENTS } from "../schema";
import { getDB } from "../database";
import { workoutService } from "../workoutService";
import { syncService } from "../syncService";
import { buildWorkoutChanges } from "@/utils/workoutChangeUtils";
import { Workout } from "@/types/interfaces/types";

jest.mock("@react-native-community/netinfo", () => ({ fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }) }));

jest.mock("../database", () => ({ getDB: jest.fn() }));
jest.mock("expo-crypto", () => ({ randomUUID: () => require("crypto").randomUUID() }));

// Run production SQL and transactions with foreign keys enabled, without a native emulator.
const { DatabaseSync } = createRequire(__filename)("node:sqlite");
function database(filename = ":memory:") {
  const sqlite = new DatabaseSync(filename);
  SCHEMA_STATEMENTS.forEach(sql => sqlite.exec(sql));
  sqlite.exec("PRAGMA foreign_keys=ON");
  const db: any = {
    execAsync: async (sql: string) => sqlite.exec(sql),
    runAsync: async (sql: string, values: any[] = []) => { const result = sqlite.prepare(sql).run(...values); return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) }; },
    getFirstAsync: async (sql: string, values: any[] = []) => sqlite.prepare(sql).get(...values) ?? null,
    getAllAsync: async (sql: string, values: any[] = []) => sqlite.prepare(sql).all(...values),
    withExclusiveTransactionAsync: async (task: any) => { sqlite.exec("BEGIN"); try { await task(db); sqlite.exec("COMMIT"); } catch (error) { sqlite.exec("ROLLBACK"); throw error; } },
  };
  let closed = false;
  return { db, close: () => { if (!closed) { closed = true; sqlite.close(); } } };
}
function fixture(): Workout {
  return {
    id: "workout", user_id: "user", name: "Disposable circuit", workoutType: "circuit", scheduled_datetime: "2030-04-07T17:35:00.000Z", duration: 20, is_completed: 0, completed_at: null,
    circuit_rounds: [{ id: "round", workout_id: "workout", round_number: 3, rest_after_round: 60, notes: "Round notes" }],
    exercises: [{ id: "exercise", workout_id: "workout", exercise_id: "catalog", exercise_name: "Movement", exercise_order: 1, group_id: "round", group_type: "circuit", round_number: 3, validUnits: ["reps"], sets: [{ id: "set", workout_exercise_id: "exercise", reps: 12, set_order: 1, is_warmup: 0, is_max: 0 }] }],
    cardio_entries: [{ id: "cardio", workout_id: "workout", activity: "sprint", mode: "intervals", entry_order: 1, is_finisher: 0, calories: 50, heart_rate_avg: 150, intervals: [{ id: "interval", cardio_entry_id: "cardio", interval_order: 1, work_duration: 30, rest_duration: 60 }] }],
  };
}
function remote() {
  const tables: Record<string, Record<string, any>> = {};
  const failures = new Map<string, any>();
  const writes: Array<[string, string]> = [];
  const client: any = { from: (table: string) => {
    tables[table] ??= {};
    const write = async (data: any, update = false) => {
      writes.push([table, data.id]);
      if (failures.has(table)) return { error: failures.get(table) };
      if (!update && tables[table][data.id]) return { error: { code: "23505", message: "Duplicate key" } };
      const parent = ({ circuit_rounds: ["workouts", "workout_id"], workout_exercises: ["workouts", "workout_id"], exercise_sets: ["workout_exercises", "workout_exercise_id"], cardio_entries: ["workouts", "workout_id"], cardio_intervals: ["cardio_entries", "cardio_entry_id"] } as Record<string, string[]>)[table];
      if (parent && !tables[parent[0]]?.[data[parent[1]]]) return { error: { code: "23503", message: "Missing parent" } };
      if (data.circuit_id && !tables.circuit_rounds?.[data.circuit_id]) return { error: { code: "23503", message: "Missing circuit" } };
      tables[table][data.id] = { ...tables[table][data.id], ...data };
      return { error: null };
    };
    return {
      insert: (data: any) => write(data), update: (data: any) => ({ eq: () => write(data, true) }),
      delete: () => {
        const filters: Record<string, unknown> = {};
        const query: any = {
          eq: (key: string, value: unknown) => { filters[key] = value; return query; },
          select: async () => {
            writes.push([table, String(filters.id)]);
            if (failures.has(table)) return { data: null, error: failures.get(table) };
            const row = tables[table][String(filters.id)];
            if (!row || Object.entries(filters).some(([key, value]) => row[key] !== value)) return { data: [], error: null };
            delete tables[table][String(filters.id)];
            return { data: [{ id: row.id }], error: null };
          },
        };
        return query;
      },
      select: () => {
        let key: string, value: any;
        const rows = () => Object.values(tables[table]).filter(row => !key || row[key] === value);
        const query: any = {
          eq: (field: string, expected: any) => { key = field; value = expected; return query; },
          order: () => query,
          limit: async () => ({ data: rows(), error: null }),
          range: async () => ({ data: rows().map(row => ({ ...row,
            circuit_rounds: Object.values(tables.circuit_rounds ?? {}).filter(child => child.workout_id === row.id),
            workout_exercises: Object.values(tables.workout_exercises ?? {}).filter(child => child.workout_id === row.id).map(exercise => ({ ...exercise, exercise_sets: Object.values(tables.exercise_sets ?? {}).filter(set => set.workout_exercise_id === exercise.id) })),
            cardio_entries: Object.values(tables.cardio_entries ?? {}).filter(child => child.workout_id === row.id).map(entry => ({ ...entry, cardio_intervals: Object.values(tables.cardio_intervals ?? {}).filter(interval => interval.cardio_entry_id === entry.id) })),
          })), error: null }),
        };
        return query;
      },
    };
  } };
  return { client, tables, failures, writes };
}
let local: ReturnType<typeof database>;
const opened: Array<ReturnType<typeof database>> = [];
async function connect() {
  local = database(); opened.push(local);
  jest.mocked(getDB).mockResolvedValue(local.db);
  await local.db.runAsync("INSERT INTO profiles (id) VALUES (?)", ["user"]);
  await local.db.runAsync("INSERT INTO exercises (id, name) VALUES (?, ?)", ["catalog", "Movement"]);
  return local;
}
beforeEach(connect);
afterEach(() => opened.splice(0).forEach(item => item.close()));
const pending = () => local.db.getAllAsync("SELECT * FROM sync_queue WHERE synced=0 ORDER BY id");
async function save() { expect((await workoutService.insertWorkout(fixture(), "user")).success).toBe(true); }

it("creates every circuit row and queue entry atomically, preserves the date, and reopens edits", async () => {
  await save();
  const reopened = (await workoutService.getWorkoutById("user", "workout"))!;
  expect(reopened.scheduled_datetime).toBe(fixture().scheduled_datetime);
  expect(reopened.exercises[0]).toMatchObject({ circuit_id: "round", group_id: "round", round_number: 3 });
  expect((await pending()).map((row: any) => row.table_name).sort()).toEqual(["workouts", "circuit_rounds", "workout_exercises", "exercise_sets", "cardio_entries", "cardio_intervals"].sort());
  const edited = { ...reopened, name: "Edited circuit" };
  expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(reopened, edited))).success).toBe(true);
  expect((await workoutService.getWorkoutById("user", "workout"))?.scheduled_datetime).toBe(fixture().scheduled_datetime);
  const dated = { ...edited, scheduled_datetime: "2031-05-06 15:45" };
  expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(edited, dated))).success).toBe(true);
  expect((await workoutService.getWorkoutById("user", "workout"))?.scheduled_datetime).toBe("2031-05-06T15:45");
});
it("pushes and pulls every relationship and the scheduled date", async () => {
  await save(); const server = remote();
  expect(await syncService.pushToSupabase("user", server.client)).toEqual({ success: true });
  expect(server.writes.map(([table]) => table)).toEqual(["workouts", "circuit_rounds", "workout_exercises", "exercise_sets", "cardio_entries", "cardio_intervals"]);
  expect(server.tables.workout_exercises.exercise).toMatchObject({ circuit_id: "round", group_id: "round", round_number: 3 });
  expect(server.tables.workouts.workout.scheduled_datetime).toBe(fixture().scheduled_datetime);
  const expected = await workoutService.getWorkoutById("user", "workout");
  await connect();
  await syncService.pullFromSupabase(server.client, "user");
  expect(await workoutService.getWorkoutById("user", "workout")).toEqual(expected);
});
it.each(["workouts", "circuit_rounds", "workout_exercises", "exercise_sets"])("keeps failed %s uploads and their dependents pending and retries safely", async table => {
  await save(); const server = remote();
  server.failures.set(table, { code: "42501", message: "RLS rejected disposable write" });
  const first = await syncService.pushToSupabase("user", server.client);
  expect(first.success).toBe(false); expect(first.error).toContain("RLS rejected");
  expect((await pending()).some((row: any) => row.table_name === table)).toBe(true);
  if (table === "circuit_rounds") expect(server.tables.workout_exercises).toBeUndefined();
  if (table === "workout_exercises") expect(server.tables.exercise_sets).toBeUndefined();
  server.failures.clear();
  expect(await syncService.pushToSupabase("user", server.client)).toEqual({ success: true });
  expect(await pending()).toHaveLength(0);
  expect(Object.keys(server.tables.exercise_sets)).toEqual(["set"]);
});
it("verifies retry duplicates including PostgreSQL timestamp formatting", async () => {
  await save(); const server = remote();
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  server.tables.workouts.workout.scheduled_datetime = "2030-04-07T17:35:00+00:00";
  await local.db.runAsync("UPDATE sync_queue SET synced=0 WHERE table_name='workouts'");
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  expect(await pending()).toHaveLength(0);
});
it("keeps mismatched duplicate records pending", async () => {
  await save(); const server = remote();
  await syncService.pushToSupabase("user", server.client);
  server.tables.workout_exercises.exercise.exercise_name = "Conflicting remote value";
  await local.db.runAsync("UPDATE sync_queue SET synced=0 WHERE table_name='workout_exercises'");
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(false);
  expect(await pending()).toHaveLength(1);
});
it("does not refresh over failed pending changes", async () => {
  await save(); const server = remote(); server.failures.set("circuit_rounds", { code: "23503", message: "Foreign key failure" });
  const before = await workoutService.getWorkoutById("user", "workout");
  const result = await syncService.refreshWorkouts(server.client, "user");
  expect(result.success).toBe(false);
  expect(result.error).toContain("Foreign key failure");
  expect(await workoutService.getWorkoutById("user", "workout")).toEqual(before);
  expect((await pending()).length).toBeGreaterThan(0);
});
it.each(["", "invalid", "2030-02-30T12:00"])("rejects invalid new dates atomically: %s", async scheduled_datetime => {
  expect((await workoutService.insertWorkout({ ...fixture(), scheduled_datetime }, "user")).success).toBe(false);
  expect(await local.db.getAllAsync("SELECT * FROM workouts")).toHaveLength(0);
  expect(await pending()).toHaveLength(0);
});
it("does not clear an orphan's queue entry as synchronized", async () => {
  await syncService.addToSyncQueueInTransaction(local.db, "user", "exercise_sets", "orphan", "insert", { id: "orphan", workout_exercise_id: "missing" });
  const server = remote();
  const result = await syncService.pushToSupabase("user", server.client);
  expect(result.success).toBe(false); expect(result.error).toContain("Missing local parent");
  expect(await pending()).toHaveLength(1);
});

it("rolls back an invalid date edit and retains the saved date and queue", async () => {
  await save();
  const before = await workoutService.getWorkoutById("user", "workout");
  const queued = await pending();
  const changes = buildWorkoutChanges(before!, { ...before!, scheduled_datetime: "invalid" });
  expect((await workoutService.updateWorkout("user", "workout", changes)).success).toBe(false);
  expect(await workoutService.getWorkoutById("user", "workout")).toEqual(before);
  expect(await pending()).toEqual(queued);
});
it("validates remote dates before writing pulled data", async () => {
  await save(); const server = remote();
  await syncService.pushToSupabase("user", server.client);
  server.tables.workouts.workout.scheduled_datetime = "invalid";
  await connect();
  await expect(syncService.pullFromSupabase(server.client, "user")).rejects.toThrow("Scheduled date");
  expect(await local.db.getAllAsync("SELECT * FROM workouts")).toHaveLength(0);
});
it("preserves pending data when changes arrive during a refresh fetch", async () => {
  await save(); const server = remote();
  const from = server.client.from;
  server.client.from = (table: string) => {
    const result = from(table);
    if (table !== "workouts") return result;
    const select = result.select;
    result.select = () => {
      const query = select(); const range = query.range;
      query.range = async () => {
        await syncService.addToSyncQueueInTransaction(local.db, "user", "workouts", "workout", "update", { id: "workout", name: "New local edit" });
        return range();
      };
      return query;
    };
    return result;
  };
  const before = await workoutService.getWorkoutById("user", "workout");
  const result = await syncService.refreshWorkouts(server.client, "user");
  expect(result.success).toBe(false);
  expect(result.error).toContain("became pending");
  expect(await workoutService.getWorkoutById("user", "workout")).toEqual(before);
  expect(await pending()).toHaveLength(1);
});

it.each([
  ["existing workout sync checks", runDevWorkoutSyncVerification],
  ["existing SQLite transaction checks", runDevTransactionVerification],
] as const)("passes %s against real SQLite", async (_name, verify) => {
  const results = await verify();
  expect(results.length).toBeGreaterThan(0);
  expect(results.filter(result => !result.passed)).toEqual([]);
});

it("inspects only record metadata without modifying SQLite or leaking workout content", async () => {
  await save();
  const rows = () => local.db.getAllAsync("SELECT * FROM sync_queue ORDER BY id");
  const before = await rows();
  const inspected = await inspectDevWorkoutSync("user", "workout");
  expect(inspected.scheduledDateValid).toBe(true);
  expect(inspected.tables.workout_exercises).toEqual([{ id: "exercise", workoutId: "workout", circuitId: "round" }]);
  expect(inspected.queue).toHaveLength(6);
  expect(await rows()).toEqual(before);
  const text = JSON.stringify(inspected);
  expect(text).not.toMatch(/Disposable circuit|Round notes|Movement|user_id|scheduled_datetime|reps/);
  expect(inspected.queue.every(row => !("data" in row))).toBe(true);
  await expect(inspectDevWorkoutSync("different-user", "workout")).rejects.toThrow("signed-in account");
});

function gate() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}
it("serializes simultaneous full syncs and direct uploads without duplicate remote writes", async () => {
  const server = remote();
  await save();
  const held = gate();
  const original = server.client.from;
  let entered = gate();
  server.client.from = (table: string) => {
    const query = original(table);
    const insert = query.insert;
    query.insert = async (data: any) => { entered.release(); await held.promise; return insert(data); };
    return query;
  };
  const first = syncService.sync(server.client, "user");
  const second = syncService.sync(server.client, "user");
  const push = syncService.pushToSupabase("user", server.client);
  await entered.promise;
  expect(syncService.isSyncActive("user")).toBe(true);
  held.release();
  await Promise.all([first, second, push]);
  expect(await pending()).toHaveLength(0);
  expect(server.writes.filter(([table]) => table === "workouts")).toHaveLength(1);
});
it("uploads a mutation committed after the active upload snapshot", async () => {
  const server = remote();
  await save();
  const held = gate(), entered = gate();
  const original = server.client.from;
  server.client.from = (table: string) => {
    const query = original(table), insert = query.insert;
    query.insert = async (data: any) => { entered.release(); await held.promise; return insert(data); };
    return query;
  };
  const first = syncService.pushToSupabase("user", server.client);
  await entered.promise;
  await syncService.addToSyncQueue("user", "workouts", "workout", "update", { id: "workout", name: "Changed during upload" });
  const second = syncService.pushToSupabase("user", server.client);
  held.release();
  expect((await first).success).toBe(true);
  expect((await second).success).toBe(true);
  expect(server.tables.workouts.workout.name).toBe("Changed during upload");
  expect(await pending()).toHaveLength(0);
});
it("retains genuine failures, then drains pending entries after reconnection", async () => {
  const server = remote();
  await save();
  server.failures.set("workouts", new Error("Network disconnected"));
  await expect(syncService.sync(server.client, "user")).rejects.toThrow("Network disconnected");
  expect((await pending()).length).toBeGreaterThan(0);
  jest.mocked(NetInfo.fetch).mockResolvedValueOnce({ isConnected: false, isInternetReachable: false } as any);
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(false);
  server.failures.clear();
  await syncService.sync(server.client, "user");
  expect(await pending()).toHaveLength(0);
  expect(Object.keys(server.tables.workouts)).toEqual(["workout"]);
});


it("shares the promise for two simultaneous sync calls", async () => {
  const server = remote();
  await save();
  const first = syncService.sync(server.client, "user");
  const second = syncService.sync(server.client, "user");
  expect(first).toBe(second);
  await first;
  expect(await pending()).toHaveLength(0);
});
it("retains queue operations when connectivity drops during a remote request", async () => {
  const server = remote();
  await save();
  const held = gate(), entered = gate();
  const original = server.client.from;
  server.client.from = (table: string) => {
    const query = original(table);
    if (table === "workouts") query.insert = async () => {
      entered.release(); await held.promise;
      return { error: new Error("Connection lost during request") };
    };
    return query;
  };
  const syncing = syncService.sync(server.client, "user");
  const rejection = expect(syncing).rejects.toThrow("Connection lost during request");
  await entered.promise;
  held.release();
  await rejection;
  expect((await pending()).length).toBeGreaterThan(0);
  expect(Object.keys(server.tables.workouts)).toHaveLength(0);
});

it("invalidates an active session without acknowledging its upload, then safely retries on re-login", async () => {
  const server = remote();
  await save();
  const held = gate(), entered = gate();
  const original = server.client.from;
  let paused = false;
  server.client.from = (table: string) => {
    const query = original(table), insert = query.insert;
    query.insert = async (data: any) => {
      const result = await insert(data);
      if (!paused) { paused = true; entered.release(); await held.promise; }
      return result;
    };
    return query;
  };
  const old = syncService.pushToSupabase("user", server.client);
  const cancellation = expect(old).rejects.toThrow("session changed");
  await entered.promise;
  syncService.invalidateUserSync("user");
  const fresh = syncService.pushToSupabase("user", server.client);
  expect(fresh).not.toBe(old);
  expect((await pending()).length).toBeGreaterThan(0);
  held.release();
  await cancellation;
  expect((await fresh).success).toBe(true);
  expect(await pending()).toHaveLength(0);
  expect(Object.keys(server.tables.workouts)).toEqual(["workout"]);
});
it("cancels an old session's queued sync before it can start", async () => {
  const server = remote();
  await save();
  const old = syncService.sync(server.client, "user");
  const cancellation = expect(old).rejects.toThrow("session changed");
  syncService.invalidateUserSync("user");
  await cancellation;
  expect(server.writes).toHaveLength(0);
  expect((await pending()).length).toBeGreaterThan(0);
  await syncService.sync(server.client, "user");
  expect(await pending()).toHaveLength(0);
});

it.each([false, true])("synchronizes locally deleted workouts (previously uploaded: %s)", async uploaded => {
  await save(); const server = remote();
  if (uploaded) expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  if (uploaded) await syncService.addToSyncQueue("user", "workouts", "workout", "update", { id: "workout", name: "Last offline edit" });
  expect((await workoutService.deleteWorkout("user", "workout")).success).toBe(true);
  expect(await workoutService.getWorkoutById("user", "workout")).toBeNull();
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  expect(await pending()).toHaveLength(0);
  expect(server.tables.workouts?.workout).toBeUndefined();
});

it("handles both reported IDs as multiple newly deleted workouts, without uploading their stale inserts", async () => {
  const ids = ["bf480eef-6ead-4965-a0af-fcd96972a40b", "55cd68e8-9616-4c52-8dcc-cfb45cd76e0f"];
  for (const id of ids) {
    expect((await workoutService.insertWorkout({ ...fixture(), id, exercises: [], cardio_entries: [], circuit_rounds: [] }, "user")).success).toBe(true);
    expect((await workoutService.deleteWorkout("user", id)).success).toBe(true);
  }
  const before = await pending(); expect(before.map((row: any) => row.operation)).toEqual(["insert", "delete", "insert", "delete"]);
  const server = remote();
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  expect(await pending()).toHaveLength(0); expect(server.writes).toHaveLength(0);
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  expect(server.writes).toHaveLength(0);
});
it("persists verified deletion ownership across closing SQLite and starting online", async () => {
  const fs = require("fs"), path = require("path"), os = require("os");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fitness-deletion-"));
  const filename = path.join(directory, "workout.db");
  const disk = database(filename); opened.push(disk); local = disk;
  jest.mocked(getDB).mockResolvedValue(disk.db);
  await local.db.runAsync("INSERT INTO profiles (id) VALUES ('user')");
  await local.db.runAsync("INSERT INTO exercises (id, name) VALUES ('catalog', 'Movement')");
  try {
    await save(); const server = remote();
    expect((await workoutService.deleteWorkout("user", "workout")).success).toBe(true);
    disk.close();
    const reopened = database(filename); opened.push(reopened); local = reopened;
    jest.mocked(getDB).mockResolvedValue(reopened.db);
    await syncService.sync(server.client, "user");
    expect(await pending()).toHaveLength(0); expect(server.writes).toHaveLength(0);
  } finally {
    opened.forEach(item => item.close());
    fs.unlinkSync(filename); fs.rmdirSync(directory);
  }
});
it("recovers an existing ID-only delete and its stale insert/update using verified remote ownership", async () => {
  await save(); const server = remote();
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  await syncService.addToSyncQueue("user", "workouts", "workout", "update", { id: "workout", name: "Old pending edit" });
  expect((await workoutService.deleteWorkout("user", "workout")).success).toBe(true);
  await local.db.runAsync("DELETE FROM app_meta WHERE key LIKE 'workout-delete-owner:%'"); // Model pre-fix entries only in disposable DB.
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  expect(server.tables.workouts.workout).toBeUndefined(); expect(await pending()).toHaveLength(0);
});
it("keeps legacy deletes without trusted evidence and never trusts payload ownership alone", async () => {
  await syncService.addToSyncQueue("user", "workouts", "legacy", "delete", { id: "legacy", user_id: "user", ownershipVerified: true });
  const server = remote(), before = await pending();
  const result = await syncService.pushToSupabase("user", server.client);
  expect(result.success).toBe(false); expect(result.error).toContain("ownership is unavailable");
  expect(await pending()).toEqual(before); expect(server.writes).toHaveLength(0);
});
it("rejects remote ownership mismatch even with a valid local receipt", async () => {
  await save(); const server = remote(); await syncService.pushToSupabase("user", server.client);
  expect((await workoutService.deleteWorkout("user", "workout")).success).toBe(true);
  server.tables.workouts.workout.user_id = "other";
  const before = await pending(), writes = server.writes.length;
  const result = await syncService.pushToSupabase("user", server.client);
  expect(result.error).toContain("Remote delete owner mismatch");
  expect(await pending()).toEqual(before); expect(server.writes).toHaveLength(writes);
});
it.each(["RLS", "network", "silent-RLS"])("retains deleted workouts after %s failure and retries idempotently", async failure => {
  await save(); const server = remote(); await syncService.pushToSupabase("user", server.client);
  expect((await workoutService.deleteWorkout("user", "workout")).success).toBe(true);
  const before = await pending();
  if (failure === "silent-RLS") {
    const from = server.client.from;
    server.client.from = (table: string) => {
      const query = from(table);
      query.delete = () => { const denied: any = { eq: () => denied, select: async () => ({ data: [], error: null }) }; return denied; };
      return query;
    };
  } else server.failures.set("workouts", { code: failure === "RLS" ? "42501" : "NETWORK", message: failure });
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(false);
  expect(await pending()).toEqual(before); expect(server.tables.workouts.workout).toBeDefined();
  server.failures.clear();
  if (failure !== "silent-RLS") {
    expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
    expect(await pending()).toHaveLength(0);
    const writes = server.writes.length;
    expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
    expect(server.writes).toHaveLength(writes);
  }
});
it("retries a delete whose remote success response was lost without recreating the workout", async () => {
  await save(); const server = remote(); await syncService.pushToSupabase("user", server.client);
  expect((await workoutService.deleteWorkout("user", "workout")).success).toBe(true);
  const from = server.client.from;
  server.client.from = (table: string) => {
    const query = from(table);
    query.delete = () => { const lost: any = { eq: () => lost, select: async () => { delete server.tables.workouts.workout; return { data: null, error: new Error("response lost") }; } }; return lost; };
    return query;
  };
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(false);
  expect((await pending()).length).toBeGreaterThan(0);
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  expect(await pending()).toHaveLength(0);
});
it("rolls back local deletion, tombstone, and receipt together if receipt persistence fails", async () => {
  await save(); const before = await pending();
  await local.db.execAsync(`CREATE TRIGGER reject_delete_receipt BEFORE INSERT ON app_meta
    WHEN NEW.key LIKE 'workout-delete-owner:%' BEGIN SELECT RAISE(ABORT, 'receipt failure'); END`);
  expect((await workoutService.deleteWorkout("user", "workout")).success).toBe(false);
  expect(await workoutService.getWorkoutById("user", "workout")).not.toBeNull();
  expect(await pending()).toEqual(before);
});

it("inspects missing-local legacy deletions read-only without leaking workout content", async () => {
  await syncService.addToSyncQueue("user", "workouts", "legacy", "delete", { id: "legacy" });
  const server = remote(); server.client.auth = { getUser: async () => ({ data: { user: { id: "user" } }, error: null }) };
  server.tables.workouts = { legacy: { id: "legacy", user_id: "user", name: "PRIVATE WORKOUT" } };
  const before = await pending();
  const result = await inspectDevWorkoutDeletion(server.client, "user", "legacy");
  expect(result.localState).toBe("absent"); expect(result.remote.state).toBe("owned");
  expect(result.queue[0]).toMatchObject({ operation: "delete", payloadContainsOwner: false, verifiedDeletionReceipt: false });
  expect(await pending()).toEqual(before); expect(server.writes).toHaveLength(0);
  expect(JSON.stringify(result)).not.toContain("PRIVATE WORKOUT");
  await expect(inspectDevWorkoutDeletion(server.client, "other", "legacy")).rejects.toThrow("Authenticated account");
});

async function secondAccount() {
  await local.db.runAsync("INSERT INTO profiles (id) VALUES (?)", ["other"]);
  const other = JSON.parse(JSON.stringify(fixture()).replace(/"workout"/g, '"other-workout"').replace(/"round"/g, '"other-round"').replace(/"exercise"/g, '"other-exercise"').replace(/"set"/g, '"other-set"').replace(/"cardio"/g, '"other-cardio"').replace(/"interval"/g, '"other-interval"'));
  other.user_id = "other";
  expect((await workoutService.insertWorkout(other, "other")).success).toBe(true);
}
it("isolates simultaneous accounts, preserves inactive queue byte-for-byte, and refreshes only the active cache", async () => {
  await save(); await secondAccount();
  const server = remote();
  const snapshot = () => local.db.getAllAsync("SELECT * FROM sync_queue WHERE user_id='user' ORDER BY id");
  const before = await snapshot();
  expect((await syncService.refreshWorkouts(server.client, "other")).success).toBe(true);
  expect(await snapshot()).toEqual(before);
  expect(server.writes.every(([, id]) => id.startsWith("other-"))).toBe(true);
  expect(await workoutService.getWorkoutById("user", "workout")).not.toBeNull();
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  expect(await pending()).toHaveLength(0);
});
it("does not let failed inactive operations block another account", async () => {
  await save(); const server = remote(); server.failures.set("workouts", new Error("failed A"));
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(false);
  await secondAccount(); server.failures.clear();
  expect((await syncService.pushToSupabase("other", server.client)).success).toBe(true);
  expect((await pending()).every((row: any) => row.user_id === "user")).toBe(true);
});
it.each(["workouts", "workout_exercises", "exercise_sets", "circuit_rounds", "cardio_entries", "cardio_intervals"])("rejects incorrectly labeled %s queue records before any upload", async table => {
  await save();
  await local.db.runAsync("UPDATE sync_queue SET user_id='other' WHERE table_name=?", [table]);
  const server = remote();
  expect((await syncService.pushToSupabase("other", server.client)).success).toBe(false);
  expect(server.writes).toHaveLength(0);
  expect(await pending()).toHaveLength(6);
});
it("leaves legacy unowned entries untouched", async () => {
  await save(); await local.db.runAsync("UPDATE sync_queue SET user_id=NULL");
  const before = await pending(), server = remote();
  expect((await syncService.pushToSupabase("other", server.client)).success).toBe(true);
  expect(await pending()).toEqual(before); expect(server.writes).toHaveLength(0);
});
it("allows B to sync while A's in-flight request settles, without sending A's children", async () => {
  await save(); await secondAccount(); const server = remote();
  const held = gate(), entered = gate(), from = server.client.from;
  server.client.from = (table: string) => {
    const query = from(table), insert = query.insert;
    query.insert = async (data: any) => {
      if (table === "workouts" && data.id === "workout") { entered.release(); await held.promise; }
      return insert(data);
    };
    return query;
  };
  const old = syncService.pushToSupabase("user", server.client);
  const rejected = expect(old).rejects.toThrow("session changed");
  await entered.promise; syncService.invalidateUserSync("user");
  expect((await syncService.pushToSupabase("other", server.client)).success).toBe(true);
  held.release(); await rejected;
  expect(server.writes.filter(([, id]) => !id.startsWith("other-"))).toEqual([["workouts", "workout"]]);
  expect((await pending()).filter((row: any) => row.user_id === "user")).toHaveLength(6);
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
});
it("rejects legacy deleted child ownership established as another account remotely", async () => {
  await syncService.addToSyncQueue("user", "exercise_sets", "deleted", "delete", { id: "deleted" });
  const remove = jest.fn();
  const client: any = { from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: [{ workout_exercises: { workouts: { user_id: "other" } } }], error: null }) }) }), delete: remove }) };
  expect((await syncService.pushToSupabase("user", client)).success).toBe(false);
  expect(remove).not.toHaveBeenCalled(); expect(await pending()).toHaveLength(1);
});
it("scopes acknowledgment by queue owner even when ownership changes during the request", async () => {
  await save(); const server = remote(), from = server.client.from;
  server.client.from = (table: string) => {
    const query = from(table), insert = query.insert;
    query.insert = async (data: any) => {
      const result = await insert(data);
      if (table === "workouts") await local.db.runAsync("UPDATE sync_queue SET user_id='other' WHERE table_name='workouts'");
      return result;
    };
    return query;
  };
  await syncService.pushToSupabase("user", server.client);
  const retained = await local.db.getFirstAsync("SELECT * FROM sync_queue WHERE table_name='workouts'");
  expect(retained.user_id).toBe("other"); expect(retained.synced).toBe(0);
});
it.each(["user", null])("verifies deleted child ownership before deleting: %s", async owner => {
  await syncService.addToSyncQueue("user", "exercise_sets", "deleted", "delete", { id: "deleted" });
  const remove = jest.fn(() => ({ eq: async () => ({ error: null }) }));
  const client: any = { from: () => ({ select: () => ({ eq: () => ({ limit: async () => ({ data: owner ? [{ workout_exercises: { workouts: { user_id: owner } } }] : [], error: null }) }) }), delete: remove }) };
  expect((await syncService.pushToSupabase("user", client)).success).toBe(owner !== null);
  expect(remove).toHaveBeenCalledTimes(owner ? 1 : 0);
  expect(await pending()).toHaveLength(owner ? 0 : 1);
});
it("rejects a new stale request after the authenticated account changes", async () => {
  await save(); const server = remote();
  syncService.setAuthenticatedUser("user"); syncService.setAuthenticatedUser("other");
  try {
    await expect(syncService.pushToSupabase("user", server.client)).rejects.toThrow("session changed");
    expect(server.writes).toHaveLength(0); expect(await pending()).toHaveLength(6);
  } finally { syncService.setAuthenticatedUser(null); }
});
it("preserves inactive deletion queues and rejects an active-owner mismatch", async () => {
  await save(); await secondAccount();
  expect((await workoutService.deleteWorkout("user", "workout")).success).toBe(true);
  const snapshot = () => local.db.getAllAsync("SELECT * FROM sync_queue WHERE user_id='user' ORDER BY id");
  const before = await snapshot(), server = remote();
  syncService.setAuthenticatedUser("other");
  try {
    await expect(syncService.pushToSupabase("user", server.client)).rejects.toThrow("session changed");
    expect((await syncService.pushToSupabase("other", server.client)).success).toBe(true);
    expect(await snapshot()).toEqual(before);
    expect(server.writes.every(([, id]) => id.startsWith("other-"))).toBe(true);
  } finally { syncService.setAuthenticatedUser("user"); }
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
});
