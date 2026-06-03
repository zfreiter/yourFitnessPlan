import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import { useFormContext } from "react-hook-form";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useWorkoutSession } from "@/context/WorkoutSessionContext";

export default function UpdateManagerFabButton() {
  const { theme } = useColorTheme();
  const { saveWorkout, isUpdateNeeded, isSaving, saveError } =
    useWorkoutSession();
  const {
    formState: { isDirty },
  } = useFormContext();

  const isActive = isUpdateNeeded;

  const handlePress = async () => {
    if (!isActive || isSaving) {
      console.log("Update FAB not active");
      return;
    }
    const result = await saveWorkout();
    if (!result.success) {
      console.error("Save failed", saveError);
    }
  };

  return (
    <Pressable style={styles.fab} onPress={handlePress} disabled={isSaving}>
      {isSaving ? (
        <ActivityIndicator
          size={64}
          color={theme.color.accentActive}
          style={{ zIndex: 5, elevation: 5 }}
        />
      ) : (
        <MaterialIcons
          name="change-circle"
          style={{ zIndex: 5, elevation: 5 }}
          size={64}
          color={isActive ? theme.color.accentActive : theme.color.disabled}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
  },
});
