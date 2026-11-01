/** Parse stored ISO timestamps or legacy local timestamps without a current-time fallback. */
export function parseScheduledDate(value?: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(value)) return null;
  const [hours, minutes, seconds = 0] = value.slice(11).split(/[Z+\-]/)[0].split(":").map(Number);
  if (hours > 23 || minutes > 59 || seconds >= 60) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) return null;
  const parsed = new Date(value.replace(" ", "T"));
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

/** Keep the existing T-separated storage format and explicit timezone, when present. */
export function serializeScheduledDate(value: string): string {
  if (!parseScheduledDate(value)) throw new Error("Scheduled date and time is missing or invalid");
  return value.replace(" ", "T");
}

export function initialScheduledDate(routeDate?: string): string {
  if (routeDate) {
    const value = `${routeDate}T12:00`;
    const parsed = parseScheduledDate(value);
    return parsed ? parsed.toISOString() : value;
  }
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

export function changeScheduledDate(value: string, selected: Date, mode: "date" | "time"): string {
  const next = parseScheduledDate(value) ?? new Date(selected);
  if (mode === "date") next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
  else next.setHours(selected.getHours(), selected.getMinutes());
  // User selections become explicit instants so Supabase cannot reinterpret a local clock as UTC.
  return next.toISOString();
}
