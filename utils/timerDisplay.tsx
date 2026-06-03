import { View, Text, Pressable, StyleSheet } from "react-native";
import { useState } from "react";
import { useRestTimer } from "@/hooks/useRestTimer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorTheme } from "@/context/colorThemeContext";
import * as Haptics from "expo-haptics";

export function TimerDisplay() {
  const { remaining, running, start, stop } = useRestTimer();
  const [duration, setDuration] = useState(60_000);
  const insets = useSafeAreaInsets();
  const { theme } = useColorTheme();

  const hasStarted = running || remaining > 0;

  // ⏱ Format time
  const format = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(
      2,
      "0",
    )}`;
  };

  const displayRemaining = format(remaining);
  const displayDuration = format(duration);

  const handleStart = () => {
    if (running) stop();
    else start(duration);
  };

  const adjustTime = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDuration((prev) => Math.max(30_000, prev + delta));
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: theme.color.background,
          borderColor: theme.color.border,
          shadowColor: theme.color.shadow,
        },
      ]}
    >
      <View style={[styles.inner, { paddingBottom: insets.bottom + 10 }]}>
        {/* ⏱ Show ONLY when started */}
        {hasStarted && (
          <Text style={[styles.timerText, { color: theme.color.textPrimary }]}>
            {displayRemaining}
          </Text>
        )}

        <View style={styles.bottomBar}>
          {/* -30 */}
          <Pressable
            onPress={() => adjustTime(-30_000)}
            disabled={running}
            style={[
              styles.sideButton,
              { backgroundColor: theme.color.surface },
            ]}
          >
            <Text style={[styles.sideText, { color: theme.color.textPrimary }]}>
              -30
            </Text>
          </Pressable>

          {/* Start / Stop */}
          <Pressable
            onPress={handleStart}
            style={[styles.mainButton, { backgroundColor: theme.color.accent }]}
          >
            <Text style={[styles.mainText, { color: theme.color.textPrimary }]}>
              {running ? "Stop" : `Start: ${displayDuration}`}
            </Text>
          </Pressable>

          {/* +30 */}
          <Pressable
            onPress={() => adjustTime(30_000)}
            disabled={running}
            style={[
              styles.sideButton,
              { backgroundColor: theme.color.surface },
            ]}
          >
            <Text style={[styles.sideText, { color: theme.color.textPrimary }]}>
              +30
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },

  inner: {
    paddingHorizontal: 16,
    paddingTop: 18,
    alignItems: "center",
  },

  timerText: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 6,
  },

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },

  mainButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 130,
    alignItems: "center",
  },

  mainText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },

  sideButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },

  sideText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
