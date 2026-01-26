import { Alert, View, Text, TextInput, Pressable, Modal } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";
import { useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { supabase } from "@/lib/supabaseClient";

export default function EmailChange() {
  const [modalVisible, setModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const { theme } = useColorTheme();

  const validateEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  };

  const handleEmailChange = (text: string) => {
    setNewEmail(text);
  };

  const handleSubmit = async () => {
    if (!newEmail || !validateEmail(newEmail)) {
      setEmailError("Please enter a valid email");
      console.log("Invalid email:", newEmail.length, validateEmail(newEmail));
      return;
    }
    setEmailError("");
    setIsSubmitting(true);
    console.log("Submitting email change to:", newEmail);
    try {
      const { error, data } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });
      if (error) throw error;
      // Success - show message then log out
      console.log("Email update data:", data);
      Toast.show({
        type: "success",
        text1: "Email update requested",
        text2: "Please check your email to confirm the change.",
      });

      await supabase.auth.signOut();
    } catch (error) {
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
          {
            height: theme.spacing.button_height,
            backgroundColor: pressed
              ? theme.color.accentStrong
              : theme.color.surface,
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.color.accent,
            borderRadius: 8,
          },
        ]}
      >
        {({ pressed }) => (
          <Text style={{ color: theme.color.textPrimary }}>Update Email</Text>
        )}
      </Pressable>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setNewEmail("");
          setEmailError("");
          setModalVisible(false);
        }}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center", // Vertical centering
            alignItems: "center", // Horizontal centering
          }}
          onPress={() => {
            setNewEmail("");
            setEmailError("");
            setModalVisible(false);
          }}
        >
          <Pressable
            style={{ width: "100%", padding: 20 }}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                flexDirection: "column",
                gap: theme.spacing.lg,
                backgroundColor: theme.color.surface,
                borderColor: theme.color.border,
                borderWidth: 1,
                padding: theme.spacing.lg,
                borderRadius: 10,
                width: "100%",
              }}
            >
              <Pressable
                style={{}}
                onPress={() => {
                  setNewEmail("");
                  setEmailError("");
                  setModalVisible(false);
                }}
              >
                <MaterialIcons
                  name="cancel"
                  size={30}
                  style={{ alignSelf: "flex-end" }}
                  color={theme.color.accent}
                />
              </Pressable>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  textAlign: "center",
                  color: theme.color.textPrimary,
                }}
              >
                Email change form
              </Text>
              <View style={{ gap: theme.spacing.label }}>
                <Text style={{ color: theme.color.textSecondary }}>
                  New Email:
                </Text>
                <TextInput
                  style={{
                    padding: 10,
                    backgroundColor: theme.color.input,
                    borderColor: emailError
                      ? theme.color.danger
                      : isFocused
                        ? theme.color.accent
                        : theme.color.border,
                    borderWidth: 1,
                    borderRadius: 8,
                    color: theme.color.textPrimary,
                  }}
                  placeholder="Enter new email"
                  placeholderTextColor={theme.color.placeholderColor}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => {
                    setIsFocused(false);
                  }}
                  value={newEmail}
                  onChangeText={handleEmailChange}
                />
                {emailError.length > 0 ? (
                  <Text style={{ color: theme.color.danger }}>
                    {emailError}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={handleSubmit}
                style={({ pressed }) => [
                  {
                    height: theme.spacing.button_height,
                    backgroundColor: pressed
                      ? theme.color.accentStrong
                      : theme.color.accent,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 8,
                  },
                ]}
              >
                {({ pressed }) => (
                  <Text style={{ color: theme.color.textPrimary }}>
                    Submit Email Change
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
