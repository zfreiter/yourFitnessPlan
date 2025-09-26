import { Button, Text, View } from "react-native";
import { useSession } from "@/context/sessionContext";
import OneRmReferenceChart from "../../../features/settings/oneRmReferenceChart";
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
      <Text>Account settings setting</Text>
      <Text>session data: {JSON.stringify(session)}</Text>

      <OneRmReferenceChart />
      <View>
        <Button title="Sign out" onPress={signOut} />
      </View>
    </View>
  );
}
