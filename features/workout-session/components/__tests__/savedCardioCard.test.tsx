import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { FormProvider, useForm } from "react-hook-form";
import { CardioEntry, CreateWorkoutForm } from "@/types/interfaces/types";
import { SavedCardioCard, summarizeIntervals } from "../savedCardioCard";
import { CardioBuilder } from "@/features/create-workout/components/cardioBuilder";

jest.mock("react-native", () => ({ Pressable: "Pressable", Text: "Text", TextInput: "TextInput", View: "View", ScrollView: "ScrollView", Modal: "Modal", StyleSheet: { create: (styles: any) => styles } }));
jest.mock("@/context/colorThemeContext", () => ({ useColorTheme: () => ({ theme: { color: {}, spacing: { lg: 12 } } }) }));
jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("@/features/create-workout/components/addCardioModal", () => () => null);

// Native hosts are strings in this test adapter; renderer typings use DOM host names.
type HostType = Parameters<TestRenderer.ReactTestInstance["findByType"]>[0];
const textHost = "Text" as HostType;
const inputHost = "TextInput" as HostType;
const buttonHost = "Pressable" as HostType;

const intervals = (pairs: Array<[number | undefined, number | undefined]>) => pairs.map(([work_duration, rest_duration], index) => ({
  id: `interval-${index}`, cardio_entry_id: "entry", interval_order: index + 1, work_duration, rest_duration,
}));
const entry = (overrides: Partial<CardioEntry> = {}): CardioEntry => ({
  id: "entry", workout_id: "workout", activity: "sprint", mode: "intervals", is_finisher: 0, entry_order: 1,
  intervals: intervals([[30,60],[30,60]]), ...overrides,
});
let trees: TestRenderer.ReactTestRenderer[] = [];
afterEach(() => { act(() => trees.forEach(tree => tree.unmount())); trees = []; });
async function mount(element: React.ReactElement) {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(element as Parameters<typeof TestRenderer.create>[0]); });
  trees.push(tree);
  return tree;
}
const texts = (tree: TestRenderer.ReactTestRenderer) => tree.root.findAllByType(textHost).map(text => text.props.children);
function press(tree: TestRenderer.ReactTestRenderer, label: string) {
  const button = tree.root.findAllByType(buttonHost).find(node => node.findAllByType(textHost).some(text => text.props.children === label))!;
  act(() => button.props.onPress());
}

it.each([
  { pairs: [], summary: "0 intervals", total: undefined },
  { pairs: [[30,60]], summary: "1 interval · 30s work / 60s rest", total: 90 },
  { pairs: Array.from({ length: 6 }, () => [30,60]), summary: "6 intervals · 30s work / 60s rest", total: 540 },
  { pairs: [[30,60],[45,60]], summary: "2 intervals · Custom durations", total: 195 },
  { pairs: [[30,60],[30,undefined]], summary: "2 intervals · Custom durations", total: undefined },
  { pairs: [[30,0],[30,undefined]], summary: "2 intervals · Custom durations", total: undefined },
  { pairs: [[30,undefined],[30,undefined]], summary: "2 intervals · Custom durations", total: undefined },
  { pairs: [[undefined,60]], summary: "1 interval · Custom durations", total: undefined },
  { pairs: [[30,0]], summary: "1 interval · 30s work / 0s rest", total: 30 },
  { pairs: [[NaN,60]], summary: "1 interval · Custom durations", total: undefined },
])("summarizes $summary accurately ($pairs)", ({ pairs, summary, total }) => {
  expect(summarizeIntervals(intervals(pairs as Array<[number | undefined, number | undefined]>))).toEqual({ summary, totalSeconds: total });
});

it("keeps available simple metrics including zero and hides absent fields", async () => {
  const tree = await mount(<SavedCardioCard entry={entry({ mode: "simple", activity: "bike", duration: 30, distance: 4.5, calories: 0, heart_rate_avg: 145, heart_rate_zone: "z2" })} entryOrder={0} />);
  expect(texts(tree)).toEqual(["bike", "Duration: 30 min", "Distance: 4.5 km", "Calories: 0", "AVG HR (BPM): 145", "Heart Rate Zone: Z2", "Edit cardio"]);
  expect(tree.root.findAllByType(inputHost)).toHaveLength(0);
  const empty = await mount(<SavedCardioCard entry={entry({ mode: "simple", activity: "swim" })} entryOrder={0} />);
  expect(texts(empty)).toEqual(["swim", "Edit cardio"]);
});

it("collapses initially, expands in interval order, and collapses again without mutating data", async () => {
  const data = entry({ duration: 99, intervals: [
    { ...intervals([[30,60]])[0], id: "last", interval_order: 2, notes: "Finish", distance: 0.2, calories: 12 },
    { ...intervals([[30,60]])[0], id: "first", interval_order: 1 },
  ] });
  const tree = await mount(<SavedCardioCard entry={data} entryOrder={0} />);
  expect(texts(tree)).toContain("2 intervals · 30s work / 60s rest");
  expect(texts(tree)).toContain("Total duration: 180s");
  expect(texts(tree)).not.toContain("Interval 1");
  const toggle = () => tree.root.findAllByType(buttonHost)[0];
  expect(toggle().props.accessibilityState).toEqual({ expanded: false });
  press(tree, "View intervals");
  expect(texts(tree).filter(text => typeof text === "string" && text.startsWith("Interval "))).toEqual(["Interval 1", "Interval 2"]);
  expect(texts(tree)).toEqual(expect.arrayContaining(["Work: 30s", "Rest: 60s", "Distance: 0.2 km", "Calories: 12", "Notes: Finish"]));
  expect(toggle().props.accessibilityState).toEqual({ expanded: true });
  expect(data.intervals.map(interval => interval.id)).toEqual(["last", "first"]);
  press(tree, "Hide intervals");
  expect(texts(tree)).not.toContain("Interval 1");
});

it("handles empty and incomplete intervals without invented totals or values", async () => {
  const empty = await mount(<SavedCardioCard entry={entry({ intervals: [] })} entryOrder={0} />);
  expect(texts(empty)).toContain("0 intervals");
  press(empty, "View intervals");
  expect(texts(empty)).toContain("No intervals");
  const incomplete = await mount(<SavedCardioCard entry={entry({ intervals: intervals([[30,60],[30,undefined]]) })} entryOrder={0} />);
  expect(texts(incomplete).some(text => text.startsWith("Total duration"))).toBe(false);
  press(incomplete, "View intervals");
  expect(texts(incomplete).filter(text => text.startsWith("Rest:"))).toEqual(["Rest: 60s"]);
});

it("uses the existing editor and retains the correct interval IDs and values after closing it", async () => {
  let api!: ReturnType<typeof useForm<CreateWorkoutForm>>;
  function Harness() {
    api = useForm<CreateWorkoutForm>({ defaultValues: { id: "workout", cardio_entries: [entry({ intervals: intervals([[45,15],[30,60]]).reverse() })] } });
    return <FormProvider {...api}><CardioBuilder savedDisplay /></FormProvider>;
  }
  const tree = await mount(<Harness />);
  press(tree, "Edit cardio");
  const workLabel = tree.root.findAllByType(textHost).find(node => node.props.children === "Work (sec)")!;
  act(() => workLabel.parent!.findByType(inputHost).props.onChangeText("55"));
  press(tree, "Done editing");
  expect(api.getValues("cardio_entries.0.intervals.0")).toMatchObject({ id: "interval-1", interval_order: 2, work_duration: 55 });
  expect(texts(tree)).toContain("2 intervals · Custom durations");
  press(tree, "View intervals");
  expect(texts(tree).filter(text => text.startsWith("Work:"))).toEqual(["Work: 45s", "Work: 55s"]);
  expect(tree.root.findAllByType(inputHost)).toHaveLength(0);
});
