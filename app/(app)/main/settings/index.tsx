import { Pressable, Text, View, StyleSheet } from "react-native";
import { useAuth } from "@/context/authContext";
import { useRouter } from "expo-router";
import { useColorTheme } from "@/context/colorThemeContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function Index() {
  const { signOut } = useAuth();
  const { theme } = useColorTheme();
  const router = useRouter();

  const links = [
    { title: "Account", path: "./settings/account", icon: "manage-accounts" },
    { title: "Profile", path: "./settings/profile", icon: "person" },
    {
      title: "Training Stats",
      path: "./settings/trainingStats",
      icon: "fitness-center",
    },
    { title: "Preferences", path: "./settings/preferences", icon: "tune" },
  ] as const;

  return (
    <View
      style={{
        flex: 1,
        paddingTop: theme.spacing.screenPadding,
        paddingHorizontal: theme.spacing.screenPadding,
        paddingBottom: theme.spacing.screenPadding,
        backgroundColor: theme.color.background,
        gap: 8,
      }}
    >
      <Text style={[styles.sectionLabel, { color: theme.color.textSecondary }]}>
        SETTINGS
      </Text>

      {links.map((link, index) => (
        <Pressable
          key={`${link.title}-${index}`}
          onPress={() => router.push(link.path)}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: pressed
                ? theme.color.surface2
                : theme.color.surface,
              borderColor: theme.color.border,
            },
          ]}
        >
          <MaterialIcons
            name={link.icon as any}
            size={18}
            color={theme.color.accent}
          />
          <Text
            style={[
              styles.rowText,
              { color: theme.color.textPrimary, fontFamily: theme.fonts.body },
            ]}
          >
            {link.title}
          </Text>
        </Pressable>
      ))}

      <View style={{ flex: 1 }} />

      <Pressable
        style={({ pressed }) => [
          styles.signOutButton,
          {
            borderColor: theme.color.border,
            backgroundColor: pressed
              ? theme.color.surface2
              : theme.color.surface,
          },
        ]}
        onPress={async () => await signOut()}
      >
        <Text style={[styles.signOutText, { color: theme.color.danger }]}>
          Sign Out
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 10,
  },
  rowText: {
    fontSize: 15,
  },
  signOutButton: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
