import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { useColorTheme } from "@/context/colorThemeContext";
import { Controller, useFormContext } from "react-hook-form";
import { useEffect, useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useWorkoutSession } from "@/context/WorkoutSessionContext";

export default function UpdateManagerFabButton() {
  const {
    formState: { isDirty, dirtyFields },
    getValues,
    reset,
  } = useFormContext();
  const [isActive, setIsActive] = useState<boolean>(false);
  const { theme } = useColorTheme();
  const { saveWorkout, isUpdatedNeeeded } = useWorkoutSession();
  const values = getValues();

  useEffect(() => {
    if (isUpdatedNeeeded) {
      setIsActive(true);
    }
  }, [isUpdatedNeeeded]);

  return (
    <Pressable
      style={StyleSheet.flatten([styles.fab, {}])}
      onPress={() => {
        if (!isActive) {
          console.log("Update FAB not active");
          return;
        }

        saveWorkout(values);
        const updatedValues = getValues();
        reset(updatedValues);
        setIsActive(false);
      }}
    >
      <MaterialIcons
        name="change-circle"
        style={{ zIndex: 5, elevation: 5 }}
        size={64}
        color={isActive ? theme.color.accentActive : theme.color.disabled}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 28,
    right: 20,
  },
  text: {
    color: "white",
    fontSize: 32,
    lineHeight: 32,
  },
});
