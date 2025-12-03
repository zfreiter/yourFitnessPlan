import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { useColorTheme } from "@/context/colorThemeContext";

type FabButtonProps = {
  today?: string | null;
};

export default function FabButton({ today }: FabButtonProps) {
  const { theme } = useColorTheme();
  console.log("FAB THEME:", theme.accent);
  return (
    <Link
      href={{
        pathname: "/CreateWorkout",
        params: {
          date: today,
        },
      }}
      asChild
    >
      <Pressable
        style={StyleSheet.flatten([
          styles.fab,
          { backgroundColor: theme.accentStrong },
        ])}
      >
        <Text style={styles.text}>+</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00cc44",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  text: {
    color: "white",
    fontSize: 32,
    lineHeight: 32,
  },
});
