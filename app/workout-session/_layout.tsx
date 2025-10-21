import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { StatusBar, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function StackLayout() {
  const handleBack = () => {
    router.dismissAll(); // Dismiss the workout session stack
    router.navigate("/(app)/calendar"); // Go to calendar in tab navigator
  };

  return (
    <SafeAreaProvider>
      <StatusBar />

      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: "red",
          },
        }}
      >
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
            headerBackVisible: true,
            headerBackTitle: "Back",
            headerLeft: () => (
              <TouchableOpacity onPress={handleBack}>
                <View style={{ paddingLeft: 10 }}>
                  <Ionicons name="arrow-back" size={24} color="white" />
                </View>
              </TouchableOpacity>
            ),
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
