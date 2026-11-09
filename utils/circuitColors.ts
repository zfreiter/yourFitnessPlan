// Paired hues keep circuit identity recognizable across theme changes. Colors
// are presentation only; no form values or persisted records are changed.
const palette = [
  ["#1D4ED8", "#93C5FD"],
  ["#047857", "#6EE7B7"],
  ["#7E22CE", "#D8B4FE"],
  ["#B45309", "#FCD34D"],
  ["#BE185D", "#F9A8D4"],
  ["#0E7490", "#67E8F9"],
] as const;

export function circuitColor(id: string, surface = "#FFFFFF"): string {
  let hash = 0;
  for (let index = 0; index < id.length; index++) {
    hash = (Math.imul(hash, 31) + id.charCodeAt(index)) >>> 0;
  }
  // Theme surfaces are six-digit hex colors. Use the resolved surface rather
  // than the preference so the system theme is handled as well.
  const rgb = surface.replace("#", "");
  const brightness = [0, 2, 4].reduce((sum, offset, index) =>
    sum + parseInt(rgb.slice(offset, offset + 2), 16) * [0.2126, 0.7152, 0.0722][index], 0);
  return palette[hash % palette.length][brightness < 128 ? 1 : 0];
}
