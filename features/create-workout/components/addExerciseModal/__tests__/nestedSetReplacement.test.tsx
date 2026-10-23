import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import {
  AddExerciseForm,
  CreateWorkoutForm,
  Exercise,
  ExerciseGroupType,
  WorkoutExercise,
} from "@/types/interfaces/types";
import { FormProvider, UseFieldArrayAppend, UseFieldArrayReplace, useFieldArray, useForm } from "react-hook-form";
import { SetBuilder } from "../setBuilder";
import { buildExerciseSelection } from "../../../utils/exerciseSelection";
import { AddExerciseButton } from "../addExerciseButton";

jest.mock("@/context/colorThemeContext", () => ({
  useColorTheme: () => ({
    theme: {
      color: {
        border: "#000",
        surface: "#fff",
        surface2: "#fff",
        input: "#fff",
        accent: "#000",
        textPrimary: "#000",
        textSecondary: "#000",
        danger: "#f00",
      },
      spacing: {
        screenPadding: 8,
        label: 4,
        md: 8,
        lg: 8,
        buttonHeight: 40,
      },
      fonts: { body: "body", headerBody: "header", stats: "stats" },
    },
  }),
}));
jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("expo-crypto", () => {
  let id = 0;
  return { randomUUID: () => `test-set-${++id}` };
});

type FormApi = {
  replaceExercises: UseFieldArrayReplace<AddExerciseForm, "exercises">;
  getValues: ReturnType<typeof useForm<AddExerciseForm>>["getValues"];
  setValue: ReturnType<typeof useForm<AddExerciseForm>>["setValue"];
};

function FormHarness({
  onReady,
  appendExercise,
}: {
  onReady: (api: FormApi) => void;
  appendExercise: UseFieldArrayAppend<CreateWorkoutForm, "exercises">;
}) {
  const methods = useForm<AddExerciseForm>({
    defaultValues: { logging_style: "straight", exercises: [] },
  });
  const { fields, replace } = useFieldArray({
    control: methods.control,
    name: "exercises",
  });

  onReady({
    replaceExercises: replace,
    getValues: methods.getValues,
    setValue: methods.setValue,
  });

  return (
    <FormProvider {...methods}>
      {fields.length > 0 && (
        <SetBuilder
          key={fields.map((field) => field.id).join(":")}
          entryMethodSelector="manual"
          selectedLoggingStyle="superset"
          control={methods.control}
          exerciseFields={fields}
        />
      )}
      <AddExerciseButton
        setModalVisible={() => {}}
        appendExercise={appendExercise}
      />
    </FormProvider>
  );
}

const makeExercise = (id: string): Exercise => ({
  id,
  name: id,
  description: `${id} description`,
  types: ["strength"],
  validUnits: ["reps", "weight"],
  musclesTargeted: [],
  equipment: [],
  difficulty: "beginner",
  noWeight: false,
});

const makeWorkoutExercise = (
  libraryExercise: Exercise,
  index: number,
  groupType: ExerciseGroupType | null = null,
): WorkoutExercise => ({
  id: `workout-${libraryExercise.id}`,
  workout_id: "workout-1",
  exercise_id: libraryExercise.id,
  exercise_name: libraryExercise.name,
  description: libraryExercise.description,
  validUnits: libraryExercise.validUnits,
  musclesTargeted: [],
  equipment: [],
  exercise_order: index,
  group_id: groupType ? "group-1" : null,
  group_type: groupType,
  round_number: null,
  sets: [],
});

function findAddSetButton(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAll((node) => typeof node.props.onPress === "function")
    .find((pressable) =>
      pressable.findAll((node) => String(node.props.children) === "Add Set")
        .length > 0,
    );
}

function findTextInputs(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root.findAll((node) =>
    ["TextInput", "RCTTextInput"].includes(String(node.type)),
  );
}

function findSaveButton(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAll((node) => typeof node.props.onPress === "function")
    .at(-1);
}

function populateVisibleInputs(renderer: TestRenderer.ReactTestRenderer) {
  act(() => {
    findTextInputs(renderer).forEach((input, index) => {
      input.props.onChangeText(String(index + 10));
    });
  });
}

function addThreeSets(renderer: TestRenderer.ReactTestRenderer) {
  for (let index = 0; index < 3; index += 1) {
    act(() => findAddSetButton(renderer)?.props.onPress());
  }
}

function renderForm() {
  let api: FormApi | undefined;
  let renderer!: TestRenderer.ReactTestRenderer;
  const appendExercise = jest.fn() as unknown as UseFieldArrayAppend<
    CreateWorkoutForm,
    "exercises"
  >;
  act(() => {
    renderer = TestRenderer.create(
      <FormHarness
        onReady={(formApi) => (api = formApi)}
        appendExercise={appendExercise}
      />,
    );
  });
  if (!api) throw new Error("Form harness did not expose its methods");
  return { renderer, api, appendExercise: appendExercise as jest.Mock };
}

describe("nested set field arrays when replacing selected exercises", () => {
  it("clears three populated sets and their rendered inputs when replacing a regular exercise", () => {
    const { renderer, api } = renderForm();
    const bench = makeExercise("bench-press");
    act(() => api.replaceExercises([makeWorkoutExercise(bench, 0)]));

    addThreeSets(renderer);
    expect(findTextInputs(renderer)).toHaveLength(6);
    populateVisibleInputs(renderer);
    const enteredSets = api.getValues("exercises.0.sets");
    expect(enteredSets).toHaveLength(3);
    expect(enteredSets.map((set) => set.id)).toEqual([
      "test-set-1",
      "test-set-2",
      "test-set-3",
    ]);
    expect(enteredSets.every((set) => set.workout_exercise_id === "workout-bench-press")).toBe(true);
    expect(enteredSets.map(({ reps, weight }) => [reps, weight])).toEqual([
      [10, 11],
      [12, 13],
      [14, 15],
    ]);

    const squat = makeExercise("squat");
    const replacement = buildExerciseSelection({
      selected: [squat],
      previous: api.getValues("exercises"),
      workoutId: "workout-1",
      exerciseOrderStart: 0,
      groupType: null,
      createId: () => "workout-squat",
    });
    act(() => api.replaceExercises(replacement));

    expect(api.getValues("exercises.0.exercise_id")).toBe("squat");
    expect(api.getValues("exercises.0.sets")).toEqual([]);
    expect(findTextInputs(renderer)).toHaveLength(0);
  });

  it.each(["compound_set", "superset"] as const)(
    "resets both %s members when a new pair is confirmed and saves no old sets",
    (groupType) => {
      const { renderer, api, appendExercise } = renderForm();
      const bench = makeExercise("bench-press");
      const row = makeExercise("row");
      act(() =>
        api.replaceExercises([
          makeWorkoutExercise(bench, 0, groupType),
          makeWorkoutExercise(row, 1, groupType),
        ]),
      );
      addThreeSets(renderer);
      populateVisibleInputs(renderer);

      const original = api.getValues("exercises");
      const shoulderPress = makeExercise("shoulder-press");
      const lateralRaise = makeExercise("lateral-raise");
      const replacement = buildExerciseSelection({
        selected: [shoulderPress, lateralRaise],
        previous: original,
        workoutId: "workout-1",
        exerciseOrderStart: 0,
        groupType,
        createId: (() => {
          let id = 0;
          return () => `new-pair-${++id}`;
        })(),
      });
      act(() => api.replaceExercises(replacement));

      const current = api.getValues("exercises");
      expect(current.map((exercise) => exercise.exercise_id)).toEqual([
        "shoulder-press",
        "lateral-raise",
      ]);
      expect(current.map((exercise) => exercise.sets)).toEqual([[], []]);
      expect(current.every((exercise, index) => exercise.id !== original[index].id)).toBe(true);
      expect(current.map((exercise) => exercise.validUnits)).toEqual([
        shoulderPress.validUnits,
        lateralRaise.validUnits,
      ]);
      expect(current.map((exercise) => exercise.group_id)).toEqual([
        "group-1",
        "group-1",
      ]);
      expect(api.getValues("exercises").map((exercise) => exercise.exercise_order)).toEqual([0, 1]);
      expect(findTextInputs(renderer)).toHaveLength(0);

      act(() => findSaveButton(renderer)?.props.onPress());
      expect(appendExercise).toHaveBeenCalledTimes(2);
      expect(appendExercise.mock.calls.map(([exercise]) => exercise.sets)).toEqual([
        [],
        [],
      ]);
    },
  );

  it("resets both grouped members when a confirmed new pair keeps one exercise", () => {
    const { renderer, api } = renderForm();
    const bench = makeExercise("bench-press");
    const row = makeExercise("row");
    act(() =>
      api.replaceExercises([
        makeWorkoutExercise(bench, 0, "superset"),
        makeWorkoutExercise(row, 1, "superset"),
      ]),
    );
    addThreeSets(renderer);
    populateVisibleInputs(renderer);
    const previous = api.getValues("exercises");
    const replacement = buildExerciseSelection({
      selected: [bench, makeExercise("pulldown")],
      previous,
      workoutId: "workout-1",
      exerciseOrderStart: 0,
      groupType: "superset",
      createId: (() => {
        let id = 0;
        return () => `replacement-${++id}`;
      })(),
    });

    act(() => api.replaceExercises(replacement));

    const current = api.getValues("exercises");
    expect(current.map((exercise) => exercise.exercise_id)).toEqual([
      "bench-press",
      "pulldown",
    ]);
    expect(current.map((exercise) => exercise.sets)).toEqual([[], []]);
    expect(current.every((exercise, index) => exercise.id !== previous[index].id)).toBe(true);
    expect(findTextInputs(renderer)).toHaveLength(0);
  });

  it("preserves both members when the picker is canceled without confirming", () => {
    const { renderer, api } = renderForm();
    const bench = makeExercise("bench-press");
    const row = makeExercise("row");
    act(() =>
      api.replaceExercises([
        makeWorkoutExercise(bench, 0, "superset"),
        makeWorkoutExercise(row, 1, "superset"),
      ]),
    );
    addThreeSets(renderer);
    populateVisibleInputs(renderer);
    const beforeCancel = api.getValues("exercises");

    // Cancel does not call replaceExercises, matching the modal's cancel path.
    expect(api.getValues("exercises")).toEqual(beforeCancel);
    expect(findTextInputs(renderer)).toHaveLength(12);
  });

  it("preserves both members when the exact same pair is confirmed", () => {
    const { renderer, api } = renderForm();
    const bench = makeExercise("bench-press");
    const row = makeExercise("row");
    act(() =>
      api.replaceExercises([
        makeWorkoutExercise(bench, 0, "superset"),
        makeWorkoutExercise(row, 1, "superset"),
      ]),
    );
    addThreeSets(renderer);
    populateVisibleInputs(renderer);
    const previous = api.getValues("exercises");
    const replacement = buildExerciseSelection({
      selected: [bench, row],
      previous,
      workoutId: "workout-1",
      exerciseOrderStart: 0,
      groupType: "superset",
      createId: () => "unused",
    });

    act(() => api.replaceExercises(replacement));

    expect(api.getValues("exercises").map((exercise) => exercise.id)).toEqual(
      previous.map((exercise) => exercise.id),
    );
    expect(api.getValues("exercises").map((exercise) => exercise.sets)).toEqual(
      previous.map((exercise) => exercise.sets),
    );
    expect(findTextInputs(renderer)).toHaveLength(12);
  });

  it("keeps existing values when the same exercise remains selected", () => {
    const { renderer, api } = renderForm();
    const bench = makeExercise("bench-press");
    act(() => api.replaceExercises([makeWorkoutExercise(bench, 0)]));
    addThreeSets(renderer);
    populateVisibleInputs(renderer);
    const oldSets = api.getValues("exercises.0.sets");

    const replacement = buildExerciseSelection({
      selected: [bench],
      previous: api.getValues("exercises"),
      workoutId: "workout-1",
      exerciseOrderStart: 0,
      groupType: null,
      createId: () => "unused",
    });
    act(() => api.replaceExercises(replacement));

    expect(api.getValues("exercises.0.sets")).toEqual(oldSets);
    expect(findTextInputs(renderer)).toHaveLength(6);
  });
});
