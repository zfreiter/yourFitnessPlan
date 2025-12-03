import { Stack } from "expo-router";
import { useColorTheme } from "@/context/colorThemeContext";

export default function SettingsLayout() {
  const { theme } = useColorTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.accent,
        },
        headerTintColor: theme.textPrimary,
        headerTitleStyle: {
          fontWeight: "bold",
        },
        animation: "fade", // or "slide_from_right", "slide_from_bottom", "none"
        animationDuration: 200, // milliseconds
      }}
    >
      <Stack.Screen
        name="index"
        options={{ headerShown: true, headerTitle: "Settings" }}
      />
      <Stack.Screen
        name="account"
        options={{ headerShown: true, headerTitle: "Account" }}
      />
      <Stack.Screen
        name="workout-data"
        options={{ headerShown: true, headerTitle: "Workout Data" }}
      />
      <Stack.Screen
        name="profile"
        options={{ headerShown: true, headerTitle: "Profile" }}
      />
      <Stack.Screen
        name="preferences"
        options={{ headerShown: true, headerTitle: "Preferences" }}
      />
    </Stack>
  );
}
