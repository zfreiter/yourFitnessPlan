import {
  createContext,
  useContext,
  useEffect,
  useState,
  PropsWithChildren,
} from "react";
import { useAuth } from "./authContext";
import { ExerciseMax } from "@/types/interfaces/types";
import { maxLiftService } from "@/services/maxLiftService";
import { supabase } from "@/lib/supabaseClient";
import { useProfile } from "./profileContext";

interface MaxLiftContextType {
  isMaxLiftLoading: boolean;
  exerciseMaxes: Record<string, ExerciseMax>;
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
  const { isLoading, user } = useAuth();
  const { isLoading: isProfileLoading } = useProfile();
  const [exerciseMaxes, setExerciseMaxes] = useState<
    Record<string, ExerciseMax>
  >({});
  const [isMaxLiftLoading, setMaxLiftLoading] = useState(true);

  const toMaxesMap = (maxLifts: ExerciseMax[]): Record<string, ExerciseMax> =>
    maxLifts.reduce<Record<string, ExerciseMax>>((acc, max) => {
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
    if (result.success) {
      const updated = await maxLiftService.getCurrentMaxLifts(userId);
      setExerciseMaxes(toMaxesMap(updated));
    }

    return result;
  }

  useEffect(() => {
    if (isLoading || isProfileLoading || !user) return;

    const loadMaxLifts = async () => {
      setMaxLiftLoading(true);

      try {
        // 1. Try local SQLite cache first
        const cached = await maxLiftService.getCurrentMaxLifts(user.id);

        if (cached.length > 0) {
          setExerciseMaxes(toMaxesMap(cached));
        } else {
          // 2. Fall back to Supabase view for current training maxes
          const { data, error } = await supabase
            .from("current_training_maxes")
            .select("*")
            .eq("user_id", user.id);

          if (data && data.length > 0) {
            await maxLiftService.cacheMaxLifts(data);
            setExerciseMaxes(toMaxesMap(data));
          }

          if (error) {
            console.log("Error fetching max lifts from Supabase ", error);
          }
        }
      } catch (error) {
        console.log("Error in MaxLiftContext loadMaxLifts ", error);
      } finally {
        setMaxLiftLoading(false);
      }
    };

    loadMaxLifts();
  }, [isLoading, isProfileLoading, user]);

  return (
    <MaxLiftContext.Provider
      value={{
        isMaxLiftLoading,
        exerciseMaxes,
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
