import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#8EDAF5",
        },
        headerTintColor: "#fff",
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
