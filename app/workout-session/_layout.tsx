import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function StackLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar />

      <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen
          name="[workoutId]"
          options={{
            headerStyle: {
              backgroundColor: "#8EDAF5",
            },
            headerTitleAlign: "center",
            headerTintColor: "#000",
            headerTitleStyle: {
              fontWeight: "bold",
            },
            title: "Workout Session",
            headerShown: true,
            headerTitle: "Workout Session",
            // Remove custom header back button since we have one in the page
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
