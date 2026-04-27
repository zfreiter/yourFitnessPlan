import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  ReactNode,
} from "react";
import { useColorScheme, ColorSchemeName } from "react-native";
import { tokens } from "@/utils/colorTheme";
import { useAppInit } from "./AppInitContext";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./authContext";

// Define the shape of your theme object
type Color = {
  background: string;
  surface: string;
  surface2: string;
  input: string;
  accent: string;
  accentActive: string;
  accentStrong: string;
  textPrimary: string;
  textSecondary: string;
  placeholderColor: string;
  hr: string;
  border: string;
  shadow: string;
  success: string;
  danger: string;
  warning: string;
  disabled: string;
};

type spacing = {
  xs: number;
  label: number;
  sm: number;
  md: number; // page margin for small screens
  lg: number; // default page margin for phones
  xl: number;
  xxl: number;
  buttonHeight: number;
  inputHeight: number;
  screenPadding: number;
  headerBottomMargin: number; // margin below headers
  sectionGap: number; // gap between sections
};

type fonts = {
  heading: string;
  headerBody: string;
  body: string;
  stats: string;
};

// Theme types
export type ColorThemePreference = "light" | "dark" | "system";

type ThemeTokens = {
  color: typeof tokens.light | typeof tokens.dark;
  spacing: typeof tokens.spacing;
  fonts: typeof tokens.fonts;
};

interface ColorThemeContextType {
  theme: ThemeTokens;
  themePreference: ColorThemePreference;
  updateThemePreference: (value: ColorThemePreference) => Promise<void>;
}

// Context
const ThemeContext = createContext<ColorThemeContextType | undefined>(
  undefined,
);

export function ColorThemeProvider({ children }: { children: ReactNode }) {
  const { isDbReady } = useAppInit();
  const { user } = useAuth();
  const systemScheme = useColorScheme();

  const [themePreference, setThemePreference] =
    useState<ColorThemePreference>("system");
  const [isLoaded, setIsLoaded] = useState(false);

  // 🔥 Load theme on startup
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // 1. Check AsyncStorage first
        const saved = await AsyncStorage.getItem("theme");

        if (saved === "light" || saved === "dark" || saved === "system") {
          setThemePreference(saved);
          setIsLoaded(true);
          return;
        }

        // 2. Fallback to Supabase
        if (isDbReady && user) {
          const { data, error } = await supabase
            .from("user_preferences")
            .select("theme")
            .eq("user_id", user.id)
            .single();

          if (error) throw error;

          const theme = data?.theme ?? "system";

          setThemePreference(theme);
          await AsyncStorage.setItem("theme", theme);
        } else {
          setThemePreference("system");
        }
      } catch (error) {
        console.error("Error loading theme:", error);
        setThemePreference("system");
      } finally {
        setIsLoaded(true);
      }
    };

    loadTheme();
  }, [isDbReady, user]);

  // 🔥 Public function to update theme (used anywhere)
  const updateThemePreference = async (value: ColorThemePreference) => {
    try {
      // 1. Update UI immediately
      setThemePreference(value);

      // 2. Save locally
      await AsyncStorage.setItem("theme", value);

      // 3. Sync to Supabase
      if (user) {
        await supabase.from("user_preferences").upsert({
          user_id: user.id,
          theme: value,
        });
      }
    } catch (error) {
      console.warn("Failed to update theme:", error);
    }
  };

  // Determine actual scheme
  const scheme: ColorSchemeName =
    themePreference === "system" ? systemScheme : themePreference;

  // Build theme object
  const theme = useMemo<ThemeTokens>(() => {
    const colorSet = scheme === "dark" ? tokens.dark : tokens.light;

    return {
      color: colorSet,
      spacing: tokens.spacing,
      fonts: tokens.fonts,
    };
  }, [scheme]);

  // Prevent flicker
  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider
      value={{ theme, themePreference, updateThemePreference }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// Hook
export const useColorTheme = (): ColorThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useColorTheme must be used within a ThemeProvider");
  }
  return context;
};
