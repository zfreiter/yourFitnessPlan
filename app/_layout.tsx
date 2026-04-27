import { AuthProvider } from "@/context/authContext";
import { WorkoutProvider } from "@/context/workoutContext";
import { Slot, SplashScreen } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ColorThemeProvider } from "@/context/colorThemeContext";
import { useResolvedScheme } from "@/hooks/useResolvedScheme";
import Toast from "react-native-toast-message";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
//import { StatusBar } from "expo-status-bar";
import { MaxLiftProvider } from "@/context/maxLiftContext";
import * as Font from "expo-font";
import { Oswald_700Bold } from "@expo-google-fonts/oswald";
import { Inter_400Regular, Inter_700Bold } from "@expo-google-fonts/inter";
import { Pacifico_400Regular } from "@expo-google-fonts/pacifico";
import { RussoOne_400Regular } from "@expo-google-fonts/russo-one";
import { Orbitron_700Bold } from "@expo-google-fonts/orbitron";
import { UserPreferenceProvider } from "@/context/userPreferenceContext";
import { ProfileProvider } from "@/context/profileContext";
import { AppInitProvider } from "@/context/AppInitContext";
import { DataProvider } from "@/context/DataContext";
import { SyncProvider } from "@/context/SyncContext";
import { tokens } from "@/utils/colorTheme";
import { StatusBar } from "react-native";
SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prepare = async () => {
      console.log("prepare started");
      try {
        console.log("loading fonts...");
        await Font.loadAsync({
          "Oswald-Bold": Oswald_700Bold,
          "Inter-Regular": Inter_400Regular,
          "Inter-Bold": Inter_700Bold,
          "Pacifico-Regular": Pacifico_400Regular,
          "RussoOne-Regular": RussoOne_400Regular,
          "Orbitron-Bold": Orbitron_700Bold,
        });
        console.log("fonts loaded");
      } catch (e) {
        console.warn("Failed to load fonts:", e);
      } finally {
        console.log("finally block reached");
        setIsReady(true);
        console.log("isReady set to true");
        await SplashScreen.hideAsync().catch((e) => {
          console.warn("Failed to hide splash screen:", e);
        });
        console.log("splash hidden");
      }
    };

    prepare();
  }, []);

  if (!isReady && !error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0B0F0E",
        }}
      >
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#0EA06F" />
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

  function AppStatusBar() {
    const resolvedScheme = useResolvedScheme();
    const isDark = resolvedScheme === "dark";

    return (
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={
          isDark ? tokens.dark.background : tokens.light.background
        }
        translucent={false}
        animated={false}
      />
    );
  }

  return (
    <>
      {/* <StatusBar
        barStyle="dark-content"
        backgroundColor="#FF0000"
        translucent={false}
      /> */}
      <SafeAreaProvider>
        <AppInitProvider>
          <AuthProvider>
            <SyncProvider>
              <ColorThemeProvider>
                <DataProvider>
                  <ProfileProvider>
                    <UserPreferenceProvider>
                      <WorkoutProvider>
                        <MaxLiftProvider>
                          <GestureHandlerRootView style={{ flex: 1 }}>
                            <AppStatusBar />

                            <Slot />
                            <Toast />
                          </GestureHandlerRootView>
                        </MaxLiftProvider>
                      </WorkoutProvider>
                    </UserPreferenceProvider>
                  </ProfileProvider>
                </DataProvider>
              </ColorThemeProvider>
            </SyncProvider>
          </AuthProvider>
        </AppInitProvider>
      </SafeAreaProvider>
    </>
  );
}
