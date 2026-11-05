# Valid-unit verification

Run the component contracts with the project's Jest preset:

```sh
node --experimental-sqlite ./node_modules/jest/bin/jest.js --runInBand --watchAll=false features/create-workout/components/__tests__/validUnits.test.tsx
```

Run all regression coverage by omitting the test path. The tests use real React,
React Hook Form, field arrays, controllers, component effects, and
`NestedExerciseSetArray`. Only native UI surfaces, theme/context data, icons,
and UUID generation are mocked. Picker tests select exercises through UI events.

## Assertion inventory and migration

The retired standalone harness contained the following checks. The seven unit
cases are reps+weight, reps, time, time+distance, reps+weight+time, empty units,
and absent units. Absent-unit fixtures deliberately omit the property at runtime
to exercise the components' existing fallback without changing canonical types.

| Original assertion | Jest coverage |
| --- | --- |
| Creator metric labels equal the supplied units in order, uppercased, for all seven cases | New `validUnits.test.tsx`: creator matrix |
| Creator input count equals the number of units | Same creator matrix |
| Add Set initializes only supported metrics for each member of a pair | New paired manual matrix; uses the real nested field-array wrappers |
| Both rendered creator cards receive their own units, including empty/missing fallback | Same manual matrix; also checks actual input counts and parent IDs |
| Selection adopts the newly selected exercise's units | Existing `exerciseSelection.test.ts`; new picker confirmation test exercises the real modal |
| Selected reps remain 8 and unsupported saved weight becomes undefined | New unchanged-pair picker/save integration test |
| Unchanged companion sets are equal and source time remains 42 | Same picker/save integration test |
| Saving time-only sets removes reps and weight and preserves time=30 | New save-filtering test; also proves the source form is not mutated |
| Auto-fill gives the supported member reps=10 | New paired auto-fill test |
| Auto-fill omits reps/weight for an unsupported companion | Same auto-fill test |
| Auto-fill companion has the correct parent ID and a distinct set ID | Same auto-fill test |
| Circuit selection preserves units, normalizing missing units to empty | New circuit picker matrix, all seven cases |
| Circuit sets initialize exactly the supported metrics | Same circuit matrix |
| Saved set editor uses only distance/time paths, in that order | New editor test checks two real inputs and edits them, then verifies distance/time form values |
| Removed metrics are cleared without losing supported values | New editor test changes units on a mounted real exercise card and verifies weight is cleared while time=30 remains |

## Stale expectations corrected during migration

Two literal assertions in the old harness conflict with current production
behavior and could not have passed through its broken loader:

1. It changed one exercise of a superset but expected old reps to survive and
   the companion's old sets to remain. `buildExerciseSelection` intentionally
   resets both members when either selected exercise changes. Existing
   `exerciseSelection.test.ts` and `nestedSetReplacement.test.tsx` enforce that
   behavior, including matching units, changed first/second member, retained
   group IDs, fresh exercise IDs, cleared rendered inputs, and no stale saved
   sets. Metric preservation/filtering is covered for an unchanged pair instead.
2. It expected stale metric cleanup on the initial render. `ExerciseCard` only
   clears removed metrics when its unit combination changes. The new test
   performs that actual transition instead of manually invoking collected effects.

These differences are documented rather than changing production behavior or
weakening existing regression assertions. Existing nested-set tests also cover
regular replacement, exact-pair retention, and cancellation. All valid-unit
contracts above now run under Jest; no custom module loader is needed.
