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
  const { isAuthInitialized, isLoading, user } = useAuth();
  const { theme } = useColorTheme();

  return (
    <HomeProvider>
      <Tabs
        backBehavior="history"
        screenOptions={{
          tabBarActiveTintColor: theme.color.accent,
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.color.background,
            //height: 100,
          },
          headerTintColor: theme.color.textPrimary,
          headerTitleStyle: {
            fontFamily: theme.fonts.heading,
          },
          tabBarStyle: {
            backgroundColor: theme.color.surface,
            borderTopWidth: 0,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontFamily: theme.fonts.heading,
            fontSize: 12,
          },
          headerShadowVisible: false,

          sceneStyle: { backgroundColor: theme.color.background },
        }}
      >
        <Tabs.Protected guard={!!user}>
          <Tabs.Screen
            name="home/index"
            options={{
              title: "Home", // Set the header title
              headerTitleAlign: "center",
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
              headerTitleAlign: "center",
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
              title: "Settings",
              headerTitleAlign: "center",
              tabBarLabel: "Settings",
              popToTopOnBlur: true,
              tabBarIcon: ({ color }) => (
                <Ionicons name="settings-sharp" size={24} color={color} />
              ),
            }}
          />
        </Tabs.Protected>
      </Tabs>
    </HomeProvider>
  );
}
