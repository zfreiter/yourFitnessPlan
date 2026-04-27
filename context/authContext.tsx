// context/authContext.tsx
import {
  createContext,
  useEffect,
  useState,
  ReactNode,
  useContext,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { ProfileInterface } from "@/types/user/type";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { getDB } from "@/services/database";
import { getMeta, META_KEYS, setMeta } from "@/utils/appMeta";
import { syncService } from "@/services/syncService";
import { useAppInit } from "@/context/AppInitContext";
export interface AuthContextType {
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  isLoading: boolean;
  user: ProfileInterface | null;
  isSynced: boolean;
  isAuthInitialized: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function useAuth(): AuthContextType {
  const value = useContext(AuthContext);
  if (process.env.NODE_ENV !== "production") {
    if (!value) {
      throw new Error("useAuth must be wrapped in a <AuthProvider />");
    }
  }
  return value!;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<ProfileInterface | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const { isDbReady } = useAppInit();

  // Helper function to fetch user data (DRY principle)
  const fetchUserData = async (userId: string, showToastOnError = false) => {
    const db = await getDB();
    try {
      const [profileResult, preferencesResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", userId)
          .single(),
      ]);

      const { data: profileData, error: profileError } = profileResult;
      const { data: preferenceData, error: preferenceError } =
        preferencesResult;

      if (profileError || !profileData)
        throw new Error("Failed to load profile");
      if (preferenceError || !preferenceData)
        throw new Error("Failed to load preferences");

      // ✅ Upsert profile into local SQLite so FK constraints are satisfied
      const userMeta = await getMeta(META_KEYS.USER_ID);
      if (userMeta && userMeta !== userId) {
        // This means a different user has logged in on the same device
        // To prevent FK issues, we reset the local database
        console.log(
          `User ID changed from ${userMeta} to ${userId}. Resetting local database...`,
        );
        // Note: This will delete all local data, but it's necessary to prevent FK constraint issues. Will need to re-sync exercises and other static data at this point, but user-specific data will be cleared and re-fetched from Supabase.
        // await resetDatabase();
        // await setMeta(META_KEYS.USER_ID, userId);
      } else if (!userMeta) {
        await setMeta(META_KEYS.USER_ID, userId);
        // Insert or update the profile in the local SQLite database
        // await db.runAsync(
        //   `INSERT OR IGNORE INTO profiles (id, created_at) VALUES (?, ?)`,
        //   [profileData.id, profileData.created_at],
        // );

        // await db.runAsync(
        //   `INSERT OR REPLACE INTO profiles
        // (id, full_name, username, avatar_url, age, current_weight, current_height, created_at, updated_at)
        // VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        //   [
        //     profileData.id,
        //     profileData.full_name,
        //     profileData.username ?? null,
        //     profileData.avatar_url ?? null,
        //     profileData.age ?? null,
        //     profileData.current_weight ?? null,
        //     profileData.current_height ?? null,
        //     profileData.created_at,
        //     new Date().toISOString(),
        //   ],
        // );
      }

      return { profile: profileData, preferences: preferenceData };
    } catch (error) {
      console.error("fetchUserData error:", error);
      throw error;
    }
  };

  // useEffect(() => {
  //   console.log("AuthProvider mounted, checking session...");

  //   const initAuth = async () => {
  //     try {
  //       const { data: sessionData, error: sessionError } =
  //         await supabase.auth.getSession();

  //       if (sessionError) {
  //         console.error("Session fetch error:", sessionError);
  //         Toast.show({
  //           type: "error",
  //           text1: "Session Error",
  //           text2: "Please sign in again",
  //         });
  //         return;
  //       }
  //       //console.log("Session data:", sessionData.session?.user);
  //       const session = sessionData.session;

  //       if (session?.user) {
  //         const userData = await fetchUserData(session.user.id, true); // Show toast on error
  //         setUser(userData.profile);
  //       }
  //     } catch (error) {
  //       console.error("Init auth error:", error);
  //       // Error toast already shown by fetchUserData if needed
  //     } finally {
  //       setIsAuthInitialized(true);
  //       setIsLoading(false);
  //     }
  //   };

  //   initAuth();

  //   // Listen for auth state changes

  //   const { data: subscription } = supabase.auth.onAuthStateChange(
  //     async (event, session) => {
  //       console.log("Auth event:", event);

  //       if (event === "SIGNED_IN" && session?.user) {
  //         setIsLoading(true);
  //         console.log("User signed in:", session?.user.user_metadata.full_name);
  //         try {
  //           const userData = await fetchUserData(session.user.id, true); // Show toast on error
  //           setUser(userData.profile);

  //           setIsAuthInitialized(true);
  //           // After sign-in, sync data and navigate to main screen
  //           setIsSyncing(true);
  //           await syncService.sync(supabase, session.user.id);
  //           setIsSyncing(false);
  //           console.log("Data synced successfully after sign-in");
  //           setIsSynced(true);
  //           router.replace("/(app)/main/");
  //         } catch (error) {
  //           // Error toast already shown by fetchUserData
  //           setIsAuthInitialized(true);
  //         } finally {
  //           setIsLoading(false);
  //         }
  //       }

  //       if (event === "SIGNED_OUT") {
  //         setUser(null);

  //         setIsAuthInitialized(true);
  //         router.replace("/login");
  //       }

  //       if (event === "INITIAL_SESSION") {
  //         // Already handled in initAuth

  //         return;
  //       }

  //       if (event === "USER_UPDATED" && session?.user) {
  //         // Optionally refresh user data
  //         console.log("User updated");
  //         await supabase
  //           .from("profiles")
  //           .update({ email: session.user.email })
  //           .eq("id", session.user.id);

  //         const db = await getDB();
  //         await db.runAsync(`UPDATE profiles SET email = ? WHERE id = ?`, [
  //           session.user.email ?? "",
  //           session.user.id,
  //         ]);
  //       }

  //       if (event === "TOKEN_REFRESHED") {
  //         console.log("Token refreshed successfully");
  //       }
  //     },
  //   );

  //   return () => subscription.subscription.unsubscribe();
  // }, []);

  useEffect(() => {
    // Db must be ready before we can listen to auth changes, otherwise we might have FK constraint issues when inserting user data on sign-in
    if (!isDbReady) return;

    console.log("AuthProvider mounted, subscribing to auth changes...");

    const handleAuth = async (event: string, session: any) => {
      console.log("Auth event:", event);

      // 🟢 Handle initial session WITH user OR signed in
      // if (event === "INITIAL_SESSION") {
      //   console.log("Initial session with user:", session);
      // }

      // 🟢 Handle initial session with NO user
      if (event === "INITIAL_SESSION" && !session?.user) {
        setUser(null);
        setIsAuthInitialized(true);
        setIsLoading(false);

        //router.replace("/login");
        return;
      }

      if (
        (event === "INITIAL_SESSION" || event === "SIGNED_IN") &&
        session?.user
      ) {
        setIsLoading(true);

        try {
          const userData = await fetchUserData(session.user.id, true);
          // console.log(
          //   "User data fetched successfully on auth change:",
          //   userData.profile,
          // );
          setUser(userData.profile);

          setIsAuthInitialized(true);

          // if (event === "SIGNED_IN") {
          //   router.replace("/(app)/main/");
          // }
        } catch (error) {
          console.error(error);
          setIsAuthInitialized(true);
        } finally {
          setIsLoading(false);
        }
      }

      if (event === "SIGNED_OUT") {
        setUser(null);
        setIsAuthInitialized(true);
        setIsLoading(false);

        router.replace("/login");
      }
    };

    const { data: subscription } = supabase.auth.onAuthStateChange(handleAuth);

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [isDbReady]);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        console.error("SignIn error:", error?.message);
        return false;
      }

      return true;
      // onAuthStateChange will handle fetching user data and navigation
      // If that fails, fetchUserData will show appropriate toast
    } catch (err) {
      console.error("SignIn unexpected error:", err);
      return false;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        Toast.show({
          type: "error",
          text1: "Sign Out Failed",
          text2: error.message,
        });
        console.error("SignOut error:", error);
        return;
      }

      // onAuthStateChange will handle clearing state and navigation
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Sign Out Failed",
        text2: "An unexpected error occurred",
      });
      console.error("SignOut unexpected error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        signIn,
        signOut,
        user,
        isLoading,
        isAuthInitialized,
        isSynced,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
