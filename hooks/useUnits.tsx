import { useUserPreference } from "@/context/userPreferenceContext";

export function useUnits() {
  const { userPreferences } = useUserPreference();
  const userRounding = userPreferences?.weight_rounding;
  const userUnitSystem = userPreferences?.unit_system;

  // If preference is metric we do not need to convert.

  // if preference is us then we need to convert from metric to us.

  const convertUnitWeight = (weight: number) => {
    if (userUnitSystem === "us") {
      const weightInUS = weight / 0.453592; // Convert pounds to kilograms
      console.log("Weight in US units before rounding:", weightInUS);
      if (userRounding === "10") {
        return (Math.floor(weightInUS / 10) * 10).toFixed(2); // Round to nearest 10 lbs
      } else if (userRounding === "5") {
        console.log(
          "Rounding to nearest 5 lbs ",
          weightInUS,
          "Rounded weight: ",
          (Math.floor(weightInUS / 5) * 5).toFixed(2),
        );
        return (Math.floor(weightInUS / 5) * 5).toFixed(2); // Round to nearest 5 lbs
      } else if (userRounding === "2.5") {
        return (Math.floor(weightInUS / 2.5) * 2.5).toFixed(2); // Round to nearest 2.5 lbs
      }
      return weight * 0.453592; // Convert pounds to kilograms
    } else {
      return weight; // No conversion needed for metric
    }
  };

  const convertToMetricWeight = (weight: number) => {
    if (userUnitSystem === "us") {
      return weight * 0.453592; // Convert pounds to kilograms
    } else {
      return weight; // No conversion needed for metric
    }
  };

  const convertToUSWeight = (weight: number) => {
    if (userUnitSystem === "us") {
      return weight / 0.453592; // Convert kilograms to pounds
    } else {
      return weight; // No conversion needed for metric
    }
  };

  const convertToMetricDistance = (yards: number) => {
    if (yards === 0 || yards === undefined || yards === null) {
      return yards; // No conversion needed for 0 distance
    }
    if (userUnitSystem === "us") {
      return yards * 0.9144; // Convert yards to meters
    } else {
      return yards; // No conversion needed for metric
    }
  };

  const convertToUSDistance = (meters: number) => {
    if (userUnitSystem === "us") {
      return meters / 0.9144; // Convert meters to yards
    } else {
      return meters; // No conversion needed for metric
    }
  };

  return {
    convertUnitWeight,
    convertToMetricWeight,
    convertToUSWeight,
    convertToUSDistance,
    convertToMetricDistance,
  };
}
