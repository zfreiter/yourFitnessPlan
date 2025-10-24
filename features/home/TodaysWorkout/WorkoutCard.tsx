import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { Workout } from "@/types/type";
import { format, isToday, isTomorrow } from "date-fns";
import { getColorsByType } from "@/utils/colors";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export default function WorkoutCard({
  workout,
  detailed = false,
}: {
  workout: Workout;
  detailed?: boolean;
}) {
  const todayFlag = isToday(workout.scheduled_datetime) ? "Today" : "";
  const tomorrowFlag = isTomorrow(workout.scheduled_datetime) ? "Tomorrow" : "";
  const workoutDate = format(workout.scheduled_datetime, "EEEE - h:mm aaa");
  const simpleDate = `${todayFlag}${tomorrowFlag} - ${format(
    workout.scheduled_datetime,
    "h:mm aaa"
  )}`;
  return (
    <Link
      style={styles.cardContainer}
      href={{
        pathname: "/workout-session/[workoutId]",
        params: { workoutId: workout.id },
      }}
      asChild
    >
      <Pressable
        style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
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
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {workout.name}
          </Text>
          <Text style={{}}>{detailed ? workoutDate : simpleDate}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2.84,
    elevation: 3,
  },
});
