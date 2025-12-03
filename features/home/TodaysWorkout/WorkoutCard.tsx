import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { Workout } from "@/types/type";
import { format, isToday, isTomorrow } from "date-fns";
import { getColorsByType } from "@/utils/colors";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useColorTheme } from "@/context/colorThemeContext";

export default function WorkoutCard({
  workout,
  detailed = false,
}: {
  workout: Workout;
  detailed?: boolean;
}) {
  const { theme } = useColorTheme();
  const todayFlag = isToday(workout.scheduled_datetime) ? "Today" : "";
  const tomorrowFlag = isTomorrow(workout.scheduled_datetime) ? "Tomorrow" : "";
  const workoutDate = format(workout.scheduled_datetime, "EEEE - h:mm aaa");
  const simpleDate = `${todayFlag}${tomorrowFlag} - ${format(
    workout.scheduled_datetime,
    "h:mm aaa"
  )}`;
  return (
    <Link
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}
      href={{
        pathname: "/[workoutId]",
        params: { workoutId: workout.id },
      }}
      asChild
    >
      <Pressable
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderWidth: 1,
          borderColor: theme.accent,
          padding: 5,
          borderRadius: 8,
        }}
      >
        <MaterialCommunityIcons
          name="weight-lifter"
          size={24}
          color={getColorsByType(workout.workoutType).main}
        />

        <View style={{ flex: 1, flexDirection: "column" }}>
          <Text
            style={{
              flexShrink: 0,
              flexGrow: 1,
              flexWrap: "nowrap",
              fontWeight: "bold",
              maxWidth: "90%",
              color: theme.textSecondary,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {workout.name}
          </Text>
          <Text style={{ color: theme.textSecondary }}>
            {detailed ? workoutDate : simpleDate}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2.84,
    elevation: 3,
  },
});
