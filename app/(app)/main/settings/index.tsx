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
    { title: "Profile", path: "./settings/profile" },
    { title: "Training Stats", path: "./settings/trainingStats" },
    { title: "Preferences", path: "./settings/preferences" },
  ] as const;

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 20,
        gap: 10,
        backgroundColor: theme.color.background,
      }}
    >
      {links.map((link, index) => (
        <Link key={`${link.title}-${index}`} href={link.path} asChild>
          <Pressable
            style={{
              padding: 10,
              backgroundColor: theme.color.surface,
              borderWidth: 1,
              borderColor: theme.color.border,
              borderRadius: 5,
            }}
          >
            <Text style={{ color: theme.color.textPrimary }}>{link.title}</Text>
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
              borderColor: theme.color.accent,
              borderRadius: 8,
              justifyContent: "center", // vertical alignment
              alignItems: "center",
              backgroundColor: pressed
                ? theme.color.accentStrong
                : theme.color.surface,
            },
          ]}
          onPress={async () => {
            await signOut();
          }}
        >
          <Text style={{ color: theme.color.textPrimary }}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}
