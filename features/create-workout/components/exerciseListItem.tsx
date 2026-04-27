import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { UseFormSetValue, UseFormGetValues } from "react-hook-form";
import { useColorTheme } from "@/context/colorThemeContext";
import { BaseWorkoutExercise, Workout } from "@/types/common/workoutInterface";

export default function ExerciseListItem({
  exercise,
  setValue,
  getValues,
  index,
}: {
  exercise: BaseWorkoutExercise;
  setValue: UseFormSetValue<Workout>;
  getValues: UseFormGetValues<Workout>;
  index?: number;
}) {
  const { theme } = useColorTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            (index ?? 0) % 2 === 0 ? theme.color.surface2 : "transparent",
        },
      ]}
      collapsable={false}
    >
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.color.textPrimary }]}>
          {exercise.exercise_name}
        </Text>
        <Text style={[styles.setCount, { color: theme.color.textSecondary }]}>
          {exercise.sets?.length || 0}{" "}
          {exercise.sets?.length === 1 ? "set" : "sets"}
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.5 }]}
        onPress={() => {
          Alert.alert(
            "Delete Exercise",
            "Are you sure you want to delete this exercise?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                  setValue(
                    "exercises",
                    getValues("exercises")?.filter(
                      (e: BaseWorkoutExercise) =>
                        e.exercise_name !== exercise.exercise_name,
                    ),
                  );
                },
              },
            ],
          );
        }}
      >
        {({ pressed }) => (
          <FontAwesome6
            name="trash-can"
            size={16}
            color={pressed ? theme.color.textSecondary : theme.color.danger}
          />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  info: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
  },
  setCount: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  button: {
    padding: 6,
    borderRadius: 6,
  },
});
