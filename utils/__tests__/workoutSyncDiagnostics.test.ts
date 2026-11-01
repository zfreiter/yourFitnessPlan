import { syncErrorCode, traceWorkoutSync } from "../workoutSyncDiagnostics";

const originalDev = __DEV__;
afterEach(() => { (global as any).__DEV__ = originalDev; jest.restoreAllMocks(); });
it("logs only allowlisted metadata in development", () => {
  (global as any).__DEV__ = true;
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  traceWorkoutSync("upload-failed", {
    tableName: "exercise_sets", recordId: "set", operation: "insert", queueId: 3, errorCode: "42501",
    access_token: "SECRET_TOKEN", user_id: "PRIVATE_ACCOUNT", data: { notes: "PRIVATE_NOTES" },
  } as any);
  expect(log).toHaveBeenCalledWith("[workout-sync]", { event: "upload-failed", tableName: "exercise_sets", recordId: "set", operation: "insert", queueId: 3, errorCode: "42501" });
  expect(JSON.stringify(log.mock.calls)).not.toMatch(/SECRET|PRIVATE/);
});
it("does not log in production or leak error messages through error codes", () => {
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  (global as any).__DEV__ = false;
  traceWorkoutSync("upload-succeeded", { tableName: "workouts", recordId: "workout" });
  expect(log).not.toHaveBeenCalled();
  (global as any).__DEV__ = true;
  traceWorkoutSync("upload-failed", { tableName: "workouts", recordId: "workout", errorCode: "message with PRIVATE credentials" });
  expect(log.mock.calls[0][1]).not.toHaveProperty("errorCode");
  expect(syncErrorCode(new Error("PRIVATE error"))).toBe("UNKNOWN");
});
