import { View, Text, Pressable } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import EmailChange from "@/features/settings/account/emailChange";
//import NameChange from "@/features/settings/account/nameChange";
import PasswordChange from "@/features/settings/account/passwordChange";
import DeleteAccount from "@/features/settings/account/deleteAccount";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import RefreshWorkouts from "@/features/settings/account/refreshWorkouts";
export default function Account() {
  const { theme } = useColorTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.color.background,
        gap: theme.spacing.md,
        padding: theme.spacing.screenPadding,
      }}
    >
      <EmailChange />
      {/* <NameChange /> */}
      <PasswordChange />
      <RefreshWorkouts />
      <DeleteAccount />
    </View>
  );
}
