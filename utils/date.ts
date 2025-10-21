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
