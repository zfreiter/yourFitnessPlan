import { Button, Pressable, Text, View } from "react-native";
import { useSession } from "@/context/sessionContext";
import { Link } from "expo-router";
export default function Index() {
  const { session, isLoading, signOut } = useSession();
  return (
    <View
      style={{
        flex: 1,
        padding: 10,
        gap: 10,
      }}
    >
      <Link href="./settings/account" asChild>
        <Pressable
          style={{ padding: 10, backgroundColor: "#8EDAF5", borderRadius: 5 }}
        >
          <Text>Account</Text>
        </Pressable>
      </Link>

      <Link href="./settings/workout-data" asChild>
        <Pressable
          style={{ padding: 10, backgroundColor: "#8EDAF5", borderRadius: 5 }}
        >
          <Text>Workout Data</Text>
        </Pressable>
      </Link>

      <Link href="./settings/profile" asChild>
        <Pressable
          style={{ padding: 10, backgroundColor: "#8EDAF5", borderRadius: 5 }}
        >
          <Text>Profile</Text>
        </Pressable>
      </Link>

      <Link href="./settings/preferences" asChild>
        <Pressable
          style={{ padding: 10, backgroundColor: "#8EDAF5", borderRadius: 5 }}
        >
          <Text>Preferences</Text>
        </Pressable>
      </Link>

      <View style={{ flex: 1 }} />

      <View style={{ margin: 0 }}>
        <Button title="Sign out" onPress={signOut} />
      </View>
    </View>
  );
}
