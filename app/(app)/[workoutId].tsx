import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { Workout } from "@/types/type";
import { useWorkout } from "@/context/workoutContext";
import { useEffect, useState } from "react";
import ActiveWorkoutSession from "@/features/workout-session/components/activeWorkoutSession";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/authContext";

export default function WorkoutDetails() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const { workouts, deleteWorkout } = useWorkout();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const { theme } = useColorTheme();
  const { user } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    const findWorkout = () => {
      const foundWorkout = workouts.find((w: Workout) => w.id === workoutId);
      setWorkout(foundWorkout || null);
      setIsLoading(false);
    };

    if (workouts.length > 0) {
      findWorkout();
    }
  }, [workouts, workoutId]);

  useEffect(() => {
    navigation.setOptions({
      onMenuPress: () => setMenuVisible(true),
    });
  }, [navigation]);

  const handleDelete = async () => {
    if (!user) return;
    const result = await deleteWorkout(user?.id, workoutId);
    if (result.success) router.back();
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            padding: theme.spacing.screenPadding,
            backgroundColor: theme.color.background,
          },
        ]}
      >
        <Text style={styles.loadingText}>Getting your workout...</Text>
      </View>
    );
  }

  if (!workout) {
    return (
      <View
        style={[
          styles.container,
          {
            padding: theme.spacing.screenPadding,
            backgroundColor: theme.color.background,
          },
        ]}
      >
        <Text style={[styles.errorText, { color: theme.color.danger }]}>
          Workout not found
        </Text>
      </View>
    );
  }

  return (
    <>
      <View
        style={[
          styles.container,
          {
            padding: theme.spacing.screenPadding,
            backgroundColor: theme.color.background,
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={300}
        >
          <ActiveWorkoutSession workout={workout} />
        </KeyboardAvoidingView>
      </View>

      {/* Delete menu */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menu}>
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                { backgroundColor: pressed ? "#fff0f0" : "#fff" },
              ]}
              onPress={() => {
                setMenuVisible(false);
                setConfirmVisible(true);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="red" />
              <Text style={[styles.menuText, { color: "red" }]}>
                Delete Workout
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Confirm delete modal */}
      <Modal
        transparent
        visible={confirmVisible}
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setConfirmVisible(false)}
        >
          <View style={styles.confirmMenu}>
            <Text
              style={[styles.confirmTitle, { fontFamily: theme.fonts.heading }]}
            >
              Delete Workout?
            </Text>
            <Text style={styles.confirmSubtitle}>This cannot be undone.</Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.confirmButton,
                  styles.cancelButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.confirmButton,
                  styles.deleteButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => {
                  setConfirmVisible(false);
                  handleDelete();
                }}
              >
                <Ionicons name="trash-outline" size={16} color="#fff" />
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "black",
  },
  errorText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  menu: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 110,
    marginRight: 12,
    paddingVertical: 6,
    minWidth: 180,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderRadius: 12,
  },
  menuText: {
    fontSize: 15,
  },
  confirmMenu: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginTop: 110,
    marginRight: 12,
    padding: 20,
    minWidth: 220,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  confirmSubtitle: {
    fontSize: 13,
    color: "#888",
    marginBottom: 16,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 8,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  deleteButton: {
    backgroundColor: "red",
  },
  cancelText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  deleteText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
});
