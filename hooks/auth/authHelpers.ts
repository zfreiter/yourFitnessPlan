import { supabase } from "@/lib/supabaseClient";

export const signUpSupabase = async (
  email: string,
  password: string,
  fullName: string,
  age: number,
  height: number,
  weight: number
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, age, height, weight },
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
