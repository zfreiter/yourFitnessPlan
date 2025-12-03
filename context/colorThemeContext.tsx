import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  type PropsWithChildren,
  useEffect,
  ReactNode,
} from "react";
import { useColorScheme, ColorSchemeName } from "react-native";
import { lightTheme, darkTheme, tokens } from "@/utils/colorTheme";

// Define allowed theme modes
export type ColorThemePreference = "light" | "dark" | "system";

// Define the shape of your theme object
type AppTheme = {
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

// Define what the context provides
interface ColorThemeContextType {
  theme: AppTheme;
  userPreference: ColorThemePreference;
  toggleTheme: (value: ColorThemePreference) => Promise<void>;
}

// Create the context with an undefined default
const ThemeContext = createContext<ColorThemeContextType | undefined>(
  undefined
);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ColorThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null

  const [userPreference, setUserPreference] =
    useState<ColorThemePreference>("system");

  // Load saved preference from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("theme");
        if (saved === "light" || saved === "dark" || saved === "system") {
          setUserPreference(saved);
        }
        if (saved === null) {
          await AsyncStorage.setItem("theme", "system");
          setUserPreference("system");
        }
        console.log("Loaded theme preference:", saved);
      } catch (error) {
        console.warn("Failed to load theme preference:", error);
      }
    })();
  }, []);

  // Save and update theme
  const toggleTheme = async (value: ColorThemePreference) => {
    try {
      setUserPreference(value);
      await AsyncStorage.setItem("theme", value);
    } catch (error) {
      console.warn("Failed to save theme preference:", error);
    }
  };

  // Decide which scheme to use (system or manual override)
  const scheme: ColorSchemeName =
    userPreference === "system" ? systemScheme : userPreference;

  // Choose the theme object
  const theme = useMemo<AppTheme>(
    () => (scheme === "dark" ? tokens.dark : tokens.light),
    [scheme]
  );

  return (
    <ThemeContext.Provider value={{ theme, userPreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook for consuming the theme
export const useColorTheme = (): ColorThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
