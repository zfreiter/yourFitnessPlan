import { View, Text, Button } from "react-native";
import { useSession } from "@/context/sessionContext";

export default function Index() {
  const { session, isLoading, signOut } = useSession();
  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      <View style={{ alignItems: "center", margin: 20 }}>
        <Text>{`Home page, welcome back ${session}`}</Text>
        <Text>
          CREATE AND FINISH ALL THE FUNCTIONS FOR WORKOUT CONTEXT, IMPLEMENT
          THESE ON WORKOUT-SESSION LAYOUT AND PAGE
        </Text>
      </View>
    </View>
  );
}
