import { useState, useRef, useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";

const STORAGE_KEY = "rest_timer_end_time";

type UseRestTimerReturn = {
  remaining: number;
  running: boolean;
  start: (durationMs: number) => Promise<void>;
  stop: (cancelled?: boolean) => Promise<void>;
};

export function useRestTimer(): UseRestTimerReturn {
  const [remaining, setRemaining] = useState<number>(0);
  const [running, setRunning] = useState<boolean>(false);

  const endTimeReal = useRef<number | null>(null);
  const endTimePerf = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);
  const notifIdRef = useRef<string | null>(null);

  // ▶️ Start
  const start = async (durationMs: number): Promise<void> => {
    const nowReal = Date.now();
    const nowPerf = performance.now();

    endTimeReal.current = nowReal + durationMs;
    endTimePerf.current = nowPerf + durationMs;

    await AsyncStorage.setItem(STORAGE_KEY, endTimeReal.current.toString());

    await Notifications.cancelAllScheduledNotificationsAsync();

    const seconds = Math.round(Number(durationMs) / 1000);

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        setRunning(true);
        return;
      }
    }

    notifIdRef.current = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Rest Over! 💪",
        body: "Time to get back to it.",
        sound: true,
        categoryIdentifier: "alarm",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        channelId: "timer",
      },
    });

    setRunning(true);
  };

  // ⏹ Stop
  const stop = async (cancelled = false): Promise<void> => {
    setRunning(false);

    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
    }

    if (cancelled && notifIdRef.current) {
      await Notifications.cancelScheduledNotificationAsync(notifIdRef.current);
      notifIdRef.current = null;
    }

    endTimeReal.current = null;
    endTimePerf.current = null;

    await AsyncStorage.removeItem(STORAGE_KEY);
    setRemaining(0);
  };

  // 🔁 Animation loop
  useEffect(() => {
    if (!running) return;

    const loop = () => {
      if (endTimePerf.current === null) return;

      const nowPerf = performance.now();
      const left = Math.max(0, endTimePerf.current - nowPerf);

      setRemaining(left);

      if (left <= 0) {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        ).catch(() => {});
        stop();
        return;
      }

      rafId.current = requestAnimationFrame(loop);
    };

    rafId.current = requestAnimationFrame(loop);

    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [running]);

  // 💾 Restore on app launch
  useEffect(() => {
    const restore = async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const end = Number(saved);
      const now = Date.now();

      if (end <= now) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        return;
      }

      const remainingMs = end - now;

      endTimeReal.current = end;
      endTimePerf.current = performance.now() + remainingMs;

      await Notifications.cancelAllScheduledNotificationsAsync();

      notifIdRef.current = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Rest Over! 💪",
          body: "Time to get back to it.",
          sound: true,
          categoryIdentifier: "alarm",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.round(remainingMs / 1000),
          channelId: "timer",
        },
      });

      setRemaining(remainingMs);
      setRunning(true);
    };

    restore();
  }, []);

  // 📱 Handle background / foreground
  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === "active") {
        if (endTimeReal.current === null) return;

        const now = Date.now();
        const remainingMs = endTimeReal.current - now;

        if (remainingMs <= 0) {
          stop();
          return;
        }

        Notifications.cancelAllScheduledNotificationsAsync().then(() => {
          Notifications.scheduleNotificationAsync({
            content: {
              title: "Rest Over! 💪",
              body: "Time to get back to it.",
              sound: true,
              categoryIdentifier: "alarm",
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: Math.round(remainingMs / 1000),
              channelId: "timer",
            },
          }).then((id) => {
            notifIdRef.current = id;
          });
        });

        endTimePerf.current = performance.now() + remainingMs;
        setRemaining(remainingMs);
        setRunning(true);
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, []);

  return { remaining, running, start, stop };
}
