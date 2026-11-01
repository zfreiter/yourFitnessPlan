import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { StatusBar, View } from "react-native";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { SplashScreen } from "expo-router";
import { useColorTheme } from "@/context/colorThemeContext";
import { useResolvedScheme } from "@/hooks/useResolvedScheme";

// This surface stays mounted while user-dependent providers reset.
export function AppNavigationSurface({ children }: { children: ReactNode }) {
  const { theme, isThemeReady } = useColorTheme();
  const isDark = useResolvedScheme() === "dark";
  const navigationTheme = useMemo(() => ({
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.color.background,
      card: theme.color.background,
      text: theme.color.textPrimary,
      border: theme.color.border,
      primary: theme.color.accent,
    },
  }), [isDark, theme]);
  const laidOut = useRef(false);
  const splashHidden = useRef(false);
  const hideSplash = useCallback(() => {
    if (isThemeReady && laidOut.current && !splashHidden.current) {
      splashHidden.current = true;
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [isThemeReady]);
  useEffect(hideSplash, [hideSplash]);
  return <ThemeProvider value={navigationTheme}>
    <View testID="navigation-surface" style={{ flex: 1, backgroundColor: theme.color.background }}
      onLayout={() => { laidOut.current = true; hideSplash(); }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.color.background} translucent={false} animated={false} />
      {children}
    </View>
  </ThemeProvider>;
}
