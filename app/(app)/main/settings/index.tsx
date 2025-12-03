import { Button, Pressable, Text, View } from "react-native";
import { useAuth } from "@/context/authContext";
import { Link, useRouter } from "expo-router";
import { useColorTheme } from "@/context/colorThemeContext";

export default function Index() {
  const { signOut } = useAuth();
  const { theme } = useColorTheme();
  const router = useRouter();

  const links = [
    { title: "Account", path: "./settings/account" },
    { title: "Workout Data", path: "./settings/workout-data" },
    { title: "Profile", path: "./settings/profile" },
    { title: "Preferences", path: "./settings/preferences" },
  ] as const;

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 20,
        gap: 10,
        backgroundColor: theme.background,
      }}
    >
      {links.map((link, index) => (
        <Link key={`${link.title}-${index}`} href={link.path} asChild>
          <Pressable
            style={{
              padding: 10,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 5,
            }}
          >
            <Text style={{ color: theme.textPrimary }}>{link.title}</Text>
          </Pressable>
        </Link>
      ))}

      <View style={{ flex: 1 }} />

      <View style={{ margin: 0 }}>
        <Pressable
          style={({ pressed }) => [
            {
              height: 40,
              borderWidth: 1,
              borderColor: theme.accent,
              borderRadius: 8,
              justifyContent: "center", // vertical alignment
              alignItems: "center",
              backgroundColor: pressed ? theme.accentStrong : theme.surface,
            },
          ]}
          onPress={async () => {
            await signOut();
          }}
        >
          <Text style={{ color: theme.textPrimary }}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}
