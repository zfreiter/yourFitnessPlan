// app/loading.tsx
import { useContext, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { AuthContext } from "@/context/authContext";

export default function LoadingScreen() {
  const router = useRouter();
  const { user, isAuthInitialized } = useContext(AuthContext)!;

  useEffect(() => {
    console.log("Auth initialized:", isAuthInitialized, "User:", user);
    if (!isAuthInitialized) return;

    // Redirect once auth is ready
    if (user) {
      router.replace("/main");
    } else {
      router.replace("/login");
    }
  }, [user, isAuthInitialized]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#8EDAF5" />
    </View>
  );
}
