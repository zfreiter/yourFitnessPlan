import { useAuth } from "@/context/authContext";
import { AntDesign } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import { useEffect } from "react";
import { View, Text, StatusBar } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppButton } from "@/components/button";
import { HomeProvider } from "@/context/HomeContext";
import { useColorTheme } from "@/context/colorThemeContext";

export default function MainLayoutTabs() {
  const { isAuthInitialized, isLoading } = useAuth();
  const { theme } = useColorTheme();

  return (
    <SafeAreaProvider>
      <StatusBar />
      {/* <HomeProvider> */}
      <Tabs
        backBehavior="history"
        screenOptions={{
          tabBarActiveTintColor: theme.accent,
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.accent,
          },
          headerTintColor: theme.textPrimary,
          headerTitleStyle: {
            fontWeight: "bold",
          },
          headerRight: () => <></>,
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopWidth: 0,
            //height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
        }}
      >
        <Tabs.Protected guard={true}>
          <Tabs.Screen
            name="home/index"
            options={{
              title: "Home", // Set the header title
              tabBarLabel: "Home",
              tabBarIcon: ({ color }) => (
                <AntDesign name="home" size={24} color={color} />
              ),
            }}
          />

          <Tabs.Screen
            name="calendar/index"
            options={{
              title: "Calendar",
              tabBarLabel: "Calendar",
              popToTopOnBlur: true,
              tabBarIcon: ({ color }) => (
                <AntDesign name="calendar" size={24} color={color} />
              ),
            }}
          />

          <Tabs.Screen
            name="settings"
            options={{
              headerShown: false,
              tabBarLabel: "Settings",
              popToTopOnBlur: true,

              tabBarIcon: ({ color }) => (
                <Ionicons name="settings-sharp" size={24} color={color} />
              ),
            }}
          />
        </Tabs.Protected>
      </Tabs>
      {/* </HomeProvider> */}
    </SafeAreaProvider>
  );
}
