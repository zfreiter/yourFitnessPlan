import { SupabaseClient } from "@supabase/supabase-js";
import { getDB } from "./database";
import { workoutDeletionReceiptKey, workoutDeletionReceiptValue } from "./workoutDeletionOwnership";
import { syncErrorCode } from "@/utils/workoutSyncDiagnostics";

/** Read-only metadata inspection, including workouts already removed locally. */
export async function inspectDevWorkoutDeletion(supabase: SupabaseClient, userId: string, workoutId: string) {
  if (!__DEV__) throw new Error("Deletion inspection is development-only");
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || auth.user?.id !== userId) throw new Error("Authenticated account could not be verified");
  const db = await getDB();
  const local = await db.getFirstAsync<{ user_id: string }>("SELECT user_id FROM workouts WHERE id = ?", [workoutId]);
  const rows = await db.getAllAsync<{ id: number; user_id: string | null; operation: string; data: string; synced: number }>(
    `SELECT id, user_id, operation, data, synced FROM sync_queue
     WHERE table_name = 'workouts' AND record_id = ? AND (user_id = ? OR user_id IS NULL) ORDER BY id`,
    [workoutId, userId],
  );
  const queue = await Promise.all(rows.map(async row => {
    let payload: Record<string, unknown> = {};
    try { payload = JSON.parse(row.data); } catch { /* Report malformed identity below. */ }
    const receipt = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_meta WHERE key = ?", [workoutDeletionReceiptKey(row.id)]);
    return {
      queueId: row.id, userId: row.user_id, operation: row.operation, synced: row.synced === 1,
      payloadIdMatches: payload?.id === workoutId,
      payloadContainsOwner: typeof payload?.user_id === "string",
      payloadOwnerMatches: payload?.user_id === userId,
      verifiedDeletionReceipt: receipt?.value === workoutDeletionReceiptValue(userId, workoutId),
    };
  }));
  const { data, error } = await supabase.from("workouts").select("id,user_id").eq("id", workoutId).limit(1);
  return {
    workoutId, authenticatedUserId: userId,
    localState: !local ? "absent" : local.user_id === userId ? "owned" : "owner-mismatch",
    queue,
    remote: error ? { state: "read-failed", errorCode: syncErrorCode(error) } :
      !Array.isArray(data) ? { state: "invalid-response" } :
      data.length === 0 ? { state: "absent-or-not-visible" } :
      { state: data[0].user_id === userId ? "owned" : "owner-mismatch" },
  };
}
