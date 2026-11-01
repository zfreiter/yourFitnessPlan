Android circuit checks

Use a development emulator and a test Supabase account/project. These instructions do not reset databases or delete records. The new inspector only reads data. No live Android or Supabase operations were performed for this follow-up; changes were verified through code analysis and isolated SQLite/mounted tests.

1. Start the app

From the project root:

    npm.cmd start -- --dev-client

Press a in the Expo terminal to open the Android emulator. If the native development app is not installed, build it with npm.cmd run android first. Sign in to your test account. Open React Native DevTools by pressing j in the Expo terminal, then select Console. Filter console output by [workout-sync].

2. Create a test circuit manually

Choose a recognizable test workout name, a future scheduled date and a non-default time (for example 14:25). Add a circuit with 3 rounds, 60 seconds of rest, 2 exercises, entered set values, and circuit notes. Save normally.

Expect queue-staged events for workouts, circuit_rounds, workout_exercises and exercise_sets, followed by a local-committed event for the workout. Copy its recordId: this is the workout ID to inspect and query remotely. A queue-staged event alone is not proof of a commit; the surrounding transaction may still roll back. local-failed indicates a failed save.

The existing form represents a circuit's repeat count in one circuit_rounds row: round_number=3 means 3 repeats. Do not expect 3 duplicated round rows or 3 duplicated copies of every exercise. Match the actual records shown by the inspector.

Logs include only table names, record IDs, operation types, queue IDs and sanitized error codes. They do not include tokens, user IDs, names, notes, timestamps or measurement payloads. Do not add credentials to logs when troubleshooting.

3. Inspect local records and queue without modifying them

With the app signed in, open the existing development screen:

    adb shell am start -a android.intent.action.VIEW -d "myapp://dev-transaction-verification" com.anonymous.yourFitnessPlan

If the deep link opens the development launcher, first open the running app from Expo, then retry. Paste the copied workout ID and press Inspect workout (read only).

The output lists IDs and parent IDs for all six workout tables, whether the scheduled date is valid, and matching queue operations with synced=true/false. It does not display workout contents. Requests for a workout outside the signed-in account are rejected. Inspection does not push, refresh, save, or delete records.

Use ONLY the Inspect workout (read only) button for non-mutating diagnosis. The separate, pre-existing Run SQLite and sync checks button creates/removes synthetic local fixtures. It must only be used when you explicitly choose to run that fixture suite on an isolated development install; its Supabase client is simulated.

4. Verify dates and dirty state

- Open the saved circuit. Verify its selected local date/time is unchanged and no save indicator appears before editing.
- Open and dismiss the date picker. Nothing should change.
- Change only set reps or the workout name. The save indicator should appear; the scheduled date/time should remain unchanged.
- Save, leave, and reopen. The save indicator should be clear and the edit retained.
- Change only the date. The clock should stay at the previously selected time. Change only the clock and confirm the date is retained. Save and reopen again.
- Repeat across a daylight-saving boundary if applicable. New user-selected schedules are stored as ISO instants; Supabase may show UTC. Compare the same instant rendered in the emulator's timezone rather than comparing raw UTC clock text with local clock text.

5. Verify offline/reconnect behavior

After signing in online, disable networking using the emulator's network controls. Edit or create the test circuit and save locally. Inspect its queue: new operations should remain synced=false. Reopen and confirm the locally saved edit is retained.

Restore networking. The app's normal sync runs on startup, so reopen the app if synchronization does not start immediately. Look for upload-attempt followed by upload-succeeded for each record. The ordering is workout, circuit round, linked exercise, then exercise set. After success, inspection should show the applicable operations acknowledged (synced=true), or no remaining entry if existing queue retention already removed an old acknowledged entry.

An upload-failed event and the existing error UI indicate that an operation remains pending. Error code 42501 identifies a permission/RLS error; 23503 identifies a foreign-key error. UNKNOWN can also represent a deferred dependency or a network failure. The application surfaces detailed errors in its normal error handling; the diagnostic console intentionally omits raw server messages. Do not change RLS policies just to make a test pass.

No failure should be reported as complete success. A dependent exercise/set must remain pending when its parent failed. Retry through the normal sync flow and verify that the same record IDs are used rather than new duplicate records. Do not use Refresh to repair a failed push: the existing refresh safeguards must preserve pending local changes.

6. Check Supabase rows using read-only SQL

In the test project's SQL Editor, replace WORKOUT_UUID with the copied local workout ID. Run these SELECT queries only:

```sql
select id, scheduled_datetime, type
from public.workouts
where id = 'WORKOUT_UUID'::uuid;

select id, workout_id, round_number, rest_after_round
from public.circuit_rounds
where workout_id = 'WORKOUT_UUID'::uuid;

select id, workout_id, circuit_id, group_id, round_number, exercise_order
from public.workout_exercises
where workout_id = 'WORKOUT_UUID'::uuid
order by exercise_order;

select s.id, s.workout_exercise_id, s.set_order
from public.exercise_sets s
join public.workout_exercises e on e.id = s.workout_exercise_id
where e.workout_id = 'WORKOUT_UUID'::uuid
order by e.exercise_order, s.set_order;

select id, workout_id, entry_order, mode
from public.cardio_entries
where workout_id = 'WORKOUT_UUID'::uuid
order by entry_order;

select i.id, i.cardio_entry_id, i.interval_order
from public.cardio_intervals i
join public.cardio_entries e on e.id = i.cardio_entry_id
where e.workout_id = 'WORKOUT_UUID'::uuid
order by e.entry_order, i.interval_order;
```

Match every local inspector ID to its remote row. Each exercise's circuit_id must reference the intended round ID, and each set's workout_exercise_id must reference its exercise ID. In Table Editor, filter the same IDs and check the entered reps/weights and circuit notes. If the workout contains no cardio records, empty cardio tables for that workout are expected.

SQL Editor can run with elevated permissions: these queries confirm stored records, not whether the app user's RLS access is correct. Validate app access using the same signed-in test account. Do not interpret another account's invisible rows as missing data.

7. Automated checks and outstanding verification

    npm.cmd test -- --watchAll=false --runInBand --silent

The test command uses Node's built-in SQLite (Node 22.5+). The current run passed 72 tests in 8 suites, covering dates, clean hydration, actual edits, save failures, full table/relationship mapping, transactions, partial uploads, safe retries, refresh races, diagnostic privacy, and read-only inspection. Existing strength/cardio regression suites remain included.

Manual verification still required: native date/time picker behavior, native Android SQLite lifecycle across app restarts, offline reconnect and real network failures, RLS behavior for the test account, and live push/pull under your project configuration. Do not clear app data to test pull while there are pending local changes; use a second isolated test install signed in as the same test account instead. None of these manual checks are required before using the focused fixes or running the automated suite.
