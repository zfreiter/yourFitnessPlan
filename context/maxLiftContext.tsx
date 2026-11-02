import { useSessionLifetime } from "@/hooks/useSessionLifetime";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  PropsWithChildren,
} from "react";
import { useAuth } from "./authContext";
import { TrainingMax } from "@/types/interfaces/types";
import { maxLiftService } from "@/services/maxLiftService";
import { supabase } from "@/lib/supabaseClient";
import { useProfile } from "./profileContext";

interface MaxLiftContextType {
  isMaxLiftLoading: boolean;
  exerciseMaxes: Record<string, TrainingMax>;
  insertMaxLifts: (
    userId: string,
    formData: Record<string, any>,
    touchedFields: Record<string, boolean>,
  ) => Promise<{ success: boolean }>;
}

const MaxLiftContext = createContext<MaxLiftContextType>({
  isMaxLiftLoading: false,
  exerciseMaxes: {},
  insertMaxLifts: async () => ({ success: false }),
});

export function MaxLiftProvider({ children }: PropsWithChildren) {
  const { isLoading, user, sessionKey } = useAuth();
  const isCurrent = useSessionLifetime();
  const { isLoading: isProfileLoading } = useProfile();
  const [exerciseMaxes, setExerciseMaxes] = useState<
    Record<string, TrainingMax>
  >({});
  const [isMaxLiftLoading, setMaxLiftLoading] = useState(true);

  const toMaxesMap = (maxLifts: TrainingMax[]): Record<string, TrainingMax> =>
    maxLifts.reduce<Record<string, TrainingMax>>((acc, max) => {
      acc[max.exercise_name] = max;
      return acc;
    }, {});

  async function insertMaxLifts(
    userId: string,
    formData: Record<string, any>,
    touchedFields: Record<string, boolean>,
  ): Promise<{ success: boolean }> {
    const result = await maxLiftService.insertMaxLifts(
      userId,
      formData,
      touchedFields,
    );
    console.log("resuts ", result);
    if (result.success && isCurrent()) {
      const updated = await maxLiftService.getCurrentMaxLifts(userId);
      if (isCurrent()) setExerciseMaxes(toMaxesMap(updated));
    }

    return result;
  }

  useEffect(() => {
    setExerciseMaxes({});
    if (isLoading || isProfileLoading || !user) { setMaxLiftLoading(false); return; }

    const loadMaxLifts = async () => {
      setMaxLiftLoading(true);

      try {
        // 1. Try local SQLite cache first
        const cached = await maxLiftService.getCurrentMaxLifts(user.id);

        if (cached.length > 0) {
          if (isCurrent()) setExerciseMaxes(toMaxesMap(cached));
        } else {
          // 2. Fall back to Supabase view for current training maxes
          const { data, error } = await supabase
            .from("current_training_maxes")
            .select("*")
            .eq("user_id", user.id);

          if (data && data.length > 0) {
            await maxLiftService.cacheMaxLifts(data);
            if (isCurrent()) setExerciseMaxes(toMaxesMap(data));
          }

          if (error) {
            console.log("Error fetching max lifts from Supabase ", error);
          }
        }
      } catch (error) {
        console.log("Error in MaxLiftContext loadMaxLifts ", error);
      } finally {
        if (isCurrent()) setMaxLiftLoading(false);
      }
    };

    loadMaxLifts();
  }, [isLoading, isProfileLoading, user, sessionKey, isCurrent]);

  return (
    <MaxLiftContext.Provider
      value={{
        isMaxLiftLoading,
        exerciseMaxes: user ? Object.fromEntries(Object.entries(exerciseMaxes).filter(([, max]) => max.user_id === user.id)) : {},
        insertMaxLifts,
      }}
    >
      {children}
    </MaxLiftContext.Provider>
  );
}

export const useMaxLift = () => {
  const context = useContext(MaxLiftContext);
  if (!context) {
    throw new Error("useMaxLift must be used within a MaxLiftProvider");
  }
  return context;
};
