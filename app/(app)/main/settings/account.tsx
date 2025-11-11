import { View, Text, Button, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function Account() {
  const router = useRouter();
  return (
    <View>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "bold",
          textAlign: "center",
          marginTop: 50,
        }}
      >
        Account
      </Text>
    </View>
  );
}
