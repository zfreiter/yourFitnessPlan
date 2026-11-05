# Legacy workout queue recovery decision

Update: administrator verification and the targeted recovery are now complete. See [the completed recovery report](legacy-queue-recovery-completed.md). The unresolved legacy state described below records the earlier investigation.

Neither legacy insert/delete pair is currently verified safe to cancel. The ownership and local dependency checks succeed, but authoritative remote absence cannot be established through the available authenticated client. No queue rows were canceled, acknowledged, deleted, relabeled, or assigned ownership receipts. No investigation command mutated Supabase records. The investigation stopped before implementing a cleanup path, as requested when the required checks cannot succeed.

**Fresh evidence collected on November 4, 2026**

The connected Android emulator's SQLite database and WAL were copied read-only only after consecutive byte-identical captures. The copy passed SQLite integrity checks. The audit inspected all local workout/child tables and all available sync queue history across accounts, not only the active user's root workout entries. It followed workout, exercise, set, cardio, interval, and circuit parent references through both local rows and queue payloads. No malformed queue payloads were found.

The authenticated Supabase queries were executed through the running Android app's existing client. The server-verified user UUID matched every target queue row. Its reported auth role was `authenticated`. A second auth read confirmed that the account had not switched during inspection. No credentials or tokens were exported. The remote audit completed at 2026-11-04T17:36:44.305Z.

| Workout ID | Queue sequence | Local workout and children | Surviving queued children / later operations | Deletion receipt | Authenticated remote result | Cancellation decision |
| --- | --- | --- | --- | --- | --- | --- |
| bf480eef-6ead-4965-a0af-fcd96972a40b | 287 insert -> 288 delete | Absent | None found | None | Successful read, zero visible rows | Not verified safe |
| 55cd68e8-9616-4c52-8dcc-cfb45cd76e0f | 289 insert -> 290 delete | Absent | None found | None | Successful read, zero visible rows | Not verified safe |

For both pairs, the queue's nonempty `user_id` equals the currently authenticated, server-verified test account. The two record IDs match exactly within their pairs, including the payload primary keys. Each insert payload contains a matching user ID; each delete payload contains only its workout ID. No additional related history, pending child operations, local descendants, or unattributable ID-only pending child operations for this owner were found. There are exactly **four pending entries total** on this emulator, all four listed above. Other users have no pending entries in this snapshot.

The available queue sequence is precise: for the first ID, insert 287 was queued at `2026-11-03 18:26:38`, then delete 288 at `2026-11-03 18:26:44`; for the second, insert 289 at `2026-11-03 18:29:20`, then delete 290 at `2026-11-03 18:29:33`. These are the stored SQLite timestamps. Every entry has `synced = 0`.

**Missing evidence and lost acknowledgment**

The nested remote workout reads, including exercises/sets, cardio/intervals, and circuit rounds, returned no visible root workout for either ID. This does not distinguish global absence from an RLS-hidden row. No connected authoritative SQL/query tool or deployed policy definition was available; the application client cannot bypass RLS. No administrative credentials were sought or used.

A pending insert is not evidence of an unsent insert. The implementation awaits the Supabase insert before acknowledging the local queue row, and session invalidation checks can reject acknowledgment after the request has succeeded. Network response loss or a crash can create the same state. There is no durable ownership receipt or independent server-side delivery history for these two inserts. Therefore, the possibility of an earlier successful, unacknowledged upload has not been ruled out.

The missing condition is proof that no remote workout requiring deletion survives for either ID. Local timestamps, matching queue owners, a small interval between insert and delete, repeated empty client SELECTs, and explicit user confirmation alone cannot supply that proof. Canceling based on these observations could abandon an unwanted remote workout.

**Safest recovery options**

Run [verify-legacy-workout-absence.sql](verify-legacy-workout-absence.sql) in the authorized Supabase SQL Editor for the same deployed project. It is read-only. It requires an already authorized role with RLS bypass, verifies that `public.workouts` is an actual table rather than a filtering view, and reads both IDs without an owner predicate. It neither changes roles/policies nor updates records. It refuses to treat results from a role without RLS bypass as authoritative.

- If the authoritative query returns no rows, global absence is established at that snapshot. A later recovery step can then recheck the same authenticated owner, require sync to be idle with no in-flight upload, preview the exact four rows, recheck local absence/dependencies, require explicit confirmation, and cancel only that verified snapshot atomically. It must roll back completely if any condition changes. No such mutation was executed here.
- If a row belongs to the expected user, retain its queue. If normal authenticated reads can see it, the existing verified deletion path can recover ownership and process it. If the expected owner cannot read it, investigate the deployed authorization behavior before any cancellation.
- If a row belongs to another user, retain the queue and investigate the mismatch. Do not delete or modify that unrelated user's remote record.
- If the authoritative query cannot be run, retain all four pending entries. Repeated RLS-filtered reads cannot resolve this uncertainty.

A development-only cancellation command was not added while its required remote-state check could not be satisfied. A confirmation switch would not make an unverifiable destructive action safe. The existing development-only deletion inspector remains available as a read-only preview on `myapp:///dev-transaction-verification`.

**Validation and remaining state**

The existing focused regression suite was rerun:

```powershell
node --experimental-sqlite ./node_modules/jest/bin/jest.js --runInBand --watchAll=false --silent services/__tests__/circuitPersistence.test.ts
```

Result: **55 tests passed**. These are existing tests of SQLite persistence, ownership, absent-target handling, legacy evidence rejection, dependencies, lost responses, account isolation, and deletion rollback. They do not establish global absence for these two live IDs and are not claimed as cancellation implementation tests.

There is no cleanup implementation to validate against the requested successful cancellation, atomic cleanup rollback, or startup-after-cleanup cases. Those remain conditional on obtaining the missing authoritative evidence. No production TypeScript or synchronization behavior was changed, so no new TypeScript diagnostics were introduced by this documentation-only result. The server-side diagnostic SQL has not been executed here.

A second stable read-only snapshot after inspection and regression tests matched the initial audit, confirming all four target rows remained unchanged.

Rows affected by cleanup: **zero**. Remaining pending rows: **287, 288, 289, 290**. Startup synchronization has not been claimed to succeed: the existing fail-closed validation will continue to report these ambiguous legacy deletions until their remote state is established and they are safely resolved. Live startup/manual sync was not triggered just to test this investigation.

Files added for this task: this report and `docs/verify-legacy-workout-absence.sql`. Earlier uncommitted application changes were preserved.
