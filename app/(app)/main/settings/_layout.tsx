import { router, Stack } from "expo-router";
import { useColorTheme } from "@/context/colorThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SettingsLayout() {
  const { theme } = useColorTheme();
  const insets = useSafeAreaInsets();
  const headers = [
    { name: "index", title: "Settings" },
    { name: "account", title: "Account" },
    { name: "profile", title: "Profile" },
    { name: "trainingStats", title: "Training Stats" },
    { name: "preferences", title: "Preferences" },
  ];

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
            <View style={{ width: 36, height: 36 }} />
          </View>
        ),
      }}
    >
      {headers.map((header) => (
        <Stack.Screen
          name={header.name}
          options={{
            title: header.title,
            headerTitleAlign: "center",
            headerTitleStyle: {
              fontFamily: theme.fonts.heading,
            },

            //   headerLeft: () => (
            //     <Pressable
            //       onPress={() => router.back()}
            //       style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            //     >
            //       <View
            //         style={{
            //           borderWidth: 1,
            //           borderColor: theme.color.border,
            //           backgroundColor: theme.color.accentStrong,
            //           borderRadius: 100,
            //           width: 36,
            //           height: 36,
            //           justifyContent: "center",
            //           alignItems: "center",
            //         }}
            //       >
            //         <Ionicons
            //           name="chevron-back"
            //           size={22}
            //           color={theme.color.textPrimary}
            //         />
            //       </View>
            //     </Pressable>
            //   ),
          }}
        />
      ))}

      {/* 
      <Stack.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
      <Stack.Screen
        name="trainingStats"
        options={{
          title: "Training Stats",
        }}
      />
      <Stack.Screen
        name="preferences"
        options={{
          title: "Preferences",
        }}
      /> */}
    </Stack>
  );
}
