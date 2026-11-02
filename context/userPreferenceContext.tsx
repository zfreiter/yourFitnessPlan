import { useSessionLifetime } from "@/hooks/useSessionLifetime";
import {
  createContext,
  useEffect,
  useState,
  ReactNode,
  useContext,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  UserPreferences,
  UserPreferencesUpdate,
} from "@/types/interfaces/types";
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
  const { user, sessionKey, isLoading: isAuthLoading } = useAuth();
  const isCurrent = useSessionLifetime();

  async function updateUserPreferences(
    updatedPreferences: UserPreferencesUpdate,
  ): Promise<boolean> {
    console.log("Updating user preferences with: ", updatedPreferences);
    const response =
      await userPreferenceService.updateUserPreferences(updatedPreferences);

    if (response && isCurrent()) {
      setUserPreferences(updatedPreferences as UserPreferences);
    }
    return response;
  }

  useEffect(() => {
    setUserPreferences(null);
    if (isAuthLoading || !user) { setIsLoading(false); return; }
    setIsLoading(true);
    const getUserPreferences = async () => {
      try {
        const result: UserPreferences | null =
          await userPreferenceService.getUserPreferences(user.id);

        if (result !== null) {
          if (isCurrent()) setUserPreferences(result);
        } else {
          const { data, error } = await supabase
            .from("user_preferences")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (data) {
            await userPreferenceService.cacheUserPreferences(data);
            if (isCurrent()) setUserPreferences(data);
          }
        }
      } catch (error: unknown) {
        console.log("Error in userPreferenceContext ", error);
      } finally {
        if (isCurrent()) setIsLoading(false);
      }
    };

    getUserPreferences();
  }, [user, isAuthLoading, sessionKey, isCurrent]);

  return (
    <UserPreferenceContext.Provider
      value={{ isLoading, updateUserPreferences, userPreferences: user && userPreferences?.user_id === user.id ? userPreferences : null }}
    >
      {children}
    </UserPreferenceContext.Provider>
  );
};
