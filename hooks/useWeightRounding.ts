// hooks/useWeightRounding.ts

import { useUserPreference } from "@/context/userPreferenceContext";

type WeightRounding = "2.5" | "5" | "10" | "none";

/**
 * Hook that provides weight rounding functionality based on user preferences
 */
export function useWeightRounding() {
  const { userPreferences } = useUserPreference();

  const applyWeightRounding = (weight: number): number => {
    if (!weight || weight === 0) {
      return weight;
    }

    switch (userPreferences?.weight_rounding) {
      case "2.5":
        return Number((Math.round(weight / 2.5) * 2.5).toFixed(2));

      case "5":
        return Number((Math.round(weight / 5) * 5).toFixed(2));

      case "10":
        return Number((Math.round(weight / 10) * 10).toFixed(2));

      case "none":
      default:
        return weight;
    }
  };

  return { applyWeightRounding };
}

/**
 * Example usage:
 *
 * const { applyWeightRounding } = useWeightRounding();
 * const rounded = applyWeightRounding(234.56);
 */
