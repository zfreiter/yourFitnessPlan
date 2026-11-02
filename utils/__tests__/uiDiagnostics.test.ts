import { runUiAction, traceUi, uiPressEvents } from "../uiDiagnostics";
it("records input phases without preventing the event", () => {
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  const input: any = { preventDefault: jest.fn() };
  const props = uiPressEvents("control");
  props.onPressIn?.(input); props.onPressOut?.(input); props.onFocus?.(input);
  expect(input.preventDefault).not.toHaveBeenCalled(); expect(log).toHaveBeenCalledTimes(3);
  log.mockRestore();
});
it("preserves navigation callback return values and surfaces async failures", async () => {
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  expect(runUiAction("navigation", () => 42)).toBe(42);
  const error = new Error("Failure");
  await expect(runUiAction("async", () => Promise.reject(error))).rejects.toBe(error);
  expect(log.mock.calls.some(([value]) => String(value).includes("handler-failed"))).toBe(true);
  log.mockRestore();
});
it("does not log diagnostic events in production", () => {
  const environment = jest.replaceProperty(process.env, "NODE_ENV", "production");
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  try {
    traceUi("control", "press"); expect(uiPressEvents("control")).toEqual({});
    expect(runUiAction("navigation", () => true)).toBe(true);
    expect(log).not.toHaveBeenCalled();
  } finally { environment.restore(); log.mockRestore(); }
});
