import { Redirect, Stack } from "expo-router";
import { useColorTheme } from "@/context/colorThemeContext";
import { useAuth } from "@/context/authContext";
import { ActivityIndicator, View } from "react-native";
export default function RootLayout() {
  const { user, isLoading } = useAuth();
  const { theme } = useColorTheme();

  //  if (isLoading) {
  //     return (
  //       <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
  //         <ActivityIndicator size="large" />
  //       </View>
  //     );
  //   }

  //   if (!user) {
  //     return <Redirect href="/login" />;
  //   }

  return (
    <Stack
      screenOptions={{
        headerShown: true, // Ensure the header is visible
        headerStyle: {
          backgroundColor: theme.color.accent, // Change the header background color
        },
        headerTintColor: theme.color.textPrimary, // Change the header text color
        headerTitleStyle: {
          fontWeight: "bold", // Make the title bold
        },
        contentStyle: {
          backgroundColor: theme.color.background,
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
