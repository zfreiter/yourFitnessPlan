WorkoutContext verification - October 27, 2026

Confirmed architecture and root causes

There is one WorkoutProvider in app/_layout.tsx. Home and Calendar subscribe to it. WorkoutSessionProvider separately owns the edit form's saved baseline, which is needed to track unsaved edits; it is not another general workout cache.

- The active session called workoutService.updateWorkout and reset its form, but never updated WorkoutContext with the service's hydrated result. SQLite was correct while Home and Calendar retained old objects.
- Creation already appended context data, so the create path was not simply missing an update. It published the submitted form rather than the hydrated SQLite result, allowed duplicate IDs, and did not invalidate older full-cache loads. The legacy creation container also appended using a captured workouts array.
- Existing fetch generations protected loads against other loads, but not against successful insertions/deletions/edits during an in-flight read. Month-cache reads could also restore deleted rows. Authentication checks in asynchronous callbacks referenced old closures.
- Deletion removed context data after a successful SQLite call, but always returned success=true even when the service failed. Navigation could therefore imply that a failed deletion succeeded.
- WorkoutDetails kept a separate workout object in state. Its effect ran only when workouts.length was positive, so removing the last workout could leave an old detail snapshot.
- SyncProvider replaced its entire child tree with loading/error views. Because WorkoutProvider is beneath it, a failed push or another synchronization attempt could unmount the local cache and editing session. Local rendering also waited for remote initialization.
- Calendar's effect dependencies already included workouts; they were not the primary cause. The list and date markings are now derived with useMemo so they reflect a context change in the same render rather than another local state cycle.

Implemented behavior

Successful creation/session saves publish hydrated records returned by SQLite services. Missing return data triggers a targeted SQLite read, never a Supabase fetch or publication of guessed form values. The existing insertWorkout API now replaces an existing ID as well as inserting new IDs, using a new array and workout reference.

Legacy persisted child mutations reload only their affected workout after success. The legacy saveWorkoutToDb wrapper now uses the existing atomic workout-update service and its existing change mapper rather than committing base fields and sets in separate transactions. Failed saves do not publish changes. Delete failures propagate to callers and retain the cached record.

Full loads retry when a mutation changes the cache during the read. Superseded requests, previous-account results, older per-workout reads, and reads superseded by a newer full snapshot cannot overwrite newer state. Month loads use the same revision/account safeguards. Successful Supabase initialization/refresh signals that SQLite changed; WorkoutProvider reloads that committed dataset. Normal local mutations do not reload every workout or wait for remote sync.

SyncProvider keeps its child providers mounted while syncing and on errors, displaying the error alongside the existing app. Settings records its refresh cooldown only after a successful refresh; failed refreshes do not signal replacement data or reload the cache. WorkoutDetails derives its workout directly from context. Clean session forms adopt external committed changes; dirty sessions retain their unsaved edits.

Files changed for this task

- context/workoutContext.tsx: immutable replacement, targeted hydration, load/mutation/account race guards, correct deletion result, and persisted legacy helpers.
- context/WorkoutSessionContext.tsx: publish hydrated saves and reconcile external changes only when the form is clean.
- context/SyncContext.tsx: retain provider mounting on sync loading/errors, report refresh results, and signal committed local dataset changes.
- app/(app)/[workoutId].tsx: derive details directly from current context.
- features/create-workout/components/createWorkoutButton.tsx: publish the hydrated creation result or reload the one saved workout.
- features/create-workout/components/createWorkoutContainer.tsx: replace the legacy captured-array append with the same publication flow.
- features/settings/account/refreshWorkouts.tsx: honor refresh failure; let the provider's successful-refresh signal reload SQLite.
- features/calendar/components/calendar.tsx: derive selected-day rows and markings from current context.
- features/calendar/components/DailyWorkoutSchedule.tsx and features/home/TodaysWorkout/WorkoutCard.tsx: use the canonical Workout type; preserve the existing neutral color for open workouts.
- context/__tests__/workoutContext.test.tsx: mounted provider/creation/session/Home/Calendar and race regressions.
- context/__tests__/workoutSyncContext.test.tsx: actual SyncProvider plus WorkoutProvider tests for pending/failed sync and refresh.
- context/__tests__/circuitSession.test.tsx: supply the shared-context publication API to the existing isolated session harness.
- docs/workout-context-verification.md: this report.

Verification results

97 tests passed in 10 suites under TZ=America/Los_Angeles:

    node --experimental-sqlite ./node_modules/jest/bin/jest.js --watchAll=false --runInBand --silent

Equivalent project command (Node 22.5+):

    npm.cmd test -- --watchAll=false --runInBand --silent

The new tests cover all three workout types, real mounted creation/session handlers, Home and Calendar subscribers, immutable references, duplicate avoidance, saved-date movement between days, failed SQLite operations, deletion success/failure, full/targeted/month-read races, account switches, external session changes with/without unsaved edits, hydrated fallback reads, local rendering while remote sync is pending, failed pushes retaining mounted state, and context reload only after successful refresh. Existing real-SQLite transaction/sync/queue and strength/cardio/circuit regressions continue to pass. No live database or Supabase operations were performed for this task.

TypeScript still reports 155 repository diagnostics. No diagnostics occurred in the changed providers, active session/details, Calendar/Home consumers, refresh handler, or new tests. Six pre-existing errors remain in the legacy createWorkoutContainer.tsx: nonexistent ExerciseType, CreateWorkoutForm, Exercise and Workout imports, and the resulting implicit-any exercise/index parameters. Other existing legacy session tracking and renderer-type errors remain outside this task. No schema, RLS, dependencies, or queue/transaction implementation was changed.

Manual Android checks

1. Use an isolated development emulator/test account. Start with npm.cmd start -- --dev-client and press a. Sign in once, then disable networking using the emulator controls.
2. Create one strength, one cardio, and one circuit workout scheduled for today. After each normal local save, Home and Calendar should immediately display it without reloading, signing in again, or synchronizing.
3. Open each workout. Change its name and an exercise/set or cardio/interval value, then save. Navigate back to Home and Calendar and reopen the session: all values should agree, with no unsaved-change indicator after a successful save.
4. Change a workout's scheduled date to tomorrow and save. It should leave today's Home list and today's Calendar list, appear on tomorrow's Calendar date, and retain its chosen local time. Reopen and verify the date/time.
5. Explicitly delete a test workout through its confirmation UI. It should disappear immediately. Repeat with the last displayed workout to check that no stale detail remains. Automated tests cover failed deletion without requiring destructive database fault injection on the emulator.
6. Restore networking. A failed push must leave successful local saves visible; existing queued operations remain pending. Navigate between Home, Calendar and Session while synchronization is pending or fails and confirm that forms/cache are not remounted or cleared. Use the existing read-only inspector documented in android-circuit-checks.md to inspect queue state.
7. On an isolated test dataset, use the existing Refresh Workouts action after pending local changes have synced. The successful local replacement should update Home, Calendar and a clean session without restarting. A failed refresh must keep the current local state and not consume the successful-refresh cooldown.
8. Test fast navigation/account switching while a load is pending. Workouts from a previous account must never appear. Verify native scrolling, navigation and form focus after provider updates.

Native Android navigation, native SQLite timing across app restarts, and live Supabase/network behavior still require manual verification. Automated tests simulate remote failures; they do not change production records, policies or authentication settings.
