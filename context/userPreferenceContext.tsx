import {
  createContext,
  useEffect,
  useState,
  ReactNode,
  useContext,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserPreferences, UserPreferencesUpdate } from "@/types/user/type";
import { useAuth } from "./authContext";
import { userPreferenceService } from "@/services/userPreferenceService";

export interface UserPreferenceType {
  isLoading: boolean;
  updateUserPreferences: (
    updatedPreferences: UserPreferencesUpdate,
  ) => Promise<boolean>;
  userPreferences: UserPreferences | null;
}

export const UserPreferenceContext = createContext<
  UserPreferenceType | undefined
>(undefined);

export function useUserPreference(): UserPreferenceType {
  const value = useContext(UserPreferenceContext);
  if (process.env.NODE_ENV !== "production") {
    if (!value) {
      throw new Error("useAuth must be wrapped in a <AuthProvider />");
    }
  }
  return value!;
}

export const UserPreferenceProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userPreferences, setUserPreferences] =
    useState<UserPreferences | null>(null);
  const { user, isLoading: isAuthLoading } = useAuth();

  async function updateUserPreferences(
    updatedPreferences: UserPreferencesUpdate,
  ): Promise<boolean> {
    const response =
      await userPreferenceService.updateUserPreferences(updatedPreferences);

    if (response) {
      setUserPreferences(updatedPreferences as UserPreferences);
    }
    return response;
  }

  useEffect(() => {
    if (isAuthLoading || !user) return;
    setIsLoading(true);
    const getUserPreferences = async () => {
      try {
        const result: UserPreferences | null =
          await userPreferenceService.getUserPreferences(user.id);

        if (result !== null) {
          setUserPreferences(result);
        } else {
          const { data, error } = await supabase
            .from("user_preferences")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (data) {
            await userPreferenceService.cacheUserPreferences(data);
            setUserPreferences(data);
          }
        }
      } catch (error: unknown) {
        console.log("Error in userPreferenceContext ", error);
      } finally {
        setIsLoading(false);
      }
    };

    getUserPreferences();
  }, [user, isAuthLoading]);

  return (
    <UserPreferenceContext.Provider
      value={{ isLoading, updateUserPreferences, userPreferences }}
    >
      {children}
    </UserPreferenceContext.Provider>
  );
};
