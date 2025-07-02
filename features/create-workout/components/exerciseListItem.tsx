import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { UseFormSetValue, UseFormGetValues } from "react-hook-form";
import {
  BaseWorkoutExercise,
  CreateWorkoutForm,
} from "@/types/common/workoutInterface";
export default function ExerciseListItem({
  exercise,
  setValue,
  getValues,
}: {
  exercise: BaseWorkoutExercise;
  setValue: UseFormSetValue<CreateWorkoutForm>;
  getValues: UseFormGetValues<CreateWorkoutForm>;
}) {
  return (
    <View style={styles.container}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Text style={styles.text}>{exercise.exercise_name}</Text>
        <Text style={styles.text}>Sets: {exercise.sets.length}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && { backgroundColor: "" },
        ]}
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
                        e.exercise_name !== exercise.exercise_name
                    )
                  );
                },
              },
            ]
          );
        }}
      >
        {({ pressed }) => (
          <FontAwesome6
            name="trash-can"
            size={24}
            color={pressed ? "black" : "red"}
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
    borderWidth: 1,
    borderColor: "black",
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
    marginHorizontal: 10,
    backgroundColor: "white",
  },
  text: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
  },
  setContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  button: {
    padding: 5,
    borderRadius: 5,
  },
});
