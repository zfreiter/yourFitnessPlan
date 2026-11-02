import type { PressableProps } from "react-native";

type Details = { destination?: string; reason?: string; prevented?: boolean; session?: number; ready?: boolean; loading?: boolean; syncBusy?: boolean; profileLoading?: boolean; workoutCount?: number; errorName?: string };
let sequence = 0;
// Only explicit labels/state are accepted. Never pass events, auth responses,
// form values, credentials, or entire navigation states to this logger.
export function traceUi(control: string, phase: string, details: Details = {}) {
  if (process.env.NODE_ENV !== "production") console.log("[ui] " + JSON.stringify({ sequence: ++sequence, time: Date.now(), control, phase, ...details }));
}
export function uiPressEvents(control: string): Pick<PressableProps, "onPressIn" | "onPressOut" | "onFocus"> {
  if (process.env.NODE_ENV === "production") return {};
  return {
    onPressIn: () => traceUi(control, "press-in"),
    onPressOut: () => traceUi(control, "press-out"),
    onFocus: () => traceUi(control, "focus"),
  };
}
export function runUiAction<T>(control: string, action: () => T, details: Details = {}): T {
  if (process.env.NODE_ENV === "production") return action();
  traceUi(control, "handler-start", details);
  try {
    const result = action();
    if (result && typeof (result as any).then === "function") {
      return (result as any).then((value: unknown) => { traceUi(control, "handler-resolved", details); return value; }, (error: unknown) => {
        traceUi(control, "handler-failed", { errorName: error instanceof Error ? error.name : "Unknown" });
        throw error;
      });
    }
    traceUi(control, "handler-returned", details);
    return result;
  } catch (error) {
    traceUi(control, "handler-failed", { errorName: error instanceof Error ? error.name : "Unknown" });
    throw error;
  }
}
