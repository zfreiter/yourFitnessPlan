import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Checkbox } from "expo-checkbox";
import { useSync } from "@/context/SyncContext";
import { useWorkout } from "@/context/workoutContext";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RefreshWorkouts() {
  const [modalVisible, setModalVisible] = useState(false);
  const [isConfirmChecked, setIsConfirmChecked] = useState(false);
  const { theme } = useColorTheme();
  const { refreshWorkouts, isSyncing } = useSync();
  const { reloadWorkouts } = useWorkout();

  const closeModal = () => {
    setModalVisible(false);
    setIsConfirmChecked(false);
  };

  const REFRESH_COOLDOWN_MS = 1000 * 60 * 15; // 15 minutes
  const REFRESH_KEY = "last_workout_refresh";

  const handleRefetch = async () => {
    const last = await AsyncStorage.getItem(REFRESH_KEY);
    if (last) {
      const diff = Date.now() - parseInt(last);
      if (diff < REFRESH_COOLDOWN_MS) {
        const minutesLeft = Math.ceil((REFRESH_COOLDOWN_MS - diff) / 60000);
        Toast.show({
          type: "info",
          text1: "Please wait",
          text2: `You can refresh again in ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}`,
        });
        closeModal();
        return;
      }
    }

    await refreshWorkouts();
    await reloadWorkouts();
    await AsyncStorage.setItem(REFRESH_KEY, Date.now().toString());
    closeModal();
  };

  return (
    <View>
      <Pressable
        onPress={() => setModalVisible(true)}
        style={({ pressed }) => [
          styles.triggerButton,
          {
            backgroundColor: pressed
              ? theme.color.surface2
              : theme.color.surface,
            borderColor: theme.color.border,
          },
        ]}
      >
        <Text
          style={[
            styles.triggerText,
            { color: theme.color.textPrimary, fontFamily: theme.fonts.body },
          ]}
        >
          Refresh Workouts
        </Text>
      </Pressable>

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <Pressable style={styles.backdrop} onPress={closeModal}>
          <Pressable
            style={styles.sheetWrapper}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: theme.color.surface,
                  borderColor: theme.color.border,
                },
              ]}
            >
              <Pressable onPress={closeModal} style={styles.closeButton}>
                <MaterialIcons
                  name="cancel"
                  size={24}
                  color={theme.color.textSecondary}
                />
              </Pressable>

              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: theme.color.textPrimary,
                    fontFamily: theme.fonts.heading,
                  },
                ]}
              >
                Refresh Workouts
              </Text>

              <Text
                style={[
                  styles.bodyText,
                  {
                    color: theme.color.textPrimary,
                    fontFamily: theme.fonts.body,
                  },
                ]}
              >
                This will clear all locally stored workout data and re-fetch
                everything from the server.
              </Text>

              <Text
                style={[
                  styles.bodyText,
                  {
                    color: theme.color.textSecondary,
                    fontFamily: theme.fonts.body,
                  },
                ]}
              >
                Any unsynced local changes will be pushed to the server first
                before the refresh begins.
              </Text>

              <Pressable
                style={styles.checkRow}
                onPress={() => setIsConfirmChecked((v) => !v)}
              >
                <Checkbox
                  style={styles.checkbox}
                  value={isConfirmChecked}
                  onValueChange={setIsConfirmChecked}
                  color={isConfirmChecked ? theme.color.accent : undefined}
                />
                <Text
                  style={[
                    styles.checkLabel,
                    {
                      color: theme.color.textPrimary,
                      fontFamily: theme.fonts.body,
                    },
                  ]}
                >
                  I understand local data will be replaced
                </Text>
              </Pressable>

              <View style={styles.buttonRow}>
                <Pressable
                  onPress={closeModal}
                  disabled={isSyncing}
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor: pressed
                        ? theme.color.surface2
                        : theme.color.surface,
                      borderColor: theme.color.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.actionText,
                      { color: theme.color.textPrimary },
                    ]}
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleRefetch}
                  disabled={!isConfirmChecked || isSyncing}
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor:
                        !isConfirmChecked || isSyncing
                          ? theme.color.disabled
                          : pressed
                            ? theme.color.accentActive
                            : theme.color.accent,
                      borderColor:
                        !isConfirmChecked || isSyncing
                          ? theme.color.disabled
                          : theme.color.accent,
                    },
                  ]}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.actionText, { color: "#fff" }]}>
                      Refresh
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  triggerButton: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
  },
  triggerText: { fontSize: 15, fontWeight: "600" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheetWrapper: { width: "100%", padding: 20 },
  sheet: { gap: 16, borderWidth: 1, padding: 20, borderRadius: 10 },
  closeButton: { alignSelf: "flex-end" },
  modalTitle: { fontSize: 18, textAlign: "center", fontWeight: "700" },
  bodyText: { fontSize: 14, lineHeight: 20 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: { height: 20, width: 20 },
  checkLabel: { fontSize: 14 },
  buttonRow: { flexDirection: "row", gap: 12 },
  actionButton: {
    flex: 1,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
  },
  actionText: { fontSize: 15, fontWeight: "600" },
});
