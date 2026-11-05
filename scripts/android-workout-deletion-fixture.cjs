// Executed by the Android Hermes runtime through the development-only Metro inspector.
// Clone service module instances so getDB and coordinator state never touch the app session.
module.exports = function startAndroidWorkoutDeletionFixtures() {
  if (!globalThis.__DEV__ || typeof globalThis.__r !== "function") throw new Error("A Metro development runtime is required");
  const modules = globalThis.__r.getModules();
  const find = name => {
    const item = Array.from(modules).find(([, module]) => module.verboseName === name);
    if (!item) throw new Error(`Module unavailable: ${name}`);
    return item[0];
  };
  const sqlite = globalThis.__r(find("node_modules/expo-sqlite/build/index.js"));
  const schema = globalThis.__r(find("services/schema.ts")).SCHEMA_STATEMENTS;
  const filename = `deletion-verification-${Date.now()}.db`;
  globalThis.__androidDeletionVerification = { state: "running" };
  (async () => {
    let db;
    let cache;
    function isolated(id) {
      const module = modules.get(id);
      const name = module?.verboseName ?? "";
      if (name === "services/database.ts") return { getDB: async () => db };
      if (name === "lib/supabaseClient.ts") throw new Error("Live Supabase client is forbidden in isolated fixtures");
      if (!/^(services|utils|types)\//.test(name)) return globalThis.__r(id);
      if (cache.has(id)) return cache.get(id).exports;
      const output = { exports: {} };
      cache.set(id, output);
      const importDefault = key => { const value = isolated(key); return value?.__esModule ? value.default : value; };
      const importAll = key => { const value = isolated(key); return value?.__esModule ? value : { ...value, default: value }; };
      module.factory(globalThis, isolated, importDefault, importAll, output, output.exports, module.dependencyMap);
      return output.exports;
    }
    let sync, workouts;
    function services() {
      cache = new Map();
      sync = isolated(find("services/syncService.ts")).syncService;
      workouts = isolated(find("services/workoutService.ts")).workoutService;
      sync.isOnline = async () => true;
      sync.setAuthenticatedUser("native-a");
    }
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    const server = () => {
      const rows = new Map();
      const calls = [];
      const control = { failure: null, silent: false, loseResponse: false };
      const client = { from: table => {
        assert(table === "workouts", "Unexpected fixture table");
        return {
          insert: async payload => { calls.push(["insert", payload.id]); rows.set(payload.id, { ...payload }); return { error: null }; },
          update: payload => ({ eq: async () => { calls.push(["update", payload.id]); rows.set(payload.id, { ...rows.get(payload.id), ...payload }); return { error: null }; } }),
          select: () => {
            const filters = {};
            const matches = () => Array.from(rows.values()).filter(row => Object.entries(filters).every(([key, value]) => row[key] === value));
            const query = { eq: (key, value) => { filters[key] = value; return query; }, order: () => query,
              limit: async () => ({ data: matches(), error: null }), range: async () => ({ data: matches(), error: null }) };
            return query;
          },
          delete: () => {
            const filters = {};
            const query = { eq: (key, value) => { filters[key] = value; return query; }, select: async () => {
              calls.push(["delete", filters.id]);
              if (control.failure) return { data: null, error: control.failure };
              const row = rows.get(filters.id);
              if (control.silent || !row || Object.entries(filters).some(([key, value]) => row[key] !== value)) return { data: [], error: null };
              rows.delete(filters.id);
              if (control.loseResponse) return { data: null, error: new Error("response lost") };
              return { data: [{ id: filters.id }], error: null };
            } };
            return query;
          },
        };
      } };
      return { client, rows, calls, control };
    };
    const pending = () => db.getAllAsync("SELECT * FROM sync_queue WHERE synced=0 ORDER BY id");
    async function create(id, userId = "native-a") {
      const result = await workouts.insertWorkout({ id, user_id: userId, name: "Isolated Android deletion fixture", workoutType: "strength",
        scheduled_datetime: "2035-04-07T12:00", is_completed: 0, completed_at: null, exercises: [], cardio_entries: [], circuit_rounds: [] }, userId);
      assert(result.success, `Create failed: ${result.error}`);
    }
    async function remove(id) { const result = await workouts.deleteWorkout("native-a", id); assert(result.success, `Local delete failed: ${result.error}`); }
    async function push(remote, userId = "native-a") { return sync.pushToSupabase(userId, remote.client); }
    const results = [];
    async function test(name, run) {
      await db.execAsync("DELETE FROM sync_queue; DELETE FROM app_meta; DELETE FROM workouts;");
      services();
      await run();
      results.push({ name, passed: true });
    }
    try {
      db = await sqlite.openDatabaseAsync(filename);
      for (const statement of schema) await db.execAsync(statement);
      await db.execAsync("PRAGMA foreign_keys=ON; INSERT INTO profiles (id) VALUES ('native-a'), ('native-b');");
      await test("uploaded workout with pending edit is deleted without replaying the edit", async () => {
        const remote = server(); await create("uploaded"); assert((await push(remote)).success, "Initial upload failed");
        await sync.addToSyncQueue("native-a", "workouts", "uploaded", "update", { id: "uploaded", name: "Pending edit" });
        await remove("uploaded"); assert((await push(remote)).success, "Deletion sync failed");
        assert(!remote.rows.has("uploaded") && (await pending()).length === 0, "Deletion not acknowledged");
        assert(!remote.calls.some(([operation]) => operation === "update"), "Stale update replayed");
      });
      await test("create then delete before first upload sends no remote writes", async () => {
        const remote = server(); await create("never-uploaded"); await remove("never-uploaded");
        assert((await push(remote)).success, "Never-uploaded deletion failed");
        assert(remote.calls.length === 0 && (await pending()).length === 0, "Unnecessary write or pending deletion");
      });
      await test("offline deletion survives closing SQLite and recreating services before startup sync", async () => {
        const remote = server(); await create("restart"); await remove("restart");
        await db.closeAsync(); db = await sqlite.openDatabaseAsync(filename); services();
        await sync.sync(remote.client, "native-a");
        assert((await pending()).length === 0 && remote.calls.length === 0, "Restart lost ownership evidence");
      });
      await test("multiple pending deletions complete and repeated sync stays empty", async () => {
        const remote = server();
        for (const id of ["multiple-1", "multiple-2"]) { await create(id); await remove(id); }
        assert((await push(remote)).success && (await push(remote)).success, "Multiple deletions failed");
        assert((await pending()).length === 0 && remote.calls.length === 0, "Repeated sync sent writes");
      });
      await test("legacy ID-only deletion recovers from a verified remote owner", async () => {
        const remote = server(); await create("legacy-owned"); await push(remote); await remove("legacy-owned");
        await db.execAsync("DELETE FROM app_meta WHERE key LIKE 'workout-delete-owner:%'");
        assert((await push(remote)).success && !remote.rows.has("legacy-owned"), "Legacy recovery failed");
      });
      await test("legacy missing ownership remains pending despite an arbitrary payload owner", async () => {
        const remote = server();
        await sync.addToSyncQueue("native-a", "workouts", "legacy-unknown", "delete", { id: "legacy-unknown", user_id: "native-a", ownershipVerified: true });
        assert(!(await push(remote)).success, "Untrusted payload accepted");
        assert((await pending()).length === 1 && remote.calls.length === 0, "Ambiguous deletion cleared or sent");
      });
      await test("RLS errors and RLS-filtered no-ops retain pending deletions", async () => {
        const remote = server(); await create("rls"); await push(remote); await remove("rls");
        remote.control.failure = { code: "42501", message: "fixture RLS rejection" };
        assert(!(await push(remote)).success && (await pending()).length === 1, "RLS error acknowledged");
        remote.control.failure = null; remote.control.silent = true;
        assert(!(await push(remote)).success && (await pending()).length === 1, "Silent RLS no-op acknowledged");
        remote.control.silent = false; assert((await push(remote)).success, "Authorized retry failed");
      });
      await test("remote completion with lost response retries using durable evidence", async () => {
        const remote = server(); await create("lost-response"); await push(remote); await remove("lost-response");
        remote.control.loseResponse = true;
        assert(!(await push(remote)).success && (await pending()).length === 1, "Lost response acknowledged early");
        assert((await push(remote)).success && (await pending()).length === 0, "Already-absent retry failed");
      });
      await test("inactive user deletion is neither uploaded nor acknowledged", async () => {
        const remote = server(); await create("inactive"); await remove("inactive");
        const before = JSON.stringify(await pending()); sync.setAuthenticatedUser("native-b");
        await create("active-b", "native-b"); assert((await push(remote, "native-b")).success, "B sync failed");
        assert(JSON.stringify(await pending()) === before, "B modified A's pending deletion");
        assert(!remote.calls.some(([, id]) => id === "inactive"), "B sent A's deletion");
        sync.setAuthenticatedUser("native-a"); assert((await push(remote)).success, "A retry failed");
      });
      await test("receipt failure rolls back workout removal and queued deletion", async () => {
        await create("rollback"); const before = JSON.stringify(await pending());
        await db.execAsync("CREATE TRIGGER reject_receipt BEFORE INSERT ON app_meta WHEN NEW.key LIKE 'workout-delete-owner:%' BEGIN SELECT RAISE(ABORT, 'receipt failure'); END;");
        const result = await workouts.deleteWorkout("native-a", "rollback");
        assert(!result.success && await workouts.getWorkoutById("native-a", "rollback"), "Workout removal did not roll back");
        assert(JSON.stringify(await pending()) === before, "Queue did not roll back");
      });
      return { state: "completed", runtime: "Android Hermes + expo-sqlite", remote: "in-memory fake only", results };
    } finally {
      if (db) await db.closeAsync();
      // This generated database is separate from workout.db and contains only these fixtures.
      if (!/^deletion-verification-\d+\.db$/.test(filename)) throw new Error("Invalid fixture database name");
      await sqlite.deleteDatabaseAsync(filename);
    }
  })().then(result => { globalThis.__androidDeletionVerification = result; }, error => {
    globalThis.__androidDeletionVerification = { state: "failed", message: error.message };
  });
  return "Isolated Android fixtures started";
};
