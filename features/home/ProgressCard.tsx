import { View, Text } from "react-native";
import { StyleSheet } from "react-native";

export default function ProgressCard() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Progress Card</Text>
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
