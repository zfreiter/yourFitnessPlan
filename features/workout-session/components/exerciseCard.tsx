import { Exercise, ExerciseSet } from "@/types/type";
import { StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";

export default function ExerciseCard({ exercise }: { exercise: Exercise }) {
  //console.log("exercise in ExerciseCard", exercise);
  const [sets, setSets] = useState<ExerciseSet[]>([]);
  useEffect(() => {
    setSets(exercise.sets);
  }, [exercise]);
  //console.log("sets in ExerciseCard", sets);
  return (
    <View style={styles.container}>
      <Text>{exercise.exercise_name}</Text>
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
  );
}

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
  console.log("set in SetCard", set, options);
  return (
    <View style={styles.setContainer}>
      <Text>Set {set.id}</Text>
      {options.track_reps && <Text>Reps: {set.reps || 0}</Text>}
      {options.track_weight && <Text>Weight: {set.weight || 0}</Text>}
      {options.track_time && <Text>Time: {set.duration || 0}</Text>}
      {options.track_distance && <Text>Distance: {set.distance || 0}</Text>}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderWidth: 1,
    borderColor: "black",
  },
  setContainer: {
    padding: 10,
    borderWidth: 1,
    borderColor: "black",
  },
});
