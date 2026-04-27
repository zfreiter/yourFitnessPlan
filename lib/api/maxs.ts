import { supabase } from "../supabaseClient";
import { ExerciseMax } from "@/types/interfaces/types";

// 1. Get CURRENT maxes (one per exercise)
export async function getCurrentMaxes(
  userId: string,
): Promise<{ data: ExerciseMax[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from("current_training_maxes")
      .select("*")
      .eq("user_id", userId)
      .order("exercise_name", { ascending: true });

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// 2. Get ALL history (for charts/progress tracking)
export async function getMaxHistory(
  userId: string,
): Promise<{ data: ExerciseMax[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from("training_max_history")
      .select("*")
      .eq("user_id", userId)
      .order("tested_date", { ascending: false });

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// 3. Get history for ONE exercise (for a detail page)
export async function getExerciseHistory(
  userId: string,
  exerciseName: string,
): Promise<{ data: ExerciseMax[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from("training_max_history")
      .select("*")
      .eq("user_id", userId)
      .eq("exercise_name", exerciseName)
      .order("tested_date", { ascending: false });

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function insertMultipleMaxLifts(
  userId: string,
  formData: Record<string, any>,
  touchedFields: Record<string, boolean>,
): Promise<{ data: any[] | null; error: any }> {
  try {
    // Extract exercise names from touched fields
    const exercises = new Set<string>();
    Object.keys(touchedFields).forEach((key) => {
      if (touchedFields[key] && key.endsWith("_1rm")) {
        // Keep the full exercise name including _1rm
        exercises.add(key);
      }
    });

    // Build insert records for each exercise
    const insertRecords = Array.from(exercises)
      .filter((exercise) => {
        // Only include if the 1RM field has a value
        return formData[exercise] != null;
      })
      .map((exercise) => {
        // Extract base name for the tested_date field
        const baseName = exercise.replace(/_1rm$/, "");
        return {
          user_id: userId,
          exercise_name: exercise, // e.g., "overhead_press_1rm"
          one_rep_max: formData[exercise],
          tested_date:
            formData[`${baseName}_tested_date`] || new Date().toISOString(),
        };
      });

    if (insertRecords.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from("training_max_history")
      .insert(insertRecords)
      .select();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Error inserting multiple max lifts:", error);
    return { data: null, error };
  }
}

// Bonus: Insert a new max lift (you already have this one)
export async function insertMaxLift(
  userId: string,
  exerciseName: string,
  maxLift: number,
  testedDate?: string,
): Promise<{ data: any | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from("training_max_history")
      .insert({
        user_id: userId,
        exercise_name: exerciseName,
        one_rep_max: maxLift,
        tested_date: testedDate || new Date().toISOString(),
      })
      .select();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Bonus: Update an existing max record
export async function updateMaxLift(
  recordId: number,
  maxLift: number,
  testedDate?: string,
): Promise<{ data: any[] | null; error: any }> {
  try {
    const updateData: any = {
      one_rep_max: maxLift,
    };

    if (testedDate) {
      updateData.tested_date = testedDate;
    }

    const { data, error } = await supabase
      .from("training_max_history")
      .update(updateData)
      .eq("id", recordId)
      .select();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Bonus: Delete a max record
export async function deleteMaxLift(
  recordId: number,
): Promise<{ data: any[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from("training_max_history")
      .delete()
      .eq("id", recordId)
      .select();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
