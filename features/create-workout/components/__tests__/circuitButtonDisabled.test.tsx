import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { FormProvider, useForm, UseFormReturn } from "react-hook-form";
import { CreateCircuitForm, CreateWorkoutForm } from "@/types/interfaces/types";
import { AddCircuitButton } from "../addCircuitModal/addCircuitButton";

jest.mock("react-native", () => ({ Text: "Text", Pressable: "Pressable", StyleSheet: { create: (value: unknown) => value } }));
jest.mock("@/context/colorThemeContext", () => ({ useColorTheme: () => ({ theme: { color: { disabled: "gray", accent: "blue" }, spacing: {} } }) }));
jest.mock("expo-crypto", () => { let id=0; return { randomUUID: () => `instance-${++id}` }; });
const host=(name:string)=>name as Parameters<TestRenderer.ReactTestInstance["findByType"]>[0];
let tree:TestRenderer.ReactTestRenderer;
let circuit:UseFormReturn<CreateCircuitForm>;
let setVisible:React.Dispatch<React.SetStateAction<boolean>>;
const append=jest.fn();
function mount() {
  function Harness() {
    const workout=useForm<CreateWorkoutForm>({defaultValues:{id:"workout",exercises:[],circuit_rounds:[]}});
    circuit=useForm<CreateCircuitForm>({defaultValues:{rounds:3,restAfterRound:30,notes:"",exercises:[]}});
    const [visible,changeVisible]=React.useState(true);setVisible=changeVisible;
    return <FormProvider {...workout}><AddCircuitButton control={circuit.control} reset={circuit.reset} getValues={circuit.getValues}
      workoutId="workout" appendExercise={append} modalVisible={visible} setModalVisible={jest.fn()} /></FormProvider>;
  }
  act(()=>{tree=TestRenderer.create(<Harness /> as Parameters<typeof TestRenderer.create>[0]);});
}
const button=()=>tree.root.findByType(host("Pressable"));
const addExercise=()=>act(()=>circuit.setValue("exercises",[{id:"draft",workout_id:"workout",exercise_id:"catalog",exercise_name:"Squat",exercise_order:0,validUnits:["reps"],sets:[]} ]));
afterEach(()=>{act(()=>tree.unmount());jest.clearAllMocks();});
it("reacts to the draft control rather than the parent workout and applies disabled styling",()=>{
  mount();expect(button().props.disabled).toBe(true);
  expect(button().props.style({pressed:false}).at(-1)).toMatchObject({backgroundColor:"gray",opacity:0.5});
  addExercise();expect(button().props.disabled).toBe(false);
  expect(button().props.style({pressed:false}).at(-1)).toMatchObject({backgroundColor:"blue",opacity:1});
  act(()=>circuit.setValue("exercises",[]));expect(button().props.disabled).toBe(true);
  expect(button().props.accessibilityState).toEqual({disabled:true,busy:false});
});
it("disables submission, retains the synchronous duplicate guard, and resets on reopening",()=>{
  mount();addExercise();const onPress=button().props.onPress;
  act(()=>{onPress();onPress();});
  expect(append).toHaveBeenCalledTimes(1);
  expect(button().props.disabled).toBe(true);expect(button().props.accessibilityState.busy).toBe(true);
  act(()=>setVisible(false));act(()=>setVisible(true));
  expect(button().props.disabled).toBe(true);expect(button().props.accessibilityState.busy).toBe(false);
  addExercise();expect(button().props.disabled).toBe(false);
});
it("retains live submission validation even when a stale enabled handler is called",()=>{
  mount();addExercise();const onPress=button().props.onPress;
  act(()=>circuit.setValue("exercises",[]));act(()=>onPress());
  expect(append).not.toHaveBeenCalled();expect(button().props.accessibilityState.busy).toBe(false);
});
