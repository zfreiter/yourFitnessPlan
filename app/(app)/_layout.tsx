import { Stack } from "expo-router";
import { useColorTheme } from "@/context/colorThemeContext";
import { useAuth } from "@/context/authContext";
export default function RootLayout() {
  const { user } = useAuth();
  const { theme } = useColorTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true, // Ensure the header is visible
        headerStyle: {
          backgroundColor: theme.accent, // Change the header background color
        },
        headerTintColor: "theme.textPrimary", // Change the header text color
        headerTitleStyle: {
          fontWeight: "bold", // Make the title bold
        },
      }}
    >
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="main" options={{ headerShown: false }} />

        {/* Full-screen flows */}
        <Stack.Screen
          name="CreateWorkout"
          options={{ title: "Create Workout" }}
        />
        <Stack.Screen
          name="[workoutId]"
          options={{ title: "Workout Session" }}
        />
      </Stack.Protected>
      <Stack.Screen name="loading" options={{ title: "loading" }} />
      <Stack.Screen name="login" options={{ title: "Login" }} />
      <Stack.Screen name="register" options={{ title: "Sign Up" }} />
    </Stack>
  );
}
