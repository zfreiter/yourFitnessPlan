import {
  createContext,
  useEffect,
  useState,
  ReactNode,
  useContext,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { ProfileInterface } from "@/types/user/type";
import { useAuth } from "./authContext";
import { profileService, ProfileUpdate } from "@/services/profileService";
import { useSync } from "@/context/SyncContext";

export interface ProfileContextType {
  isLoading: boolean;
  profile: ProfileInterface | null;
  updateProfile: (updatedProfile: ProfileUpdate) => Promise<boolean>;
}

export const ProfileContext = createContext<ProfileContextType | undefined>(
  undefined,
);

export function useProfile(): ProfileContextType {
  const value = useContext(ProfileContext);
  if (process.env.NODE_ENV !== "production") {
    if (!value) {
      throw new Error("useProfile must be wrapped in a <ProfileProvider />");
    }
  }
  return value!;
}

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<ProfileInterface | null>(null);
  const { isProfileSet } = useSync();
  const { user, isLoading: isAuthLoading } = useAuth();

  async function updateProfile(
    updatedProfile: ProfileUpdate,
  ): Promise<boolean> {
    const response = await profileService.updateProfile(updatedProfile);

    if (response) {
      setProfile(updatedProfile as ProfileInterface);
    }

    return response;
  }

  useEffect(() => {
    if (!isProfileSet || !user) return;
    setIsLoading(true);

    const loadProfile = async () => {
      try {
        // 1. Try local SQLite cache first
        const cached = await profileService.getProfile(user.id);

        if (cached !== null) {
          console.log("Loaded profile from cache");
          setProfile(cached);
        } else {
          console.log("No cached profile found, fetching from Supabase...");
          // 2. Fall back to Supabase
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (data) {
            await profileService.cacheProfile(data);
            setProfile(data);
          }

          if (error) {
            console.log("Error fetching profile from Supabase ", error);
          }
        }
      } catch (error: unknown) {
        console.log("Error in ProfileContext ", error);
      } finally {
        console.log("Profile loading complete, setting isLoading to false");
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user, isProfileSet]);

  return (
    <ProfileContext.Provider value={{ isLoading, profile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};
