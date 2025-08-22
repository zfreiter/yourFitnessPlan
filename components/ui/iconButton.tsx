import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function IconButton({
  icon,
  onPress,
  style,
  size = 24,
  color = "white",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  style?: ViewStyle | ViewStyle[];
  size?: number;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {},
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
