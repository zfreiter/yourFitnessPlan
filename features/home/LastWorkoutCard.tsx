import { View, Text } from "react-native";
import { StyleSheet } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";

export default function LastWorkoutCard() {
  const { theme } = useColorTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: theme.textPrimary }]}>
        Last Workout Card
      </Text>
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
