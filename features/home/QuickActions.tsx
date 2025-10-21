import { View, Text } from "react-native";
import { StyleSheet } from "react-native";

export default function QuickActions() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Quick Actions</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  text: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
  },
});
