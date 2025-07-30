import { Exercise, ExerciseSet } from "@/types/type";
import { StyleSheet, Text, View, TextInput } from "react-native";
import { useEffect, useState } from "react";

// The exercise card is used to display the exercise and the sets
// It is used to modify the exercise and the sets
// ONLY delete or add a set to the end of the list
// TODO: add a button to delete the exercise
// TODO: add a button to add a set
// ?? Should I allow a user to change the order of the sets?
// ?? Should I allow a user to change the chosen unit combination?
export default function ExerciseCard({
  exercise,
  isActive,
}: {
  exercise: Exercise;
  isActive: boolean;
}) {
  //console.log("exercise in ExerciseCard", exercise);
  const [sets, setSets] = useState<ExerciseSet[]>([]);
  useEffect(() => {
    setSets(exercise.sets);
  }, [exercise]);

  return (
    <View style={[styles.ExerciseCardContainer, isActive && styles.activeItem]}>
      <Text>{exercise.exercise_name}</Text>
      <View style={styles.SetCardContainer}>
        {sets.map((set) => (
          <SetCard
            key={set.id}
            set={set}
            options={{
              track_reps: exercise.track_reps,
              track_weight: exercise.track_weight,
              track_time: exercise.track_time,
              track_distance: exercise.track_distance,
            }}
          />
        ))}
      </View>
    </View>
  );
}

// SetCard is used to display the set and the options
// It is used to modify the set and the options
// TODO: update the set values when the user changes the values in real time
function SetCard({
  set,
  options,
}: {
  set: ExerciseSet;
  options: {
    track_reps: number;
    track_weight: number;
    track_time: number;
    track_distance: number;
  };
}) {
  const [values, setValues] = useState({
    reps: set.reps,
    weight: set.weight,
    duration: set.duration,
    distance: set.distance,
  });

  return (
    <View style={styles.SetCardInputContainer}>
      <Text>Set {set.set_order}</Text>
      <View style={styles.SetCardInputOptionsContainer}>
        {options.track_reps === 1 && (
          <View style={styles.inputContainer}>
            <Text style={styles.SetCardInputLabel}>Reps</Text>
            <TextInput
              style={styles.SetCardInput}
              value={values.reps?.toString() || ""}
              onChangeText={(text) =>
                setValues({ ...values, reps: parseInt(text) })
              }
            />
          </View>
        )}
        {options.track_reps === 1 && options.track_weight === 1 && (
          <Text style={{ bottom: -10, fontSize: 20 }}>x</Text>
        )}
        {options.track_weight === 1 && (
          <View style={styles.inputContainer}>
            <Text style={styles.SetCardInputLabel}>wt.</Text>
            <TextInput
              style={styles.SetCardInput}
              value={values.weight?.toString() || ""}
              onChangeText={(text) =>
                setValues({ ...values, weight: parseInt(text) })
              }
            />
          </View>
        )}
        {options.track_time === 1 && (
          <View style={styles.inputContainer}>
            <Text style={styles.SetCardInputLabel}>Time</Text>
            <TextInput
              style={styles.SetCardInput}
              value={values.duration?.toString() || ""}
              onChangeText={(text) =>
                setValues({ ...values, duration: parseInt(text) })
              }
            />
          </View>
        )}
        {options.track_distance === 1 && (
          <View style={styles.inputContainer}>
            <Text style={styles.SetCardInputLabel}>Dist.</Text>
            <TextInput
              style={styles.SetCardInput}
              value={values.distance?.toString() || ""}
              onChangeText={(text) =>
                setValues({ ...values, distance: parseInt(text) })
              }
            />
          </View>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  ExerciseCardContainer: {
    padding: 10,
    borderWidth: 1,
    borderColor: "black",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    minHeight: 60, // Ensure minimum height to prevent layout issues
    flex: 1,
  },
  SetCardContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    paddingTop: 10,
    alignItems: "flex-start", // Ensure proper alignment
  },
  SetCardInputOptionsContainer: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 3,
    paddingTop: 0,
    alignItems: "center", // Ensure proper alignment
  },
  SetCardInputContainer: {
    padding: 5,
    borderWidth: 1,
    borderColor: "black",
    backgroundColor: "white",
    borderRadius: 5,
    minWidth: 50, // Ensure minimum width for proper layout
  },
  SetCardInput: {
    width: 45,
    textAlign: "right",
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 5,
    padding: 5,
    backgroundColor: "white",
  },
  SetCardInputLabel: {
    width: 45,
    textAlign: "left",
  },
  activeItem: {
    borderColor: "blue",
  },
  inputContainer: {
    flexDirection: "column",
    paddingTop: 0,
  },
});
