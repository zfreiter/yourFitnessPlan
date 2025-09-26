import { FlatList } from "react-native";
import { Workout } from "@/types/type";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { WorkoutUpdateFormValues } from "@/features/create-workout/types/type";
import ExerciseManager from "./exerciseManager";
import { WorkoutSessionHeader } from "./WorkoutSessionHeader";
import { WorkoutSessionFooter } from "./WorkoutSessionFooter";

export default function ActiveWorkoutSession({
  workout,
}: {
  workout: Workout;
}) {
  const methods = useForm<WorkoutUpdateFormValues>({
    defaultValues: {
      id: workout.id,
      name: workout.name,
      description: workout.description,
      type: workout.workoutType,
      date: new Date(workout.scheduled_datetime),
      duration: workout.duration,
      exercises: workout.exercises,
      isCompleted: workout.isCompleted,
    },
  });

  const { control, setValue } = methods;
  const [mode, setMode] = useState<"date" | "time">("time");
  const [show, setShow] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  //const [workoutType, setWorkoutType] = useState(workout.workoutType);

  // Register all nested form fields to ensure they are properly initialized
  const isInitializedRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (!workout?.exercises) return;

    workout.exercises.forEach((exercise, exerciseIndex) => {
      if (!exercise.sets) return;

      exercise.sets.forEach((set, setIndex) => {
        const key = `${exercise.id}_${set.id}`;
        if (isInitializedRef.current[key]) return;

        setValue(
          `exercises.${exerciseIndex}.sets.${setIndex}.reps`,
          set.reps || 0
        );
        setValue(
          `exercises.${exerciseIndex}.sets.${setIndex}.weight`,
          set.weight || 0
        );
        setValue(
          `exercises.${exerciseIndex}.sets.${setIndex}.duration`,
          set.duration || 0
        );
        setValue(
          `exercises.${exerciseIndex}.sets.${setIndex}.distance`,
          set.distance || 0
        );

        isInitializedRef.current[key] = true;
      });
    });
  }, [workout.id, setValue]);

  const openDatePicker = useCallback(() => {
    setMode("date");
    setShow(true);
  }, []);

  const handleAddExercise = useCallback(() => {
    setShowExerciseModal(true);
  }, []);

  const handleCloseExerciseModal = useCallback(() => {
    setShowExerciseModal(false);
  }, []);

  const exercises = useWatch({
    control,
    name: "exercises",
  });

  const header = useMemo(
    () => (
      <WorkoutSessionHeader
        showExerciseModal={showExerciseModal}
        handleAddExercise={handleAddExercise}
        handleCloseExerciseModal={handleCloseExerciseModal}
      />
    ),
    [showExerciseModal, handleAddExercise, handleCloseExerciseModal]
  );

  const footer = useMemo(
    () => (
      <WorkoutSessionFooter
        show={show}
        mode={mode}
        openDatePicker={openDatePicker}
        setMode={setMode}
        setShow={setShow}
      />
    ),
    [show, mode, openDatePicker, setMode, setShow]
  );
  // console.log("active workout session rendering ...");
  return (
    <FormProvider {...methods}>
      <FlatList
        data={exercises || []}
        renderItem={useCallback(
          ({ item, index }: { item: any; index: number }) => (
            <ExerciseManager exercise={item} exerciseIndex={index} />
          ),
          []
        )}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
      />
    </FormProvider>
  );
}
