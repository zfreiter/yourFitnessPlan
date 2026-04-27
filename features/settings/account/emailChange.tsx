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

export default function EmailChange() {
  const [modalVisible, setModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { theme } = useColorTheme();

  const validateEmail = (email: string) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());

  const closeModal = () => {
    setNewEmail("");
    setEmailError("");
    setModalVisible(false);
  };

  const handleSubmit = async () => {
    if (!newEmail || !validateEmail(newEmail)) {
      setEmailError("Please enter a valid email");
      return;
    }
    setEmailError("");
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });
      if (error) throw error;
      Toast.show({
        type: "success",
        text1: "Email update requested",
        text2: "Check your email to confirm the change.",
      });
      await supabase.auth.signOut();
    } catch {
      setEmailError("Failed to update email");
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
          Update Email
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
                Email Change
              </Text>

              <View style={{ gap: theme.spacing.label }}>
                <Text
                  style={[
                    styles.fieldLabel,
                    { color: theme.color.textSecondary },
                  ]}
                >
                  NEW EMAIL
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.color.input,
                      borderColor: emailError
                        ? theme.color.danger
                        : isFocused
                          ? theme.color.accentActive
                          : theme.color.border,
                      color: theme.color.textPrimary,
                    },
                  ]}
                  placeholder="Enter new email"
                  placeholderTextColor={theme.color.placeholderColor}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  value={newEmail}
                  onChangeText={setNewEmail}
                />
                {emailError.length > 0 && (
                  <Text
                    style={[styles.errorText, { color: theme.color.danger }]}
                  >
                    {emailError}
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
                  {isSubmitting ? "Submitting..." : "Submit Email Change"}
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
  modalTitle: { fontSize: 18, textAlign: "center" },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  input: { borderWidth: 1, padding: 10, borderRadius: 8, fontSize: 15 },
  errorText: { fontSize: 12 },
  submitButton: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  submitText: { fontSize: 15, color: "#fff", fontWeight: "600" },
});
