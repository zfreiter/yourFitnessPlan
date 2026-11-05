# Cross-account synchronization investigation

Deletion handling has since been updated; see [the deletion fix report](workout-deletion-sync-fix.md) for durable ownership receipts, legacy recovery rules, and Android verification. The original delete limitation described below is historical.

The broad claim that login B uploads both accounts was **not reproduced** with correctly labeled queues. Production queue selection, drain counts, retry snapshots, remote pull, refresh deletion, timestamps, and old acknowledged-row cleanup already use the requested user ID. Supabase rows visible today do not establish when they were uploaded. No live Supabase account or records were accessed for this investigation.

Confirmed defects were missing upload ownership validation for mislabeled legacy rows, acknowledgment by queue ID alone, a stale callback being able to request a new coordinator generation after logout, and an explicit network-reconnect synchronization trigger contrary to the requested policy. Existing generation invalidation already stops operations requested before logout; it did not reject a newly requested operation for an inactive account. Preexisting diagnostics omitted the user and mixed local queue events with upload events. These findings establish vulnerabilities and a policy violation, not the cause of a particular historical Supabase write.

**Flow and account IDs**

1. AuthProvider publishes the authenticated owner synchronously to syncService and invalidates the prior user's generation. The existing auth/navigation lifecycle remains in place.
2. SyncProvider requests startup sync after database/profile initialization, or refresh on explicit user action. Both entry points reject stale session-lifetime callbacks before contacting the service. Network subscriptions have been removed. Workout services continue committing SQLite and queue entries locally without initiating sync.
3. The existing coordinator keeps FIFO tails, generations, deduplication, and activity counts per requested user ID. Its session check now also requires that ID to match the authenticated owner once auth has initialized it. Different accounts have independent tails and failure state.
4. Queue selection uses `synced = 0 AND user_id = ?`. Every item must have the requested owner, an allowed table, and a matching payload primary key. Null/empty-owner legacy entries are not adopted, uploaded, acknowledged, or deleted. Incorrectly labeled records with conflicting local/payload ownership fail and remain pending.
5. Upload checks resolve the existing local record and the proposed parent chain to the owning workout. This covers workouts, workout_exercises, exercise_sets, circuit_rounds, cardio_entries, and cardio_intervals. Circuit references must belong to the same workout. Ownership is verified without rewriting payload owners or relying on RLS as a queue filter.
6. Deleted local records can lack a parent chain. Deletes therefore perform one additional RLS-protected remote relationship read, following parents to workouts.user_id, before sending the delete. A mismatch, error, or unavailable remote owner retains the operation and reports failure. In particular, an already-absent remote row cannot be distinguished safely from a hidden row for an incorrectly labeled legacy tombstone: it remains pending for review rather than being silently discarded. This is a deliberate conservative limitation.
7. Acknowledgment now requires queue ID **and** requested user ID and `synced = 0`. Existing orphan cleanup and old-acknowledged-row cleanup are user scoped. Other users' pending operations remain intact.
8. Pull requests filter workouts by that user ID and validate every returned owner and child relationship. Refresh replaces only that user's cache in a transaction and checks that user's pending queue before replacement. Pagination checks the session before and after each request. Existing per-user timestamp behavior is preserved.

Session checks precede new uploads, duplicate verification, remote delete verification, acknowledgment, pull pages, transaction application, and cleanup. A request already dispatched before a session change can still finish remotely. It cannot be recalled; its stale run cannot acknowledge it or initiate subsequent writes. The owning account retries it later using the existing duplicate verification. Tests explicitly distinguish this in-flight completion from a new upload initiated by account B.

**Diagnostics**

Development-only `[workout-sync]` events distinguish `sync-started`, `queue-selected` (active-user pending count), `upload-attempt`, `upload-succeeded`, `upload-failed`, and `sync-completed`. Upload events carry coordinator `userId`, `queueUserId`, queue ID, operation, table, and record ID. `queue-staged` and `queue-committed` describe local writes, not remote uploads. No payloads, tokens, passwords, or error messages are logged. Production logging remains disabled for these diagnostics. A failed ownership check has `upload-failed` without a preceding `upload-attempt` for that entry.

**Changed files**

- services/syncService.ts: session owner guard, upload relationship checks, scoped acknowledgment, pagination cancellation, diagnostics.
- context/authContext.tsx: publish the authenticated owner to the coordinator.
- context/SyncContext.tsx: reject stale callback entry and remove reconnect synchronization.
- utils/workoutSyncDiagnostics.ts: allowlisted account/queue metadata and stage events.
- services/__tests__/circuitPersistence.test.ts: real disposable SQLite multi-account, legacy ownership, delete ownership, acknowledgment, and switch-during-upload regressions.
- context/__tests__/workoutSyncContext.test.tsx: no reconnect subscription, no sync from ordinary mutation, and stale callback tests.
- services/__tests__/cardioPersistence.test.ts: teach its SQL adapter the new actual record queries.
- context/__tests__/authLifecycle.test.tsx and authTransitionTheme.test.tsx: include the authenticated-owner API in service mocks.

Home, Calendar, RLS policies, and exerciseService.ts were not changed.

**Validation**

`node --experimental-sqlite ./node_modules/jest/bin/jest.js --runInBand --watchAll=false --silent`

Result: **15 suites, 150 tests passed**. Disposable `node:sqlite` databases use the production schema and foreign keys. Supabase calls are mocked, with attempted writes recorded separately from reads. Tests cover both accounts pending simultaneously, B-only push/refresh preserving A's entire queue, A's later upload, independent account failure, all six ownership chains, null-owner entries, owner-scoped acknowledgment, stale callbacks, queued cancellation, and switching while A's first request is in flight. Existing startup/manual-refresh, transaction rollback, persistence, and navigation/theme tests pass.

TypeScript diagnostics were compared in memory against HEAD using the same compiler/configuration, substituting the original versions of modified files: **154 baseline diagnostics, 154 current, zero introduced**. Repository-wide type checking still fails on existing errors such as missing legacy type exports and workout-session context members. `git diff --check` passes. Android verification below has not been executed here.

**Exact Android verification with two disposable accounts**

1. Use an Android development build and two test accounts with completed profiles, A and B. Record their UUIDs. Run `npm.cmd run android` if a development build is needed, then `npm.cmd start -- --dev-client`. Open the app on the emulator/device and keep the Metro console visible. Clear the displayed log buffer between phases, without clearing app storage.
2. Sign in as A online and let startup finish. Disable Wi-Fi/mobile networking. Create a workout named `A-pending-<unique suffix>` containing a circuit round, exercise, set, cardio entry, and interval. Edit it. Confirm SQLite/Home/Calendar reflect the changes immediately and no new `sync-started` or `upload-attempt` events occur from those mutations.
3. Inspect `workout.db` using the Android development database inspection tooling available for your build, or a debugger read through `getDB().getAllAsync`. Run the read-only query below with A's actual UUID and save the complete result as A-before. Do not use database reset or the development fixture runners on this app database.

```sql
SELECT id, user_id, table_name, record_id, operation, data, created_at, synced
FROM sync_queue WHERE user_id = '<A UUID>' AND synced = 0 ORDER BY id;
```

4. Restore networking while leaving A signed in. Wait at least ten seconds. Confirm no reconnect `sync-started` or `upload-attempt` occurs and the query still equals A-before. Log out A, then sign in as B online. B's startup should report B's coordinator ID and select only B's pending queue. No upload attempt should list A's queue IDs. Repeat the A query: it must still equal A-before, including synced flags and payloads.
5. With B signed in, disable networking, create/edit `B-pending-<suffix>`, restore networking, and verify that restoration itself causes no upload. Use the existing pull-to-refresh action. Confirm only B's queue IDs are attempted and all upload `userId` and `queueUserId` values equal B's UUID. A-before must remain unchanged. Home and Calendar must continue showing only B's workouts.
6. Sign out B and sign in A online. A's startup should now upload A's pending queue and acknowledge it. Confirm no B queue IDs are attempted. In Supabase's read-only Table Editor, filter workouts by A UUID and the unique workout ID/name, then separately B UUID. Follow each child relationship to its workout. Use the captured attempt logs to determine upload timing; existing table rows alone are insufficient evidence.
7. Verify deletion: while offline in each account, remove a child and delete a test workout; check the owned queue tombstones, reconnect (no sync), then manually refresh. Successful verified deletes are acknowledged. An unresolved legacy/absent remote tombstone must remain pending with an error instead of being reassigned or deleted locally.
8. Exercise the race using slow network throttling: A creates pending work offline, reconnects, and manually refreshes. After A's first `upload-attempt`, immediately log out and sign in as B. After the auth change there must be no new A upload attempts. A's already-sent request may finish remotely, but its stale run must not acknowledge or send children. B's startup must proceed independently. Log back into A and refresh; duplicate verification should permit a safe retry.
9. To test a failed upload without editing policies or production data, interrupt networking during A's manual request; verify A's rows remain pending. Restore networking (no automatic retry), then switch to B and manually refresh. B must succeed independently. Return to A for explicit retry.

Use mocked/Jest fixtures for malformed or missing ownership rather than injecting corrupt operations into live user databases. All pending records without trustworthy ownership stay available for deliberate recovery; no automatic ownership migration is performed.
