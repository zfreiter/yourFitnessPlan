import { DatabaseProvider } from "@/context/databaseContext";
import { HomeProvider } from "@/context/HomeContext";
import { SessionProvider } from "@/context/sessionContext";
import { WorkoutProvider } from "@/context/workoutContext";
import { Slot, Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <DatabaseProvider>
          <WorkoutProvider>
            <HomeProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <Stack
                  screenOptions={{
                    headerShown: true, // Ensure the header is visible
                    headerStyle: {
                      backgroundColor: "#8EDAF5", // Change the header background color
                    },
                    headerTintColor: "#fff", // Change the header text color
                    headerTitleStyle: {
                      fontWeight: "bold", // Make the title bold
                    },
                  }}
                >
                  <Stack.Screen name="login" options={{ title: "Login" }} />
                  <Stack.Screen
                    name="register"
                    options={{ title: "Sign Up" }}
                  />

                  <Stack.Screen name="main" options={{ headerShown: false }} />

                  {/* Full-screen flows */}
                  <Stack.Screen
                    name="CreateWorkout"
                    options={{ title: "Create Workout" }}
                  />
                  <Stack.Screen
                    name="[workoutId]"
                    options={{ title: "Workout Session" }}
                  />
                </Stack>
              </GestureHandlerRootView>
            </HomeProvider>
          </WorkoutProvider>
        </DatabaseProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );

  // return (
  //   <SafeAreaProvider>
  //     <SessionProvider>
  //       <DatabaseProvider>
  //         <WorkoutProvider>
  //           <HomeProvider>
  //             <GestureHandlerRootView style={{ flex: 1 }}>
  //               <Slot />
  //             </GestureHandlerRootView>
  //           </HomeProvider>
  //         </WorkoutProvider>
  //       </DatabaseProvider>
  //     </SessionProvider>
  //   </SafeAreaProvider>
  // );
}
