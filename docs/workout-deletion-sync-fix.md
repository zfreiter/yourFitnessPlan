# Workout deletion synchronization fix

Update: administrator verification and the targeted recovery are now complete. See [the completed recovery report](legacy-queue-recovery-completed.md). The unresolved legacy state described below records the earlier investigation.

The new deletion path is fixed and verified with real Android Hermes/Expo SQLite execution against an isolated database and a fake remote. The two original entries remain pending intentionally: read-only inspection found no trusted deletion receipts and no remote rows visible to the authenticated owner. The inspection and verification tools did not clear, acknowledge, or upload live queue entries or mutate live Supabase rows. Real Supabase deletion through the Android UI still needs the disposable-account checks below; the native tests mock remote responses rather than proving deployed RLS behavior.

**Confirmed root cause and exact failure path**

The previous safeguard introduced two independent errors for a create-then-delete operation:

1. `deleteWorkout` correctly removes the workout and children in its SQLite transaction. It removes pending child operations but leaves earlier workout insert/update operations and queues an ID-only workout delete.
2. On sync, earlier workout inserts/updates are processed first. `validateUploadOwner` cannot resolve their deleted local workout and throws `Missing local workout or owner mismatch`. This error comes from the earlier write, not the delete branch itself.
3. The delete branch does allow a missing local row, but requires a visible remote owner. If the workout was never uploaded, was already removed, or is hidden by RLS, its query returns no row. Without durable local deletion ownership evidence, it throws `Remote delete ownership is unavailable; operation retained for review`.
4. Consequently, an ordinary new workout deleted before its first upload gets stuck. A previous ownership check deliberately refused an absent remote target, and the transaction had not captured the evidence needed to distinguish a valid deletion from an arbitrary tombstone.

**Actual inspection of both reported IDs**

These are observations from a read-only copy of the connected emulator's `workout.db` and the development-only inspector calling the existing authenticated Supabase client. Both queue owners match the authenticated user; neither UUID was inferred from the current login or assigned to a queue entry.

| Workout ID | Pending queue IDs | Local row | Queue owner | Delete payload | Deletion receipt | Remote owner read |
| --- | --- | --- | --- | --- | --- | --- |
| bf480eef-6ead-4965-a0af-fcd96972a40b | 287 insert; 288 delete | Absent | Nonempty; matches authenticated user | `{ id }` only | None | No visible row |
| 55cd68e8-9616-4c52-8dcc-cfb45cd76e0f | 289 insert; 290 delete | Absent | Same authenticated user | `{ id }` only | None | No visible row |

All four entries are still pending. Both original insert payloads contain a matching ID and user ID. That is supporting history, but arbitrary queue payload ownership alone is not accepted as authoritative evidence. The authenticated remote reads completed successfully with no visible rows; RLS prevents interpreting that as proof of global nonexistence or ownership. Accordingly, the existence and owner of an invisible remote row cannot be established by this client.

For these original deletes, normal sync can recover if a later authorized remote read returns a workout owned by this user. Otherwise they stay pending, along with the superseded inserts. What is missing is an independently verified ownership receipt or a visible owned remote row. No unrelated remote record is targeted. If an authorized server-side review later proves the IDs were never uploaded/already removed for this owner, deliberate local recovery can be considered separately; this fix does not silently manufacture that evidence or clear the operations.

**Implementation**

- `queueOwnedWorkoutDeletion` re-reads the persisted workout owner inside the existing exclusive deletion transaction. It inserts the ID-only queue tombstone and writes a receipt into the existing `app_meta` table, keyed by the actual inserted queue ID and containing the verified owner and workout ID. The local row is then removed within that same transaction. Receipt, queue, workout, and child changes roll back together on failure. No schema change was needed.
- The receipt is separate from the arbitrary queue JSON. Sync only accepts a receipt matching this exact queue ID, owner, and workout ID. It never trusts a payload flag such as `ownershipVerified`, rewrites ownership, or requires the deleted local workout to remain present.
- A later validly formed workout delete supersedes earlier workout operations for the same requested owner and workout. Those earlier operations are skipped, not acknowledged or removed yet. If the deletion is ambiguous or fails, all operations remain pending. Successful deletion acknowledgment updates only that owner's workout operations through the tombstone's queue ID, atomically with receipt cleanup; later operations and other users remain intact.
- A visible remote owner mismatch is always rejected, including when a local receipt exists. A legacy ID-only delete can acquire a receipt from a verified authenticated remote owner read before deletion, allowing safe recovery if the response is subsequently lost.
- A remote workout delete filters both `id` and `user_id`, retains Supabase RLS, and requests the deleted IDs. An error or a visible-target delete returning no matching deleted row remains pending, covering explicit and silently filtered RLS rejection. Local authorization never bypasses RLS.
- When a deletion has a trusted receipt and the read returns no visible target without an error, no remote write is sent; its local intent can be acknowledged idempotently. The development event is `delete-already-absent`. This means no target is visible to this authenticated request, not that a privileged global lookup was performed. Without a receipt, the same response stays ambiguous and pending. Read errors, permission errors, and network errors do not take this success path.
- Existing per-user coordinator, session invalidation, local-first mutations, startup/manual-refresh triggers, and transaction safeguards remain. Child deletion validation is unchanged. No Home, Calendar, auth, navigation, RLS, or reconnect behavior was modified for this task.

**Files changed for this deletion fix**

- `services/workoutService.ts`: queue a verified deletion before removing the persisted workout row.
- `services/workoutDeletionOwnership.ts`: transaction-only queue/receipt helper using the existing schema.
- `services/syncService.ts`: terminal deletion handling, receipt validation/recovery, owner-filtered confirmed remote deletion, scoped transactional acknowledgment.
- `utils/workoutSyncDiagnostics.ts`: distinguish receipt-backed absent-target completion from an upload attempt.
- `services/devWorkoutDeletionInspection.ts`: read-only authenticated inspection of deleted workouts, queue metadata, receipt status, and remote owner visibility.
- `app/dev-transaction-verification.tsx`: a separate read-only deletion inspection button supporting missing local rows.
- `services/__tests__/circuitPersistence.test.ts`: real SQLite deletion tests and a remote mock implementing filtered delete results.
- `scripts/verify-android-workout-deletion.cjs` and `scripts/android-workout-deletion-fixture.cjs`: repeatable isolated native Android verification using the current Metro service factories, a separate generated SQLite file, and a fake remote.
- This report, plus a link from the earlier cross-account report to supersede its old delete limitation.

The preexisting uncommitted cross-account changes elsewhere in the working tree were preserved.

**Tests and TypeScript diagnostics**

Before implementation, the disposable create/delete fixture reproduced the missing-local failure. The real emulator queue inspection independently confirmed the exact two-operation failure path for both reported IDs.

Full suite:

```powershell
node --experimental-sqlite ./node_modules/jest/bin/jest.js --runInBand --watchAll=false --silent
```

Result: **15 suites, 164 tests passed**. Coverage includes create/upload/delete, pending edits before deletion, create/delete before first upload, file-backed SQLite close/reopen and startup sync, both reported IDs as disposable fixtures, multiple pending deletes, inactive-user preservation, existing ID-only deletes, missing local rows with/without receipts, already-absent remote targets, owner mismatch, RLS/network failures, silently filtered delete results, lost-success responses, repeated sync, transaction rollback, and read-only inspection.

Android native verification executed on the connected `emulator-5554` (`sdk_gphone64_x86_64`):

```powershell
node scripts/verify-android-workout-deletion.cjs
```

Result: **10 native checks passed** using Android Hermes and native Expo SQLite. The harness opens `deletion-verification-<timestamp>.db`, clones service module instances with a private `getDB` and private coordinator, and injects only an in-memory fake remote. It never replaces the running app's module exports, uses its live queue, or imports the live Supabase client. It closes and removes its generated database afterward. Native checks covered upload/edit/delete, pre-upload deletion, close/reopen/startup, multiple/repeated deletions, legacy recovery, insufficient evidence, explicit/silent RLS failures, lost-response retry, account isolation, and rollback.

A same-configuration TypeScript comparison against the working tree immediately before this deletion fix found **154 baseline diagnostics, 154 current diagnostics, zero introduced**. Existing repository errors remain. `git diff --check` passes.

**Android verification steps**

1. Use an Android development build connected to Metro on localhost port 8081, with Node 22+ on the host. Start Metro with `npm.cmd start -- --dev-client`; open the already installed development build. Use `npm.cmd run android` only if a build is needed. Do not clear application storage: that would lose the original pending queue.
2. Run `node scripts/verify-android-workout-deletion.cjs`. Expect `state: completed`, `runtime: Android Hermes + expo-sqlite`, and ten passed results. This native test is safe to run while the original queue remains unresolved because its SQLite file, service instances, coordinator, profiles, and fake remote are separate. It relies on Metro development module metadata and is intentionally unavailable in release builds.
3. For the original records, use the existing development route `myapp:///dev-transaction-verification` (for example, `adb shell am start -a android.intent.action.VIEW -d myapp:///dev-transaction-verification com.anonymous.yourFitnessPlan`). Enter one original workout ID and press **Inspect deletion (read only)**. Repeat for the other ID. Expect missing-local state, matching queue owner, no verified receipt, and `absent-or-not-visible` if the current remote state is unchanged. The inspector never uploads, acknowledges, or deletes anything. Do not use the fixture-mutation button on that screen to investigate live records.
4. To verify actual deployed Supabase behavior, use two disposable accounts A and B in an isolated development installation. Complete profile setup and wait for startup sync. As A, create `delete-after-upload-<suffix>`, manually refresh to upload it, then delete locally. Confirm the UI removes it immediately. Manually refresh again: expect a verified delete attempt and success, and confirm the owned remote row is gone using an owner-filtered read. Refresh again: expect no duplicate deletion.
5. As A, disable networking, create `delete-before-upload-<suffix>`, and delete it before any refresh. Inspect the tombstone and receipt. Restore networking: there must be no automatic upload. Manually refresh: expect receipt-backed `delete-already-absent`, no replay of the old insert, and acknowledgment of only that workout's earlier operations.
6. Repeat the offline deletion, close the app, restore networking, and reopen. Startup sync should complete it using the persisted receipt. Repeat with two workouts pending simultaneously.
7. Leave A's deletion pending, switch to B, and refresh B. A's pending operations must remain unchanged and no A delete attempt should appear. Return to A to process its deletion. Do not modify deployed RLS to force failures: the native and Jest fake responses cover those negative paths.
8. Verify legacy recovery only with disposable records: an ID-only pending delete whose owned remote row is still visible should recover through normal sync. An ID-only delete with neither a receipt nor a visible remote owner must remain pending. The two original deletes currently fall into that latter category.

Completed Android evidence consists of the ten isolated native checks and read-only inspection of the original queue and remote visibility. A real Supabase create/upload/delete UI round trip on disposable accounts has not been executed here, and the two original legacy entries have not been claimed as cleared or resolved.
