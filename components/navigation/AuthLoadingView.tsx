import { ActivityIndicator, View } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";

export function AuthLoadingView() {
  const { theme } = useColorTheme();
  return <View testID="auth-loading" style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.color.background }}>
    <ActivityIndicator accessibilityLabel="Loading" size="large" color={theme.color.accent} />
  </View>;
}
