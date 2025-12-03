import { View, Text, StyleSheet } from "react-native";
import { useHome } from "@/context/HomeContext";
import { useAuth } from "@/context/authContext";
import { useColorTheme } from "@/context/colorThemeContext";
import { getCurrentGreetingForCurrentTime } from "@/utils/Welcome";
// TODO: Implement the Home Header Greeting + streak
// Greeting time of day
// Streak - should be dynamic based on the current date
// db calls to get the streak
// skeleton loading
export default function HomeHeader() {
  const { theme } = useColorTheme();
  const { weeklyTotal, monthlyTotal } = useHome();
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.greetingContainer}>
        <Text style={[styles.text, { color: theme.textPrimary }]}>
          {getCurrentGreetingForCurrentTime()}, {user?.full_name}!
        </Text>
      </View>
      <View
        style={[
          styles.streakContainer,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}
      >
        <Text style={[styles.text, { color: theme.textPrimary }]}>
          {weeklyTotal !== 0
            ? `${weeklyTotal} workouts this week`
            : "Lets get started!"}
        </Text>
        {}
        <Text style={[styles.text, { color: theme.textPrimary }]}>
          {monthlyTotal !== 0
            ? `${monthlyTotal} workouts this month`
            : "Keep it up!"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greetingContainer: { flexDirection: "row", alignItems: "center" },
  streakContainer: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    fontSize: 14,
    fontWeight: "normal",
    color: "black",
  },
});
