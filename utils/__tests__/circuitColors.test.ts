import { circuitColor } from "../circuitColors";
import { tokens } from "../colorTheme";

function luminance(hex: string) {
  const values = [1, 3, 5].map(offset => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
it.each(["light", "dark"] as const)("gives every palette shade readable contrast on the %s card surface", scheme => {
  const surface = tokens[scheme].surface;
  const colors = new Set(Array.from({ length: 100 }, (_, index) => circuitColor(`circuit-${index}`, surface)));
  expect(colors.size).toBe(6);
  colors.forEach(color => {
    const values = [luminance(color), luminance(surface)].sort((a, b) => b - a);
    expect((values[0] + 0.05) / (values[1] + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
});
