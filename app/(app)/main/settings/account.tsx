import { View, Text, Button, Pressable, StyleSheet } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import { useRouter } from "expo-router";
import EmailChange from "@/features/settings/account/emailChange";
import NameChange from "@/features/settings/account/nameChange";
import PasswordChange from "@/features/settings/account/passwordChange";
import DeleteAccount from "@/features/settings/account/deleteAccount";

export default function Account() {
  const { theme } = useColorTheme();
  const router = useRouter();
  return (
    <View
      style={[
        styles.pageContainer,
        { backgroundColor: theme.color.background, gap: theme.spacing.md },
      ]}
    >
      <Text
        style={{
          fontSize: 20,
          color: theme.color.textPrimary,
          fontWeight: "bold",
          textAlign: "center",
          marginVertical: theme.spacing.lg,
        }}
      >
        Account
      </Text>
      <EmailChange />
      <NameChange />
      <PasswordChange />
      <DeleteAccount />
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
  },
});
