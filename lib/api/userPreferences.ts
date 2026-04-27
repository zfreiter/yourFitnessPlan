import { supabase } from "../supabaseClient";
import { UserPreferencesUpdate } from "@/types/user/type";

export const updateUserPreferences = async (
  preferences: UserPreferencesUpdate,
): Promise<{ data: any; error: any }> => {
  try {
    console.log("function ", preferences);
    const { data, error } = await supabase
      .from("user_preferences")
      .update(preferences)
      .eq("user_id", preferences.user_id)
      .select()
      .single();

    if (error) throw error;
    console.log("new data: ", data.theme);
    return { data, error: null };
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return { data: null, error };
  }
};

export const getUserPreferences = async (
  userId: string,
): Promise<{ data: any; error: any }> => {
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return { data: null, error };
  }
};
