import { useState } from "react";
import { Alert, View, Text, TextInput, Pressable, Modal } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Checkbox } from "expo-checkbox";

export default function DeleteAccount() {
  const [modalVisible, setModalVisible] = useState(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isDeleteChecked, setIsDeleteChecked] = useState<boolean>(false);
  const [confirmationText, setConfirmationText] = useState<string>("");
  const [confirmationError, setConfirmationError] = useState<string>("");
  const { theme } = useColorTheme();

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
          <Text style={{ color: theme.color.textPrimary }}>Delete Account</Text>
        )}
      </Pressable>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
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
                Account Deletion Form
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.color.textPrimary,
                }}
              >
                This will permanently delete your account and all your data.
                This includes your profile, posts, comments, and uploaded files.
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.color.textPrimary,
                }}
              >
                You will have access to your account for 30 days after deletion,
                during which you can recover it by logging back in.
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Checkbox
                  style={{ marginRight: 8, height: 20, width: 20 }}
                  value={isDeleteChecked}
                  onValueChange={setIsDeleteChecked}
                  color={isDeleteChecked ? theme.color.accent : undefined}
                />
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.color.textPrimary,
                  }}
                >
                  I understand this is permanent
                </Text>
              </View>
              <View
                style={{
                  justifyContent: "space-between",
                  alignContent: "center",
                  gap: theme.spacing.label,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.color.textPrimary,
                  }}
                >
                  Type "DELETE" to confirm:
                </Text>
                <TextInput
                  placeholder="DELETE"
                  placeholderTextColor={theme.color.placeholderColor}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => {
                    setIsFocused(false);
                  }}
                  style={{
                    padding: 10,
                    backgroundColor: theme.color.input,
                    borderColor: confirmationError
                      ? theme.color.danger
                      : isFocused
                        ? theme.color.accent
                        : theme.color.border,
                    borderWidth: 1,
                    borderRadius: 8,
                    color: theme.color.textPrimary,
                  }}
                />
              </View>
              <View style={{ flexDirection: "row", gap: theme.spacing.label }}>
                <Pressable
                  onPress={() => setModalVisible(false)}
                  style={({ pressed }) => [
                    {
                      height: theme.spacing.button_height,
                      width: "48%",
                      backgroundColor: pressed
                        ? theme.color.warning
                        : theme.color.warning,
                      justifyContent: "center",
                      alignItems: "center",
                      borderRadius: 8,
                    },
                  ]}
                >
                  {({ pressed }) => (
                    <Text style={{ color: theme.color.textPrimary }}>
                      Cancel
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => {}}
                  style={({ pressed }) => [
                    {
                      height: theme.spacing.button_height,
                      width: "48%",
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
                      Delete Account
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
