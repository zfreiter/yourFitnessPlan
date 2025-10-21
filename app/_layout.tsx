import { DatabaseProvider } from "@/context/databaseContext";
import { HomeProvider } from "@/context/HomeContext";
import { SessionProvider } from "@/context/sessionContext";
import { WorkoutProvider } from "@/context/workoutContent";
import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <DatabaseProvider>
          <WorkoutProvider>
            <HomeProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <Slot />
              </GestureHandlerRootView>
            </HomeProvider>
          </WorkoutProvider>
        </DatabaseProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
