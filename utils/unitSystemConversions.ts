export function weightConversion(
  value: number,
  unitSystem: "us" | "metric",
  toUnitSystem: "us" | "metric",
): number {
  if (unitSystem === toUnitSystem) {
    return value; // No conversion needed
  } else if (unitSystem === "us" && toUnitSystem === "metric") {
    return value * 0.453592; // Convert pounds to kilograms
  } else if (unitSystem === "metric" && toUnitSystem === "us") {
    return value / 0.453592; // Convert kilograms to pounds
  } else {
    throw new Error("Invalid unit conversion");
  }
}

export function unitConversion(
  value: number,
  unitSystem: "us" | "metric",
): number {
  if (unitSystem === "us") {
    return value * 0.453592; // Convert pounds to kilograms
  } else {
    return value / 0.453592; // Convert kilograms to pounds
  }
}

export function formatWeight(
  value: number,
  unitSystem: "us" | "metric",
): string {
  if (unitSystem === "us") {
    return `${value.toFixed(1)} lbs`;
  } else {
    return `${value.toFixed(1)} kg`;
  }
}
