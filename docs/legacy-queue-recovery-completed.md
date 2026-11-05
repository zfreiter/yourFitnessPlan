# Completed legacy queue recovery

The four verified orphaned entries were canceled atomically on the connected Android emulator. Exactly queue IDs **287, 288, 289, and 290** were deleted. All **66 unrelated queue rows** were compared before and after the transaction and preserved unchanged. Pending entries immediately after recovery: **0**. The recovery made **zero Supabase writes**.

**Evidence and exact changes**

The administrator verification reported both workout UUIDs globally absent under SQL Editor role `postgres` with `rolbypassrls = true`. The user explicitly confirmed project `bojjxwudhkvcjipglwps`. The Android runtime's actual Supabase URL and the repository app configuration matched that project. Fresh `auth.getUser()` calls verified the queue owner as the current test account before cancellation.

| Queue ID | Workout ID | Operation | State before | Action |
| --- | --- | --- | --- | --- |
| 287 | bf480eef-6ead-4965-a0af-fcd96972a40b | insert | pending | canceled locally |
| 288 | bf480eef-6ead-4965-a0af-fcd96972a40b | delete | pending | canceled locally |
| 289 | 55cd68e8-9616-4c52-8dcc-cfb45cd76e0f | insert | pending | canceled locally |
| 290 | 55cd68e8-9616-4c52-8dcc-cfb45cd76e0f | delete | pending | canceled locally |

Both local workouts remained absent. No local or queued child dependencies were found. All four row identities, operations, payload identities, owners, pending flags, receipt absence, and available queue history matched the expected manifest. Authenticated remote reads still returned no visible rows; the administrator evidence, rather than those filtered client reads, supplied proof of global absence.

The script required sync to be idle, monitored auth/session changes, and prevented a newly scheduled synchronization from starting during recovery by invalidating it and aborting recovery. It revalidated the entire preview inside an exclusive SQLite transaction. The DELETE predicate bound the exact owner, record UUID, operation, and queue ID for each of the four rows. It required exactly four changes and verified all other queue rows were byte-for-byte equivalent as query results. Any failure would roll back the transaction. No ownership receipt was manufactured.

The result was logged in the Android development console under `[verified-legacy-recovery]`, including canceled IDs and remaining pending count. [Captured verification results](legacy-queue-recovery-results.json) preserve the recovery, startup, and live validation evidence without credentials.

**Android and deployed Supabase validation**

Android was force-stopped and relaunched without clearing storage. The restarted JavaScript runtime's buffered console showed `Initializing sync on app start...`, `Online - starting sync`, and **`Sync complete`**, with no `Sync error:` event. Read-only inspection confirmed the four legacy rows were absent, the pending queue was empty, and synchronization was idle. React Native did not forward these JavaScript events to Logcat; the evidence came from the Metro runtime console rather than interpreting empty Logcat output as success.

A real disposable workout, **823a058a-722e-41ec-9f02-f42b53670a58**, then completed the requested round trip through the running Android app's normal persistence and manual-refresh services:

1. Create locally; verify it is not automatically uploaded.
2. Manually refresh; verify the deployed Supabase row exists and belongs to the authenticated user.
3. Delete locally; verify local absence, pending tombstone **296**, and a matching durable ownership receipt. Verify the remote row still exists until refresh.
4. Manually refresh; verify remote deletion and `synced = 1` on the new tombstone.
5. Repeat manual refresh; verify the remote row stays absent and the queue remains clear.

Disposable insert **295** and delete **296** are acknowledged (`synced = 1`) and retained by normal queue history retention. They are not pending. Final pending count: **0**. The validation used the real deployed authenticated Supabase client and native SQLite, not a mocked remote. Only this newly generated disposable workout was created/deleted remotely; the legacy recovery did not modify any remote record. Manual refresh was explicitly invoked through the same production service used by the UI; the validation did not automate a swipe gesture.

**Regression checks**

```powershell
node --experimental-sqlite ./node_modules/jest/bin/jest.js --runInBand --watchAll=false --silent services/__tests__/verifiedLegacyQueueRecovery.test.ts services/__tests__/circuitPersistence.test.ts context/__tests__/workoutSyncContext.test.tsx
```

Result: **3 suites, 83 tests passed**, including **20 new recovery tests** for exact-row scope, unrelated/inactive-user preservation, required project and global-absence evidence, lost-acknowledgment ambiguity, ownership mismatch, changed rows, reappeared workouts, direct/indirect dependencies, changed previews, atomic rollback, session changes, and repeated recovery. Existing workout persistence and startup/manual-only synchronization tests passed. TypeScript comparison found **154 baseline diagnostics, 154 current diagnostics, and zero introduced**; existing repository diagnostics remain. `git diff --check` passed.

**Development-only commands**

The one-off manifest is in `scripts/verified-legacy-queue-recovery.cjs`; no production synchronization module imports these scripts. Preview was the default and performed no mutation:

```powershell
node scripts/run-verified-legacy-recovery.cjs --report recovery-preview.json
```

After all checks passed, the explicitly authorized command was:

```powershell
node scripts/run-verified-legacy-recovery.cjs --apply --admin-project-ref bojjxwudhkvcjipglwps --admin-verified-absent --confirm 'CANCEL EXACTLY 287 288 289 290' --report recovery-result.json
```

This manifest is already resolved. Re-running it now fails validation because the four expected pending rows no longer exist; it cannot clear other entries. Flags record the administrator's externally verified evidence; they do not perform an administrative SQL query or bypass RLS. The command must not be repurposed for unverified IDs.

Read-only startup inspection and the explicitly authorized disposable live validation are repeatable development commands:

```powershell
node scripts/verify-live-workout-deletion.cjs
node scripts/verify-live-workout-deletion.cjs --roundtrip --confirm 'CREATE AND DELETE ONE DISPOSABLE WORKOUT'
```

The second command creates and removes one newly generated disposable workout through normal services and requires an empty pending queue before starting.

**Files added in this recovery task**

- `scripts/verified-legacy-queue-recovery.cjs`: narrow verified manifest, preview, and transactional cancellation.
- `scripts/android-verified-legacy-recovery.cjs`: Android project/auth/idle guards and remote read checks.
- `scripts/run-verified-legacy-recovery.cjs`: preview-first CLI with exact explicit confirmation.
- `scripts/metro-development-runtime.cjs`: development runtime execution helper.
- `scripts/android-live-workout-deletion-validation.cjs` and `scripts/verify-live-workout-deletion.cjs`: read-only startup inspection and explicitly authorized live disposable validation.
- `services/__tests__/verifiedLegacyQueueRecovery.test.ts`: focused disposable SQLite recovery regressions.
- This report and `docs/legacy-queue-recovery-results.json`.

The earlier audit and deletion reports were annotated to link to this completed recovery. Production synchronization, auth/navigation, SQLite schema, ownership safeguards, and reconnect/mutation triggers were not changed by this task.
