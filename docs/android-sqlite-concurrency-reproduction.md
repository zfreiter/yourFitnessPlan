# Android Expo SQLite concurrency reproduction

The default mode uses only the installed Expo SQLite module and `SELECT 1 AS value`.
The opt-in workout mode below adds a self-contained synthetic workload.
Neither mode imports workout services, production schemas, auth
clients, sync handlers, React, or test renderer. It uses the existing Metro
inspector transport in `scripts/metro-development-runtime.cjs` without changing
that utility, reloading the app, or installing new dependencies.

The default mode opens one uniquely named `sqlite-concurrency-repro-*.db` using
`useNewConnection:true`. Workout mode uses a `sqlite-workout-repro-*.db` and
optionally two strongly retained connections to that same disposable file.
No database filename can be supplied on the command
line. The handle stays strongly referenced until both phases finish and every
operation settles. No reset or connection reopen is used. Only that disposable
file is closed/deleted; `workout.db`, its WAL, and the existing sync queue are
never queried or modified.

## Prerequisites

- Node 22+ and the current dependencies already installed.
- An Android device/emulator running the existing Hermes development build.
- Its existing Metro server reachable from the host at `127.0.0.1:8081`.
- Wait for normal startup to finish. Do not refresh, change accounts, edit
  workouts, or run other diagnostic utilities during this experiment.
- For USB devices, confirm `adb devices`. If the development build needs the
  usual Metro USB routing, use `adb reverse tcp:8081 tcp:8081`. The phone must
  already be connected to this project's Metro server; starting Metro alone
  does not establish an app inspector session.

Do not reset/reinstall the app, clear its storage, invoke recovery scripts, or
change synchronization settings for this experiment. A native crash can kill
the development process and leave its disposable file behind, so do not run
while real workout edits are in progress.

## Commands

Run from the project root. First use a small smoke test:

```powershell
node scripts/run-android-sqlite-concurrency.cjs --iterations 100 --concurrency 4
```

Then compare these configurations:

```powershell
# Sequential control in both phases
node scripts/run-android-sqlite-concurrency.cjs --iterations 2000 --concurrency 1

# Sequential baseline, then bounded batches of eight
node scripts/run-android-sqlite-concurrency.cjs --iterations 2000 --concurrency 8

# Longer observation window
node scripts/run-android-sqlite-concurrency.cjs --iterations 20000 --concurrency 8

# Optional allocation churn; no unsupported/forced-GC API
node scripts/run-android-sqlite-concurrency.cjs --iterations 2000 --concurrency 8 --allocation-kib 64
```

`iterations` is the **total number of reads per phase**, not the number of
batches. A 2,000-iteration run performs 2,000 sequential reads followed by 2,000
reads in bounded batches. Defaults: 2,000 iterations, concurrency eight, no
allocation pressure. Bounds: 1–100,000 iterations, concurrency 1–32, allocation
0–256 KiB per read. The final partial batch also respects the concurrency cap.

Allocation mode retains only two byte slabs plus small object groups at a time;
older allocations become eligible for normal GC. It increases allocation churn
without asserting when GC happens. `forcedGC` is always false.

## Opt-in realistic workout mode

The original SELECT 1 commands/defaults remain unchanged. Select the new mode
explicitly; start with a small run that exercises every operation kind:

```powershell
# Sequential control and bounded shared-connection workload
node scripts/run-android-sqlite-concurrency.cjs --mode workout --iterations 7 --concurrency 3

# Add a third, separately reported phase using two retained connections
node scripts/run-android-sqlite-concurrency.cjs --mode workout --iterations 7 --concurrency 3 --connections 2

# Longer shared-connection comparison, with optional allocation churn
node scripts/run-android-sqlite-concurrency.cjs --mode workout --iterations 140 --concurrency 8 --allocation-kib 64

# Longer multi-connection comparison
node scripts/run-android-sqlite-concurrency.cjs --mode workout --iterations 1400 --concurrency 8 --connections 2
```

Workout-mode defaults are 120 logical operations per phase, concurrency eight,
one connection, and no allocation pressure. Each logical operation can issue
several SQL/API calls. `iterations` therefore counts **workload operations**, not
individual SELECTs. Limits match SELECT 1 mode; `connections` must be one or two
and is accepted only with `--mode workout`. Allocation churn is per logical
operation in this mode.

Fixture tables contain three owned synthetic workouts (circuit, strength, cardio),
one other-owner workout, four workout-exercise instances, twelve sets, one circuit
record, three cardio entries, and four intervals per cardio entry. A separate
synthetic catalog record supplies the exercise FK. There is no sync queue,
receipt, lifecycle, profile, or auth-client table involved.

The deterministic operation mix repeats every seven operations:

1. Bulk/nested hydration with the application's ownership filters, exercise/set
   joins and ordering, cardio/interval joins, and circuit-round reads. Required
   child groups are read sequentially, as in the current hydration implementation.
2. Exercise-service-style reads with nested set reads.
3. Circuit-service-style reads.
4. Cardio-service-style reads with nested intervals.
5. Overlapping exercise, circuit, and cardio reads representing independent services.
   Every branch is joined, including after a sibling fails.
6. An explicitly prepared ownership-filtered set SELECT reused for two exercises.
   Each result is fully consumed before another execution/finalization.
7. An explicitly prepared set UPDATE reused for three sets, matching the app's
   set-field update shape. It writes the same synthetic values each time, so
   hydration checks remain deterministic. These are disposable autocommit writes,
   not production session saves or transaction-helper invocations.

The SQL mirrors production query shapes without importing or changing production
services. Automatic statements from `getAllAsync`/`runAsync` exercise the SDK's
temporary-statement lifecycle. Explicit statements are owned by one operation
and finalized once in `finally`, including after execution/read failure. A
secondary finalization error is recorded without hiding the original error.
No intentional handle reset/close or failure injection is used.

Both logical batches and a separate SQLite-call permit pool are bounded by the
configured concurrency. Permits cover **individual API calls**, not whole jobs;
a parent hydration never holds a permit while awaiting child reads. Thus the
parallel-service operation cannot create unbounded fan-out or a permit deadlock.
The cap applies across both connections together, not once per connection.

With `--connections 2`, the sequential and shared-connection phases still use
only the primary connection. A third `multi-connection` phase distributes the
same operation mix across both handles. WAL is enabled on the disposable file;
each connection enables foreign keys and a 1,000 ms busy timeout before any
workload starts. Multiple writers can legitimately produce `sqlite-busy` or
`sqlite-locked`: those are not evidence of a shared-object release race.

Each phase reports `completed`, `failed`, `maxInFlight` (logical operations),
`peakSqliteCalls` (measured outstanding public SQLite API promises), API counts,
operation-kind counts, timings, and categorized failure samples. API counts do
not count the SDK's internal bridge calls separately or measure native worker
threads. `errorCounts` counts failed logical operations; `nativeErrorCounts`
counts rejected API calls, so one operation can contribute more than one native
error. `application-error` identifies a failed synthetic-data invariant and is
separate from native conversion/release and locking errors.

Successful cleanup additionally reports `explicitStatementsFinalized:true`,
matching `statementsPrepared`/`statementsFinalized`, and equal
`connectionsOpened`/`connectionsClosed`. All logical jobs, queued API requests,
parallel child reads, result reads, and finalizers settle before any connection
is closed. Close failures do not prevent attempts to close the other idle fixture
handles, but the file is never deleted unless every opened handle closed.
Rejected finalizers are surfaced in `statementFinalizeFailures`; a successfully
closed database alone must not be interpreted as successful explicit finalization.

`--status` and `--stop` work for either mode, without a mode flag. A stop during
fixture setup takes effect after setup completes. Longer workloads may exceed
the existing host transport's 60-second wait; inspect status rather than restarting.

## Progress, stopping, and timeouts

The runtime result is `globalThis.__sqliteConcurrencyRepro`. It contains the
current phase, settings, scheduled/completed read counts, in-flight counts,
elapsed times, error counts, and bounded sanitized failure samples.

From another terminal:

```powershell
node scripts/run-android-sqlite-concurrency.cjs --status
node scripts/run-android-sqlite-concurrency.cjs --stop
```

Stop is cooperative: it prevents another batch from starting and waits for the
active batch to settle before closing. It never abandons a native request or
closes the connection to interrupt one. The result stays `state:"running"`
through cleanup and reports `stage:"cleanup"` while closing/deleting.

The reused host transport waits about 60 seconds. A host timeout/disconnect does
**not** stop the Android workload. Inspect `--status` before any further action;
use `--stop` if desired, then inspect again. A second run is refused while one is
active or an opened fixture database's cleanup is incomplete. A native call that
never settles cannot be safely interrupted by closing its database. Do not
blindly rerun, reload the app, or delete files in that situation.

## Reading results

For each phase, inspect `concurrency`, `requested`, `scheduled`, `completed`,
`succeeded`, `failed`, `maxInFlight`, `elapsedMs`, `errorCounts`, and
`failureSamples` (at most 20 per phase). Successful cleanup reports:

```json
{
  "state": "completed",
  "inFlight": 0,
  "cleanup": {
    "opened": true,
    "allOperationsSettled": true,
    "closeAttempted": true,
    "closed": true,
    "deleted": true
  }
}
```

- `statement-id-conversion`: a NativeStatement integer bridge ID could not be
  converted. A sample may also have `sharedObjectReleased:true` and
  `nativeMethod:"NativeDatabase.prepareAsync"`; this matches the earlier error.
- `shared-object-release`: a shared-object release error without that exact
  statement conversion signature.
- `sqlite-busy` / `sqlite-locked`: SQLite locking errors, reported separately
  from shared-object conversion. A single disposable connection doing constant
  reads normally has no competing writer, so investigate these independently.
- `statement-finalized` / `database-closed`: explicit native lifetime errors.
- `unexpected-result`: the query returned something other than one row/value 1.
- `other`: unclassified error; raw content is deliberately suppressed.

Samples include only a fixed sanitized description, an allowlisted native method
and error code, and the iteration index. No raw error stack, database path,
request body, authorization header, token, or user data is printed.

A completed run can contain failures: that is an observed reproduction, not a
claim that the native implementation passed. CLI exit codes are 0 for clean
completion/cooperative cancellation, 2 when read failures were captured, and 1
for setup, cleanup, or transport failure. Status/stop commands report snapshots.
Workout mode uses `failedOperations` for workload failures and exits 2 for them.

The strongest evidence is a clean sequential baseline followed by the matching
statement/shared-object error under concurrency, with no closes/resets and the
same held-open connection. Errors in the sequential phase are also relevant:
record them rather than assuming concurrency is required. Zero failures only
means the error was not observed in that run. Repeat explicit runs and record
the device, Android version, iteration/concurrency settings, and installed
development-build versions. The process-wide registry and other app background
activity are still shared; a separate minimal test application provides a
stronger control if needed later.

## Original incident and investigation outcome

The original Android error, `Cannot use shared object that was already released`,
is intermittent and remains unreproduced by this harness. Passing diagnostics do
not establish that it is fixed or identify its cause. The investigation used
Expo 54.0.35, expo-sqlite 16.0.10, expo-modules-core 3.0.30, and React Native
0.81.5. No production code, dependencies, or native implementations were changed.

Operator-reported testing also passed 4,000 reads at concurrency eight, followed
by 4,000 reads at concurrency eight with 64 KiB allocation pressure per operation
(approximately 250 MiB cumulatively, without forced GC). Synthetic hydration,
prepared-statement, and two-connection testing passed as well. These outcomes
are evidence of completed runs, not proof that a rare native race cannot occur.

Relevant upstream references, checked November 9, 2026:

- [Expo issue #50855](https://github.com/expo/expo/issues/50855) reports an Android
  shared-object registry lookup race under concurrent SQLite calls. It remains
  open and provides a plausible mechanism, not proof of this app's root cause.
- [Proposed fix #50939](https://github.com/expo/expo/pull/50939) locks registry
  reads. It is open; this branch does not apply it.
- [Merged fix #50513](https://github.com/expo/expo/pull/50513) addresses a separate
  async shared-object peer lifetime issue. Its merged status does not establish
  that the installed SDK contains it or that it explains this incident.

If the error recurs, preserve the sanitized native method/error category, device
and Android version, development-build versions, and complete harness JSON.
Use the existing development build and rerun the controls explicitly:

```powershell
node scripts/run-android-sqlite-concurrency.cjs --iterations 4000 --concurrency 8
node scripts/run-android-sqlite-concurrency.cjs --mode workout --iterations 140 --concurrency 8
node scripts/run-android-sqlite-concurrency.cjs --mode workout --iterations 140 --concurrency 8 --connections 2
```

Each run includes a sequential control. Add `--allocation-kib 64` separately if
needed. On timeout use `--status`, then cooperative `--stop` if necessary; do not
start another run until operations settle and cleanup is confirmed. Never reset
the workout database or patch dependencies to make this diagnostic pass. If only
the application reproduces the error, a separate minimal Expo application is the
next isolation step; these passing runs alone do not justify a production fix.

## Scope and retirement

There are no application startup imports or npm scripts for this harness. Both
the Android adapter and core enforce Android development mode. Completing a run
removes its stop control; only sanitized result metadata remains. No failure
injection or native patch is installed.

To retire it, remove these files together: `scripts/sqlite-concurrency-harness.cjs`,
`scripts/android-sqlite-concurrency-repro.cjs`,
`scripts/run-android-sqlite-concurrency.cjs`,
`services/__tests__/sqliteConcurrencyHarness.test.ts`,
`scripts/sqlite-workout-concurrency-harness.cjs`,
`services/__tests__/sqliteWorkoutConcurrencyHarness.test.ts`, and this document.
Preserve the shared Metro transport and all existing archival utilities.

## Initial smoke verification

The emulator completed 100 sequential reads and 100 reads at concurrency four
with zero failures. Observed peak in-flight counts were one and four; phase
times were 1,712 ms and 490 ms. All operations settled before close, and the
disposable database was deleted. This validates the harness, not the absence of
an intermittent native race. No native patch or dependency change was applied.

The initial realistic-workload smoke run also completed all three phases with
seven logical operations per phase, concurrency three, and two retained handles.
Each phase completed 40 public SQLite calls; measured call peaks were one, three,
and three. All six explicit statements finalized, both handles closed, and the
disposable file was deleted. No native, locking, or application errors were seen
in this small run; this validates execution/cleanup, not absence of a rare race.
