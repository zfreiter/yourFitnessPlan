import { supabase } from "../supabaseClient";
import { ProfileUpdate, ProfileUpdateFunction } from "@/types/user/type";

export const updateUser = async (
  user: ProfileUpdate,
): Promise<{ data: any; error: any }> => {
  try {
    const updatedUser: ProfileUpdateFunction = {
      age: user.age,
      current_height: user.current_height,
      current_weight: user.current_weight,
      full_name: `${user.first_name} ${user.last_name}`,
      username: user.username,
    };
    const { data: userToReturn, error } = await supabase
      .from("profiles")
      .update(updatedUser)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }
    const transformedUser = {
      id: userToReturn?.id,
      age: userToReturn?.age || null,
      current_height: userToReturn?.current_height,
      current_weight: userToReturn?.current_weight,
      first_name: userToReturn?.full_name?.split(" ")[0] || "",
      last_name: userToReturn?.full_name?.split(" ")[1] || "",
      username: userToReturn?.username || "",
      avatar_url: userToReturn?.avatar_url || "",
      created_at: userToReturn?.created_at,
    };
    return { data: transformedUser, error: null };
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return { data: null, error };
  }
};
