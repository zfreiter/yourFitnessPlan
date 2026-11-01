type DiagnosticEvent = "queue-staged" | "queue-committed" | "local-committed" | "local-failed" | "upload-attempt" | "upload-succeeded" | "upload-failed";
interface DiagnosticFields {
  tableName: string;
  recordId: string;
  operation?: string;
  queueId?: number;
  errorCode?: string;
}

/** Metadata only. Never pass payloads, account information, or error messages to the console. */
export function traceWorkoutSync(event: DiagnosticEvent, fields: DiagnosticFields) {
  if (typeof __DEV__ === "undefined" || !__DEV__) return;
  if (!["workouts", "circuit_rounds", "workout_exercises", "exercise_sets", "cardio_entries", "cardio_intervals"].includes(fields.tableName)) return;
  console.log("[workout-sync]", {
    event,
    tableName: fields.tableName,
    recordId: fields.recordId,
    ...(fields.operation ? { operation: fields.operation } : {}),
    ...(fields.queueId !== undefined ? { queueId: fields.queueId } : {}),
    ...(fields.errorCode && /^[A-Z0-9_]{1,32}$/.test(fields.errorCode) ? { errorCode: fields.errorCode } : {}),
  });
}

export function syncErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") return error.code;
  return "UNKNOWN";
}
