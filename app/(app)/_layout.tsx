import { useSession } from "@/context/sessionContext";
import AntDesign from "@expo/vector-icons/AntDesign";
import { router, Tabs } from "expo-router";
import { useEffect } from "react";
import { View, Text, StatusBar } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppButton } from "@/components/button";

export default function AppLayout() {
  const { session, isLoading, signOut } = useSession();
  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/(auth)/login");
    }
  }, [isLoading, session]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <StatusBar />
      <Tabs
        backBehavior="history"
        screenOptions={{
          tabBarActiveTintColor: "#8EDAF5",
          headerShown: true, // Ensure the header is visible
          headerStyle: {
            backgroundColor: "#8EDAF5", // Change the header background color
          },
          headerTintColor: "#fff", // Change the header text color
          headerTitleStyle: {
            fontWeight: "bold", // Make the title bold
          },
          headerRight: () => <></>,
        }}
      >
        <Tabs.Screen
          name="(home)/index"
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
          name="create-workout/index"
          options={{
            title: "Create Workout",
            tabBarLabel: "Create Workout",
            popToTopOnBlur: true,

            headerRight: () => (
              <AppButton
                title="Cancel"
                style={{
                  backgroundColor: "#FF9500",
                  marginRight: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
                onPress={() => router.back()}
                textStyle={{ color: "white" }}
              />
            ),
            tabBarIcon: ({ color }) => (
              <AntDesign name="pluscircleo" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings/index"
          options={{
            title: "Settings",
            tabBarLabel: "Account",
            popToTopOnBlur: true,

            tabBarIcon: ({ color }) => (
              <Ionicons name="settings-sharp" size={24} color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaProvider>
  );
}
