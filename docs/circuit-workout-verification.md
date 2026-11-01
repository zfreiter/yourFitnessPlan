Circuit workout verification — October 27, 2026

Confirmed findings and fixes

- Date: the shared date picker unconditionally called setValue(scheduled_datetime, today at noon) on mount. It also applied the route date during editing. The saved-session defaults independently fell back to new Date() for a missing saved timestamp. Initialization now belongs to creation only. The picker leaves stored dates alone, ignores dismissed events, and preserves the existing clock when selecting a date. New user selections use explicit ISO instants so Supabase cannot reinterpret a local clock as UTC. The storage boundary retains the existing T-separated format and rejects invalid new/changed timestamps. Invalid saved timestamps remain visible as invalid instead of becoming today.
- Dirty state: the indicator uses actual workout differences, not React Hook Form isDirty. The exercise-card mount effect changed inactive persisted set metrics from zero/null to undefined. Along with the date overwrite, this created real differences immediately on opening a workout. Cleanup now runs only after units actually change. Empty optional description/completion defaults compare consistently. The saved baseline updates after success; failures retain changes. Edits made during an in-flight save also survive.
- Sync: individual upload errors were logged but generally returned success=true. Some missing-parent queue items were even marked synchronized without uploading. Push now reports errors, retains failed/orphaned operations, defers dependent records, and preserves per-record order on retry. Rounds precede linked exercises; exercises precede sets. Duplicate retries still require matching remote data and now allow equivalent PostgreSQL timestamp formatting.
- Data mapping: initial set insert queue payloads defaulted absent metrics to zero, while SQLite stored null. Inserts now reuse the existing update mapping. Circuit creation also omitted notes; notes and an explicit circuit_id are now included.

Actual local/remote comparison before implementation

The connected emulator's SQLite database and sync queue were compared with Supabase under the app user's existing RLS permissions.

- SYNC TEST - Circuit 01: locally 1 circuit round, 3 exercises, and 3 sets. Supabase had all those records, with matching circuit/group relationships. Its queue operations were acknowledged. Current creation did not reproduce missing records.
- Older Circuit test: locally 1 circuit round, 7 exercises, and 7 sets, belonging to a DIFFERENT account than the persisted Supabase session. A remote query under the current session returned no visible workout; that does not establish missing remote data because RLS scopes access by owner. There was no remaining queue history for these older records. No cross-account recovery or requeue was attempted. No missing remote records were confirmed for the signed-in user.
- A newly generated disposable circuit was saved through the production services into isolated real SQLite, including its queue, then pushed to actual Supabase before changing implementation. The workout, round, exercise, set, scheduled timestamp, and circuit_id matched. The fixture was deleted afterward.
- The live disposable test was repeated after the changes, including resetting its isolated queue and retrying the same inserts. Both pushes succeeded, no operations remained pending, and only the expected records existed. The fixture was deleted afterward. Neither run changed the emulator's workout records.

Regression coverage and results

Run with Node 22.5+; the existing npm test script now enables node:sqlite. No new dependencies were installed.

    npm.cmd test -- --watchAll=false --runInBand --silent

Verified command:

    node --experimental-sqlite ./node_modules/jest/bin/jest.js --watchAll=false --runInBand --silent

69 tests passed in 7 suites, including a full run with TZ=America/Los_Angeles. New circuit tests cover mounted form initialization and editing, creation notes/relationships, picker dismissal, successful/failed saves, edits during saving, invalid dates, reopening, real SQL transactions and foreign keys, all six workout tables, push/pull, RLS/FK failure simulation, dependency deferral, duplicate retries and mismatches, and refresh races. The existing transaction and sync verification harnesses also pass against real SQLite.

TypeScript checking still reports 158 repository diagnostics. No diagnostics occurred in the files changed for this task. Relevant pre-existing legacy consumers still reference removed WorkoutSessionContext APIs: GenericTextInput, workout-session/durationWheelPicker, setInputs, and WorkoutSessionHeader reference markDirty, trackWorkoutUpdate, or trackSetUpdate. The active session uses the shared current form components and workout-diff tracking. The earlier cardioForms test also retains renderer host-type diagnostics. These were not expanded into unrelated migration work.

Files changed for this task

- app/(app)/CreateWorkout.tsx — initialize the creation schedule from its route/default.
- features/create-workout/components/dateTimePicker.tsx — remove mount/route overwrites and handle explicit selections safely.
- features/workout-session/components/activeWorkoutSession.tsx — retain missing/invalid saved dates without a current-time substitute.
- utils/scheduledDate.ts — shared validation, parsing, serialization, and explicit user selections.
- utils/workoutChangeUtils.ts — safe invalid-date comparison and consistent empty optional defaults.
- features/create-workout/components/exerciseCard.tsx — prevent hydration-time set mutation.
- context/WorkoutSessionContext.tsx — saved baseline and pending-edit preservation.
- features/create-workout/components/addCircuitModal/addCircuitButton.tsx — notes and explicit circuit relationship.
- services/workoutService.ts — timestamp validation and consistent set queue mapping.
- services/syncService.ts — error reporting, dependency handling, safe retries, timestamp verification, and pull validation.
- services/devWorkoutSyncVerification.ts — expect surfaced partial-upload errors.
- context/__tests__/circuitSession.test.tsx — mounted circuit regressions.
- services/__tests__/circuitPersistence.test.ts — real SQLite/service and sync regressions.
- services/__tests__/cardioPersistence.test.ts — make its existing queue adapter honor real queue ordering and acknowledgements.
- package.json — enable built-in SQLite for tests.
- docs/circuit-workout-verification.md — this report.

Remaining Android and Supabase checks

The changed JavaScript has not been exercised interactively in a freshly loaded Android session. Verify opening the existing circuit starts clean, calendar and clock picker selections and cancellation preserve the intended time, unrelated edits retain the schedule, successful save/reopen remains clean, and offline/reconnect behavior reports and retries failures. Test device locale/timezone changes and daylight-saving boundaries. Live Supabase checks verified successful upload and duplicate retry under current RLS; denied RLS/FK and network-failure paths were simulated in regression tests. Native Android transaction verification remains useful even though the same verification routines passed against real desktop SQLite. The older account?s records can only be compared remotely under that account?s own session; their presence in the local cache is not evidence of a sync failure for the signed-in user.

SQLite/Supabase schemas, RLS policies, and the offline queue/transaction design were preserved.


Follow-up: diagnostics without live access

The follow-up adds owner-scoped, read-only inspection to the existing app/dev-transaction-verification.tsx screen and metadata-only logging around queue staging, local transaction commits, and upload outcomes. It reuses services/devWorkoutSyncVerification.ts and the existing SQLite/service test harnesses. It performs no live writes, refreshes, resets, or automatic record deletion. The older fixture-runner button retains its explicit fixture cleanup behavior and is separate from the read-only inspector.

See android-circuit-checks.md in this directory for exact emulator startup/deep-link commands, interpretation of logs and queue states, read-only Supabase SQL, and remaining manual checks. The follow-up suite passed 72 tests in 8 suites, including diagnostic privacy/production-disable and read-only ownership checks. Full workout/queue dumps were removed from the instrumented paths.

Additional files changed for this follow-up: app/dev-transaction-verification.tsx; services/devWorkoutSyncVerification.ts; services/syncService.ts; services/workoutService.ts; context/WorkoutSessionContext.tsx; features/create-workout/components/createWorkoutButton.tsx; features/create-workout/components/circuitBuilder.tsx; utils/workoutSyncDiagnostics.ts; utils/__tests__/workoutSyncDiagnostics.test.ts; services/__tests__/circuitPersistence.test.ts; docs/android-circuit-checks.md; and this report.
