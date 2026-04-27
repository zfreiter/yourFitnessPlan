import { ExerciseSet } from "@/types/type";
import { StyleSheet, Text, View } from "react-native";
import { useFieldArray, useFormContext } from "react-hook-form";
import SetInputs from "./setInputs";
import { useState } from "react";
import { useColorTheme } from "@/context/colorThemeContext";

export default function SetCard({
  set,
  exerciseIndex,
  setIndex,
  options,
}: {
  set: ExerciseSet;
  exerciseIndex: number;
  setIndex: number;
  options: {
    track_reps: number;
    track_weight: number;
    track_time: number;
    track_distance: number;
  };
}) {
  const { watch } = useFormContext();
  const { theme } = useColorTheme();
  const { remove } = useFieldArray({
    name: `exercises.${exerciseIndex}.sets`,
  });

  const [isModalVisible, setIsModalVisible] = useState(false);
  const sets = watch(`exercises.${exerciseIndex}.sets`);
  const size = sets?.length || 0;

  return (
    <View
      style={[
        styles.SetCardInputContainer,
        {
          backgroundColor:
            setIndex % 2 === 0 ? theme.color.surface2 : "transparent",
        },
      ]}
    >
      <Text style={[styles.setLabel, { color: theme.color.textSecondary }]}>
        SET {setIndex + 1}
      </Text>

      <SetInputs
        set={set}
        exerciseIndex={exerciseIndex}
        setIndex={setIndex}
        options={options}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  SetCardInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  setLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    width: 44,
  },
});
