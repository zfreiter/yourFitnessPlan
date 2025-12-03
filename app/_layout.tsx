import { DatabaseProvider } from "@/context/databaseContext";
import { HomeProvider } from "@/context/HomeContext";
import { AuthProvider } from "@/context/authContext";
import { WorkoutProvider } from "@/context/workoutContext";
import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ColorThemeProvider } from "@/context/colorThemeContext";

export default function Layout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ColorThemeProvider>
          <DatabaseProvider>
            <WorkoutProvider>
              <HomeProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <Slot />
                </GestureHandlerRootView>
              </HomeProvider>
            </WorkoutProvider>
          </DatabaseProvider>
        </ColorThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
