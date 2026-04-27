import { Stack } from "expo-router";
import { useColorTheme } from "@/context/colorThemeContext";
import { useAuth } from "@/context/authContext";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function RootLayout() {
  const { user, isAuthInitialized } = useAuth();
  const { theme } = useColorTheme();
  const insets = useSafeAreaInsets();

  if (!isAuthInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={theme.color.accent} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        animation: "none",
        contentStyle: {
          backgroundColor: theme.color.background,
        },
        headerShadowVisible: false,
        header: ({ options, navigation }) => (
          <View
            style={{
              backgroundColor: theme.color.background,
              paddingTop: insets.top + 8,
              height: insets.top + 56,
              justifyContent: "space-between",
              alignItems: "center",
              flexDirection: "row",
              paddingBottom: 8,
              paddingHorizontal: 16,
            }}
          >
            {/* Left — back button or spacer */}
            {navigation.canGoBack() ? (
              <Pressable
                onPress={() => navigation.goBack()}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: theme.color.border,
                    backgroundColor: theme.color.surface2,
                    borderRadius: 100,
                    width: 36,
                    height: 36,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name="chevron-back"
                    size={22}
                    color={theme.color.accent}
                  />
                </View>
              </Pressable>
            ) : (
              <View style={{ width: 36, height: 36 }} />
            )}

            {/* Center — title */}
            <Text
              style={{
                color: theme.color.textPrimary,
                fontSize: 18,
                fontFamily: theme.fonts.heading,
              }}
            >
              {options.title}
            </Text>

            {/* Right — menu button or spacer */}
            {options.title === "Workout Session" ? (
              <Pressable
                onPress={() => (options as any).onMenuPress?.()}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: theme.color.border,
                    backgroundColor: theme.color.surface2,
                    borderRadius: 100,
                    width: 36,
                    height: 36,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="menu" size={20} color={theme.color.accent} />
                </View>
              </Pressable>
            ) : (
              <View style={{ width: 36, height: 36 }} />
            )}
          </View>
        ),
      }}
    >
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="main" options={{ headerShown: false }} />
        <Stack.Screen
          name="CreateWorkout"
          options={{ title: "Create Workout" }}
        />
        <Stack.Screen
          name="[workoutId]"
          options={{ title: "Workout Session" }}
        />
      </Stack.Protected>

      <Stack.Screen
        name="loading"
        options={{
          title: "Loading",
          headerTitleStyle: { fontFamily: theme.fonts.heading },
          headerStyle: { backgroundColor: theme.color.background },
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          title: "Login",
          headerTitleStyle: { fontFamily: theme.fonts.heading },
          headerStyle: { backgroundColor: theme.color.background },
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: "Register",
          headerTitleStyle: { fontFamily: theme.fonts.heading },
          headerStyle: { backgroundColor: theme.color.background },
        }}
      />
    </Stack>
  );
}
