import { supabase } from "@/lib/supabaseClient";

export const signUpSupabase = async (
  email: string,
  password: string,
  fullName: string,
  age: number,
  height: number,
  weight: number,
  gender: string,
) => {
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        full_name: fullName,
        age: Number(age), // Ensure it's a number
        height: Number(height),
        weight: Number(weight),
        gender: gender !== "NULL" ? gender : null,
      },
    },
  });
  return { data, error };
};

export const signInSupabase = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const signOutSupabase = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
