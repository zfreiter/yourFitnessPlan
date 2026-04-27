import { router, useLocalSearchParams, Stack } from "expo-router";
import { useColorTheme } from "@/context/colorThemeContext";
import { CreateWorkoutContainer } from "@/features/create-workout/components/createWorkoutContainer";
import { Pressable } from "react-native-gesture-handler";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CreateWorkout() {
  const { theme } = useColorTheme();
  return (
    <>
      {/* Override the header set in _layout.tsx for this screen only */}
      {/* <Stack.Screen
        options={{
          title: "Create Workout",
          headerTitleAlign: "center",
          headerStyle: {
            backgroundColor: theme.color.accent,
          },
          headerTitleStyle: { fontFamily: theme.fonts.heading },

          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <View
                style={{
                  borderWidth: 1,
                  borderColor: theme.color.border,
                  backgroundColor: theme.color.accentStrong,
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
                  color={theme.color.textPrimary}
                />
              </View>
            </Pressable>
          ),
        }}
      /> */}
      <CreateWorkoutContainer />
    </>
  );
}
