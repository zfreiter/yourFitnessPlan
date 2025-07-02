import { Stack, useRouter, useNavigation } from "expo-router";
import { Pressable, StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function StackLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar />

      <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen
          name="[workoutId]"
          options={{
            headerStyle: {
              backgroundColor: "#8EDAF5", // Change the header

              // background color
            },
            headerTitleAlign: "center",
            headerTintColor: "#fff", // Change the header text color
            headerTitleStyle: {
              fontWeight: "bold", // Make the title bold
            },
            title: "Workout Session",

            headerShown: true,
            headerTitle: "Workout Session",
            headerLeft: () => <BackButton />,
            headerRight: () => <></>,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

const BackButton = () => {
  const router = useRouter();
  const navigation = useNavigation();

  const handleBack = () => {
    const state = navigation?.getState();
    const previousScreen = state?.routes[state?.index - 1]?.name;

    if (previousScreen) {
      router.back();
    } else {
      router.replace("/(app)/calendar");
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.5 : 1,
        },
      ]}
      onPress={handleBack}
    >
      <Ionicons name="caret-back-circle" size={24} color="black" />
    </Pressable>
  );
};
