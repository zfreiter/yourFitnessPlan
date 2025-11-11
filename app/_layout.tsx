import { DatabaseProvider } from "@/context/databaseContext";
import { HomeProvider } from "@/context/HomeContext";
import { AuthProvider } from "@/context/authContext";
import { WorkoutProvider } from "@/context/workoutContext";
import { Slot, Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function Layout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DatabaseProvider>
          <WorkoutProvider>
            <HomeProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <Slot />
              </GestureHandlerRootView>
            </HomeProvider>
          </WorkoutProvider>
        </DatabaseProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
