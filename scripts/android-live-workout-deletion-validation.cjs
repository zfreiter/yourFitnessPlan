// Explicit Android validation. Roundtrip mode creates and removes only its own
// generated disposable workout through the normal persistence/refresh services.
module.exports = function startLiveWorkoutDeletionValidation(options) {
  if (!__DEV__) throw new Error("Validation is development-only");
  const modules = Array.from(__r.getModules());
  const load = name => { const entry = modules.find(([, module]) => module.verboseName === name); if (!entry) throw new Error(`Missing module ${name}`); return __r(entry[0]); };
  globalThis.__liveWorkoutDeletionValidation = { state: "running", mode: options.roundtrip ? "roundtrip" : "startup-inspection" };
  (async () => {
    const { supabase } = load("lib/supabaseClient.ts");
    const { syncService } = load("services/syncService.ts");
    const { workoutService } = load("services/workoutService.ts");
    const projectRef = new URL(supabase.supabaseUrl).hostname.split(".")[0];
    if (projectRef !== "bojjxwudhkvcjipglwps") throw new Error("Validation project mismatch");
    const { data, error } = await supabase.auth.getUser();
    if (error || data.user?.id !== "a47d200f-2dde-4b20-bc4a-c1008ed338d7") throw new Error("Validation account mismatch");
    const userId = data.user.id;
    const db = await load("services/database.ts").getDB();
    const countPending = async () => (await db.getFirstAsync("SELECT COUNT(*) AS count FROM sync_queue WHERE synced=0")).count;
    const legacyCount = async () => (await db.getFirstAsync("SELECT COUNT(*) AS count FROM sync_queue WHERE id IN (287,288,289,290)")).count;
    const legacyRows = await legacyCount();
    const pending = await countPending();
    if (legacyRows !== 0 || pending !== 0 || syncService.isSyncActive(userId)) throw new Error("Startup not idle or queue not empty after recovery");
    const stamp = await db.getFirstAsync("SELECT value FROM app_meta WHERE key=?", [`workouts_synced_at:${userId}`]);
    if (!options.roundtrip) return { state: "completed", projectRef, authenticatedUserId: userId, legacyQueueRows: legacyRows,
      remainingPending: pending, syncActive: false, lastWorkoutPull: stamp?.value ?? null };
    if (options.confirmation !== "CREATE AND DELETE ONE DISPOSABLE WORKOUT") throw new Error("Explicit disposable-workout confirmation required");
    const cryptoEntry = modules.find(([, module]) => /node_modules\/expo-crypto\/build\/(Crypto|index)\.js$/.test(module.verboseName || ""));
    if (!cryptoEntry) throw new Error("Native UUID generator is unavailable");
    const workoutId = __r(cryptoEntry[0]).randomUUID();
    const results = [];
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    const readRemote = async () => {
      const response = await supabase.from("workouts").select("id,user_id").eq("id", workoutId).limit(1);
      if (response.error || !Array.isArray(response.data)) throw new Error("Disposable workout remote verification failed");
      return response.data;
    };
    try {
      const created = await workoutService.insertWorkout({ id: workoutId, user_id: userId,
        name: `Disposable deletion verification ${new Date().toISOString()}`,
        workoutType: "strength", scheduled_datetime: new Date(Date.now() + 86400000).toISOString(),
        is_completed: 0, completed_at: null, exercises: [], cardio_entries: [], circuit_rounds: [] }, userId);
      assert(created.success, `Disposable creation failed: ${created.error}`);
      assert(!syncService.isSyncActive(userId) && (await readRemote()).length === 0, "Mutation unexpectedly synchronized");
      const uploaded = await syncService.refreshWorkouts(supabase, userId);
      assert(uploaded.success, `Manual upload refresh failed: ${uploaded.error}`);
      const remoteBefore = await readRemote();
      assert(remoteBefore.length === 1 && remoteBefore[0].user_id === userId, "Disposable upload ownership was not verified");
      results.push({ check: "uploaded-owned-remote-workout", passed: true });
      const removed = await workoutService.deleteWorkout(userId, workoutId);
      assert(removed.success, `Local deletion failed: ${removed.error}`);
      assert(!await db.getFirstAsync("SELECT id FROM workouts WHERE id=?", [workoutId]), "Deleted fixture still exists locally");
      const tombstone = await db.getFirstAsync("SELECT * FROM sync_queue WHERE user_id=? AND table_name='workouts' AND record_id=? AND operation='delete' AND synced=0", [userId, workoutId]);
      assert(tombstone, "New deletion tombstone is absent");
      const receipt = await db.getFirstAsync("SELECT value FROM app_meta WHERE key=?", [`workout-delete-owner:${tombstone.id}`]);
      assert(receipt?.value === JSON.stringify({ userId, workoutId }), "New deletion receipt is missing or mismatched");
      assert(!syncService.isSyncActive(userId) && (await readRemote()).length === 1, "Local deletion unexpectedly synchronized");
      results.push({ check: "local-deletion-and-durable-receipt", passed: true, deleteQueueId: tombstone.id });
      const refreshed = await syncService.refreshWorkouts(supabase, userId);
      assert(refreshed.success, `Manual deletion refresh failed: ${refreshed.error}`);
      assert((await readRemote()).length === 0, "Remote disposable workout survived deletion");
      const acknowledged = await db.getFirstAsync("SELECT synced FROM sync_queue WHERE id=? AND user_id=?", [tombstone.id, userId]);
      assert(acknowledged?.synced === 1, "New delete was not acknowledged");
      assert(await countPending() === 0 && await legacyCount() === 0, "Queue not clear after round trip");
      results.push({ check: "remote-deletion-and-acknowledgment", passed: true });
      const before = await db.getAllAsync("SELECT id,operation,synced FROM sync_queue WHERE record_id=? ORDER BY id", [workoutId]);
      const repeat = await syncService.refreshWorkouts(supabase, userId);
      assert(repeat.success && (await readRemote()).length === 0 && await countPending() === 0, "Repeated refresh failed");
      const after = await db.getAllAsync("SELECT id,operation,synced FROM sync_queue WHERE record_id=? ORDER BY id", [workoutId]);
      assert(JSON.stringify(before) === JSON.stringify(after), "Repeated refresh changed acknowledged fixture queue");
      results.push({ check: "repeat-manual-refresh", passed: true });
      return { state: "completed", projectRef, workoutId, results, fixtureQueue: after, legacyQueueRows: 0,
        remainingPending: 0, remoteWorkoutDeleted: true, newDeleteAcknowledged: true };
    } catch (failure) {
      // Preserve all evidence and pending operations on failure. Never clear the
      // queue or issue an unvalidated direct remote delete as test cleanup.
      return { state: "failed", workoutId, message: failure.message, results, remainingPending: await countPending() };
    }
  })().then(result => { globalThis.__liveWorkoutDeletionValidation = result; }, error => {
    globalThis.__liveWorkoutDeletionValidation = { state: "failed", message: error.message };
  });
  return "Android validation started";
};
