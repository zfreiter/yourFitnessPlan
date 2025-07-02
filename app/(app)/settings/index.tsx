import { Button, Text, View } from "react-native";
import { useSession } from "@/context/sessionContext";
export default function Index() {
  const { session, isLoading, signOut } = useSession();
  return (
    <View
      style={{
        flex: 1,
        padding: 20,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text>Account settings setting</Text>
        <Text>session data: {JSON.stringify(session)}</Text>
      </View>
      <View style={{}}>
        <Button title="Sign out" onPress={signOut} />
      </View>
    </View>
  );
}
