import { useAuth } from "@/context/authContext";
import { AntDesign } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HomeProvider } from "@/context/HomeContext";
import { useColorTheme } from "@/context/colorThemeContext";

export default function MainLayoutTabs() {
  const { isAuthInitialized, isLoading, user } = useAuth();
  const { theme } = useColorTheme();
  const insets = useSafeAreaInsets();

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
            paddingBottom: insets.bottom,
            paddingTop: 8,
            height: 60 + insets.bottom,
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
