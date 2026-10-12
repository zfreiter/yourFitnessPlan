import { exerciseService } from "@/services/exerciseService";
import { workoutService } from "@/services/workoutService";
import {
  CreateWorkoutForm,
  Exercise,
  Workout,
  WorkoutExercise,
} from "@/types/interfaces/types";
import { useAppInit } from "./AppInitContext";
import { useAuth } from "./authContext";
import {
  ExerciseDirection,
  ExerciseSet,
  WorkoutType,
} from "@/types/interfaces/types";
import {
  createContext,
  Dispatch,
  type PropsWithChildren,
  SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { format } from "date-fns";
import { setService } from "@/services/setService";
import { debugSchema } from "@/services/database";
import { useSync } from "./SyncContext";

interface WorkoutContextType {
  workouts: Workout[];
  setWorkouts: Dispatch<SetStateAction<Workout[]>>;
  exercises: Exercise[];
  setExercises: Dispatch<SetStateAction<Exercise[]>>;
  insertWorkout: (workout: Workout) => void;
  updateWorkoutExerciseOrder: (
    userId: string,
    workoutId: string,
    exercises: WorkoutExercise[],
    currentIndex: number,
    direction: ExerciseDirection,
  ) => void;
  addWorkoutExercise: (
    newExerciseData: WorkoutExercise,
    workoutId: string,
  ) => void;
  deleteWorkoutExercise: (userId: string, exerciseId: string) => void;
  deleteWorkoutExerciseSet: (
    workoutId: string,
    exerciseId: string,
    setId: string,
    setOrder: number,
  ) => void;
  updateWorkoutExerciseSet: (
    userId: string,
    workoutId: string,
    exerciseId: string,
    setId: string,
    field: string,
    text: string,
  ) => void;
  updateWorkoutSets: (
    workoutId: string,
    exercisesSetsMap: Map<string, ExerciseSet[]>,
  ) => void;
  updateWorkoutType: (workoutId: string, workoutType: WorkoutType) => void;
  updateContextWorkoutField: (
    userId: string,
    workoutId: string,
    fieldName: string,
    value: string,
  ) => void;
  updateContextWorkoutFields: (
    workoutId: string,
    fieldvalues: { fieldName: string; value: string }[],
  ) => void;
  updateContextWorkoutCompleted: (
    workoutId: string,
    isCompleted: boolean,
    completedDate: string | null,
  ) => void;
  currentWorkouts?: Workout[];
  insertSet: (
    userId: string,
    newSet: ExerciseSet,
    workoutId: string,
  ) => Promise<{ success: boolean }>;
  deleteSet: (
    userId: string,
    setId: string,
    exerciseId: string,
    workoutId: string,
  ) => Promise<{ success: boolean }>;
  saveWorkoutToDb: (
    userId: string,
    workoutUpdates: Partial<Workout> | undefined,
    setUpdates: ExerciseSet[],
    workoutId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  deleteWorkout: (
    userId: string,
    workoutToDelete: string,
  ) => Promise<{ success: boolean; error?: string }>;
  reloadWorkouts: () => Promise<void>;
  earliestCachedMonth: { month: string; year: string } | null;
  latestCachedMonth: { month: string; year: string } | null;
  updateCachedMonths: (
    userId: string,
    targetMonth: { month: string; year: string },
  ) => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function useWorkout() {
  const value = useContext(WorkoutContext);
  if (!value) {
    throw new Error("useWorkout must be wrapped in a <WorkoutProvider />");
  }
  return value;
}

function addMonths(date: { month: string; year: string }, count: number) {
  const year = parseInt(date.year);
  const month = parseInt(date.month) - 1; // JS months are 0-indexed
  const d = new Date(year, month, 1); // local time, no UTC shift
  d.setMonth(d.getMonth() + count);
  return {
    month: String(d.getMonth() + 1).padStart(2, "0"),
    year: String(d.getFullYear()),
  };
}

export function WorkoutProvider({ children }: PropsWithChildren) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const { isAppInitLoading } = useAppInit();
  const today = format(new Date(), "yyyy-MM-dd");

  const t = new Date();
  const currentMonth = {
    month: String(t.getMonth() + 1).padStart(2, "0"),
    year: String(t.getFullYear()),
  };

  // Start 1 month behind and 2 months ahead so the trigger is strictly > latest
  const [earliestCachedMonth, setEarliestCachedMonth] = useState<{
    month: string;
    year: string;
  } | null>(addMonths(currentMonth, -1));

  const [latestCachedMonth, setLatestCachedMonth] = useState<{
    month: string;
    year: string;
  } | null>(addMonths(currentMonth, 2));

  // Refs for immediate guard checks — avoids stale closure issues
  const latestCachedMonthRef = useRef(addMonths(currentMonth, 2));
  const earliestCachedMonthRef = useRef(addMonths(currentMonth, -1));

  useEffect(() => {
    if (latestCachedMonth) latestCachedMonthRef.current = latestCachedMonth;
  }, [latestCachedMonth]);

  useEffect(() => {
    if (earliestCachedMonth)
      earliestCachedMonthRef.current = earliestCachedMonth;
  }, [earliestCachedMonth]);

  const { isSyncLoading, isProfileSet } = useSync();
  const { user, isLoading: isAuthLoading, isSynced } = useAuth();

  useEffect(() => {
    if (isAppInitLoading) return;
    const fetchExercises = async () => {
      const exercises = await exerciseService.getExercises();
      setExercises(exercises);
    };
    fetchExercises();
  }, [isAppInitLoading]);

  const fetchWorkouts = async () => {
    if (!user?.id) return;
    const workouts = await workoutService.getAllWorkouts(user.id);
    setWorkouts(workouts);
  };

  useEffect(() => {
    if (!user?.id || !isProfileSet) return;
    fetchWorkouts();
  }, [user?.id, isProfileSet]);

  const currentWorkouts = useMemo(() => {
    return workouts.filter(
      (workout) => format(workout.scheduled_datetime, "yyyy-MM-dd") === today,
    );
  }, [workouts]);

  // Inserting new workout by date.
  async function insertWorkout(workout: Workout) {
    setWorkouts((workouts) => {
      const updated = [...workouts, workout];
      return updated.sort((a, b) =>
        a.scheduled_datetime.localeCompare(b.scheduled_datetime),
      );
    });
  }

  async function saveWorkoutToDb(
    userId: string,
    workoutUpdates: Partial<Workout> | undefined,
    setUpdates: ExerciseSet[],
    workoutId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (workoutUpdates) {
        const result = await workoutService.updateBaseWorkoutFields(
          userId,
          workoutUpdates,
          workoutId,
        );
        if (!result.success) throw new Error(result.error);
      }

      if (setUpdates.length > 0) {
        const result = await setService.updateSets(userId, setUpdates);
        if (!result.success) throw new Error(result.error);
      }

      if (workoutId) {
        setWorkouts((prevWorkouts) =>
          prevWorkouts.map((w) => {
            if (w.id !== workoutId) return w;
            const { ...workoutFields } = workoutUpdates || {};
            const updatedWorkout = { ...w, ...workoutFields };
            const updatedExercises = updatedWorkout.exercises.map(
              (exercise) => {
                const updatedSets = exercise.sets.map((existingSet) => {
                  const changedSet = setUpdates.find(
                    (s) => s.id === existingSet.id,
                  );
                  return changedSet
                    ? { ...existingSet, ...changedSet }
                    : existingSet;
                });
                return { ...exercise, sets: updatedSets };
              },
            );
            return { ...updatedWorkout, exercises: updatedExercises };
          }),
        );
      }

      return { success: true };
    } catch (error) {
      console.error("Error saving workout:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to save workout",
      };
    }
  }

  async function updateWorkoutExerciseOrder(
    userId: string,
    workoutId: string,
    exercises: WorkoutExercise[],
    currentIndex: number,
    direction: ExerciseDirection,
  ) {
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const updatedExercises = exercises.map((e) => ({ ...e }));

    [
      updatedExercises[currentIndex].exercise_order,
      updatedExercises[swapIndex].exercise_order,
    ] = [
      updatedExercises[swapIndex].exercise_order,
      updatedExercises[currentIndex].exercise_order,
    ];

    [updatedExercises[currentIndex], updatedExercises[swapIndex]] = [
      updatedExercises[swapIndex],
      updatedExercises[currentIndex],
    ];

    setWorkouts((prev: Workout[]) =>
      prev.map((workout) =>
        workout.id === workoutId
          ? { ...workout, exercises: updatedExercises }
          : workout,
      ),
    );

    const result = await workoutService.reorderWorkoutExercise(
      userId,
      exercises,
      currentIndex,
      direction,
    );

    if (!result.success) {
      setWorkouts((prev: Workout[]) =>
        prev.map((workout) =>
          workout.id === workoutId ? { ...workout, exercises } : workout,
        ),
      );
    }
  }

  function addWorkoutExercise(
    newExerciseData: WorkoutExercise,
    workoutId: string,
  ) {
    setWorkouts((prev: Workout[]) => {
      if (newExerciseData) {
        return prev.map((workout: Workout) =>
          workout.id === workoutId
            ? { ...workout, exercises: [...workout.exercises, newExerciseData] }
            : workout,
        );
      }
      return prev;
    });
  }

  function deleteWorkoutExercise(userId: string, exerciseId: string) {
    workoutService.deleteWorkoutExercise(userId, exerciseId);
    setWorkouts((prev: Workout[]) =>
      prev.map((workout) => ({
        ...workout,
        exercises: workout.exercises.filter((e) => e.id !== exerciseId),
      })),
    );
  }

  function updateWorkoutExerciseSet(
    userId: string,
    workoutId: string,
    exerciseId: string,
    setId: string,
    field: string,
    text: string,
  ) {
    setWorkouts((prevWorkouts: Workout[]) =>
      prevWorkouts.map((workout: Workout) => {
        if (workout.id !== workoutId) return workout;
        return {
          ...workout,
          exercises: workout.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;
            return {
              ...ex,
              sets: ex.sets.map((s) =>
                s.id === setId ? { ...s, [field]: parseInt(text) || 0 } : s,
              ),
            };
          }),
        };
      }),
    );
  }

  function updateWorkoutSets(
    workoutId: string,
    exercisesSetsMap: Map<string, ExerciseSet[]>,
  ) {
    setWorkouts((prevWorkouts: Workout[]) =>
      prevWorkouts.map((workout: Workout) => {
        if (workout.id !== workoutId) return workout;
        return {
          ...workout,
          exercises: workout.exercises.map((ex) => {
            const updatedSets = exercisesSetsMap.get(ex.id);
            return updatedSets ? { ...ex, sets: updatedSets } : ex;
          }),
        };
      }),
    );
  }

  function deleteWorkoutExerciseSet(
    workoutId: string,
    exerciseId: string,
    setId: string,
    setOrder: number,
  ) {
    setWorkouts((prevWorkouts) =>
      prevWorkouts.map((workout) => {
        if (workout.id !== workoutId) return workout;
        return {
          ...workout,
          exercises: workout.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;
            return {
              ...ex,
              sets: ex.sets
                .filter((s: ExerciseSet) => s.id !== setId)
                .map((s: ExerciseSet) =>
                  s.set_order > setOrder
                    ? { ...s, set_order: s.set_order - 1 }
                    : s,
                ),
            };
          }),
        };
      }),
    );
  }

  function updateWorkoutType(workoutId: string, workoutType: WorkoutType) {
    setWorkouts((prevWorkouts: Workout[]) =>
      prevWorkouts.map((workout: Workout) =>
        workout.id === workoutId
          ? { ...workout, workoutType: workoutType }
          : workout,
      ),
    );
  }

  function updateContextWorkoutField(
    userId: string,
    workoutId: string,
    fieldName: string,
    value: string,
  ) {
    setWorkouts((prevWorkouts: Workout[]) =>
      prevWorkouts.map((workout: Workout) =>
        workout.id === workoutId
          ? fieldName === "scheduled_datetime"
            ? { ...workout, scheduled_datetime: new Date(value).toISOString() }
            : { ...workout, [fieldName]: value }
          : workout,
      ),
    );
  }

  function updateContextWorkoutFields(
    workoutId: string,
    fieldvalues: { fieldName: string; value: string }[],
  ) {
    setWorkouts((prevWorkouts) =>
      prevWorkouts.map((workout) =>
        workout.id === workoutId
          ? fieldvalues.reduce(
              (acc, { fieldName, value }) => ({ ...acc, [fieldName]: value }),
              workout,
            )
          : workout,
      ),
    );
  }

  function updateContextWorkoutCompleted(
    workoutId: string,
    isCompleted: boolean,
    completedDate: string | null,
  ) {
    setWorkouts((prevWorkouts: Workout[]) =>
      prevWorkouts.map((workout: Workout) =>
        workout.id === workoutId
          ? { ...workout, isCompleted, completed_at: completedDate }
          : workout,
      ),
    );
  }

  async function insertSet(
    userId: string,
    newSet: ExerciseSet,
    workoutId: string,
  ): Promise<{ success: boolean }> {
    const result = await setService.insertSet(userId, newSet);

    if (result.success) {
      setWorkouts((prev) =>
        prev.map((workout) => {
          if (workout.id !== workoutId) return workout;
          return {
            ...workout,
            exercises: workout.exercises.map((exercise) => {
              if (exercise.id !== newSet.workout_exercise_id) return exercise;
              return { ...exercise, sets: [...exercise.sets, newSet] };
            }),
          };
        }),
      );
    }

    return { success: result.success };
  }

  async function deleteSet(
    userId: string,
    setId: string,
    exerciseId: string,
    workoutId: string,
  ): Promise<{ success: boolean }> {
    const result = await setService.deleteSet(userId, setId);

    if (result.success) {
      setWorkouts((prev) =>
        prev.map((workout) => {
          if (workout.id !== workoutId) return workout;
          return {
            ...workout,
            exercises: workout.exercises.map((exercise) => {
              if (exercise.id !== exerciseId) return exercise;
              return {
                ...exercise,
                sets: exercise.sets.filter((s) => s.id !== setId),
              };
            }),
          };
        }),
      );
    }

    return { success: result.success };
  }

  async function deleteWorkout(userId: string, workoutIdToDelete: string) {
    //await debugSchema();
    const result = await workoutService.deleteWorkout(
      userId,
      workoutIdToDelete,
    );

    if (result.success) {
      setWorkouts((prev) =>
        prev.filter((workout) => workout.id !== workoutIdToDelete),
      );
    }
    return { success: true };
  }

  async function updateCachedMonths(
    userId: string,
    targetMonth: { month: string; year: string },
  ) {
    const targetDate = new Date(`${targetMonth.year}-${targetMonth.month}-01`);
    const latestDate = new Date(
      `${latestCachedMonthRef.current.year}-${latestCachedMonthRef.current.month}-01`,
    );
    const earliestDate = new Date(
      `${earliestCachedMonthRef.current.year}-${earliestCachedMonthRef.current.month}-01`,
    );

    if (targetDate > latestDate) {
      const startFetch = addMonths(targetMonth, 1);
      const endFetch = addMonths(targetMonth, 2);

      // Guard: check ref to avoid duplicate fetches from stale closure
      const endFetchDate = new Date(`${endFetch.year}-${endFetch.month}-01`);
      if (
        endFetchDate <=
        new Date(
          `${latestCachedMonthRef.current.year}-${latestCachedMonthRef.current.month}-01`,
        )
      )
        return;

      // Lock ref immediately before async fetch
      latestCachedMonthRef.current = endFetch;

      const fetchedWorkouts = await workoutService.getWorkoutsByMonth(
        userId,
        startFetch,
        endFetch,
      );

      setWorkouts((prev) => {
        const existingIds = new Set(prev.map((w) => w.id));
        const newWorkouts = fetchedWorkouts.filter(
          (w) => !existingIds.has(w.id),
        );
        if (newWorkouts.length === 0) return prev;
        return [...prev, ...newWorkouts].sort(
          (a, b) =>
            new Date(a.scheduled_datetime).getTime() -
            new Date(b.scheduled_datetime).getTime(),
        );
      });

      setLatestCachedMonth(endFetch);
    } else if (targetDate < earliestDate) {
      const startFetch = addMonths(targetMonth, -2);
      const endFetch = addMonths(targetMonth, -1);

      // Guard: check ref to avoid duplicate fetches from stale closure
      const startFetchDate = new Date(
        `${startFetch.year}-${startFetch.month}-01`,
      );
      if (
        startFetchDate >=
        new Date(
          `${earliestCachedMonthRef.current.year}-${earliestCachedMonthRef.current.month}-01`,
        )
      )
        return;

      // Lock ref immediately before async fetch
      earliestCachedMonthRef.current = startFetch;

      const fetchedWorkouts = await workoutService.getWorkoutsByMonth(
        userId,
        startFetch,
        endFetch,
      );

      setWorkouts((prev) => {
        const existingIds = new Set(prev.map((w) => w.id));
        const newWorkouts = fetchedWorkouts.filter(
          (w) => !existingIds.has(w.id),
        );
        if (newWorkouts.length === 0) return prev;
        return [...prev, ...newWorkouts].sort(
          (a, b) =>
            new Date(a.scheduled_datetime).getTime() -
            new Date(b.scheduled_datetime).getTime(),
        );
      });

      setEarliestCachedMonth(startFetch);
    }
  }

  return (
    <WorkoutContext.Provider
      value={{
        workouts,
        setWorkouts,
        exercises,
        setExercises,
        insertWorkout,
        updateWorkoutExerciseOrder,
        addWorkoutExercise,
        deleteWorkoutExercise,
        deleteWorkoutExerciseSet,
        updateWorkoutExerciseSet,
        updateWorkoutSets,
        updateWorkoutType,
        updateContextWorkoutField,
        updateContextWorkoutFields,
        updateContextWorkoutCompleted,
        currentWorkouts,
        insertSet,
        deleteSet,
        saveWorkoutToDb,
        deleteWorkout,
        reloadWorkouts: fetchWorkouts,
        earliestCachedMonth,
        latestCachedMonth,
        updateCachedMonths,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}
