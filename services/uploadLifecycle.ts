import { SQLiteDatabase } from "expo-sqlite";

export interface UploadOperation {
  id: number;
  user_id: string;
  table_name: string;
  record_id: string;
  operation: string;
  data: string;
}
const tables = new Set(["workouts", "workout_exercises", "exercise_sets", "circuit_rounds", "cardio_entries", "cardio_intervals"]);

// Called only at trusted local INSERT boundaries, on the transaction handle.
// Remote cache hydration and generic queue insertion must never call this.
export async function registerLocalCreation(db: SQLiteDatabase, userId: string, table: string, id: string) {
  if (!tables.has(table) || !userId) throw new Error("Invalid local creation identity");
  const lifecycle = await db.getFirstAsync("SELECT state FROM sync_upload_lifecycle WHERE user_id=? AND table_name=? AND record_id=?", [userId, table, id]);
  if (lifecycle) throw new Error("Record identity has previous upload lifecycle evidence");
  // Imported/reused identities with older queue history cannot establish origin.
  if (await db.getFirstAsync("SELECT id FROM sync_queue WHERE table_name=? AND record_id=? LIMIT 1", [table, id])) return;
  await db.runAsync("INSERT INTO sync_upload_lifecycle (user_id,table_name,record_id,state) VALUES (?,?,?,'local_only')", [userId, table, id]);
}

// Serialized with claims by the same exclusive SQLite transaction machinery.
// Returning true does not delete domain rows: that remains the caller's work
// in this transaction. No legacy receipt or queue record is retroactively trusted.
export async function cancelNeverAttempted(db: SQLiteDatabase, userId: string, table: string, id: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ state: string; attempt_count: number }>(
    "SELECT state,attempt_count FROM sync_upload_lifecycle WHERE user_id=? AND table_name=? AND record_id=?", [userId, table, id]);
  if (row?.state === "canceled") return true;
  if (row?.state !== "local_only" || row.attempt_count !== 0) return false;
  const history = await db.getAllAsync<{ user_id: string; operation: string; synced: number }>(
    "SELECT user_id,operation,synced FROM sync_queue WHERE table_name=? AND record_id=?", [table, id]);
  if (!history.length || history.filter(item => item.operation === "insert").length !== 1 ||
      history.some(item => item.user_id !== userId || item.synced !== 0 || !["insert", "update"].includes(item.operation))) return false;
  // A child with an uncertain deletion must not lose its remote parent.
  for (const child of await db.getAllAsync<{ table_name: string; record_id: string }>(
    "SELECT table_name,record_id FROM sync_queue WHERE user_id=? AND operation='delete' AND synced=0", [userId])) {
    const receipt = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_meta WHERE key=?", [`owned-delete:v2:${JSON.stringify([userId, child.table_name, child.record_id])}`]);
    try {
      if (JSON.parse(receipt?.value ?? "null")?.parents?.some((parent: { table: string; id: string }) => parent.table === table && parent.id === id)) return false;
    } catch { return false; }
  }
  const changed = await db.runAsync("UPDATE sync_upload_lifecycle SET state='canceled' WHERE user_id=? AND table_name=? AND record_id=? AND state='local_only' AND attempt_count=0", [userId, table, id]);
  if (changed.changes !== 1) return false;
  await db.runAsync("DELETE FROM sync_queue WHERE user_id=? AND table_name=? AND record_id=? AND synced=0 AND operation IN ('insert','update')", [userId, table, id]);
  return true;
}

// Must be committed before the remote request. A crash at any later point
// remains uncertain, including a crash before the request actually leaves JS.
export async function claimUpload(db: SQLiteDatabase, userId: string, item: UploadOperation): Promise<boolean> {
  if (item.user_id !== userId) throw new Error("Upload claim owner mismatch");
  const queued = await db.getFirstAsync<{ data: string }>(
    "SELECT data FROM sync_queue WHERE id=? AND user_id=? AND table_name=? AND record_id=? AND operation=? AND synced=0",
    [item.id, userId, item.table_name, item.record_id, item.operation]);
  if (!queued || queued.data !== item.data) return false;
  if (item.operation !== "delete" && await db.getFirstAsync("SELECT id FROM sync_queue WHERE user_id=? AND table_name=? AND record_id=? AND operation='delete' AND synced=0", [userId, item.table_name, item.record_id])) return false;
  if (!tables.has(item.table_name)) return true;
  const row = await db.getFirstAsync<{ state: string }>("SELECT state FROM sync_upload_lifecycle WHERE user_id=? AND table_name=? AND record_id=?", [userId, item.table_name, item.record_id]);
  if (row?.state === "canceled") throw new Error("Canceled record has an unexpected queued operation; review required");
  await db.runAsync(`INSERT INTO sync_upload_lifecycle (user_id,table_name,record_id,state,attempt_count,last_attempt_queue_id)
    VALUES (?,?,?,'uncertain',1,?) ON CONFLICT(user_id,table_name,record_id) DO UPDATE SET
    state='uncertain',attempt_count=attempt_count+1,last_attempt_queue_id=excluded.last_attempt_queue_id`, [userId, item.table_name, item.record_id, item.id]);
  return true;
}

export async function confirmUpload(db: SQLiteDatabase, userId: string, item: UploadOperation) {
  if (tables.has(item.table_name)) await db.runAsync("UPDATE sync_upload_lifecycle SET state='confirmed' WHERE user_id=? AND table_name=? AND record_id=? AND state<>'canceled'", [userId, item.table_name, item.record_id]);
}

// Authenticated, validated pull data is known remote presence, not a new local
// creation. Preserve counters and never let hydration revive local-only proof.
export async function recordRemotePresence(db: SQLiteDatabase, userId: string, table: string, id: string) {
  if (!tables.has(table) || !userId) throw new Error("Invalid remote presence identity");
  await db.runAsync(`INSERT INTO sync_upload_lifecycle (user_id,table_name,record_id,state) VALUES (?,?,?,'confirmed')
    ON CONFLICT(user_id,table_name,record_id) DO UPDATE SET state='confirmed'`, [userId, table, id]);
}
