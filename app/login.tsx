import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useSession } from "@/context/sessionContext";
import { useEffect } from "react";

export default function SignIn() {
  const { signIn } = useSession();

  return (
    <View style={{ flex: 1, justifyContent: "center", marginHorizontal: 20 }}>
      <Pressable
        onPress={() => {
          signIn();
          router.push("/main/home"); // Redirect to the home page after login
        }}
        style={({ pressed }) => ({
          backgroundColor: pressed ? "#ddd" : "blue",
          padding: 10,
          borderRadius: 5,
        })}
      >
        <Text style={{ textAlign: "center", color: "white" }}>Login</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/register")}
        style={({ pressed }) => ({
          backgroundColor: pressed ? "#ddd" : "green",
          padding: 10,
          borderRadius: 5,
          marginTop: 10,
        })}
      >
        <Text style={{ textAlign: "center", color: "white" }}>Register</Text>
      </Pressable>
    </View>
  );
}
