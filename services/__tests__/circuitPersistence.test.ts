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
import { moveExerciseBlock } from "@/utils/exerciseOrdering";
import { Workout, WorkoutExercise } from "@/types/interfaces/types";
import { exerciseService } from "../exerciseService";
import { setService } from "../setService";
import { circuitService } from "../circuitService";
import { deletionEvidenceKey, readDeletionEvidence } from "../ownedDeletion";
import { claimUpload, cancelNeverAttempted, registerLocalCreation } from "../uploadLifecycle";
import { withLocalTransaction } from "../localTransaction";

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
    exercises: [{ id: "exercise", workout_id: "workout", exercise_id: "catalog", exercise_name: "Movement", exercise_order: 1, group_id: "round", group_type: "circuit", circuit_id: "round", round_number: 3, validUnits: ["reps"], sets: [{ id: "set", workout_exercise_id: "exercise", reps: 12, set_order: 1, is_warmup: 0, is_max: 0 }] }],
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
        query.then = (resolve: any, reject: any) => query.select().then(resolve, reject);
        return query;
      },
      select: (selection = "*") => {
        let key: string, value: any;
        const rows = () => Object.values(tables[table]).filter(row => !key || row[key] === value);
        const query: any = {
          eq: (field: string, expected: any) => { key = field; value = expected; return query; },
          order: () => query,
          limit: async () => {
            function withOwner(tableName: string, row: any): any {
              const parent = ({ circuit_rounds: ["workouts", "workout_id"], workout_exercises: ["workouts", "workout_id"], exercise_sets: ["workout_exercises", "workout_exercise_id"], cardio_entries: ["workouts", "workout_id"], cardio_intervals: ["cardio_entries", "cardio_entry_id"] } as Record<string, string[]>)[tableName];
              return parent ? { ...row, [parent[0]]: withOwner(parent[0], tables[parent[0]][row[parent[1]]]) } : row;
            }
            return { data: rows().map(row => selection.includes("!inner") ? withOwner(table, row) : row), error: null };
          },
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

it("reports a creation transaction failure with no committed domain, lifecycle or queue rows", async () => {
  await local.db.execAsync("CREATE TRIGGER fail_creation_queue BEFORE INSERT ON sync_queue BEGIN SELECT RAISE(ABORT,'queue failure'); END");
  const result = await workoutService.insertWorkout(fixture(), "user");
  expect(result.success).toBe(false);
  expect(result.reloadError).toBeUndefined();
  expect(await local.db.getAllAsync("SELECT id FROM workouts")).toEqual([]);
  expect(await pending()).toEqual([]);
  expect(await local.db.getAllAsync("SELECT * FROM sync_upload_lifecycle")).toEqual([]);
});

it("reports committed creation success when hydration fails and reloads without adding operations", async () => {
  const reload = jest.spyOn(workoutService, "getWorkoutById").mockRejectedValueOnce(new Error("Native read failed"));
  try {
    const result = await workoutService.insertWorkout(fixture(), "user");
    expect(result).toMatchObject({ success: true, data: null, reloadError: expect.stringContaining("Workout saved") });
    expect(result.error).toBeUndefined();
    expect(await local.db.getAllAsync("SELECT id FROM workouts")).toHaveLength(1);
    const committedQueue = await pending();
    expect(committedQueue.length).toBeGreaterThan(0);
    const loaded = await workoutService.getWorkoutById("user", "workout");
    expect(loaded?.exercises[0].sets[0].id).toBe("set");
    expect(await pending()).toEqual(committedQueue);
  } finally { reload.mockRestore(); }
});

it("reports committed editing success despite reload failure, including newly inserted children", async () => {
  await save();
  const stored = (await workoutService.getWorkoutById("user", "workout"))!;
  const edited = { ...stored, name: "Committed edit", exercises: [...stored.exercises, {
    ...stored.exercises[0], id: "added-exercise", exercise_order: 1,
    sets: [{...stored.exercises[0].sets[0],id:"added-set",workout_exercise_id:"added-exercise"}],
  }] };
  const reload = jest.spyOn(workoutService, "getWorkoutById").mockRejectedValueOnce(new Error("Read failed after commit"));
  try {
    const result = await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(stored, edited));
    expect(result).toMatchObject({ success: true, data: null, reloadError: expect.any(String) });
    expect((await local.db.getFirstAsync("SELECT name FROM workouts WHERE id='workout'")).name).toBe("Committed edit");
    expect(await local.db.getAllAsync("SELECT id FROM workout_exercises")).toHaveLength(2);
    const queue = await pending();
    expect(queue.filter((row:any)=>row.record_id==="added-set")).toHaveLength(1);
    expect((await workoutService.getWorkoutById("user","workout"))?.exercises).toHaveLength(2);
    expect(await pending()).toEqual(queue);
  } finally { reload.mockRestore(); }
});

it("reports an editing rollback as failure and preserves the original snapshot and queue", async () => {
  await save(); const stored = (await workoutService.getWorkoutById("user", "workout"))!, queue = await pending();
  await local.db.execAsync("CREATE TRIGGER fail_edit_queue BEFORE INSERT ON sync_queue WHEN NEW.operation='update' BEGIN SELECT RAISE(ABORT,'queue failure'); END");
  const result = await workoutService.updateWorkout("user","workout",buildWorkoutChanges(stored,{...stored,name:"Not committed"}));
  expect(result.success).toBe(false);
  expect(result.reloadError).toBeUndefined();
  expect(await workoutService.getWorkoutById("user","workout")).toEqual(stored);
  expect(await pending()).toEqual(queue);
});

it("propagates circuit query failures and preserves genuine empty results", async () => {
  expect(await circuitService.getWorkoutCircuitRounds("user", "missing", local.db)).toEqual([]);
  const failure = new Error("Native prepare rejected");
  const read = jest.spyOn(local.db, "getAllAsync").mockRejectedValueOnce(failure);
  try {
    await expect(circuitService.getWorkoutCircuitRounds("user", "workout", local.db)).rejects.toBe(failure);
  } finally { read.mockRestore(); }
});

it.each(["exercise_sets", "cardio_entries", "cardio_intervals", "circuit_rounds"])("rejects the entire hydration when %s cannot be read", async table => {
  await save();
  const original = local.db.getAllAsync;
  const failure = new Error("Required child read failed");
  const read = jest.spyOn(local.db, "getAllAsync").mockImplementation(async (sql: any, args: any) => {
    if (new RegExp(`FROM ${table}\\b`).test(sql)) throw failure;
    return original(sql, args);
  });
  try {
    await expect(workoutService.getAllWorkouts("user")).rejects.toBe(failure);
    await expect(workoutService.getWorkoutsByMonth("user", {year:"2030",month:"04"}, {year:"2030",month:"04"})).rejects.toBe(failure);
  } finally { read.mockRestore(); }
});

it("hydrates all child data with one outstanding child read per bulk load", async () => {
  await save();
  const second = fixture(); second.id = "second";
  second.exercises = second.exercises.map(e => ({...e, id:"second-exercise",workout_id:second.id,circuit_id:"second-round",group_id:"second-round",sets:e.sets.map(s=>({...s,id:"second-set",workout_exercise_id:"second-exercise"}))}));
  second.circuit_rounds = second.circuit_rounds!.map(r=>({...r,id:"second-round",workout_id:second.id}));
  second.cardio_entries = second.cardio_entries!.map(e=>({...e,id:"second-cardio",workout_id:second.id,intervals:e.intervals.map(i=>({...i,id:"second-interval",cardio_entry_id:"second-cardio"}))}));
  expect((await workoutService.insertWorkout(second,"user")).success).toBe(true);
  const original = local.db.getAllAsync;
  let active = 0, peak = 0;
  const read = jest.spyOn(local.db,"getAllAsync").mockImplementation(async (sql:any,args:any) => {
    active++; peak=Math.max(peak,active);
    try { await Promise.resolve(); return await original(sql,args); } finally { active--; }
  });
  try {
    const loaded = await workoutService.getAllWorkouts("user");
    expect(loaded).toHaveLength(2);
    expect(peak).toBe(1);
    for(const workout of loaded) {
      expect(workout.exercises[0].sets).toHaveLength(1);
      expect(workout.exercises[0].circuit_id).toBe(workout.circuit_rounds![0].id);
      expect(workout.cardio_entries![0].intervals[0].work_duration).toBe(30);
      expect(workout.circuit_rounds![0].round_number).toBe(3);
    }
  } finally { read.mockRestore(); }
});

function strengthExercise(id: string, order = 80): WorkoutExercise {
  return { id, workout_id: "workout", exercise_id: "catalog", exercise_name: id,
    exercise_order: order, validUnits: ["reps"], group_id: null, group_type: null,
    circuit_id: null, round_number: null,
    sets: [{ id: `set-${id}`, workout_exercise_id: id, reps: 7, set_order: 1, is_warmup: 0, is_max: 0 }] };
}
async function saveStrength() {
  const workout = { ...fixture(), workoutType: "strength" as const, circuit_rounds: [],
    exercises: [strengthExercise("a"), strengthExercise("b"), strengthExercise("c")] };
  expect((await workoutService.insertWorkout(workout, "user")).success).toBe(true);
  await local.db.runAsync("DELETE FROM sync_queue");
  return (await workoutService.getWorkoutById("user", "workout"))!;
}

it("detects array-only reorders, persists order and full queue parents without touching sets or starting sync", async () => {
  const stored = await saveStrength();
  const push = jest.spyOn(syncService, "pushToSupabase");
  const sync = jest.spyOn(syncService, "sync");
  const refresh = jest.spyOn(syncService, "refreshWorkouts");
  try {
    const changes = buildWorkoutChanges(stored, { ...stored, exercises: [stored.exercises[2], ...stored.exercises.slice(0, 2)] });
    expect(changes.exercisesToUpdate).toHaveLength(3);
    expect([changes.setsToInsert, changes.setsToUpdate, changes.setIdsToDelete]).toEqual([[], [], []]);
    expect((await workoutService.updateWorkout("user", "workout", changes)).success).toBe(true);
    const reloaded = (await workoutService.getWorkoutById("user", "workout"))!;
    expect(reloaded.exercises.map(exercise => [exercise.id, exercise.exercise_order])).toEqual([["c", 0], ["a", 1], ["b", 2]]);
    for (const row of await pending()) {
      expect(row.table_name).toBe("workout_exercises");
      const data = JSON.parse(row.data);
      const exercise = reloaded.exercises.find(exercise => exercise.id === data.id)!;
      expect(data).toMatchObject({ id: exercise.id, workout_id: "workout", exercise_id: "catalog", exercise_order: exercise.exercise_order,
        circuit_id: null, group_id: null, group_type: null, round_number: null });
      expect(exercise.sets).toEqual(stored.exercises.find(original => original.id === exercise.id)!.sets);
    }
    expect(await pending()).toHaveLength(3);
    expect(push).not.toHaveBeenCalled(); expect(sync).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled();
  } finally { push.mockRestore(); sync.mockRestore(); refresh.mockRestore(); }
});

it("normalizes survivors and additions after deletion without reusing order values", async () => {
  const stored = await saveStrength();
  const next = { ...stored, exercises: [stored.exercises[0], stored.exercises[2], strengthExercise("d", 2)] };
  expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(stored, next))).success).toBe(true);
  const saved = (await workoutService.getWorkoutById("user", "workout"))!;
  expect(saved.exercises.map(exercise => [exercise.id, exercise.exercise_order])).toEqual([["a", 0], ["c", 1], ["d", 2]]);
  expect(saved.exercises[1].sets).toEqual(stored.exercises[2].sets);
  expect((await pending()).filter((row: any) => row.table_name === "workout_exercises").map((row: any) => JSON.parse(row.data)))
    .toEqual(expect.arrayContaining([expect.objectContaining({ id: "c", workout_id: "workout", exercise_order: 1 }),
      expect.objectContaining({ id: "d", workout_id: "workout", exercise_order: 2 })]));
});

it.each(["superset", "compound_set"] as const)("persists a %s block without changing members or sets", async group_type => {
  const workout = { ...fixture(), workoutType: "strength" as const, circuit_rounds: [], exercises: [
    ...["a", "b"].map(id => ({ ...strengthExercise(id), group_id: "pair", group_type })), strengthExercise("c"),
  ] };
  expect((await workoutService.insertWorkout(workout, "user")).success).toBe(true);
  const stored = (await workoutService.getWorkoutById("user", "workout"))!;
  await local.db.runAsync("DELETE FROM sync_queue");
  const changes = buildWorkoutChanges(stored, { ...stored, exercises: [stored.exercises[2], ...stored.exercises.slice(0, 2)] });
  expect((await workoutService.updateWorkout("user", "workout", changes)).success).toBe(true);
  const saved = (await workoutService.getWorkoutById("user", "workout"))!;
  expect(saved.exercises.map(exercise => exercise.id)).toEqual(["c", "a", "b"]);
  expect(saved.exercises.slice(1)).toEqual(stored.exercises.slice(0, 2).map((exercise, index) => ({ ...exercise, exercise_order: index + 1 })));
  await local.db.runAsync("DELETE FROM sync_queue");
  const split = { ...saved, exercises: [saved.exercises[1], saved.exercises[0], saved.exercises[2]] };
  expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(saved, split))).success).toBe(false);
  const orphan = { ...saved, exercises: saved.exercises.slice(0, 2) };
  expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(saved, orphan))).success).toBe(false);
  expect(await workoutService.getWorkoutById("user", "workout")).toEqual(saved);
  expect(await pending()).toEqual([]);
});

it("rejects malformed circuit creation before writing any workout or queue entry", async () => {
  const workout = fixture();
  workout.exercises[0].circuit_id = "different-round";
  expect((await workoutService.insertWorkout(workout, "user")).success).toBe(false);
  expect(await workoutService.getWorkoutById("user", "workout")).toBeNull();
  expect(await pending()).toEqual([]);
});

it("normalizes multiple circuits globally on creation and preserves their relationships after reordering", async () => {
  const workout = fixture();
  const original = workout.exercises[0];
  workout.circuit_rounds.push({ ...workout.circuit_rounds[0], id: "second-round", round_number: 2 });
  workout.exercises.push(...["second-a", "second-b"].map(id => ({ ...strengthExercise(id, 1),
    group_id: "second-round", circuit_id: "second-round", group_type: "circuit" as const, round_number: 2 })));
  expect((await workoutService.insertWorkout(workout, "user")).success).toBe(true);
  const stored = (await workoutService.getWorkoutById("user", "workout"))!;
  expect(stored.exercises.map(exercise => exercise.exercise_order)).toEqual([0, 1, 2]);
  await local.db.runAsync("DELETE FROM sync_queue");
  expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(stored,
    { ...stored, exercises: [...stored.exercises.slice(1), stored.exercises[0]] }))).success).toBe(true);
  const saved = (await workoutService.getWorkoutById("user", "workout"))!;
  expect(saved.exercises.map(exercise => exercise.id)).toEqual(["second-a", "second-b", original.id]);
  expect(saved.exercises[2]).toEqual({ ...stored.exercises[0], exercise_order: 2 });
  expect(saved.circuit_rounds).toEqual(stored.circuit_rounds);
  expect((await pending()).map((row: any) => JSON.parse(row.data))).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "second-a", workout_id: "workout", circuit_id: "second-round", group_id: "second-round", round_number: 2, exercise_order: 0 }),
  ]));
});

it("saves and reloads three moved circuits and synchronizes their grouping only on an explicit request", async () => {
  const workout = fixture();
  workout.circuit_rounds = [1, 2, 3].map(index => ({ id: `circuit-${index}`, workout_id: "workout",
    round_number: index + 1, rest_after_round: index * 30, notes: `Notes ${index}` }));
  workout.exercises = workout.circuit_rounds.flatMap((round, circuit) => Array.from({ length: circuit + 1 }, (_, member) => ({
    ...strengthExercise(`circuit-exercise-${circuit}-${member}`), group_type: "circuit" as const,
    group_id: round.id, circuit_id: round.id, round_number: round.round_number,
  })));
  expect((await workoutService.insertWorkout(workout, "user")).success).toBe(true);
  const server = remote();
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  const before = (await workoutService.getWorkoutById("user", "workout"))!;
  const writes = server.writes.length;
  const next = { ...before, exercises: moveExerciseBlock(before.exercises, 2, "up") };
  expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(before, next))).success).toBe(true);
  const saved = (await workoutService.getWorkoutById("user", "workout"))!;
  expect(saved.exercises).toEqual(next.exercises);
  expect(saved.circuit_rounds).toEqual(before.circuit_rounds);
  expect(server.writes).toHaveLength(writes);
  expect((await pending()).every((row: any) => row.table_name === "workout_exercises")).toBe(true);
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  await connect();
  await syncService.pullFromSupabase(server.client, "user");
  expect(await workoutService.getWorkoutById("user", "workout")).toEqual(saved);
});

it("rolls back every order update and queued operation when queue insertion fails", async () => {
  const stored = await saveStrength();
  // Fail the second insertion, after SQL updates and the first queue write.
  const implementation = syncService.addToSyncQueueInTransaction;
  const failure = jest.spyOn(syncService, "addToSyncQueueInTransaction");
  let count = 0;
  failure.mockImplementation(async (...args) => {
    if (++count === 2) throw new Error("Injected queue failure");
    return implementation(...args);
  });
  try {
    expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(stored,
      { ...stored, exercises: [...stored.exercises].reverse() }))).success).toBe(false);
    expect(await workoutService.getWorkoutById("user", "workout")).toEqual(stored);
    expect(await pending()).toEqual([]);
  } finally { failure.mockRestore(); }
});

it("rejects foreign ownership, duplicate IDs and malformed groups without committing", async () => {
  const stored = await saveStrength();
  const reordered = buildWorkoutChanges(stored, { ...stored, exercises: [...stored.exercises].reverse() });
  expect((await workoutService.updateWorkout("other-user", "workout", reordered)).success).toBe(false);
  expect(() => buildWorkoutChanges(stored, { ...stored, exercises: [stored.exercises[0], stored.exercises[0]] })).toThrow("Duplicate exercise instance IDs");
  expect((await workoutService.updateWorkout("user", "workout", {
    ...reordered, exercisesToUpdate: [stored.exercises[0], stored.exercises[0]],
  })).success).toBe(false);
  for (const exercises of [
    [{ ...stored.exercises[0], group_type: "superset" as const, group_id: "pair" }, ...stored.exercises.slice(1)],
    [{ ...stored.exercises[0], group_type: "circuit" as const, group_id: "missing", circuit_id: "missing", round_number: 2 }, ...stored.exercises.slice(1)],
  ]) {
    expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(stored, { ...stored, exercises }))).success).toBe(false);
  }
  expect(await workoutService.getWorkoutById("user", "workout")).toEqual(stored);
  expect(await pending()).toEqual([]);
});

it("retires direct reorder APIs without writing SQLite or queue entries", async () => {
  const stored = await saveStrength();
  expect((await workoutService.reorderWorkoutExercise("user", stored.exercises, 0, "down")).success).toBe(false);
  expect((await exerciseService.updateExerciseOrder("user", [{ id: "a", exercise_order: 2 }])).success).toBe(false);
  expect(await workoutService.getWorkoutById("user", "workout")).toEqual(stored);
  expect(await pending()).toEqual([]);
});

it("does not mark legacy order gaps dirty and rejects malformed legacy relationships only when exercises change", async () => {
  const stored = await saveStrength();
  await local.db.runAsync("UPDATE workout_exercises SET exercise_order = exercise_order + 10");
  await local.db.runAsync("UPDATE workout_exercises SET group_type = 'superset', group_id = 'orphan' WHERE id = 'a'");
  const legacy = (await workoutService.getWorkoutById("user", "workout"))!;
  expect(buildWorkoutChanges(legacy, legacy).exercisesToUpdate).toEqual([]);
  expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(legacy, { ...legacy, name: "Renamed" }))).success).toBe(true);
  expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(legacy,
    { ...legacy, exercises: [...legacy.exercises].reverse() }))).success).toBe(false);
});

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
  const before = await pending();
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  if (uploaded) expect(await pending()).toHaveLength(0);
  else { expect(await pending()).toEqual(before); expect(server.writes).toHaveLength(0); }
  expect(server.tables.workouts?.workout).toBeUndefined();
});

it("handles both reported IDs as multiple newly deleted workouts, without uploading their stale inserts", async () => {
  const ids = ["bf480eef-6ead-4965-a0af-fcd96972a40b", "55cd68e8-9616-4c52-8dcc-cfb45cd76e0f"];
  for (const id of ids) {
    expect((await workoutService.insertWorkout({ ...fixture(), id, exercises: [], cardio_entries: [], circuit_rounds: [] }, "user")).success).toBe(true);
    expect((await workoutService.deleteWorkout("user", id)).success).toBe(true);
  }
  const before = await pending(); expect(before).toEqual([]);
  const server = remote();
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  expect(await pending()).toEqual(before); expect(server.writes).toHaveLength(0);
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
    const before = await pending();
    await syncService.sync(server.client, "user");
    expect(await pending()).toEqual(before); expect(server.writes).toHaveLength(0);
    expect((await local.db.getAllAsync("SELECT * FROM sync_upload_lifecycle WHERE state='canceled'")).length).toBe(6);
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
  const remaining = await pending();
  expect(remaining).toContainEqual(before.find((row: any) => row.table_name === "workouts"));
  if (failure === "silent-RLS") expect(remaining).toEqual(before);
  expect(server.tables.workouts.workout).toBeDefined();
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
    if (table === "workouts") query.delete = () => { const lost: any = { eq: () => lost, select: async () => { delete server.tables.workouts.workout; return { data: null, error: new Error("response lost") }; } }; return lost; };
    return query;
  };
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(false);
  expect((await pending()).length).toBeGreaterThan(0);
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(false);
  expect((await pending()).some((row: any) => row.table_name === "workouts" && row.operation === "delete")).toBe(true);
  expect(server.tables.workouts.workout).toBeUndefined();
});
it("rolls back local deletion, tombstone, and receipt together if receipt persistence fails", async () => {
  await save(); const before = await pending();
  await local.db.runAsync("UPDATE sync_upload_lifecycle SET state='uncertain',attempt_count=1");
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
  const remove = jest.fn(() => ({ eq: () => ({ select: async () => ({ data: [{ id: "deleted" }], error: null }) }) }));
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
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true); // proven local-only records were canceled
  expect(await pending()).toEqual([]);
});

it.each(["uploaded", "pending inserts", "partially uploaded"])("atomically deletes an offline circuit with %s and manually syncs without resurrection", async state => {
  const original = fixture();
  original.exercises.push(strengthExercise("standalone", 2));
  expect((await workoutService.insertWorkout(original, "user")).success).toBe(true);
  const server = remote();
  if (state === "uploaded") expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  if (state === "partially uploaded") {
    server.failures.set("exercise_sets", { message: "Offline during upload" });
    expect((await syncService.pushToSupabase("user", server.client)).success).toBe(false);
    server.failures.clear();
  }
  const stored = (await workoutService.getWorkoutById("user", "workout"))!;
  const next = { ...stored, circuit_rounds: [], exercises: stored.exercises.filter(exercise => exercise.group_type !== "circuit") };
  const push = jest.spyOn(syncService, "pushToSupabase");
  const sync = jest.spyOn(syncService, "sync");
  const refresh = jest.spyOn(syncService, "refreshWorkouts");
  jest.mocked(NetInfo.fetch).mockResolvedValueOnce({ isConnected: false } as any);
  try {
    expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(stored, next))).success).toBe(true);
    expect(push).not.toHaveBeenCalled(); expect(sync).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled();
    const reloaded = (await workoutService.getWorkoutById("user", "workout"))!;
    expect(reloaded.circuit_rounds).toEqual([]);
    expect(reloaded.exercises).toEqual(next.exercises.map((exercise, exercise_order) => ({ ...exercise, exercise_order })));
    expect(reloaded.cardio_entries).toEqual(stored.cardio_entries);
    expect(await local.db.getAllAsync("SELECT * FROM exercise_sets WHERE id='set'")).toEqual([]);
    const deletedIds = new Set(["round", "exercise", "set"]);
    const tombstones = (await pending()).filter((row: any) => deletedIds.has(row.record_id) && row.operation === "delete");
    expect(tombstones.map((row: any) => [row.table_name, row.operation])).toEqual(state === "pending inserts" ? [] : [["exercise_sets", "delete"], ["workout_exercises", "delete"], ["circuit_rounds", "delete"]]);
    expect((await syncService.pushToSupabase("user", server.client)).success).toBe(false); // still offline
    expect(await pending()).not.toEqual([]);
    expect((await syncService.refreshWorkouts(server.client, "user")).success).toBe(state !== "partially uploaded");
    if (state !== "partially uploaded") expect(await pending()).toEqual([]);
    else expect((await pending()).some((row: any) => row.operation === "delete")).toBe(true);
    if (state === "partially uploaded") {
      expect(server.tables.circuit_rounds?.round).toBeDefined();
      expect(server.tables.workout_exercises?.exercise).toBeDefined();
    } else {
      expect(server.tables.circuit_rounds?.round).toBeUndefined();
      expect(server.tables.workout_exercises?.exercise).toBeUndefined();
    }
    expect(server.tables.exercise_sets?.set).toBeUndefined();
    expect((await workoutService.getWorkoutById("user", "workout"))?.circuit_rounds).toEqual([]);
    expect(await local.db.getAllAsync("SELECT * FROM app_meta WHERE key LIKE 'circuit-delete-owner:%'")).toEqual([]);
  } finally { push.mockRestore(); sync.mockRestore(); refresh.mockRestore(); }
});

it("rolls back circuit children, settings, pending inserts and deletion receipts when save fails", async () => {
  await save();
  const stored = (await workoutService.getWorkoutById("user", "workout"))!;
  const queued = await pending();
  await local.db.runAsync("UPDATE sync_upload_lifecycle SET state='uncertain',attempt_count=1");
  await local.db.execAsync("CREATE TRIGGER reject_circuit_delete BEFORE INSERT ON sync_queue WHEN NEW.table_name='workout_exercises' AND NEW.operation='delete' BEGIN SELECT RAISE(ABORT, 'queue failure'); END");
  try {
    expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(stored, { ...stored, exercises: [], circuit_rounds: [] }))).success).toBe(false);
    expect(await workoutService.getWorkoutById("user", "workout")).toEqual(stored);
    expect(await pending()).toEqual(queued);
    expect(await local.db.getAllAsync("SELECT * FROM app_meta WHERE key LIKE 'owned-delete:v2:%'")).toEqual([]);
  } finally { await local.db.execAsync("DROP TRIGGER reject_circuit_delete"); }
});

it("rejects empty circuits on create and update without committing or clearing their metadata", async () => {
  expect((await workoutService.insertWorkout({ ...fixture(), exercises: [] }, "user")).error).toContain("empty circuit");
  expect(await pending()).toEqual([]);
  await save();
  const stored = (await workoutService.getWorkoutById("user", "workout"))!;
  const queue = await pending();
  expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(stored, { ...stored, exercises: [] }))).error).toContain("empty circuit");
  expect(await workoutService.getWorkoutById("user", "workout")).toEqual(stored);
  expect(await pending()).toEqual(queue);
});

it("deletes every instance and set in a multi-exercise circuit while retaining another circuit", async () => {
  const original = fixture();
  const first = original.exercises[0];
  original.exercises.push({ ...first, id: "second-instance", exercise_order: 2,
    sets: [1, 2].map(order => ({ ...first.sets[0], id: `second-set-${order}`, workout_exercise_id: "second-instance", set_order: order })) });
  original.circuit_rounds.push({ ...original.circuit_rounds[0], id: "other-round", rest_after_round: 120 });
  original.exercises.push({ ...first, id: "other-instance", circuit_id: "other-round", group_id: "other-round", exercise_order: 3,
    sets: [{ ...first.sets[0], id: "other-set", workout_exercise_id: "other-instance" }] });
  expect((await workoutService.insertWorkout(original, "user")).success).toBe(true);
  const stored = (await workoutService.getWorkoutById("user", "workout"))!;
  const next = { ...stored, exercises: stored.exercises.filter(exercise => exercise.circuit_id === "other-round"),
    circuit_rounds: stored.circuit_rounds.filter(round => round.id === "other-round") };
  expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(stored, next))).success).toBe(true);
  const reloaded = (await workoutService.getWorkoutById("user", "workout"))!;
  expect(reloaded.exercises).toEqual(next.exercises.map(exercise => ({ ...exercise, exercise_order: 0 })));
  expect(reloaded.circuit_rounds).toEqual(next.circuit_rounds);
  expect(reloaded.cardio_entries).toEqual(stored.cardio_entries);
  expect((await local.db.getAllAsync("SELECT id FROM exercise_sets")).map((row: any) => row.id)).toEqual(["other-set"]);
  expect((await pending()).filter((row: any) => row.operation === "delete").map((row: any) => row.record_id).sort())
    .toEqual([]); // all six records were proven never attempted
});

it.each([false, true])("cancels a proven local-only child chain (offline update: %s) without remote writes", async update => {
  await save();
  if (update) {
    const before = (await workoutService.getWorkoutById("user", "workout"))!;
    expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(before, { ...before, exercises: before.exercises.map(exercise => ({ ...exercise, exercise_name: "Offline edit" })) }))).success).toBe(true);
  }
  expect((await exerciseService.deleteExercise("user", "exercise")).success).toBe(true);
  expect((await pending()).filter((row: any) => ["exercise", "set"].includes(row.record_id))).toEqual([]);
  expect(await readDeletionEvidence(local.db, "user", "exercise_sets", "set")).toBeNull();
  const server = remote();
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  expect(server.writes.some(([, id]) => ["exercise", "set"].includes(id))).toBe(false);
  expect(await pending()).toEqual([]);
});

it("retries an insert followed by multiple already-uploaded updates using only known historical states", async () => {
  await save(); const server = remote();
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  for (const name of ["Edit one", "Edit two"]) {
    const before = (await workoutService.getWorkoutById("user", "workout"))!;
    expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(before, { ...before, exercises: before.exercises.map(exercise => ({ ...exercise, exercise_name: name })) }))).success).toBe(true);
  }
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  await local.db.runAsync("UPDATE sync_queue SET synced=0 WHERE table_name='workout_exercises'"); // disposable lost-ack simulation
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  expect(server.tables.workout_exercises.exercise.exercise_name).toBe("Edit two");
  expect(await pending()).toEqual([]);
});

it.each(["exercise service", "workout service", "set service", "set reorder"])("captures evidence before individual deletion through %s and confirms uploaded deletes", async path => {
  await save(); const server = remote(); await syncService.pushToSupabase("user", server.client);
  if (path === "exercise service") expect((await exerciseService.deleteExercise("user", "exercise")).success).toBe(true);
  else if (path === "workout service") expect((await workoutService.deleteWorkoutExercise("user", "exercise")).success).toBe(true);
  else if (path === "set service") expect((await setService.deleteSet("user", "set")).success).toBe(true);
  else expect((await setService.deleteSetAndUpdateOrder("user", "set", "exercise", false, 1)).success).toBe(true);
  const before = await readDeletionEvidence(local.db, "user", "exercise_sets", "set");
  expect(before).toMatchObject({ workoutId: "workout", remoteConfirmed: false });
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  expect(server.tables.exercise_sets.set).toBeUndefined();
  expect(await readDeletionEvidence(local.db, "user", "exercise_sets", "set")).toMatchObject({ remoteConfirmed: true });
  expect(await pending()).toEqual([]);
});

it("supersedes an uploaded exercise's offline updates only after its deletion is confirmed", async () => {
  await save(); const server = remote(); await syncService.pushToSupabase("user", server.client);
  const before = (await workoutService.getWorkoutById("user", "workout"))!;
  await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(before, { ...before, exercises: before.exercises.map(exercise => ({ ...exercise, exercise_name: "Never replay this" })) }));
  await exerciseService.deleteExercise("user", "exercise");
  const writes = server.writes.length;
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  expect(server.writes.slice(writes)).toEqual([["exercise_sets", "set"], ["workout_exercises", "exercise"]]);
  expect(server.tables.workout_exercises.exercise).toBeUndefined();
  expect(await pending()).toEqual([]);
});

it.each(["circuit", "workout"])("retains member deletion evidence when the %s is subsequently deleted", async parent => {
  await save(); const server = remote(); await syncService.pushToSupabase("user", server.client);
  await exerciseService.deleteExercise("user", "exercise");
  const evidence = await readDeletionEvidence(local.db, "user", "exercise_sets", "set");
  if (parent === "workout") await workoutService.deleteWorkout("user", "workout");
  else {
    const before = (await workoutService.getWorkoutById("user", "workout"))!;
    expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(before, { ...before, circuit_rounds: [] }))).success).toBe(true);
  }
  expect(await readDeletionEvidence(local.db, "user", "exercise_sets", "set")).toEqual(evidence);
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  expect(server.tables.exercise_sets.set).toBeUndefined(); expect(server.tables.workout_exercises.exercise).toBeUndefined();
  expect(server.tables.circuit_rounds.round).toBeUndefined();
  expect(await pending()).toEqual([]);
});

it("acknowledges duplicate terminal tombstones together and retains confirmation for later duplicates", async () => {
  await save(); const server = remote(); await syncService.pushToSupabase("user", server.client);
  await setService.deleteSet("user", "set");
  await syncService.addToSyncQueue("user", "exercise_sets", "set", "delete", { id: "set" });
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  const writes = server.writes.length;
  await syncService.addToSyncQueue("user", "exercise_sets", "set", "delete", { id: "set" });
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  expect(server.writes).toHaveLength(writes); expect(await pending()).toEqual([]);
  expect(await readDeletionEvidence(local.db, "user", "exercise_sets", "set")).toMatchObject({ remoteConfirmed: true });
});

it("retries a confirmed delete after local acknowledgment fails without requiring a deleted parent", async () => {
  await save(); const server = remote(); await syncService.pushToSupabase("user", server.client);
  await workoutService.deleteWorkout("user", "workout");
  await local.db.execAsync("CREATE TRIGGER fail_ack BEFORE UPDATE ON sync_queue WHEN OLD.table_name='exercise_sets' AND NEW.synced=1 BEGIN SELECT RAISE(ABORT, 'ack failure'); END");
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(false);
  expect(await readDeletionEvidence(local.db, "user", "exercise_sets", "set")).toMatchObject({ remoteConfirmed: true });
  expect(server.tables.workout_exercises.exercise).toBeDefined(); // parent deferred
  await local.db.execAsync("DROP TRIGGER fail_ack");
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  expect(server.tables.workouts.workout).toBeUndefined(); expect(await pending()).toEqual([]);
});

it("retains unconfirmed child deletion after a lost remote response and never replays the old insert", async () => {
  await save(); const server = remote(); await syncService.pushToSupabase("user", server.client);
  await local.db.runAsync("UPDATE sync_queue SET synced=0 WHERE table_name='exercise_sets'");
  await setService.deleteSet("user", "set");
  const from = server.client.from;
  server.client.from = (table: string) => {
    const query = from(table);
    if (table === "exercise_sets") query.delete = () => { const request: any = { eq: () => request, select: async () => { delete server.tables.exercise_sets.set; return { data: null, error: new Error("lost response") }; } }; return request; };
    return query;
  };
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(false);
  const before = await pending();
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(false);
  expect(await pending()).toEqual(before); expect(server.tables.exercise_sets.set).toBeUndefined();
  expect(await readDeletionEvidence(local.db, "user", "exercise_sets", "set")).toMatchObject({ remoteConfirmed: false });
});

it.each(["absent", "RLS-hidden", "foreign-owned", "silent delete denial"])("does not infer safe deletion from %s remote state", async state => {
  await save(); const server = remote(); await syncService.pushToSupabase("user", server.client);
  await setService.deleteSet("user", "set");
  if (state === "absent") delete server.tables.exercise_sets.set;
  else if (state === "foreign-owned") server.tables.workouts.workout.user_id = "other";
  else {
    const from = server.client.from;
    server.client.from = (table: string) => {
      const query = from(table);
      if (table === "exercise_sets" && state === "RLS-hidden") query.select = () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) });
      if (table === "exercise_sets" && state === "silent delete denial") query.delete = () => { const request: any = { eq: () => request, select: async () => ({ data: [], error: null }) }; return request; };
      return query;
    };
  }
  const before = await pending();
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(false);
  expect(await pending()).toEqual(before);
  if (state !== "absent") expect(server.tables.exercise_sets.set).toBeDefined();
});

it.each(["exercise", "set"])("rolls back %s deletion, evidence and all queue writes on receipt failure", async kind => {
  await save(); const before = (await workoutService.getWorkoutById("user", "workout"))!; const queue = await pending();
  await local.db.runAsync("UPDATE sync_upload_lifecycle SET state='uncertain',attempt_count=1");
  await local.db.execAsync("CREATE TRIGGER fail_owned_receipt BEFORE INSERT ON app_meta WHEN NEW.key LIKE 'owned-delete:v2:%' BEGIN SELECT RAISE(ABORT, 'receipt failure'); END");
  const result = kind === "exercise" ? await exerciseService.deleteExercise("user", "exercise") : await setService.deleteSet("user", "set");
  expect(result.success).toBe(false); expect(await workoutService.getWorkoutById("user", "workout")).toEqual(before);
  expect(await pending()).toEqual(queue);
});

it("leaves the legacy ten-operation missing-receipt queue unchanged and never resurrects its deleted children", async () => {
  await save(); const server = remote(); await syncService.pushToSupabase("user", server.client);
  for (const suffix of ["a", "b"]) {
    const id = `legacy-${suffix}`;
    const exercise = { ...fixture().exercises[0], id, sets: undefined };
    await syncService.addToSyncQueue("user", "workout_exercises", id, "insert", exercise);
    await syncService.addToSyncQueue("user", "exercise_sets", `legacy-set-${suffix}`, "insert", { ...fixture().exercises[0].sets[0], id: `legacy-set-${suffix}`, workout_exercise_id: id });
    await syncService.addToSyncQueue("user", "workout_exercises", id, "update", { ...exercise, exercise_name: "Old edit" });
    await syncService.addToSyncQueue("user", "exercise_sets", `legacy-set-${suffix}`, "delete", { id: `legacy-set-${suffix}` });
    await syncService.addToSyncQueue("user", "workout_exercises", id, "delete", { id });
  }
  const before = await pending(); expect(before).toHaveLength(10);
  const writes = server.writes.length;
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(false);
  expect(await pending()).toEqual(before); expect(server.writes).toHaveLength(writes);
  expect(await local.db.getAllAsync("SELECT * FROM app_meta WHERE key LIKE 'owned-delete:v2:%'")).toEqual([]);
});

it("captures terminal intent for set removals through the complete workout edit path", async () => {
  await save(); const server = remote(); await syncService.pushToSupabase("user", server.client);
  let before = (await workoutService.getWorkoutById("user", "workout"))!;
  await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(before, { ...before, exercises: before.exercises.map(exercise => ({ ...exercise, sets: exercise.sets.map(set => ({ ...set, reps: 99 })) })) }));
  before = (await workoutService.getWorkoutById("user", "workout"))!;
  expect((await workoutService.updateWorkout("user", "workout", buildWorkoutChanges(before, { ...before, exercises: before.exercises.map(exercise => ({ ...exercise, sets: [] })) }))).success).toBe(true);
  expect(await readDeletionEvidence(local.db, "user", "exercise_sets", "set")).toMatchObject({ workoutId: "workout", remoteConfirmed: false });
  expect((await pending()).map((row: any) => row.operation)).toEqual(["update", "delete"]);
  const count = server.writes.length;
  expect((await syncService.pushToSupabase("user", server.client)).success).toBe(true);
  expect(server.writes.slice(count)).toEqual([["exercise_sets", "set"]]);
  expect(await pending()).toEqual([]); expect(server.tables.exercise_sets.set).toBeUndefined();
});

it("rejects a changed remote parent even when both parent workouts belong to the expected account", async () => {
  await save(); const server = remote(); await syncService.pushToSupabase("user", server.client);
  await setService.deleteSet("user", "set");
  server.tables.workout_exercises["moved-parent"] = { ...server.tables.workout_exercises.exercise, id: "moved-parent" };
  server.tables.exercise_sets.set.workout_exercise_id = "moved-parent";
  const before = await pending(); const count = server.writes.length;
  const result = await syncService.pushToSupabase("user", server.client);
  expect(result.error).toContain("parent mismatch"); expect(await pending()).toEqual(before);
  expect(server.writes).toHaveLength(count); expect(server.tables.exercise_sets.set).toBeDefined();
});

const lifecycle = (table: string, id: string, owner = "user") => local.db.getFirstAsync("SELECT * FROM sync_upload_lifecycle WHERE user_id=? AND table_name=? AND record_id=?", [owner,table,id]);
it("cancels multiple local set edits, uploads survivors, and sends no request for the deleted set", async () => {
  const original=fixture(); original.exercises[0].sets.push({...original.exercises[0].sets[0],id:"deleted-set",set_order:2});
  expect((await workoutService.insertWorkout(original,"user")).success).toBe(true);
  for(const reps of [20,30]) expect((await setService.updateSet("user",{...original.exercises[0].sets[1],reps})).success).toBe(true);
  expect(await lifecycle("exercise_sets","deleted-set")).toMatchObject({state:"local_only",attempt_count:0});
  expect((await setService.deleteSet("user","deleted-set")).success).toBe(true);
  expect((await pending()).some((row:any)=>row.record_id==="deleted-set")).toBe(false);
  expect(await lifecycle("exercise_sets","deleted-set")).toMatchObject({state:"canceled",attempt_count:0});
  expect(await readDeletionEvidence(local.db,"user","exercise_sets","deleted-set")).toBeNull();
  const server=remote(); expect((await syncService.refreshWorkouts(server.client,"user")).success).toBe(true);
  expect(server.writes.some(([,id])=>id==="deleted-set")).toBe(false);
  expect(server.tables.exercise_sets.set).toBeDefined(); expect(await pending()).toEqual([]);
});
it.each(["delete first","claim first"])("serializes upload claim versus deletion: %s", async order=>{
  await save(); const item=(await pending()).find((row:any)=>row.record_id==="set");
  if(order==="claim first") expect(await withLocalTransaction(db=>claimUpload(db,"user",item))).toBe(true);
  expect((await setService.deleteSet("user","set")).success).toBe(true);
  if(order==="delete first") {
    expect(await withLocalTransaction(db=>claimUpload(db,"user",item))).toBe(false);
    expect(await lifecycle("exercise_sets","set")).toMatchObject({state:"canceled",attempt_count:0});
    expect((await pending()).some((row:any)=>row.record_id==="set")).toBe(false);
  } else {
    expect(await lifecycle("exercise_sets","set")).toMatchObject({state:"uncertain",attempt_count:1,last_attempt_queue_id:item.id});
    expect((await pending()).filter((row:any)=>row.record_id==="set").map((row:any)=>row.operation)).toEqual(["insert","delete"]);
    expect(await readDeletionEvidence(local.db,"user","exercise_sets","set")).toMatchObject({remoteConfirmed:false});
  }
});
it("keeps a claimed request safe when deletion occurs while its response is in flight", async()=>{
  await save(); const server=remote(); const from=server.client.from;
  let release!:()=>void; let started!:()=>void;
  const signal=new Promise<void>(resolve=>{started=resolve;}); const gate=new Promise<void>(resolve=>{release=resolve;});
  server.client.from=(table:string)=>{
    const query=from(table);
    if(table==="exercise_sets") { const insert=query.insert; query.insert=async(data:any)=>{
      if(data.id==="set") {started();await gate;} return insert(data);
    }; }
    return query;
  };
  const uploading=syncService.pushToSupabase("user",server.client);
  await signal; expect(await lifecycle("exercise_sets","set")).toMatchObject({state:"uncertain",attempt_count:1});
  expect((await setService.deleteSet("user","set")).success).toBe(true);
  expect(await readDeletionEvidence(local.db,"user","exercise_sets","set")).not.toBeNull();
  release(); expect((await uploading).success).toBe(true);
  expect(server.tables.exercise_sets.set).toBeUndefined(); expect(await pending()).toEqual([]);
  expect(await readDeletionEvidence(local.db,"user","exercise_sets","set")).toMatchObject({remoteConfirmed:true});
});
it("a crash after claim but before transmission stays uncertain rather than cancelable", async()=>{
  await save(); const item=(await pending()).find((row:any)=>row.record_id==="set");
  await withLocalTransaction(db=>claimUpload(db,"user",item));
  expect(await withLocalTransaction(db=>cancelNeverAttempted(db,"user","exercise_sets","set"))).toBe(false);
  expect((await setService.deleteSet("user","set")).success).toBe(true);
  const server=remote(); expect((await syncService.pushToSupabase("user",server.client)).success).toBe(false);
  expect(server.writes.some(([,id])=>id==="set")).toBe(false);
  expect((await pending()).filter((row:any)=>row.record_id==="set")).toHaveLength(2);
});
it("rolls back both local-only queue cancellation and the lifecycle marker when domain deletion fails", async()=>{
  await save(); const before=await pending();
  await local.db.execAsync("CREATE TRIGGER fail_local_delete BEFORE DELETE ON exercise_sets WHEN OLD.id='set' BEGIN SELECT RAISE(ABORT,'domain failure'); END");
  expect((await setService.deleteSet("user","set")).success).toBe(false);
  expect(await pending()).toEqual(before); expect(await lifecycle("exercise_sets","set")).toMatchObject({state:"local_only",attempt_count:0});
  expect(await local.db.getFirstAsync("SELECT id FROM exercise_sets WHERE id='set'")).not.toBeNull();
});
it("does not transmit if durable claim persistence fails", async()=>{
  await save(); const before=await pending(); const server=remote();
  await local.db.execAsync("CREATE TRIGGER fail_upload_claim BEFORE UPDATE ON sync_upload_lifecycle BEGIN SELECT RAISE(ABORT,'claim failure'); END");
  expect((await syncService.pushToSupabase("user",server.client)).success).toBe(false);
  expect(server.writes).toEqual([]); expect(await pending()).toEqual(before);
  expect(await lifecycle("workouts","workout")).toMatchObject({state:"local_only",attempt_count:0});
});
it("records failed request attempts durably and retries without regaining local-only status", async()=>{
  await save(); const server=remote(); server.failures.set("exercise_sets",{message:"Network outcome unknown"});
  expect((await syncService.pushToSupabase("user",server.client)).success).toBe(false);
  expect(await lifecycle("exercise_sets","set")).toMatchObject({state:"uncertain",attempt_count:1});
  server.failures.clear(); expect((await syncService.pushToSupabase("user",server.client)).success).toBe(true);
  expect(await lifecycle("exercise_sets","set")).toMatchObject({state:"confirmed",attempt_count:2});
});
it("cancels a fully local workout subtree across all six record types without remote writes", async()=>{
  await save(); expect((await workoutService.deleteWorkout("user","workout")).success).toBe(true);
  expect(await pending()).toEqual([]);
  expect((await local.db.getAllAsync("SELECT state FROM sync_upload_lifecycle")).map((row:any)=>row.state)).toEqual(Array(6).fill("canceled"));
  const server=remote(); await syncService.sync(server.client,"user"); expect(server.writes).toEqual([]);
});
it("a repeated cancellation in one mutation cannot create a redundant tombstone", async()=>{
  await save();
  await withLocalTransaction(async db=>{
    expect(await cancelNeverAttempted(db,"user","exercise_sets","set")).toBe(true);
    expect(await cancelNeverAttempted(db,"user","exercise_sets","set")).toBe(true);
    await db.runAsync("DELETE FROM exercise_sets WHERE id='set'");
  });
  expect((await pending()).some((row:any)=>row.record_id==="set")).toBe(false);
});
it("scopes claims and cancellation to the authenticated owner", async()=>{
  await save(); const before=await pending(); const item=before.find((row:any)=>row.record_id==="set");
  await expect(withLocalTransaction(db=>claimUpload(db,"other",item))).rejects.toThrow("owner mismatch");
  expect(await withLocalTransaction(db=>cancelNeverAttempted(db,"other","exercise_sets","set"))).toBe(false);
  expect(await pending()).toEqual(before); expect(await lifecycle("exercise_sets","set")).toMatchObject({state:"local_only",attempt_count:0});
});
it("adds the lifecycle table idempotently without backfilling legacy queue evidence", async()=>{
  await save(); await local.db.execAsync("DROP TABLE sync_upload_lifecycle");
  const before=await pending(); const meta=await local.db.getAllAsync("SELECT * FROM app_meta");
  for(const sql of SCHEMA_STATEMENTS) await local.db.execAsync(sql);
  for(const sql of SCHEMA_STATEMENTS) await local.db.execAsync(sql);
  expect(await local.db.getAllAsync("SELECT * FROM sync_upload_lifecycle")).toEqual([]);
  expect(await pending()).toEqual(before); expect(await local.db.getAllAsync("SELECT * FROM app_meta")).toEqual(meta);
  expect(await withLocalTransaction(db=>cancelNeverAttempted(db,"user","exercise_sets","set"))).toBe(false);
  await withLocalTransaction(db=>registerLocalCreation(db,"user","exercise_sets","set"));
  expect(await lifecycle("exercise_sets","set")).toBeNull();
});
it("preserves the four legacy 467/468/471/472 entries and v2 receipts without inventing origin evidence", async()=>{
  await save(); const server=remote(); await syncService.pushToSupabase("user",server.client);
  const ids=["4da25ea9-93e7-4d84-9082-d25a5e72da52","ee77f5c0-b2c1-45df-96a6-329d3030fc4d"];
  for(let i=0;i<2;i++) {
    await local.db.runAsync("INSERT INTO sync_queue (id,user_id,table_name,record_id,operation,data,synced) VALUES (?,'user','exercise_sets',?,'insert',?,0)",[467+i,ids[i],JSON.stringify({id:ids[i],workout_exercise_id:"exercise"})]);
    const queueId=i===0?472:471;
    await local.db.runAsync("INSERT INTO sync_queue (id,user_id,table_name,record_id,operation,data,synced) VALUES (?,'user','exercise_sets',?,'delete',?,0)",[queueId,ids[i],JSON.stringify({id:ids[i]})]);
    await local.db.runAsync("INSERT INTO app_meta (key,value) VALUES (?,?)",[deletionEvidenceKey("user","exercise_sets",ids[i]),JSON.stringify({version:2,userId:"user",table:"exercise_sets",recordId:ids[i],workoutId:"workout",queueId,parents:[{table:"workout_exercises",id:"exercise"},{table:"workouts",id:"workout"}],remoteConfirmed:false})]);
  }
  const before=await pending();const meta=await local.db.getAllAsync("SELECT * FROM app_meta ORDER BY key");const writes=server.writes.length;
  expect((await syncService.pushToSupabase("user",server.client)).success).toBe(false);
  expect(await pending()).toEqual(before);expect(server.writes).toHaveLength(writes);
  expect(await local.db.getAllAsync("SELECT * FROM app_meta ORDER BY key")).toEqual(meta);
  for(const id of ids) expect(await lifecycle("exercise_sets",id)).toBeNull();
});

it("cancels new children on an already-uploaded workout without touching existing remote records", async()=>{
  await save(); const server=remote(); await syncService.pushToSupabase("user",server.client);
  const original=(await workoutService.getWorkoutById("user","workout"))!;
  const addition={...original.exercises[0],id:"new-local-exercise",exercise_order:1,sets:[{...original.exercises[0].sets[0],id:"new-local-set",workout_exercise_id:"new-local-exercise"}]};
  expect((await workoutService.updateWorkout("user","workout",buildWorkoutChanges(original,{...original,exercises:[...original.exercises,addition]}))).success).toBe(true);
  expect(await lifecycle("workouts","workout")).toMatchObject({state:"confirmed"});
  expect(await lifecycle("workout_exercises",addition.id)).toMatchObject({state:"local_only"});
  const current=(await workoutService.getWorkoutById("user","workout"))!;
  expect((await workoutService.updateWorkout("user","workout",buildWorkoutChanges(current,original))).success).toBe(true);
  expect(await pending()).toEqual([]); const writes=server.writes.length;
  expect((await syncService.refreshWorkouts(server.client,"user")).success).toBe(true);
  expect(server.writes).toHaveLength(writes); expect(server.tables.workout_exercises.exercise).toBeDefined();
});
it("persists an uncertain claim across closing and reopening SQLite", async()=>{
  const fs=require("fs"),path=require("path"),os=require("os"); const dir=fs.mkdtempSync(path.join(os.tmpdir(),"fitness-upload-claim-"));
  const filename=path.join(dir,"workout.db"); const disk=database(filename);opened.push(disk);local=disk;jest.mocked(getDB).mockResolvedValue(disk.db);
  await disk.db.runAsync("INSERT INTO profiles (id) VALUES ('user')");await disk.db.runAsync("INSERT INTO exercises (id,name) VALUES ('catalog','Movement')");
  try {
    await save();const item=(await pending()).find((row:any)=>row.record_id==="set");await withLocalTransaction(db=>claimUpload(db,"user",item));
    disk.close();const reopened=database(filename);opened.push(reopened);local=reopened;jest.mocked(getDB).mockResolvedValue(reopened.db);
    expect(await lifecycle("exercise_sets","set")).toMatchObject({state:"uncertain",attempt_count:1,last_attempt_queue_id:item.id});
    expect((await setService.deleteSet("user","set")).success).toBe(true);
    expect((await pending()).filter((row:any)=>row.record_id==="set").map((row:any)=>row.operation)).toEqual(["insert","delete"]);
  }finally{opened.forEach(item=>item.close());fs.unlinkSync(filename);fs.rmdirSync(dir);}
});
it("retries remote insert success with a lost response as uncertain, without canceling the remote row", async()=>{
  await save();const server=remote();const from=server.client.from;let lose=true;
  server.client.from=(table:string)=>{const query=from(table);if(table==="exercise_sets"){const insert=query.insert;query.insert=async(data:any)=>{const result=await insert(data);if(data.id==="set"&&lose){lose=false;return {error:new Error("Response lost after commit")};}return result;};}return query;};
  expect((await syncService.pushToSupabase("user",server.client)).success).toBe(false);
  expect(server.tables.exercise_sets.set).toBeDefined();expect(await lifecycle("exercise_sets","set")).toMatchObject({state:"uncertain",attempt_count:1});
  expect((await syncService.pushToSupabase("user",server.client)).success).toBe(true);
  expect(await lifecycle("exercise_sets","set")).toMatchObject({state:"confirmed",attempt_count:2});
  expect((await setService.deleteSet("user","set")).success).toBe(true);
  expect((await pending()).some((row:any)=>row.record_id==="set"&&row.operation==="delete")).toBe(true);
  expect((await syncService.pushToSupabase("user",server.client)).success).toBe(true);expect(server.tables.exercise_sets.set).toBeUndefined();
});
it("does not treat authenticated remote hydration as local-only creation", async()=>{
  await save();const server=remote();await syncService.pushToSupabase("user",server.client);
  await connect();expect(await local.db.getAllAsync("SELECT * FROM sync_upload_lifecycle")).toEqual([]);
  await syncService.pullFromSupabase(server.client,"user");
  expect(await lifecycle("exercise_sets","set")).toMatchObject({state:"confirmed",attempt_count:0});
  expect((await setService.deleteSet("user","set")).success).toBe(true);
  expect((await pending()).map((row:any)=>row.operation)).toEqual(["delete"]);
  expect((await syncService.pushToSupabase("user",server.client)).success).toBe(true);
});
