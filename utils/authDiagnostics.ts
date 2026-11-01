// Deliberately accept only lifecycle labels and non-secret state.
export function traceAuth(event: string, details: { userId?: string | null; loading?: boolean; initialized?: boolean; decision?: string } = {}) {
  if (process.env.NODE_ENV !== "production") console.log(`[auth] ${event}`, details);
}
