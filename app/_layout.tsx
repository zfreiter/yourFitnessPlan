import { AuthProvider } from "@/context/authContext";
import { WorkoutProvider } from "@/context/workoutContext";
import { Slot, SplashScreen } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ColorThemeProvider } from "@/context/colorThemeContext";
import { useResolvedScheme } from "@/hooks/useResolvedScheme";
import Toast from "react-native-toast-message";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";
import { MaxLiftProvider } from "@/context/maxLiftContext";
import * as Font from "expo-font";
import * as Notifications from "expo-notifications";
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

SplashScreen.preventAutoHideAsync();

// ← NEW: controls how notifications appear when app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ← NEW: Android requires a channel for sound/vibration to work reliably
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("timer", {
    name: "Timer Alerts",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
  });
}

export default function Layout() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prepare = async () => {
      try {
        await Font.loadAsync({
          "Oswald-Bold": Oswald_700Bold,
          "Inter-Regular": Inter_400Regular,
          "Inter-Bold": Inter_700Bold,
          "Pacifico-Regular": Pacifico_400Regular,
          "RussoOne-Regular": RussoOne_400Regular,
          "Orbitron-Bold": Orbitron_700Bold,
        });

        // ← NEW: request notification permission once on first launch.
        // getPermissionsAsync checks first so we don't prompt on every launch.
        // If already granted it skips the dialog entirely.
        const { status: existing } = await Notifications.getPermissionsAsync();
        if (existing !== "granted") {
          await Notifications.requestPermissionsAsync();
        }
      } catch (e) {
        console.warn("Prepare failed:", e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync().catch((e) => {
          console.warn("Failed to hide splash screen:", e);
        });
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
  );
}
