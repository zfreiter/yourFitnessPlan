import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
} from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";

type AppButtonProps = {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  disabled?: boolean;
};

export function AppButton({
  title,
  onPress,
  style,
  textStyle,
  disabled,
}: AppButtonProps) {
  const { theme } = useColorTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        {
          height: theme.spacing.buttonHeight,
          backgroundColor: disabled ? theme.color.disabled : theme.color.accent,
          borderColor: theme.color.border,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          { color: theme.color.textPrimary },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
