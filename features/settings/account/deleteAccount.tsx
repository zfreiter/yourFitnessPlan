import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
} from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Checkbox } from "expo-checkbox";

export default function DeleteAccount() {
  const [modalVisible, setModalVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDeleteChecked, setIsDeleteChecked] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [confirmationError, setConfirmationError] = useState("");
  const { theme } = useColorTheme();

  const closeModal = () => setModalVisible(false);

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
            { color: theme.color.danger, fontFamily: theme.fonts.body },
          ]}
        >
          Delete Account
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
                Delete Account
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
                This will permanently delete your account and all your data,
                including your profile, workouts, and uploaded files.
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
                You will have 30 days to recover your account by logging back
                in.
              </Text>

              <Pressable
                style={styles.checkRow}
                onPress={() => setIsDeleteChecked((v) => !v)}
              >
                <Checkbox
                  style={styles.checkbox}
                  value={isDeleteChecked}
                  onValueChange={setIsDeleteChecked}
                  color={isDeleteChecked ? theme.color.danger : undefined}
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
                  I understand this is permanent
                </Text>
              </Pressable>

              <View style={{ gap: theme.spacing.label }}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { color: theme.color.textSecondary },
                  ]}
                >
                  TYPE "DELETE" TO CONFIRM
                </Text>
                <TextInput
                  placeholder="DELETE"
                  placeholderTextColor={theme.color.placeholderColor}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  value={confirmationText}
                  onChangeText={setConfirmationText}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.color.input,
                      borderColor: confirmationError
                        ? theme.color.danger
                        : isFocused
                          ? theme.color.accentActive
                          : theme.color.border,
                      color: theme.color.textPrimary,
                    },
                  ]}
                />
                {confirmationError.length > 0 && (
                  <Text
                    style={[styles.errorText, { color: theme.color.danger }]}
                  >
                    {confirmationError}
                  </Text>
                )}
              </View>

              <View style={styles.buttonRow}>
                <Pressable
                  onPress={closeModal}
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
                  onPress={() => {}}
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor: pressed ? "#cc0000" : theme.color.danger,
                      borderColor: theme.color.danger,
                    },
                  ]}
                >
                  <Text style={[styles.actionText, { color: "#fff" }]}>
                    Delete Account
                  </Text>
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
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  input: { borderWidth: 1, padding: 10, borderRadius: 8, fontSize: 15 },
  errorText: { fontSize: 12 },
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
