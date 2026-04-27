import { View, Text, StyleSheet } from "react-native";
import { useHome } from "@/context/HomeContext";
import { useAuth } from "@/context/authContext";
import { useColorTheme } from "@/context/colorThemeContext";
import { getCurrentGreetingForCurrentTime } from "@/utils/Welcome";

export default function HomeHeader() {
  const { theme } = useColorTheme();
  const { weeklyTotal, monthlyTotal } = useHome();
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      {/* Greeting */}
      <Text style={[styles.greeting, { color: theme.color.textPrimary }]}>
        {getCurrentGreetingForCurrentTime()},{"\n"}
        {user?.full_name.split(" ")[0]}!
      </Text>

      {/* Stats card */}
      <View
        style={[
          styles.statsCard,
          {
            backgroundColor: theme.color.surface,
            borderColor: theme.color.border,
            shadowColor: theme.color.shadow,
          },
        ]}
      >
        <Text style={[styles.statLabel, { color: theme.color.textSecondary }]}>
          THIS WEEK
        </Text>
        <Text style={[styles.statValue, { color: theme.color.textPrimary }]}>
          {weeklyTotal !== 0
            ? `${weeklyTotal} workout${weeklyTotal > 1 ? "s" : ""}`
            : "Let's go!"}
        </Text>

        <View
          style={[styles.divider, { backgroundColor: theme.color.border }]}
        />

        <Text style={[styles.statLabel, { color: theme.color.textSecondary }]}>
          THIS MONTH
        </Text>
        <Text style={[styles.statValue, { color: theme.color.textPrimary }]}>
          {monthlyTotal !== 0
            ? `${monthlyTotal} workout${monthlyTotal > 1 ? "s" : ""}`
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
    alignItems: "center",
  },
  greeting: {
    fontFamily: "RussoOne",
    fontSize: 22,
    lineHeight: 28,
  },
  statsCard: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  statValue: {
    fontFamily: "Inter-Regular",
    fontSize: 13,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
});
