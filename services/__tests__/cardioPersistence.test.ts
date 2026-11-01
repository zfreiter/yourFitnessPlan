import { cardioService } from "../cardioService";
import { workoutService } from "../workoutService";
import { syncService } from "../syncService";
import { buildWorkoutChanges } from "@/utils/workoutChangeUtils";
import { Workout } from "@/types/interfaces/types";

jest.mock("@react-native-community/netinfo", () => ({ fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }) }));

jest.mock("../database", () => ({ getDB: jest.fn() }));
jest.mock("../localTransaction", () => ({ withLocalTransaction: jest.fn() }));
jest.mock("../localOwnership", () => ({ assertWorkoutOwned: jest.fn(), assertWorkoutChildOwned: jest.fn().mockResolvedValue("workout"), assertWorkoutChildDoesNotExist: jest.fn() }));

// SQL boundary adapter: stores the actual bound columns, not the input objects.
function database() {
  const tables: Record<string, any[]> = {};
  const db: any = {
    runAsync: jest.fn(async (sql: string, values: any[] = []) => {
      const insert = sql.match(/INSERT(?: OR IGNORE)? INTO (\w+)\s*\(([^)]+)\)/i);
      if (insert) {
        const row = Object.fromEntries(insert[2].split(",").map((column, index) => [column.trim(), values[index]]));
        if (insert[1] === "sync_queue") { row.synced = 0; row.id = (tables.sync_queue?.length ?? 0) + 1; }
        (tables[insert[1]] ??= []).push(row);
      }
      if (sql.includes("UPDATE sync_queue SET synced = 1")) tables.sync_queue.find(row => row.id === values[0]).synced = 1;
      const update = sql.match(/UPDATE (cardio_entries|cardio_intervals)\s+SET\s+([\s\S]+?)WHERE id = \?/i);
      if (update) {
        const row = tables[update[1]].find(row => row.id === values[values.length - 1]);
        update[2].split(",").forEach((assignment, index) => { row[assignment.split("=")[0].trim()] = values[index]; });
      }
    }),
    getFirstAsync: jest.fn(async (sql: string, values: any[]) => {
      if (sql.includes("COUNT")) return { count: 0 };
      if (sql.includes("SELECT cardio_entry_id")) return tables.cardio_intervals.find(row => row.id === values[0]);
      return tables.workouts?.[0] ?? null;
    }),
    getAllAsync: jest.fn(async (sql: string, values: any[]) => {
      if (sql.includes("sync_queue")) {
        const rank = ["workouts", "circuit_rounds", "workout_exercises", "exercise_sets", "cardio_entries", "cardio_intervals"];
        return [...(tables.sync_queue ?? [])].filter(row => row.synced === 0).sort((a,b) => rank.indexOf(a.table_name) - rank.indexOf(b.table_name));
      }
      if (sql.includes("FROM cardio_entries")) return (tables.cardio_entries ?? []).filter(row => row.workout_id === values[0]).sort((a,b) => a.entry_order-b.entry_order);
      if (sql.includes("FROM cardio_intervals")) return (tables.cardio_intervals ?? []).filter(row => row.cardio_entry_id === values[0]).sort((a,b) => a.interval_order-b.interval_order);
      if (sql.includes("FROM workouts")) return tables.workouts ?? [];
      return [];
    }),
  };
  return { db, tables };
}

it.each(["cardio", "strength", "circuit"] as const)("saves, reopens, edits and syncs full cardio data in %s workouts", async workoutType => {
  const { db, tables } = database();
  require("../database").getDB.mockResolvedValue(db);
  require("../localTransaction").withLocalTransaction.mockImplementation((task: any) => task(db));
  const workout: Workout = {
    id: "workout", user_id: "user", name: "Cardio", workoutType, scheduled_datetime: "2026-10-26T12:00", is_completed: 0, completed_at: null, exercises: [], circuit_rounds: [],
    cardio_entries: (["bike", "run", "walk", "swim", "sprint"] as const).map((activity, index) => ({
      id: activity, workout_id: "workout", activity, mode: activity === "sprint" ? "intervals" : "simple", duration: 30, distance: 4.5, calories: index === 0 ? 0 : 240, heart_rate_avg: 145, is_finisher: workoutType === "strength" ? 1 : 0, entry_order: index + 1,
      intervals: activity === "sprint" ? [2,1].map(order => ({ id: `interval-${order}`, cardio_entry_id: activity, interval_order: order, work_duration: 45 + order, rest_duration: 15, distance: 0.2, calories: 10 })) : [],
    })),
  };
  expect((await workoutService.insertWorkout(workout, "user")).success).toBe(true);
  const reopened = (await workoutService.getWorkoutById("user", "workout"))!.cardio_entries;
  expect(reopened.slice(0,4)).toEqual(workout.cardio_entries.slice(0,4));
  expect(reopened[4].intervals.map(i => [i.interval_order, i.work_duration, i.rest_duration])).toEqual([[1,46,15],[2,47,15]]);
  const edited = JSON.parse(JSON.stringify(workout)) as Workout;
  edited.cardio_entries[1].calories = 350;
  edited.cardio_entries[1].heart_rate_avg = 160;
  edited.cardio_entries[4].intervals[0].work_duration = 60;
  const changes = buildWorkoutChanges(workout, edited);
  expect((await workoutService.updateWorkout("user", "workout", changes)).success).toBe(true);
  expect((await cardioService.getWorkoutCardioEntries("user", "workout", db))[1]).toMatchObject({ id: "run", calories: 350, heart_rate_avg: 160 });
  const remote: Record<string, any[]> = {};
  const client: any = { from: (table: string) => ({
    insert: async (data: any) => { (remote[table] ??= []).push(data); return { error: null }; },
    update: (data: any) => ({ eq: async (_: string, id: string) => { Object.assign(remote[table].find(row => row.id === id), data); return { error: null }; } }),
  }) };
  expect((await syncService.pushToSupabase("user", client)).success).toBe(true);
  expect(remote.cardio_entries.find(row => row.id === "run")).toMatchObject({ calories: 350, heart_rate_avg: 160 });
  expect(remote.cardio_intervals.find(row => row.id === "interval-2")).toMatchObject({ work_duration: 60, rest_duration: 15, interval_order: 2 });
  const fresh = database();
  require("../localTransaction").withLocalTransaction.mockImplementation((task: any) => task(fresh.db));
  const payload = { ...remote.workouts[0], workout_exercises: [], circuit_rounds: [], cardio_entries: remote.cardio_entries.map(entry => ({ ...entry, cardio_intervals: (remote.cardio_intervals ?? []).filter(i => i.cardio_entry_id === entry.id) })) };
  const query: any = { select: () => query, eq: () => query, order: () => query, range: async () => ({ data: [payload], error: null }) };
  await syncService.pullFromSupabase({ from: () => query } as any, "user");
  expect(await cardioService.getWorkoutCardioEntries("user", "workout", fresh.db)).toEqual(await cardioService.getWorkoutCardioEntries("user", "workout", db));
});
