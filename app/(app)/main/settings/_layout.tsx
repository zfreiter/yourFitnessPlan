import { Stack } from "expo-router";
import { useColorTheme } from "@/context/colorThemeContext";

export default function SettingsLayout() {
  const { theme } = useColorTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.color.accent,
        },
        headerTintColor: theme.color.textPrimary,
        headerTitleStyle: {
          fontWeight: "bold",
        },
        animation: "slide_from_right", // or "slide_from_right", "slide_from_bottom", "none"
        animationDuration: 200, // milliseconds
        contentStyle: {
          backgroundColor: theme.color.background,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          headerTitle: "Settings",
          contentStyle: {
            backgroundColor: theme.color.background,
          },
        }}
      />
      <Stack.Screen
        name="account"
        options={{
          headerShown: true,
          headerTitle: "Account",
          contentStyle: {
            backgroundColor: "theme.color.background",
          },
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: true,
          headerTitle: "Profile",
          contentStyle: {
            backgroundColor: theme.color.background,
          },
        }}
      />
      <Stack.Screen
        name="trainingStats"
        options={{
          headerShown: true,
          headerTitle: "Training Stats",
          contentStyle: {
            backgroundColor: theme.color.background,
          },
        }}
      />
      <Stack.Screen
        name="preferences"
        options={{
          headerShown: true,
          headerTitle: "Preferences",
          contentStyle: {
            backgroundColor: theme.color.background,
          },
        }}
      />
    </Stack>
  );
}
