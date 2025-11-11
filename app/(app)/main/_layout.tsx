import { useAuth } from "@/context/authContext";
import { AntDesign } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import { useEffect } from "react";
import { View, Text, StatusBar } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppButton } from "@/components/button";
import { HomeProvider } from "@/context/HomeContext";

export default function MainLayoutTabs() {
  const { isAuthInitialized, isLoading } = useAuth();

  return (
    <SafeAreaProvider>
      <StatusBar />
      {/* <HomeProvider> */}
      <Tabs
        backBehavior="history"
        screenOptions={{
          tabBarActiveTintColor: "#8EDAF5",
          headerShown: true,
          headerStyle: {
            backgroundColor: "#8EDAF5",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
          headerRight: () => <></>,
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
