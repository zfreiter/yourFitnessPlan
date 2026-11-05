// Invoked explicitly through Metro by run-verified-legacy-recovery.cjs.
module.exports = function startVerifiedLegacyRecovery(createRecovery, options) {
  if (!__DEV__) throw new Error("Recovery is development-only");
  const modules = Array.from(__r.getModules());
  const load = name => { const entry = modules.find(([, module]) => module.verboseName === name); if (!entry) throw new Error(`Missing module ${name}`); return __r(entry[0]); };
  globalThis.__verifiedLegacyRecovery = { state: "running", mode: options.apply ? "apply" : "preview" };
  (async () => {
    const recovery = createRecovery();
    const { supabase } = load("lib/supabaseClient.ts");
    const { syncService } = load("services/syncService.ts");
    const runtimeProjectRef = new URL(supabase.supabaseUrl).hostname.split(".")[0];
    if (runtimeProjectRef !== recovery.projectRef) throw new Error("Android runtime project differs from verified manifest");
    const { data, error } = await supabase.auth.getUser();
    if (error || data.user?.id !== recovery.userId) throw new Error("Authenticated owner differs from verified manifest");
    if (syncService.isSyncActive(recovery.userId)) throw new Error("Synchronization is not idle");
    let sessionChanged = false, syncStarted = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user.id !== recovery.userId || event === "SIGNED_OUT" || event === "SIGNED_IN") sessionChanged = true;
    });
    const unsubscribeSync = syncService.subscribeSyncActivity((userId, active) => {
      if (userId === recovery.userId && active) {
        syncStarted = true;
        // Invalidate a newly scheduled run synchronously before it can start.
        // Recovery aborts too: an overlapping request never shares the snapshot.
        syncService.invalidateUserSync(userId);
      }
    });
    const check = () => {
      if (sessionChanged || syncStarted || syncService.isSyncActive(recovery.userId)) throw new Error("Session or synchronization changed during recovery");
    };
    try {
      const db = await load("services/database.ts").getDB();
      const preview = await recovery.preview(db, data.user.id, check);
      for (const id of recovery.ids) {
        check();
        const response = await supabase.from("workouts").select("id,user_id").eq("id", id).limit(1);
        if (response.error || !Array.isArray(response.data) || response.data.length !== 0) throw new Error(`Remote state changed or could not be read for ${id}`);
      }
      const current = await supabase.auth.getUser();
      if (current.error || current.data.user?.id !== data.user.id) throw new Error("Authenticated account changed during preview");
      check();
      const metadata = { runtimeProjectRef, authenticatedUserId: data.user.id, pendingBefore: preview.pendingBefore,
        targetRows: preview.rows.map(row => ({ id: row.id, userId: row.user_id, table: row.table_name, recordId: row.record_id, operation: row.operation, synced: row.synced })),
        unrelatedQueueRows: preview.untouched.length };
      if (!options.apply) return { state: "preview-verified", ...metadata };
      const result = await recovery.cancel(db, data.user.id, {
        runtimeProjectRef, adminProjectRef: options.adminProjectRef, bypassesRls: options.bypassesRls,
        globallyAbsent: options.globallyAbsent, confirmation: options.confirmation,
      }, preview, check);
      console.log("[verified-legacy-recovery]", result);
      return { state: "completed", ...metadata, ...result, remoteWrites: 0 };
    } finally { unsubscribeSync(); subscription.unsubscribe(); }
  })().then(result => { globalThis.__verifiedLegacyRecovery = result; }, error => {
    globalThis.__verifiedLegacyRecovery = { state: "failed", message: error.message };
  });
  return "Verified recovery started";
};
