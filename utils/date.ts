import { format, formatISO } from "date-fns";

export function convertDate(dateToConvert: Date): string {
  const yyyy = dateToConvert.getFullYear();
  const mm = String(dateToConvert.getMonth() + 1).padStart(2, "0");
  const d = String(dateToConvert.getDate()).padStart(2, "0");
  const hh = String(dateToConvert.getHours()).padStart(2, "0");
  const min = String(dateToConvert.getMinutes()).padStart(2, "0");

  return `${yyyy}-${mm}-${d}T${hh}:${min}`;
}

export function dateToUnixEpoch(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

// Sends an ISO string WITH timezone offset, e.g. "2026-04-09T18:30:00-07:00"
// Supabase (timestamptz) will store this correctly as UTC internally,
// and return it back with offset info so it round-trips correctly.
export function formatDateForDatabase(date: Date): string {
  return formatISO(date); // e.g. "2026-04-09T18:30:00-07:00"
}

export function toLocalDateString(isoString: string): string {
  const date = new Date(isoString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
