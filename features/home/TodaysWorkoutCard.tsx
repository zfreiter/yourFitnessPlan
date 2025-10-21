import { View, Text, StyleSheet } from "react-native";

export default function TodaysWorkoutCard() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Todays Workout Card</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "flex-start",
  },
  text: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
  },
});
