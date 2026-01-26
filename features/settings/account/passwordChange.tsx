import { Alert, View, Text, TextInput, Pressable, Modal } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";
import { useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import { set } from "date-fns";
import { User } from "@/types/user/type";

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
    setErrors((prevErrors) => ({
      ...prevErrors,

      newPassword:
        newPassword.length === 0 ? "New password is required." : null,
      confirmNewPassword:
        confirmNewPassword.length === 0
          ? "Confirm new password is required."
          : null,
    }));
    return "error";
  }

  if (newPassword.length < 6) {
    setErrors((prevErrors) => ({
      ...prevErrors,
      newPassword: "New password must be at least 6 characters long.",
    }));
    return "error";
  }

  if (newPassword !== confirmNewPassword) {
    setErrors((prevErrors) => ({
      ...prevErrors,
      confirmNewPassword: "New passwords do not match.",
    }));
    return "error";
  }
  return "success";
};

export default function PasswordChange() {
  const { user, setUser } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showConfirmedPassword, setShowConfirmedPassword] = useState(false);
  const [errors, setErrors] = useState<{
    newPassword: string | null;
    confirmNewPassword: string | null;
  }>({
    newPassword: null,
    confirmNewPassword: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOldPasswordFocused, setIsOldPasswordFocused] =
    useState<boolean>(false);
  const [isNewPasswordFocused, setIsNewPasswordFocused] =
    useState<boolean>(false);
  const [isConfirmNewPasswordFocused, setIsConfirmNewPasswordFocused] =
    useState<boolean>(false);

  const { theme } = useColorTheme();

  const updateNewPasswordHandler = (text: string) => {
    setNewPassword(text.trim());
  };

  const updateConfirmNewPasswordHandler = (text: string) => {
    setConfirmNewPassword(text.trim());
  };
  const handleSubmit = async () => {
    setIsSubmitting(true);

    const response = await checkAndSetError(
      newPassword,
      confirmNewPassword,
      setErrors,
    );

    if (response === "error") {
      return;
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.log("Error updating password:", error);
        Toast.show({
          type: "error",
          text1: "Failed to update password",
        });
        return;
      }

      Toast.show({
        type: "success",
        text1: "Password updated successfully",
        text2: "Please log in again with your new password.",
      });
      setModalVisible(false);
      await supabase.auth.signOut();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to update password",
      });
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
          <Text style={{ color: theme.color.textPrimary }}>
            Update Password
          </Text>
        )}
      </Pressable>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setNewPassword("");
          setConfirmNewPassword("");
          setErrors({ newPassword: null, confirmNewPassword: null });
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
            setNewPassword("");
            setConfirmNewPassword("");
            setErrors({ newPassword: null, confirmNewPassword: null });
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
                  setNewPassword("");
                  setConfirmNewPassword("");
                  setErrors({ newPassword: null, confirmNewPassword: null });
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
                Password update
              </Text>

              <View style={{ position: "relative", gap: theme.spacing.label }}>
                <Text style={{ color: theme.color.textSecondary }}>
                  New Password:
                </Text>
                <TextInput
                  style={{
                    padding: 10,
                    backgroundColor: theme.color.input,
                    borderColor: errors.newPassword
                      ? theme.color.danger
                      : isNewPasswordFocused
                        ? theme.color.accent
                        : theme.color.border,
                    borderWidth: 1,
                    borderRadius: 8,
                    color: theme.color.textPrimary,
                  }}
                  placeholder="Enter New Password"
                  placeholderTextColor={theme.color.placeholderColor}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  onFocus={() => setIsNewPasswordFocused(true)}
                  onBlur={() => {
                    setIsNewPasswordFocused(false);
                  }}
                  value={newPassword}
                  onChangeText={updateNewPasswordHandler}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: 35,
                  }}
                >
                  <Text>{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
                </Pressable>
                {errors.newPassword ? (
                  <Text style={{ color: theme.color.danger }}>
                    {errors.newPassword}
                  </Text>
                ) : null}
              </View>

              <View style={{ position: "relative", gap: theme.spacing.label }}>
                <Text style={{ color: theme.color.textSecondary }}>
                  Confirm New Password:
                </Text>
                <TextInput
                  style={{
                    padding: 10,
                    backgroundColor: theme.color.input,
                    borderColor: errors.confirmNewPassword
                      ? theme.color.danger
                      : isConfirmNewPasswordFocused
                        ? theme.color.accent
                        : theme.color.border,
                    borderWidth: 1,
                    borderRadius: 8,
                    color: theme.color.textPrimary,
                  }}
                  placeholder="Confirm New Password"
                  placeholderTextColor={theme.color.placeholderColor}
                  secureTextEntry={!showConfirmedPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  onFocus={() => setIsConfirmNewPasswordFocused(true)}
                  onBlur={() => {
                    setIsConfirmNewPasswordFocused(false);
                  }}
                  value={confirmNewPassword}
                  onChangeText={updateConfirmNewPasswordHandler}
                />
                <Pressable
                  onPress={() =>
                    setShowConfirmedPassword(!showConfirmedPassword)
                  }
                  style={{
                    position: "absolute",
                    right: 10,
                    top: 35,
                  }}
                >
                  <Text>{showConfirmedPassword ? "👁️" : "👁️‍🗨️"}</Text>
                </Pressable>
                {errors.confirmNewPassword ? (
                  <Text style={{ color: theme.color.danger }}>
                    {errors.confirmNewPassword}
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
                    Submit name change
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
