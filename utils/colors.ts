export const colors = {
  strength: "#cc0000",
  cardio: "#0066cc",
  circuit: "#00cc44",
  mobility: "#9933ff",
};

export const colorsGradiant = {
  strength: {
    main: "#cc0000",
    gradient: ["#ff4d4d", "#cc0000", "#800000"], // light → dark red
  },
  cardio: {
    main: "#0066cc",
    gradient: ["#4da6ff", "#0066cc", "#003366"], // light → dark blue
  },
  circuit: {
    main: "#00cc44",
    gradient: ["#66ff66", "#00cc44", "#006622"], // light → dark green
  },
  mobility: {
    main: "#9933ff",
    gradient: ["#d966ff", "#9933ff", "#4b0082"], // light → dark purple
  },
};

type ColorType =
  | "Select workout"
  | "strength"
  | "cardio"
  | "mobility"
  | "circuit";

export function getColorsByType(colorType: ColorType): {
  main: string;
  gradient: string[];
} {
  switch (colorType) {
    case "strength":
      return colorsGradiant.strength;
    case "cardio":
      return colorsGradiant.cardio;
    case "circuit":
      return colorsGradiant.circuit;
    case "mobility":
      return colorsGradiant.mobility;
    default:
      return {
        main: "#a9a9a9",
        gradient: ["#d3d3d3", "#a9a9a9", "#696969"], // light → dark gray
      };
  }
}
