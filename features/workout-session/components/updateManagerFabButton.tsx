import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import { useFormContext, useWatch } from "react-hook-form";
import { Workout } from "@/types/interfaces/types";
import { emptyCircuitMessages } from "@/utils/circuitValidation";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useWorkoutSession } from "@/context/WorkoutSessionContext";

export default function UpdateManagerFabButton() {
  const { theme } = useColorTheme();
  const { saveWorkout, isUpdateNeeded, isSaving, saveError } =
    useWorkoutSession();
  const { control } = useFormContext<Workout>();
  const [exercises, circuits] = useWatch({ control, name: ["exercises", "circuit_rounds"] });
  const messages = emptyCircuitMessages(exercises, circuits);

  const isActive = isUpdateNeeded;
  const disabled = !isActive || isSaving || messages.length > 0;

  const handlePress = async () => {
    if (disabled) {
      console.log("Update FAB not active");
      return;
    }
    const result = await saveWorkout();
    if (!result.success) {
      console.error("Save failed", saveError);
    }
  };

  return (
    <View style={styles.fab} pointerEvents="box-none">
      {messages.map(message => <Text key={message} accessibilityRole="alert" accessibilityLiveRegion="polite"
        style={{ color: theme.color.danger, backgroundColor: theme.color.surface, padding: 8, borderRadius: 8 }}>{message}</Text>)}
      <Pressable onPress={handlePress} disabled={disabled} accessibilityRole="button" accessibilityLabel="Save workout"
        accessibilityState={{ disabled, busy: isSaving }}>
        {isSaving ? (
          <ActivityIndicator
            size={64}
            color={theme.color.disabled}
            style={{ zIndex: 5, elevation: 5 }}
          />
        ) : (
          <MaterialIcons
            name="change-circle"
            style={{ zIndex: 5, elevation: 5 }}
            size={64}
            color={disabled ? theme.color.disabled : theme.color.accentActive}
          />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    left: 20,
    alignItems: "flex-end",
    gap: 8,
  },
});
