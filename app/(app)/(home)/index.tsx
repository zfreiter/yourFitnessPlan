import { View, Text, Button } from "react-native";
import { useSession } from "@/context/sessionContext";

export default function Index() {
  const { session, isLoading, signOut } = useSession();
  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <Text>{`Home page, welcome back ${session}`}</Text>
      </View>
    </View>
  );
}
