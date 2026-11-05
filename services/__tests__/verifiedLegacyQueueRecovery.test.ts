import { createRequire } from "module";
import { SCHEMA_STATEMENTS } from "../schema";
const createRecovery = require("../../scripts/verified-legacy-queue-recovery.cjs");
const { DatabaseSync } = createRequire(__filename)("node:sqlite");
let sqlite: any, db: any, recovery: any;
const evidence = () => ({ adminProjectRef: recovery.projectRef, runtimeProjectRef: recovery.projectRef,
  bypassesRls: true, globallyAbsent: true, confirmation: "CANCEL EXACTLY 287 288 289 290" });
const rows = () => db.getAllAsync("SELECT * FROM sync_queue ORDER BY id");
beforeEach(async () => {
  sqlite = new DatabaseSync(":memory:"); SCHEMA_STATEMENTS.forEach(sql => sqlite.exec(sql));
  recovery = createRecovery();
  db = {
    getAllAsync: async (sql: string, params: any[] = []) => sqlite.prepare(sql).all(...params),
    getFirstAsync: async (sql: string, params: any[] = []) => sqlite.prepare(sql).get(...params) ?? null,
    runAsync: async (sql: string, params: any[] = []) => ({ changes: Number(sqlite.prepare(sql).run(...params).changes) }),
    withExclusiveTransactionAsync: async (run: any) => { sqlite.exec("BEGIN"); try { await run(db); sqlite.exec("COMMIT"); } catch (error) { sqlite.exec("ROLLBACK"); throw error; } },
  };
  await db.runAsync("INSERT INTO profiles (id) VALUES (?)", [recovery.userId]);
  for (const row of recovery.expected) {
    await db.runAsync("INSERT INTO sync_queue (id,user_id,table_name,record_id,operation,data,synced) VALUES (?,?,'workouts',?,?,?,0)",
      [row.id,recovery.userId,row.record_id,row.operation,JSON.stringify({ id: row.record_id, ...(row.operation === "insert" ? { user_id: recovery.userId } : {}) })]);
  }
});
afterEach(() => sqlite.close());
it("cancels exactly the verified four entries atomically while preserving unrelated owners and rows", async () => {
  await db.runAsync("INSERT INTO sync_queue (id,user_id,table_name,record_id,operation,data,synced) VALUES (300,'inactive','workouts','other','insert','{}',0)");
  const before = await rows(), preview = await recovery.preview(db,recovery.userId);
  expect(await recovery.cancel(db,recovery.userId,evidence(),preview)).toMatchObject({ canceledQueueIds:[287,288,289,290], canceledCount:4,remainingPending:1 });
  expect(await rows()).toEqual(before.filter((row: any) => row.id === 300));
});
it.each(["adminProjectRef","runtimeProjectRef","bypassesRls","globallyAbsent","confirmation"])("refuses missing or mismatched %s evidence without changing rows", async key => {
  const before = await rows(), preview = await recovery.preview(db,recovery.userId), proof: any = evidence(); proof[key] = undefined;
  await expect(recovery.cancel(db,recovery.userId,proof,preview)).rejects.toThrow("evidence"); expect(await rows()).toEqual(before);
});
it("does not equate an unacknowledged insert or an empty authenticated SELECT with authoritative absence", async () => {
  const before = await rows(), preview = await recovery.preview(db,recovery.userId);
  await expect(recovery.cancel(db,recovery.userId,{...evidence(),globallyAbsent:false},preview)).rejects.toThrow("evidence");
  expect(await rows()).toEqual(before);
});
it("refuses a different authenticated user and mismatched row ownership", async () => {
  await expect(recovery.preview(db,"other")).rejects.toThrow("owner");
  await db.runAsync("UPDATE sync_queue SET user_id='other' WHERE id=288"); const before=await rows();
  await expect(recovery.preview(db,recovery.userId)).rejects.toThrow("288"); expect(await rows()).toEqual(before);
});
it.each(["synced=1","operation='update'","record_id='changed'","data='{}'"])("rejects changed row state: %s", async change => {
  sqlite.exec(`UPDATE sync_queue SET ${change} WHERE id=288`); const before=await rows();
  await expect(recovery.preview(db,recovery.userId)).rejects.toThrow(); expect(await rows()).toEqual(before);
});
it("rejects a reappeared local workout", async () => {
  await db.runAsync("INSERT INTO workouts (id,user_id,name,type,scheduled_datetime) VALUES (?,?,'Reappeared','strength','2035-01-01T12:00')",[recovery.ids[0],recovery.userId]);
  await expect(recovery.preview(db,recovery.userId)).rejects.toThrow("reappeared");
});
it.each(["workout_exercises","exercise_sets","cardio_intervals"])("rejects surviving %s dependencies, including indirect links", async table => {
  const parent = table === "workout_exercises" ? { workout_id: recovery.ids[0] } : table === "exercise_sets" ? { workout_exercise_id: "child" } : { cardio_entry_id: "child" };
  if (table !== "workout_exercises") {
    await db.runAsync("INSERT INTO sync_queue (id,user_id,table_name,record_id,operation,data,synced) VALUES (301,?,?,?,'insert',?,1)",
      [recovery.userId,table === "exercise_sets" ? "workout_exercises" : "cardio_entries","child",JSON.stringify({id:"child",workout_id:recovery.ids[0]})]);
  }
  await db.runAsync("INSERT INTO sync_queue (id,user_id,table_name,record_id,operation,data,synced) VALUES (302,?,?,?,'insert',?,0)",
    [recovery.userId,table,"dependent",JSON.stringify({id:"dependent",...parent})]);
  await expect(recovery.preview(db,recovery.userId)).rejects.toThrow("Dependent queue");
});
it("revalidates the complete queue snapshot inside the transaction", async () => {
  const preview=await recovery.preview(db,recovery.userId);
  await db.runAsync("UPDATE sync_queue SET created_at='changed' WHERE id=287"); const before=await rows();
  await expect(recovery.cancel(db,recovery.userId,evidence(),preview)).rejects.toThrow("changed after preview"); expect(await rows()).toEqual(before);
});
it("rolls back every cancellation when a delete trigger fails halfway through", async () => {
  const before=await rows(), preview=await recovery.preview(db,recovery.userId);
  sqlite.exec("CREATE TRIGGER reject_recovery BEFORE DELETE ON sync_queue WHEN OLD.id=289 BEGIN SELECT RAISE(ABORT,'fixture cleanup failure'); END");
  await expect(recovery.cancel(db,recovery.userId,evidence(),preview)).rejects.toThrow("fixture cleanup failure"); expect(await rows()).toEqual(before);
});
it("rolls back when authentication or synchronization changes during cancellation", async () => {
  const before=await rows(), preview=await recovery.preview(db,recovery.userId); let checks=0;
  await expect(recovery.cancel(db,recovery.userId,evidence(),preview,()=>{if(++checks===4)throw new Error("Session changed");})).rejects.toThrow("Session changed");
  expect(await rows()).toEqual(before);
});
it("does not clear anything if repeated after successful recovery", async () => {
  const preview=await recovery.preview(db,recovery.userId); await recovery.cancel(db,recovery.userId,evidence(),preview);
  await expect(recovery.preview(db,recovery.userId)).rejects.toThrow("history changed"); expect(await rows()).toHaveLength(0);
});
