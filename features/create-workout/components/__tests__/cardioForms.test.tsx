import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { FormProvider, useForm } from "react-hook-form";
import { CardioLibrary } from "../addCardioModal/cardioLibrary";
import { CardioBuilder } from "../cardioBuilder";
import { CardioEntry, CreateWorkoutForm } from "@/types/interfaces/types";

jest.mock("react-native", () => ({ Pressable: "Pressable", Text: "Text", TextInput: "TextInput", View: "View", ScrollView: "ScrollView", Modal: "Modal", StyleSheet: { create: (styles: any) => styles }, Platform: { OS: "android" } }));

jest.mock("@/context/colorThemeContext", () => ({ useColorTheme: () => ({ theme: { color: {}, spacing: {} } }) }));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: "SafeAreaView" }));
jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("@expo/vector-icons/MaterialIcons", () => () => null);
jest.mock("expo-crypto", () => { let id = 0; return { randomUUID: () => `cardio-${++id}` }; });

async function mount(element: React.ReactElement) {
  let tree!: TestRenderer.ReactTestRenderer;
  await act(async () => { tree = TestRenderer.create(element as Parameters<typeof TestRenderer.create>[0]); });
  return tree;
}
function press(tree: TestRenderer.ReactTestRenderer, label: string) {
  const button = tree.root.findAllByType("Pressable").find(node => node.findAllByType("Text").some(text => text.props.children === label));
  expect(button).toBeDefined();
  act(() => button!.props.onPress());
}
function enter(tree: TestRenderer.ReactTestRenderer, label: string, value: string) {
  const text = tree.root.findAllByType("Text").find(node => node.props.children === label)!;
  const input = text.parent!.findByType("TextInput");
  act(() => input.props.onChangeText(value));
}

describe("shared cardio creation", () => {
  it.each(["Bike", "Run", "Walk", "Swim", "Row", "Jump Rope", "Hike"])("keeps all %s metrics, including optional HR and zero calories", async activity => {
    let entry!: CardioEntry;
    const tree = await mount(<CardioLibrary workoutId="workout" onEntryChange={value => { entry = value as CardioEntry; }} />);
    press(tree, activity);
    enter(tree, "Duration (min)", "30");
    enter(tree, "Distance (km)", "4.5");
    enter(tree, "Calories", "240");
    enter(tree, "AVG HR (BPM)", "145");
    expect(entry).toMatchObject({ duration: 30, distance: 4.5, calories: 240, heart_rate_avg: 145, is_finisher: 0 });
    enter(tree, "Calories", "0");
    expect(entry.calories).toBe(0);
    enter(tree, "AVG HR (BPM)", "");
    expect(entry.heart_rate_avg).toBeNull();
    act(() => tree.unmount());
  });

  it("keeps sprint work/rest values and ordered parent-linked intervals", async () => {
    let entry!: CardioEntry;
    const tree = await mount(<CardioLibrary workoutId="workout" isFinisher onEntryChange={value => { entry = value as CardioEntry; }} />);
    press(tree, "Sprint");
    enter(tree, "AVG HR (BPM)", "170");
    enter(tree, "Work (sec)", "45");
    enter(tree, "Rest (sec)", "15");
    enter(tree, "Intervals", "3");
    enter(tree, "Dist per interval (km)", "0.2");
    expect(entry.heart_rate_avg).toBe(170);
    expect(entry.mode).toBe("intervals");
    expect(entry.is_finisher).toBe(1);
    expect(entry.intervals.map(i => [i.cardio_entry_id, i.interval_order, i.work_duration, i.rest_duration, i.distance])).toEqual([1,2,3].map(order => [entry.id, order, 45, 15, 0.2]));
    act(() => tree.unmount());
  });
});

it("retains edits through removal, unmount and reopen without changing record IDs", async () => {
  let api!: ReturnType<typeof useForm<CreateWorkoutForm>>;
  const entries: CardioEntry[] = ["bike", "run"].map((activity, index) => ({ id: `entry-${index}`, workout_id: "workout", activity: activity as any, mode: "intervals", is_finisher: 0, entry_order: index + 1, calories: 200 + index, heart_rate_avg: 140 + index, intervals: [{ id: `interval-${index}`, cardio_entry_id: `entry-${index}`, interval_order: 1, work_duration: 40, rest_duration: 20 }] }));
  function Harness({ visible }: { visible: boolean }) {
    api = useForm<CreateWorkoutForm>({ defaultValues: { id: "workout", cardio_entries: entries } });
    return <FormProvider {...api}>{visible && <CardioBuilder />}</FormProvider>;
  }
  const tree = await mount(<Harness visible />);
  act(() => tree.root.findAllByType("Pressable").filter(node => node.props.hitSlop === 8)[0].props.onPress());
  enter(tree, "Calories", "345");
  enter(tree, "AVG HR (BPM)", "155");
  enter(tree, "Work (sec)", "55");
  const saved = api.getValues("cardio_entries")!;
  expect(saved[0]).toMatchObject({ id: "entry-1", calories: 345, heart_rate_avg: 155, intervals: [{ id: "interval-1", work_duration: 55, rest_duration: 20 }] });
  await act(async () => tree.update(<Harness visible={false} /> as Parameters<typeof tree.update>[0]));
  expect(api.getValues("cardio_entries")).toEqual(saved);
  await act(async () => tree.update(<Harness visible /> as Parameters<typeof tree.update>[0]));
  expect(api.getValues("cardio_entries")).toEqual(saved);
  act(() => tree.unmount());
});
