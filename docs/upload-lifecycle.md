# Durable local-first upload lifecycle

Implemented on feature/exercise-reordering. No device database migration,
recovery, remote write, commit, or merge was executed during implementation.
Tests use disposable SQLite databases and fake Supabase clients.

## Additive migration

`services/schema.ts` adds `sync_upload_lifecycle` with `CREATE TABLE IF NOT EXISTS`,
using the existing database initialization schema loop.
Its composite primary key is `(user_id, table_name, record_id)`. Each row stores
`state`, `attempt_count`, and `last_attempt_queue_id`. It has no cascading foreign
keys: evidence must survive deletion of the associated domain row and queue history.

The creation is idempotent. There is no backfill, no modification to existing
queue rows, and no conversion of `synced=0` into never-attempted proof. Historical
records without a lifecycle row remain uncertain. The four legacy rows
467/468/471/472 and their v2 receipts require separate evidence-based recovery.

## Transitions

- Trusted local INSERT boundaries register `local_only` on the same transaction
  handle as domain creation. Generic queue insertion does not register origin.
  Prior queue history prevents origin inference; lifecycle identities are not reused.
- Before a remote INSERT/UPDATE/DELETE request, an exclusive transaction rechecks
  the exact pending queue operation, rejects cancellation/terminal-intent conflicts,
  and commits `uncertain`, an incremented attempt count, and the operation's queue ID.
- Only after that transaction commits may the existing uploader send its request.
- A positive result and queue acknowledgment commit `confirmed` together.
  The existing remote-deletion confirmation receipt is checkpointed before its
  terminal-history acknowledgment, preserving retries after acknowledgment failure.
- Authenticated, validated pull data records `confirmed` presence, never local-only
  origin. It does not erase attempt counters.

## Local cancellation

Deletion first proves ownership while local rows exist. If the record has explicit
`local_only` evidence, zero claims, exactly one pending insert, and only pending
same-owner insert/update history, it may be canceled. Unknown history, previous
acknowledgments, or pending uncertain child deletions prevent that shortcut.

The exclusive domain-deletion transaction marks the lifecycle `canceled`, removes
only that record's pending insert/update history, and removes its domain row. It
creates no remote-delete tombstone or deletion receipt. Children are processed
before parents. A failure rolls back lifecycle, queue and domain changes together.

Claims and cancellation share SQLite's exclusive transaction serialization:
if cancellation wins, stale uploader snapshots cannot claim the removed operation;
if claim wins, deletion sees uncertainty and retains a tombstone. No SQL transaction
is held open across the actual remote upload. In-flight requests may finish after
local deletion; their confirmed result is followed by the queued delete on a fresh
upload pass. Failed claims never send requests. Claims belonging to another user
are rejected.

## Crash and compatibility behavior

A crash after claim, even before bytes are sent, stays uncertain. A remote commit
with a lost response remains uncertain and uses existing safe duplicate verification
or explicit reconciliation; it never becomes local-only again. Failed requests
likewise retain uncertainty until a successful retry. An unexpected queued operation
for an already-canceled identity fails closed rather than replaying or retry-spinning.

Only startup and explicit manual refresh start synchronization. Mutations, migration,
origin registration, cancellation and reconnect events do not trigger remote work.
No dependency or Supabase schema/policy changes are required.

## Limits

Unknown legacy histories and ambiguous remote deletion outcomes still require
reconciliation; empty RLS-filtered reads are not proof of absence. Receipts and
lifecycle markers are intentionally retained, so a future retention policy should
remove them only with proof that no pending operation or retry can depend on them.
A claimed-but-never-transmitted request is conservatively uncertain, not cancelable.
