import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { Pressable } from "react-native";
import { Workout } from "@/types/type";
import { format, isToday, isTomorrow } from "date-fns";
import { getColorsByType } from "@/utils/colors";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useColorTheme } from "@/context/colorThemeContext";
import { useState } from "react";

export default function WorkoutCard({
  workout,
  detailed = false,
}: {
  workout: Workout;
  detailed?: boolean;
}) {
  const [isPressed, setIsPressed] = useState(false);
  const { theme } = useColorTheme();

  const todayFlag = isToday(workout.scheduled_datetime) ? "Today" : "";
  const tomorrowFlag = isTomorrow(workout.scheduled_datetime) ? "Tomorrow" : "";
  const dayLabel =
    todayFlag || tomorrowFlag || format(workout.scheduled_datetime, "EEE");
  const timeLabel = format(workout.scheduled_datetime, "h:mm aaa");
  const workoutDate = detailed
    ? format(workout.scheduled_datetime, "EEEE · h:mm aaa")
    : `${dayLabel} · ${timeLabel}`;

  const typeColor = getColorsByType(workout.workoutType).main;

  return (
    <Link
      href={{ pathname: "/[workoutId]", params: { workoutId: workout.id } }}
      asChild
    >
      <Pressable
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        style={[
          styles.card,
          {
            borderColor: theme.color.border,
            shadowColor: theme.color.shadow,
            opacity: isPressed ? 0.85 : 1,
          },
        ]}
      >
        {/* Left color strip */}
        <View style={[styles.typeStrip, { backgroundColor: typeColor }]} />

        {/* Main content row */}
        <View style={styles.row}>
          {/* Left section — icon + name + date */}
          <View
            style={[
              styles.leftSection,
              { backgroundColor: theme.color.surface },
            ]}
          >
            <MaterialCommunityIcons
              name="weight-lifter"
              size={20}
              color={typeColor}
            />
            <View style={styles.textBlock}>
              <Text
                style={[styles.workoutName, { color: theme.color.textPrimary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {workout.name}
              </Text>
              <Text
                style={[
                  styles.workoutDate,
                  { color: theme.color.textSecondary },
                ]}
              >
                {workoutDate}
              </Text>
            </View>
          </View>

          {/* Right section — fixed width so it's always the same size */}
          <View
            style={[
              styles.rightSection,
              { backgroundColor: theme.color.surface2 },
            ]}
          >
            <View style={[styles.typePill, { borderColor: typeColor }]}>
              <Text style={[styles.typePillText, { color: typeColor }]}>
                {workout.workoutType}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  typeStrip: {
    width: 3,
  },
  row: {
    //flex: 1,
    flexDirection: "row",
  },
  leftSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 0,
  },
  textBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  workoutName: {
    fontSize: 14,
    fontWeight: "600",
  },
  workoutDate: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  rightSection: {
    width: 90, // fixed width — always the same regardless of content
    justifyContent: "center",
    alignItems: "center",
  },
  typePill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
