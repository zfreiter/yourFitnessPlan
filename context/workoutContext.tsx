import { useSessionLifetime } from "@/hooks/useSessionLifetime";
import { parseScheduledDate } from "@/utils/scheduledDate";
import { buildWorkoutChanges } from "@/utils/workoutChangeUtils";
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
  ExerciseSet,
  WorkoutType,
} from "@/types/interfaces/types";
import {
  createContext,
  Dispatch,
  type PropsWithChildren,
  SetStateAction,
  useCallback,
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
import { Pressable, Text, View } from "react-native";

interface WorkoutContextType {
  workoutLoadError: string | null;
  reportCommittedReloadFailure: (submitted: Workout) => void;
  pendingCommittedReloads: readonly string[];
  pendingCommittedWorkouts: Readonly<Record<string, Workout>>;
  workouts: Workout[];
  setWorkouts: Dispatch<SetStateAction<Workout[]>>;
  exercises: Exercise[];
  setExercises: Dispatch<SetStateAction<Exercise[]>>;
  insertWorkout: (workout: Workout) => void;
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
  reloadWorkout: (workoutId: string) => Promise<void>;
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
  const isCurrent = useSessionLifetime();
  const [workouts, setWorkoutState] = useState<Workout[]>([]);
  const dataRevision = useRef(0);
  const recordRevision = useRef(new Map<string, number>());
  const snapshotRevision = useRef(0);
  const setWorkouts = useCallback<Dispatch<SetStateAction<Workout[]>>>((value) => {
    if (!isCurrent()) return;
    dataRevision.current += 1;
    setWorkoutState(value);
  }, [isCurrent]);
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

  const { workoutRevision } = useSync();
  const { user, sessionKey, isLoading: isAuthLoading } = useAuth();
  const scopeKey = `${sessionKey}:${user?.id ?? ""}`;
  const [loadFailure, setLoadFailure] = useState<{ scope: string; message: string; workoutId?: string } | null>(null);
  const [committedReloads, setCommittedReloads] = useState<{ scope: string; snapshots: Record<string, Workout> }>({ scope: scopeKey, snapshots: {} });
  const pendingCommittedWorkouts = committedReloads.scope === scopeKey ? committedReloads.snapshots : {};
  const pendingCommittedReloads = Object.keys(pendingCommittedWorkouts);
  const workoutLoadError = loadFailure?.scope === scopeKey ? loadFailure.message : null;
  const reportLoadFailure = useCallback(() => {
    setLoadFailure({ scope: scopeKey, message: "Unable to load workouts. Your last loaded data is still shown. Try loading again." });
  }, [scopeKey]);
  const reportCommittedReloadFailure = useCallback((submitted: Workout) => {
    if (isCurrent() && submitted.user_id === user?.id) {
      // Invalidate snapshots begun before the committed mutation, even when its
      // refreshed record is unavailable. A read-only retry can publish it later.
      dataRevision.current += 1;
      const snapshot = JSON.parse(JSON.stringify(submitted)) as Workout;
      setCommittedReloads(previous => ({ scope: scopeKey, snapshots: { ...(previous.scope === scopeKey ? previous.snapshots : {}), [snapshot.id]: snapshot } }));
      setLoadFailure({ scope: scopeKey, workoutId: snapshot.id, message: "Workout saved. Reload failed. Retry loading your workouts." });
    }
  }, [isCurrent, scopeKey, user?.id]);
  const workoutFetchGeneration = useRef(0);
  const activeUserId = useRef(user?.id);
  activeUserId.current = user?.id;
  const loadedUserId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (isAppInitLoading) return;
    const fetchExercises = async () => {
      const exercises = await exerciseService.getExercises();
      setExercises(exercises);
    };
    fetchExercises();
  }, [isAppInitLoading]);

  const fetchWorkouts = useCallback(async () => {
    const requestedUserId = activeUserId.current;
    const generation = ++workoutFetchGeneration.current;
    if (!requestedUserId) {
      setWorkoutState([]);
      return;
    }
    // Retry a snapshot read if a committed mutation occurred while it was in flight.
    // Superseded loads and loads for a previous account never publish their results.
    for (;;) {
      const revision = dataRevision.current;
      let fetched: Workout[];
      try {
        fetched = await workoutService.getAllWorkouts(requestedUserId);
      } catch {
        if (isCurrent() && generation === workoutFetchGeneration.current && requestedUserId === activeUserId.current) reportLoadFailure();
        return;
      }
      if (!isCurrent() || generation !== workoutFetchGeneration.current || requestedUserId !== activeUserId.current) return;
      if (revision !== dataRevision.current) continue;
      snapshotRevision.current += 1;
      dataRevision.current += 1;
      setWorkoutState(fetched);
      setLoadFailure(null);
      setCommittedReloads({ scope: scopeKey, snapshots: {} });
      return;
    }
  }, [isCurrent, reportLoadFailure, scopeKey]);

  // Publish a hydrated, committed record; an existing ID is replaced rather than duplicated.
  const insertWorkout = useCallback((workout: Workout) => {
    if (!isCurrent() || !activeUserId.current || workout.user_id !== activeUserId.current) return;
    recordRevision.current.set(workout.id, (recordRevision.current.get(workout.id) ?? 0) + 1);
    setWorkouts(previous => [...previous.filter(row => row.id !== workout.id), { ...workout }]
      .sort((a, b) => a.scheduled_datetime.localeCompare(b.scheduled_datetime)));
    setCommittedReloads(previous => previous.scope === scopeKey ? { ...previous, snapshots: Object.fromEntries(Object.entries(previous.snapshots).filter(([id]) => id !== workout.id)) } : previous);
    setLoadFailure(previous => previous?.scope === scopeKey && previous.workoutId === workout.id ? null : previous);
  }, [setWorkouts, isCurrent, scopeKey]);

  const reloadWorkout = useCallback(async (workoutId: string) => {
    const owner = activeUserId.current;
    if (!owner) return;
    dataRevision.current += 1;
    const revision = (recordRevision.current.get(workoutId) ?? 0) + 1;
    recordRevision.current.set(workoutId, revision);
    const snapshot = snapshotRevision.current;
    let workout: Workout | null;
    try {
      workout = await workoutService.getWorkoutById(owner, workoutId);
    } catch {
      if (isCurrent() && owner === activeUserId.current && recordRevision.current.get(workoutId) === revision && snapshot === snapshotRevision.current) reportLoadFailure();
      return;
    }
    if (!isCurrent() || owner !== activeUserId.current || recordRevision.current.get(workoutId) !== revision || snapshot !== snapshotRevision.current) return;
    if (workout) { insertWorkout(workout); setLoadFailure(null); }
  }, [insertWorkout, isCurrent, reportLoadFailure]);

  useEffect(() => {
    if (loadedUserId.current !== scopeKey) {
      loadedUserId.current = scopeKey;
      workoutFetchGeneration.current += 1;
      recordRevision.current.clear();
      earliestCachedMonthRef.current = addMonths(currentMonth, -1);
      latestCachedMonthRef.current = addMonths(currentMonth, 2);
      setEarliestCachedMonth(earliestCachedMonthRef.current);
      setLatestCachedMonth(latestCachedMonthRef.current);
      setWorkouts([]);
      setLoadFailure(null);
    }
    if (!user?.id || isAuthLoading || isAppInitLoading) return;
    void fetchWorkouts().catch(error => console.error("Workout hydration failed", error));
  }, [user?.id, sessionKey, isAuthLoading, isAppInitLoading, workoutRevision, fetchWorkouts, setWorkouts]);

  const visibleWorkouts = useMemo(() => {
    if (isAuthLoading || !user?.id) return [];
    return workouts.filter((workout) => workout.user_id === user.id);
  }, [workouts, user?.id, isAuthLoading]);

  const currentWorkouts = useMemo(() => {
    return visibleWorkouts.filter(
      (workout) => {
        const scheduled = parseScheduledDate(workout.scheduled_datetime);
        return scheduled !== null && format(scheduled, "yyyy-MM-dd") === today;
      },
    );
  }, [visibleWorkouts, today]);

  async function saveWorkoutToDb(
    userId: string,
    workoutUpdates: Partial<Workout> | undefined,
    setUpdates: ExerciseSet[],
    workoutId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!isCurrent() || userId !== activeUserId.current) return { success: false, error: "Workout owner changed" };
      const stored = await workoutService.getWorkoutById(userId, workoutId);
      if (!stored) return { success: false, error: "Workout not found" };
      const updated: Workout = {
        ...stored, ...workoutUpdates, id: stored.id, user_id: stored.user_id,
        exercises: stored.exercises.map(exercise => ({ ...exercise,
          sets: exercise.sets.map(set => setUpdates.find(update => update.id === set.id) ?? set),
        })),
      };
      const result = await workoutService.updateWorkout(userId, workoutId, buildWorkoutChanges(stored, updated));
      if (result.success) {
        if (result.data) insertWorkout(result.data);
        else if (isCurrent() && userId === activeUserId.current) reportCommittedReloadFailure(updated);
      }
      return { success: result.success, error: result.error };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to save workout" };
    }
  }

  function addWorkoutExercise(newExerciseData: WorkoutExercise, workoutId: string) {
    void reloadWorkout(workoutId);
  }

  async function deleteWorkoutExercise(userId: string, exerciseId: string) {
    if (!isCurrent() || userId !== activeUserId.current) return;
    const affected = workouts.filter(workout => workout.exercises.some(exercise => exercise.id === exerciseId));
    const result = await workoutService.deleteWorkoutExercise(userId, exerciseId);
    if (result.success) await Promise.all(affected.map(workout => reloadWorkout(workout.id)));
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
    void reloadWorkout(workoutId);
  }

  function updateContextWorkoutField(userId: string, workoutId: string, fieldName: string, value: string) {
    if (userId === activeUserId.current) void reloadWorkout(workoutId);
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

  function updateContextWorkoutCompleted(workoutId: string, isCompleted: boolean, completedDate: string | null) {
    void reloadWorkout(workoutId);
  }

  async function insertSet(
    userId: string,
    newSet: ExerciseSet,
    workoutId: string,
  ): Promise<{ success: boolean }> {
    if (!isCurrent() || userId !== activeUserId.current) return { success: false };
    const result = await setService.insertSet(userId, newSet);
    if (result.success) await reloadWorkout(workoutId);
    return { success: result.success };
  }

  async function deleteSet(
    userId: string,
    setId: string,
    exerciseId: string,
    workoutId: string,
  ): Promise<{ success: boolean }> {
    if (!isCurrent() || userId !== activeUserId.current) return { success: false };
    const result = await setService.deleteSet(userId, setId);
    if (result.success) await reloadWorkout(workoutId);
    return { success: result.success };
  }

  async function deleteWorkout(userId: string, workoutIdToDelete: string) {
    if (!isCurrent() || userId !== activeUserId.current) return { success: false, error: "Workout owner changed" };
    const result = await workoutService.deleteWorkout(
      userId,
      workoutIdToDelete,
    );

    if (result.success && isCurrent() && userId === activeUserId.current) {
      recordRevision.current.set(workoutIdToDelete, (recordRevision.current.get(workoutIdToDelete) ?? 0) + 1);
      setWorkouts(previous => previous.filter(workout => workout.id !== workoutIdToDelete));
    }
    return result;
  }

  async function updateCachedMonths(
    userId: string,
    targetMonth: { month: string; year: string },
  ) {
    if (!isCurrent() || userId !== activeUserId.current) return;
    const revision = dataRevision.current;
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

      let fetchedWorkouts: Workout[];
      try { fetchedWorkouts = await workoutService.getWorkoutsByMonth(
        userId,
        startFetch,
        endFetch,
      ); } catch {
        if (isCurrent() && userId === activeUserId.current) {
          if (latestCachedMonthRef.current === endFetch) latestCachedMonthRef.current = latestCachedMonth!;
          reportLoadFailure();
        }
        return;
      }

      if (!isCurrent() || userId !== activeUserId.current) return;
      if (revision !== dataRevision.current) { await fetchWorkouts(); return; }
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

      let fetchedWorkouts: Workout[];
      try { fetchedWorkouts = await workoutService.getWorkoutsByMonth(
        userId,
        startFetch,
        endFetch,
      ); } catch {
        if (isCurrent() && userId === activeUserId.current) {
          if (earliestCachedMonthRef.current === startFetch) earliestCachedMonthRef.current = earliestCachedMonth!;
          reportLoadFailure();
        }
        return;
      }

      if (!isCurrent() || userId !== activeUserId.current) return;
      if (revision !== dataRevision.current) { await fetchWorkouts(); return; }
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
        workoutLoadError,
        reportCommittedReloadFailure,
        pendingCommittedReloads,
        pendingCommittedWorkouts,
        workouts: visibleWorkouts,
        setWorkouts,
        exercises,
        setExercises,
        insertWorkout,
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
        reloadWorkout,
        earliestCachedMonth,
        latestCachedMonth,
        updateCachedMonths,
      }}
    >
      {workoutLoadError && <View>
        <Text accessibilityRole="alert">{workoutLoadError}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Retry loading workouts" onPress={() => { void fetchWorkouts(); }} style={{ minHeight: 44, justifyContent: "center", padding: 12 }}>
          <Text>Retry loading workouts</Text>
        </Pressable>
      </View>}
      {children}
    </WorkoutContext.Provider>
  );
}
