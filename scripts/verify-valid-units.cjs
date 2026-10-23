// Component contract checks without a native runtime. Run: node scripts/verify-valid-units.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

let exercises = [];
let selected = null;
let selectedStateIndex = 0;
let stateIndex = 0;
let uuid = 0;
let effects = [];
const writes = [];
const element = (type, props) => ({ type, props: props ?? {} });
const react = {
  createElement: (type, props, ...children) => element(type, { ...props, children }),
  useState: (initial) => [stateIndex++ === selectedStateIndex && selected ? selected : initial, () => {}],
  useMemo: (fn) => fn(),
  useEffect: (fn) => effects.push(fn),
};
const form = {
  getValues: (name) => name === 'exercises' ? exercises :
    exercises[Number(name.split('.')[1])]?.sets,
  watch: () => undefined,
  setValue: (...args) => writes.push(args),
};
const native = new Proxy({ StyleSheet: { create: (styles) => styles } }, {
  get: (target, key) => target[key] ?? key,
});
const mocks = {
  react,
  'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'Fragment' },
  'react-native': native,
  'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
  'expo-crypto': { randomUUID: () => `uuid-${++uuid}` },
  '@expo/vector-icons/Ionicons': 'Icon',
  '@expo/vector-icons': { Ionicons: 'Icon' },
  '@/context/colorThemeContext': { useColorTheme: () => ({ theme: { color: {}, spacing: {}, fonts: {} } }) },
  '@/context/workoutContext': { useWorkout: () => ({ exercises: [] }) },
  'react-hook-form': {
    Controller: 'Controller',
    useFormContext: () => form,
    useWatch: ({ name }) => form.getValues(name),
    useFieldArray: ({ name }) => {
      const index = Number(name.split('.')[1]);
      return {
        fields: exercises[index]?.sets ?? [],
        append: (set) => exercises[index].sets.push(set),
        replace: (sets) => { exercises[index].sets = sets; },
        remove: () => {},
      };
    },
  },
};
function load(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)((name) => {
    if (name in mocks) return mocks[name];
    if (name === '../setCardCreator') return { SetCardCreator: 'SetCardCreator' };
    if (name === './setCardEditor') return { SetCardEditor: 'SetCardEditor' };
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  stateIndex = 0;
  effects = [];
  return module.exports;
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function button(tree, text) {
  return nodes(tree).find((node) => node.type === 'Pressable' &&
    nodes(node).some((child) => child.type === 'Text' && child.props.children === text));
}
const root = 'features/create-workout/components/';
const cases = [['reps', 'weight'], ['reps'], ['time'], ['time', 'distance'], ['reps', 'weight', 'time'], [], undefined];
for (const units of cases) {
  const { SetCardCreator } = load(root + 'setCardCreator.tsx');
  const tree = SetCardCreator({ exerciseIndex: 0, setIndex: 0, validUnits: units ?? [] });
  assert.deepEqual(nodes(tree).filter((node) => node.type === 'Text' &&
    ['REPS', 'WEIGHT', 'TIME', 'DISTANCE'].includes(node.props.children))
    .map((node) => node.props.children), (units ?? []).map((unit) => unit.toUpperCase()));
  assert.equal(nodes(tree).filter((node) => node.type === 'TextInput').length, (units ?? []).length);
  exercises = [{ id: 'first', validUnits: units, sets: [] }, { id: 'second', validUnits: ['time', 'distance'], sets: [] }];
  const { ManualSetField } = load(root + 'addExerciseModal/manualSetField.tsx');
  button(ManualSetField({ exerciseFields: exercises, entryMethodSelector: 'manual' }), 'Add Set').props.onPress();
  for (const exercise of exercises) {
    assert.deepEqual(['reps', 'weight', 'time', 'distance'].filter((unit) => exercise.sets[0][unit] !== undefined),
      ['reps', 'weight', 'time', 'distance'].filter((unit) => exercise.validUnits?.includes(unit)));
  }
  const rerender = ManualSetField({ exerciseFields: exercises, entryMethodSelector: 'manual' });
  assert.deepEqual(nodes(rerender).filter((node) => node.type === 'SetCardCreator').map((node) => node.props.validUnits),
    [units ?? [], ['time', 'distance']]);
}

const libraryExercise = (id, validUnits) => ({ id, name: id, validUnits, musclesTargeted: [], equipment: [] });
const untouched = { id: 'other', exercise_id: 'other', validUnits: ['time'], sets: [{ id: 'other-set', time: 42 }] };
exercises = [{ id: 'first', exercise_id: 'old', validUnits: ['reps', 'weight'], sets: [{ id: 'set', reps: 8, weight: 100 }] }, untouched];
selected = [libraryExercise('new', ['reps', 'time']), libraryExercise('other', ['time'])];
const { ExerciseLibraryModal } = load(root + 'addExerciseModal/exerciseLibraryModal.tsx');
let appended = [];
const selectionTree = ExerciseLibraryModal({ selectedLoggingStyle: 'superset', replace: (ex) => { appended = ex; }, workoutId: 'workout' });
button(selectionTree, 'Confirm').props.onPress();
assert.equal(appended[0].sets[0].reps, 8);
assert.equal(appended[0].sets[0].weight, undefined);
assert.deepEqual(appended[0].validUnits, ['reps', 'time']);
assert.deepEqual(appended[1].sets, untouched.sets);
assert.equal(untouched.sets[0].time, 42);
selected = null;

const { AddExerciseButton } = load(root + 'addExerciseModal/addExerciseButton.tsx');
exercises = [{ exercise_name: 'new', validUnits: ['time'], sets: [{ reps: 8, weight: 100, time: 30 }] }];
let saved;
AddExerciseButton({ setModalVisible: () => {}, appendExercise: (ex) => { saved = ex; } }).props.onPress();
assert.equal(saved.sets[0].reps, undefined);
assert.equal(saved.sets[0].weight, undefined);
assert.equal(saved.sets[0].time, 30);

const { AutoFillSetField } = load(root + 'addExerciseModal/autoFillSetField.tsx');
exercises = [{ id: 'first', validUnits: ['reps', 'weight'], sets: [] }, { id: 'second', validUnits: ['time'], sets: [] }];
button(AutoFillSetField({ exerciseFields: exercises, entryMethodSelector: 'auto_fill' }), 'Generate Sets').props.onPress();
assert.equal(exercises[0].sets[0].reps, 10);
assert.equal(exercises[1].sets[0].reps, undefined);
assert.equal(exercises[1].sets[0].weight, undefined);
assert.equal(exercises[1].sets[0].workout_exercise_id, 'second');
assert.notEqual(exercises[0].sets[0].id, exercises[1].sets[0].id);

for (const units of cases) {
  selected = [libraryExercise('circuit', units)];
  selectedStateIndex = 1;
  const { CircuitExercisePicker } = load(root + 'addCircuitModal/circuitExercisePicker.tsx');
  let circuit;
  const tree = CircuitExercisePicker({ append: (ex) => { circuit = ex; }, workoutId: 'workout', roundNumber: 1, exerciseCount: 0 });
  // The confirmation button calls handleConfirm and has a disabled prop.
  const confirm = nodes(tree).find((node) => node.type === 'Pressable' && 'disabled' in node.props);
  confirm.props.onPress();
  assert.deepEqual(circuit.validUnits, units ?? []);
  assert.deepEqual(['reps', 'weight', 'time', 'distance'].filter((unit) => circuit.sets[0][unit] !== undefined),
    ['reps', 'weight', 'time', 'distance'].filter((unit) => units?.includes(unit)));
}
selected = null;
selectedStateIndex = 0;
const { SetCardEditor } = load(root + 'setCardEditor.tsx');
const editor = SetCardEditor({ set: { weight: 100 }, validUnits: ['time', 'distance'], exerciseOrder: 0, setOrder: 0 });
assert.deepEqual(nodes(editor).filter((node) => node.type === 'Controller').map((node) => node.props.name),
  ['exercises.0.sets.0.distance', 'exercises.0.sets.0.time']);

exercises = [{ validUnits: ['time'], sets: [{ weight: 100, time: 30 }] }];
const { ExerciseCard } = load(root + 'exerciseCard.tsx');
ExerciseCard({ exercise: exercises[0], exerciseOrder: 0 });
effects.forEach((effect) => effect());
assert.deepEqual(writes, [['exercises.0.sets.0.weight', undefined]]);
console.log('Passed: metric combinations, missing units, paired manual sets, exercise replacement, save filtering, paired auto-fill ownership, circuit metrics, and set editing cleanup.');
