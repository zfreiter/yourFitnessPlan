import { Alert, View, Text, TextInput, Pressable, Modal } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";
import { useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";

export default function NameChange() {
  const { user, setUser } = useAuth();
  const firstName = user?.full_name?.split(" ")[0] || "";
  const lastName = user?.full_name?.split(" ")[1] || "";
  const [modalVisible, setModalVisible] = useState(false);
  const [updateFirstName, setUpdateFirstName] = useState(firstName);
  const [updateLastName, setUpdateLastName] = useState(lastName);
  const [emailError, setEmailError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFirstNameFocused, setIsFirstNameFocused] = useState<boolean>(false);
  const [isLastNameFocused, setIsLastNameFocused] = useState<boolean>(false);

  const { theme } = useColorTheme();

  const updateFirstNameHandler = (text: string) => {
    setUpdateFirstName(text.trim());
  };

  const updateLastNameHandler = (text: string) => {
    setUpdateLastName(text.trim());
  };

  const handleSubmit = async () => {
    if (updateFirstName !== firstName && updateLastName !== lastName) {
      return;
    }

    setIsSubmitting(true);

    try {
      const fullName = `${updateFirstName} ${updateLastName}`.trim();
      const { data, error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user?.id)
        .select();
      if (error) throw error;

      console.log("Name update data:", data);
      setUser((prevUser) =>
        prevUser ? { ...prevUser, full_name: fullName } : prevUser,
      );
      Toast.show({
        type: "success",
        text1: "Name updated successfully",
      });
      setModalVisible(false);
    } catch (error) {
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
          <Text style={{ color: theme.color.textPrimary }}>Update Name</Text>
        )}
      </Pressable>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center", // Vertical centering
            alignItems: "center", // Horizontal centering
          }}
          onPress={() => setModalVisible(false)}
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
              <Pressable style={{}} onPress={() => setModalVisible(false)}>
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
                Name update
              </Text>
              <View style={{ gap: theme.spacing.label }}>
                <Text style={{ color: theme.color.textSecondary }}>
                  First Name:
                </Text>
                <TextInput
                  style={{
                    padding: 10,
                    backgroundColor: theme.color.input,
                    borderColor: emailError
                      ? theme.color.danger
                      : isFirstNameFocused
                        ? theme.color.accent
                        : theme.color.border,
                    borderWidth: 1,
                    borderRadius: 8,
                    color: theme.color.textPrimary,
                  }}
                  placeholder="Enter new first name"
                  placeholderTextColor={theme.color.placeholderColor}
                  keyboardType="default"
                  autoCapitalize="words"
                  autoCorrect={false}
                  textContentType="name"
                  returnKeyType="next"
                  onFocus={() => setIsFirstNameFocused(true)}
                  onBlur={() => {
                    setIsFirstNameFocused(false);
                  }}
                  value={updateFirstName}
                  onChangeText={updateFirstNameHandler}
                />
                {emailError.length > 0 ? (
                  <Text style={{ color: theme.color.danger }}>
                    {emailError}
                  </Text>
                ) : null}
              </View>

              <View style={{ gap: theme.spacing.label }}>
                <Text style={{ color: theme.color.textSecondary }}>
                  First Name:
                </Text>
                <TextInput
                  style={{
                    padding: 10,
                    backgroundColor: theme.color.input,
                    borderColor: emailError
                      ? theme.color.danger
                      : isLastNameFocused
                        ? theme.color.accent
                        : theme.color.border,
                    borderWidth: 1,
                    borderRadius: 8,
                    color: theme.color.textPrimary,
                  }}
                  placeholder="Enter new last name"
                  placeholderTextColor={theme.color.placeholderColor}
                  keyboardType="default"
                  autoCapitalize="words"
                  autoCorrect={false}
                  textContentType="name"
                  returnKeyType="next"
                  onFocus={() => setIsLastNameFocused(true)}
                  onBlur={() => {
                    setIsLastNameFocused(false);
                  }}
                  value={updateLastName}
                  onChangeText={updateLastNameHandler}
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
