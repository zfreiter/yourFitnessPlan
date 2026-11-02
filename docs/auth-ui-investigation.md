# Post-login interaction investigation

## Evidence and limits

The Android emulator was already in the reported stuck development session.
Before the fix, automated taps on Settings and the Home create button left Home
visible. The native window inspection showed only MainActivity, with no separate
modal window. No credentials or auth storage were read.

Development instrumentation then established:

- A Home workout received press-in, press, navigation-request, and press-out.
- Calendar and Settings emitted tab-press with prevented=false.
- JavaScript continued processing touches and animation frames.
- Auth was ready, profile loading was false, and sync had completed.
- Expo Router reported `(app)/login` while Android displayed Home. Pressing
  controls did not produce a matching route-state change.
- Native gesture logs showed initialization followed by teardown at the login
  session boundary.

This directly demonstrates stale navigation state, rather than a missing touch,
a blocked JS thread, or a button waiting for remote workout sync. The strongest
supported trigger is the session key remounting the Stack and Android gesture
root beneath AuthSessionScope. Jest does not reproduce the Android native
failure itself; its tests protect root lifetime, callbacks, and cleanup.

After removing the keyed subtree remount and preserving the gesture root,
a tap on Settings opened Settings on the same emulator. The user then confirmed
that Home, Calendar, Settings, and + all worked after three sign-out/sign-in
cycles. Slow/offline and two-account device scenarios remain separate checks.

## Implementation

- Keep the navigation tree, theme backdrop, and gesture root mounted across
  session boundaries. Route guards remain responsible for authenticated routes.
- Scope provider initialization and async completions to both the user ID and
  auth session generation. Clear user data/loading/error state on logout;
  reject stale responses even when the next login uses the same account.
- Preserve the existing service-level sync cancellation and upload coordination.
  Auth/navigation do not await sync. SQLite transactions, queue contents,
  schemas, and Supabase ownership checks are unchanged.
- Trace input/focus, handler start/return/failure, navigation requests and actual
  route changes, provider readiness, and session lifetime in development only.
  No polling interval, delay, forced reload, or app restart is used as a fix.

## Files

Lifecycle and reset:

- `app/_layout.tsx`
- `context/authContext.tsx`
- `context/SyncContext.tsx`
- `context/workoutContext.tsx`
- `context/WorkoutSessionContext.tsx`
- `context/profileContext.tsx`
- `context/userPreferenceContext.tsx`
- `context/maxLiftContext.tsx`
- `hooks/useSessionLifetime.ts`

Development diagnostics on representative controls:

- `utils/uiDiagnostics.ts`
- `components/navigation/UiLifecycleDiagnostics.tsx`
- `components/fabButton.tsx`
- `features/home/TodaysWorkout/WorkoutCard.tsx`
- `features/create-workout/components/createWorkoutButton.tsx`
- `app/(app)/main/_layout.tsx`
- `app/(app)/main/settings/index.tsx`

Regression coverage:

- `context/__tests__/authLifecycle.test.tsx`
- `context/__tests__/authTransitionTheme.test.tsx`
- `context/__tests__/sessionProviderReset.test.tsx`
- `context/__tests__/workoutContext.test.tsx`
- `utils/__tests__/uiDiagnostics.test.ts`

Tests exercise immediate Home/create/settings callback execution during pending
sync and remote failure, repeated login cycles with stable mounts, removal of
login's native modal after authentication, loading reset on failure, same/different
account provider resets, stale profile/preference/max/workout loads, stale save
completions, diagnostic error propagation, and silence in production. Navigation
callbacks are mocked in Jest; Android validation remains necessary for actual
native dispatch and screen transitions.

## Remaining Android checks

1. From a cold launch with a persisted session, open Calendar, Settings, Account,
   Home, and + immediately. Check both touch and Tab/Enter activation.
2. Repeat login/logout with a slow connection and with sync uploads active.
   Navigation should remain available while provider data loads.
3. Restore an existing valid session offline. Verify local workouts and tabs;
   reconnect and verify pending uploads resume.
4. Try an invalid login, then a valid one. The spinner must stop on failure and
   no login modal should remain after success.
5. Switch between two disposable accounts and check that profile, preferences,
   maxes, and workouts belong to the current user.

For a recurrence, capture the narrow development log in PowerShell:

```powershell
$fitnessAppPid = adb shell pidof com.anonymous.yourFitnessPlan
adb logcat --pid=$fitnessAppPid -v brief -s ReactNativeJS:I | Select-String '\[ui\]|\[auth\]'
```

Interpretation:

- No focus/press-in: inspect native input delivery and focused windows.
- Press-in/out without press: inspect responder cancellation or disabled state.
- Press/navigation-request without navigation state or tab focus: inspect the
  navigator lifetime and native screen state, not remote synchronization.
- handler-start without handler-resolved: inspect that specific async operation.
- handler-failed: read the corresponding error in Metro; diagnostics rethrow
  rather than swallow failures.

The diagnostics contain explicit labels, route templates and readiness flags;
they do not dump events, route params, form values, tokens, or passwords.

## Validation result

- All 134 tests passed across 15 Jest suites.
- The project TypeScript check still fails on pre-existing errors in other
  files (including references to removed workout-session methods). No errors
  were reported in files changed for this fix; the new diagnostic-test
  NODE_ENV assignment was corrected before completion.
- Android: the initial stuck session and recovery were observed directly;
  the user confirmed three working logout/login cycles. Subsequent device
  logs show tab-press followed by focus and matching route-state events,
  plus successful navigation to CreateWorkout and back.
