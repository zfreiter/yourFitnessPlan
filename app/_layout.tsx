import { DatabaseProvider } from "@/context/databaseContext";
import { HomeProvider } from "@/context/HomeContext";
import { AuthProvider } from "@/context/authContext";
import { WorkoutProvider } from "@/context/workoutContext";
import { Slot, SplashScreen } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ColorThemeProvider } from "@/context/colorThemeContext";
import Toast from "react-native-toast-message";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prepare = async () => {
      try {
        // Give providers time to initialize
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setIsReady(true);
        await SplashScreen.hideAsync();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        await SplashScreen.hideAsync();
      }
    };

    prepare();
  }, []);

  // Show loading state AFTER splash hides
  if (!isReady && !error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" />
        </View>

        <Text style={{ marginTop: 20, fontSize: 16 }}>Initializing app...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
          backgroundColor: "#fff",
        }}
      >
        <Text style={{ color: "red", fontSize: 16, textAlign: "center" }}>
          Error: {error}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ColorThemeProvider>
          <DatabaseProvider>
            <WorkoutProvider>
              <HomeProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <Slot />
                  <Toast />
                </GestureHandlerRootView>
              </HomeProvider>
            </WorkoutProvider>
          </DatabaseProvider>
        </ColorThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
