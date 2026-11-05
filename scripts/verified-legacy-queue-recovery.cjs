// One-off development recovery for the administrator-verified manifest below.
// This module is never imported by production synchronization code.
module.exports = function createVerifiedLegacyQueueRecovery() {
  const projectRef = "bojjxwudhkvcjipglwps";
  const userId = "a47d200f-2dde-4b20-bc4a-c1008ed338d7";
  const expected = [
    { id: 287, record_id: "bf480eef-6ead-4965-a0af-fcd96972a40b", operation: "insert" },
    { id: 288, record_id: "bf480eef-6ead-4965-a0af-fcd96972a40b", operation: "delete" },
    { id: 289, record_id: "55cd68e8-9616-4c52-8dcc-cfb45cd76e0f", operation: "insert" },
    { id: 290, record_id: "55cd68e8-9616-4c52-8dcc-cfb45cd76e0f", operation: "delete" },
  ];
  const ids = [...new Set(expected.map(row => row.record_id))];
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  async function preview(db, authenticatedUserId, check = () => {}) {
    check();
    assert(authenticatedUserId === userId, "Authenticated owner differs from verified manifest");
    const all = await db.getAllAsync("SELECT * FROM sync_queue ORDER BY id");
    const rootRows = all.filter(row => row.table_name === "workouts" && ids.includes(row.record_id));
    assert(rootRows.length === expected.length, "Target queue history changed");
    for (const item of expected) {
      const row = rootRows.find(row => row.id === item.id);
      assert(row && row.user_id === userId && row.table_name === "workouts" && row.record_id === item.record_id && row.operation === item.operation && row.synced === 0,
        `Queue row ${item.id} differs from verified manifest`);
      const receipt = await db.getFirstAsync("SELECT value FROM app_meta WHERE key = ?", [`workout-delete-owner:${item.id}`]);
      assert(!receipt, `Deletion ownership receipt changed for queue row ${item.id}`);
      let payload;
      try { payload = JSON.parse(row.data); } catch { throw new Error(`Malformed payload in queue row ${item.id}`); }
      assert(payload && payload.id === item.record_id, `Record identity mismatch in queue row ${item.id}`);
      assert(item.operation === "delete" || payload.user_id === userId, `Insert ownership mismatch in queue row ${item.id}`);
      assert(payload.user_id === undefined || payload.user_id === userId, `Payload owner mismatch in queue row ${item.id}`);
    }
    const workouts = await db.getAllAsync("SELECT id FROM workouts WHERE id IN (?, ?)", ids);
    assert(workouts.length === 0, "A target workout has reappeared locally");
    const related = new Set(ids);
    const links = payload => [payload.workout_id, payload.workout_exercise_id, payload.cardio_entry_id, payload.circuit_id, payload.group_id].filter(id => typeof id === "string");
    const local = [];
    for (const table of ["workout_exercises", "exercise_sets", "circuit_rounds", "cardio_entries", "cardio_intervals"]) {
      for (const row of await db.getAllAsync(`SELECT * FROM ${table}`)) local.push(row);
    }
    const parsed = all.map(row => {
      try { const payload = JSON.parse(row.data); return { row, payload: payload && typeof payload === "object" ? payload : {} }; }
      catch { return { row, payload: {}, malformed: true }; }
    });
    let changed;
    do {
      changed = false;
      for (const payload of [...local, ...parsed.map(item => ({ ...item.payload, id: item.row.record_id }))]) {
        if (links(payload).some(id => related.has(id)) && !related.has(payload.id)) { related.add(payload.id); changed = true; }
      }
    } while (changed);
    assert(!local.some(row => related.has(row.id) || links(row).some(id => related.has(id))), "Local child dependency survives");
    const targets = new Set(expected.map(row => row.id));
    for (const item of parsed) {
      if (item.row.synced !== 0 || targets.has(item.row.id)) continue;
      assert(!(related.has(item.row.record_id) || links(item.payload).some(id => related.has(id))), `Dependent queue row ${item.row.id} survives`);
      if (item.row.user_id === userId && ["workout_exercises", "exercise_sets", "circuit_rounds", "cardio_entries", "cardio_intervals"].includes(item.row.table_name)) {
        // ID-only children with no surviving parent history cannot be confidently excluded.
        const history = parsed.filter(other => other.row.table_name === item.row.table_name && other.row.record_id === item.row.record_id);
        assert(!item.malformed && (links(item.payload).length > 0 || history.some(other => links(other.payload).length > 0) || local.some(row => row.id === item.row.record_id)),
          `Child queue row ${item.row.id} has insufficient dependency evidence`);
      }
    }
    check();
    return { rows: rootRows, untouched: all.filter(row => !targets.has(row.id)), pendingBefore: all.filter(row => row.synced === 0).length };
  }
  async function cancel(db, authenticatedUserId, evidence, expectedPreview, check = () => {}) {
    assert(evidence && evidence.adminProjectRef === projectRef && evidence.runtimeProjectRef === projectRef && evidence.bypassesRls === true &&
      evidence.globallyAbsent === true && evidence.confirmation === "CANCEL EXACTLY 287 288 289 290",
      "Verified matching-project administrator evidence and exact confirmation are required");
    let result;
    await db.withExclusiveTransactionAsync(async transaction => {
      check();
      const current = await preview(transaction, authenticatedUserId, check);
      assert(JSON.stringify(current) === JSON.stringify(expectedPreview), "Queue changed after preview");
      const deleted = await transaction.runAsync(
        `DELETE FROM sync_queue WHERE user_id = ? AND table_name = 'workouts' AND synced = 0 AND
          ((id = 287 AND record_id = ? AND operation = 'insert') OR
           (id = 288 AND record_id = ? AND operation = 'delete') OR
           (id = 289 AND record_id = ? AND operation = 'insert') OR
           (id = 290 AND record_id = ? AND operation = 'delete'))`,
        [userId, ids[0], ids[0], ids[1], ids[1]],
      );
      assert(deleted.changes === 4, "Expected exactly four canceled queue entries");
      const remaining = await transaction.getAllAsync("SELECT * FROM sync_queue ORDER BY id");
      assert(JSON.stringify(remaining) === JSON.stringify(current.untouched), "Unrelated queue entries changed");
      check();
      result = { canceledQueueIds: expected.map(row => row.id), canceledCount: deleted.changes,
        remainingPending: remaining.filter(row => row.synced === 0).length, unrelatedRowsPreserved: true };
    });
    return result;
  }
  return { projectRef, userId, expected, ids, preview, cancel };
};
