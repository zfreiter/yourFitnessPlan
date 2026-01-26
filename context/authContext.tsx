// context/authContext.tsx
import {
  createContext,
  useEffect,
  useState,
  ReactNode,
  useContext,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@/types/user/type";
import { router } from "expo-router";

export interface AuthContextType {
  signIn: (email: string, password: string) => Promise<void | null>;
  signOut: () => Promise<void | null>;
  isLoading: boolean;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAuthInitialized: boolean;
  setIsAuthInitialized: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

// This hook can be used to access the user info.
export function useAuth(): AuthContextType {
  const value = useContext(AuthContext);
  if (process.env.NODE_ENV !== "production") {
    if (!value) {
      throw new Error("useAuth must be wrapped in a <AuthProvider />");
    }
    return value;
  }

  return value as AuthContextType;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);

  // 🔥 On mount, check for an existing Supabase session
  useEffect(() => {
    console.log("AuthProvider mounted, checking session...");
    const initAuth = async () => {
      // 🔹 Check if there's an existing session
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      console.log("Existing session:", session?.user);
      if (session?.user) {
        // 🔹 Fetch the user's profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (!profileError && profileData) {
          setUser(profileData);
          setIsAuthInitialized(true);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setIsAuthInitialized(true);
      setIsLoading(false);
    };

    initAuth();

    // 🔥 Listen for auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth event:", event);

        if (event === "SIGNED_IN" && session?.user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select()
            .eq("id", session?.user.id)
            .single();

          if (profileData) {
            setUser(profileData);
            setIsAuthInitialized(true);
            router.replace("/(app)/main/");
          }
        }

        if (event === "SIGNED_OUT") {
          setUser(null);
          setIsAuthInitialized(true);
          router.replace("/login"); // Redirect out of the app
        }

        if (event === "USER_UPDATED") {
          console.log("User updated, may need to re-authenticate");
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select()
      .eq("id", data.user?.id)
      .single();
    if (profileError) throw profileError;
    setUser(profileData);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        signIn,
        signOut,
        user,
        setUser,
        isLoading,
        isAuthInitialized,
        setIsAuthInitialized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
