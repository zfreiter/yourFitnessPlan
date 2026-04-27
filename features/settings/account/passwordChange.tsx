import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
} from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import Toast from "react-native-toast-message";
import { useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";

const checkAndSetError = async (
  newPassword: string,
  confirmNewPassword: string,
  setErrors: React.Dispatch<
    React.SetStateAction<{
      newPassword: string | null;
      confirmNewPassword: string | null;
    }>
  >,
): Promise<"error" | "success"> => {
  if (newPassword.length === 0 || confirmNewPassword.length === 0) {
    setErrors({
      newPassword:
        newPassword.length === 0 ? "New password is required." : null,
      confirmNewPassword:
        confirmNewPassword.length === 0
          ? "Confirm password is required."
          : null,
    });
    return "error";
  }
  if (newPassword.length < 6) {
    setErrors((p) => ({
      ...p,
      newPassword: "Password must be at least 6 characters.",
    }));
    return "error";
  }
  if (newPassword !== confirmNewPassword) {
    setErrors((p) => ({ ...p, confirmNewPassword: "Passwords do not match." }));
    return "error";
  }
  return "success";
};

export default function PasswordChange() {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showConfirmedPassword, setShowConfirmedPassword] = useState(false);
  const [errors, setErrors] = useState<{
    newPassword: string | null;
    confirmNewPassword: string | null;
  }>({ newPassword: null, confirmNewPassword: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { theme } = useColorTheme();

  const closeModal = () => {
    setNewPassword("");
    setConfirmNewPassword("");
    setErrors({ newPassword: null, confirmNewPassword: null });
    setModalVisible(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const response = await checkAndSetError(
      newPassword,
      confirmNewPassword,
      setErrors,
    );
    if (response === "error") {
      setIsSubmitting(false);
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      Toast.show({
        type: "success",
        text1: "Password updated",
        text2: "Please log in again with your new password.",
      });
      setModalVisible(false);
      await supabase.auth.signOut();
    } catch {
      Toast.show({ type: "error", text1: "Failed to update password" });
    } finally {
      setIsSubmitting(false);
    }
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
          Update Password
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
                Update Password
              </Text>

              {/* New Password */}
              <View style={{ gap: theme.spacing.label }}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { color: theme.color.textSecondary },
                  ]}
                >
                  NEW PASSWORD
                </Text>
                <View style={{ position: "relative" }}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.color.input,
                        borderColor: errors.newPassword
                          ? theme.color.danger
                          : focusedField === "new"
                            ? theme.color.accentActive
                            : theme.color.border,
                        color: theme.color.textPrimary,
                        paddingRight: 44,
                      },
                    ]}
                    placeholder="Enter new password"
                    placeholderTextColor={theme.color.placeholderColor}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setFocusedField("new")}
                    onBlur={() => setFocusedField(null)}
                    value={newPassword}
                    onChangeText={(t) => setNewPassword(t.trim())}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Text>{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
                  </Pressable>
                </View>
                {errors.newPassword && (
                  <Text
                    style={[styles.errorText, { color: theme.color.danger }]}
                  >
                    {errors.newPassword}
                  </Text>
                )}
              </View>

              {/* Confirm Password */}
              <View style={{ gap: theme.spacing.label }}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { color: theme.color.textSecondary },
                  ]}
                >
                  CONFIRM PASSWORD
                </Text>
                <View style={{ position: "relative" }}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.color.input,
                        borderColor: errors.confirmNewPassword
                          ? theme.color.danger
                          : focusedField === "confirm"
                            ? theme.color.accentActive
                            : theme.color.border,
                        color: theme.color.textPrimary,
                        paddingRight: 44,
                      },
                    ]}
                    placeholder="Confirm new password"
                    placeholderTextColor={theme.color.placeholderColor}
                    secureTextEntry={!showConfirmedPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setFocusedField("confirm")}
                    onBlur={() => setFocusedField(null)}
                    value={confirmNewPassword}
                    onChangeText={(t) => setConfirmNewPassword(t.trim())}
                  />
                  <Pressable
                    onPress={() =>
                      setShowConfirmedPassword(!showConfirmedPassword)
                    }
                    style={styles.eyeButton}
                  >
                    <Text>{showConfirmedPassword ? "👁️" : "👁️‍🗨️"}</Text>
                  </Pressable>
                </View>
                {errors.confirmNewPassword && (
                  <Text
                    style={[styles.errorText, { color: theme.color.danger }]}
                  >
                    {errors.confirmNewPassword}
                  </Text>
                )}
              </View>

              <Pressable
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.submitButton,
                  {
                    backgroundColor: pressed
                      ? theme.color.accentStrong
                      : theme.color.accent,
                  },
                ]}
              >
                <Text
                  style={[styles.submitText, { fontFamily: theme.fonts.body }]}
                >
                  {isSubmitting ? "Submitting..." : "Submit Password Change"}
                </Text>
              </Pressable>
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
  triggerText: { fontSize: 15 },
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
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  input: { borderWidth: 1, padding: 10, borderRadius: 8, fontSize: 15 },
  eyeButton: { position: "absolute", right: 10, top: 12 },
  errorText: { fontSize: 12 },
  submitButton: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  submitText: { fontSize: 15, color: "#fff", fontWeight: "600" },
});
