import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { AddExerciseForm, CreateWorkoutForm, WorkoutExercise } from "@/types/interfaces/types";
import { AddExerciseModal } from "../index";
import { AddExerciseButton } from "../addExerciseButton";
import { ExerciseLibraryModal } from "../exerciseLibraryModal";
import { useWorkoutExercisesFieldArray } from "@/hooks/useCreateWorkoutExercisesFieldArray";

jest.mock("react-native", () => ({ View:"View", Text:"Text", Pressable:"Pressable", ScrollView:"ScrollView", Platform:{OS:"android"}, StyleSheet:{create:(value:unknown)=>value},
  Modal:({children,...props}:any)=>require("react").createElement("Modal",props,props.visible?children:null) }));
jest.mock("react-native-safe-area-context",()=>({SafeAreaView:"SafeAreaView"}));
jest.mock("@expo/vector-icons/MaterialIcons",()=>()=>null);
jest.mock("@/context/colorThemeContext",()=>({useColorTheme:()=>({theme:{color:{accent:"blue",disabled:"gray"},spacing:{}}})}));
jest.mock("../exerciseLibraryModal",()=>({ExerciseLibraryModal:()=>null}));
jest.mock("../loggingStyleSelector",()=>({LoggingStyleSelector:()=>null}));
jest.mock("../EntryMethodSelector",()=>({EntryMethodSelector:()=>null}));
jest.mock("../setBuilder",()=>({SetBuilder:()=>null}));
const host=(name:string)=>name as Parameters<TestRenderer.ReactTestInstance["findByType"]>[0];
const exercise=(id="new"):WorkoutExercise=>({id,workout_id:"workout",exercise_id:`catalog-${id}`,exercise_name:`Exercise ${id}`,exercise_order:0,validUnits:["reps"],group_type:null,group_id:null,
  sets:[{id:`set-${id}`,workout_exercise_id:id,reps:12,set_order:1,is_warmup:0,is_max:0}]});
let tree:TestRenderer.ReactTestRenderer;
let form:ReturnType<typeof useForm<CreateWorkoutForm>>;
function mount(saved=false){
  function Modal(){const {control}=useFormContext<CreateWorkoutForm>();const {append}=useWorkoutExercisesFieldArray();return <AddExerciseModal WorkoutControl={control} appendExercise={append}/>;}
  function Harness(){form=useForm<CreateWorkoutForm>({defaultValues:{id:"workout",exercises:saved?[exercise("existing")]:[],circuit_rounds:[]}});return <FormProvider {...form}><Modal/></FormProvider>;}
  act(()=>{tree=TestRenderer.create(<Harness/> as Parameters<typeof TestRenderer.create>[0]);});
}
const button=()=>tree.root.findByType(AddExerciseButton).findByType(host("Pressable"));
const open=()=>act(()=>tree.root.findAllByType(host("Pressable")).find(node=>node.findAllByType(host("Text")).some(text=>text.props.children==="+ Exercise"))!.props.onPress());
const select=(selection:WorkoutExercise[])=>act(()=>tree.root.findByType(ExerciseLibraryModal).props.replace(selection));
afterEach(()=>{act(()=>tree.unmount());jest.clearAllMocks();});

it.each([false,true])("reacts to selecting, clearing and replacing exercises (saved workout: %s)",saved=>{
  mount(saved);open();expect(button().props.disabled).toBe(true);
  expect(button().props.style({pressed:false}).at(-1)).toMatchObject({backgroundColor:"gray",opacity:0.5});
  select([exercise()]);expect(button().props.disabled).toBe(false);
  expect(button().props.style({pressed:false}).at(-1)).toMatchObject({backgroundColor:"blue",opacity:1});
  select([{...exercise(),exercise_name:" "}]);expect(button().props.disabled).toBe(true);
  select([]);expect(button().props.disabled).toBe(true);
  const replacement=exercise("replacement");select([replacement]);expect(button().props.disabled).toBe(false);
  const press=button().props.onPress;act(()=>{press();press();});
  expect(form.getValues("exercises")).toHaveLength(saved?2:1);
  expect(form.getValues("exercises")!.at(-1)).toMatchObject({...replacement,exercise_order:saved?1:0});
  if(saved)expect(form.getValues("exercises.0")).toEqual(exercise("existing"));
  open();expect(button().props.disabled).toBe(true);
});
it.each(["cancel","native close"])("resets disabled state after %s and reopening",close=>{
  mount();open();select([exercise()]);expect(button().props.disabled).toBe(false);
  const modal=tree.root.findByType(host("Modal"));
  act(()=>{if(close==="native close")modal.props.onRequestClose();else modal.findAllByType(host("Pressable"))[0].props.onPress();});
  open();expect(button().props.disabled).toBe(true);expect(form.getValues("exercises")).toEqual([]);
  select([exercise()]);expect(button().props.disabled).toBe(false);
});
it.each(["superset","compound_set"] as const)("keeps %s IDs, sets and relationships when adding a valid pair",type=>{
  mount();open();const pair=[exercise("one"),exercise("two")].map(ex=>({...ex,group_type:type,group_id:"group"}));
  select(pair);expect(button().props.disabled).toBe(false);act(()=>button().props.onPress());
  expect(form.getValues("exercises")).toEqual(pair.map((ex,exercise_order)=>({...ex,exercise_order})));
});
it("retains live validation when a stale enabled handler is invoked after clearing selection",()=>{
  mount();open();select([exercise()]);const press=button().props.onPress;
  select([]);act(()=>press());expect(form.getValues("exercises")).toEqual([]);expect(button().props.disabled).toBe(true);
});
it("disables while submitting and keeps the duplicate guard even while the button remains mounted",()=>{
  let draft!:ReturnType<typeof useForm<AddExerciseForm>>;
  const append=jest.fn(), close=jest.fn();
  function Harness(){draft=useForm<AddExerciseForm>({defaultValues:{logging_style:"straight",exercises:[exercise()]}});return <FormProvider {...draft}><AddExerciseButton setModalVisible={close} appendExercise={append}/></FormProvider>;}
  act(()=>{tree=TestRenderer.create(<Harness/> as Parameters<typeof TestRenderer.create>[0]);});
  const press=button().props.onPress;act(()=>{press();press();});
  expect(button().props.disabled).toBe(true);expect(button().props.accessibilityState).toEqual({disabled:true,busy:true});
  expect(append).toHaveBeenCalledTimes(1);expect(close).toHaveBeenCalledTimes(1);
});
