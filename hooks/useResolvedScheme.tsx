// hooks/useResolvedScheme.ts
import { useColorScheme } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";

export function useResolvedScheme() {
  const { themePreference } = useColorTheme();
  const systemScheme = useColorScheme();
  return themePreference === "system" ? systemScheme : themePreference;
}
