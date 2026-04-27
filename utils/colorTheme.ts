export const lightTheme = {
  colors: {
    bgPrimary: "#F8FAFC",
    bgSection: "#E2E8F0",
    bgSurface: "#FFFFFF",
    textPrimary: "#1E293B",
    textSecondary: "#475569",
    accent: "#2563EB",
    accentHover: "#1D4ED8",
    border: "#CBD5E1",
  },
};

export const darkTheme = {
  colors: {
    bgPrimary: "#0F172A",
    bgSection: "#1E293B",
    bgSurface: "#334155",
    textPrimary: "#FFFFFF",
    textSecondary: "#CBD5E1",
    accent: "#3B82F6",
    accentHover: "#2563EB",
    border: "#475569",
  },
};

// export const tokens = {
//   light: {
//     background: "#F5F7F6",
//     surface: "#FFFFFF",
//     surface2: "#F0F2F1", // NEW (for cards)
//     input: "#ECEEED", // NEW (for text inputs)

//     accent: "#10B981",
//     accentActive: "#0EA06F",
//     accentStrong: "#34D399",

//     textPrimary: "#0B1A17",
//     textSecondary: "#4B5561",
//     placeholderColor: "rgba(75, 85, 97, 0.6)",

//     hr: "#E2E8E5",
//     border: "#E6ECE8",
//     shadow: "rgba(11,26,23,0.06)",

//     success: "#10B981",
//     danger: "#EF4444",
//     warning: "#F59E0B",
//     disabled: "#A8B3AB",
//   } as const,
//   dark: {
//     background: "#0B0F0E",
//     surface: "#1A1F1E",
//     surface2: "#222927", // NEW (for cards)
//     input: "#2A322F", // NEW (more contrast for text inputs)

//     accent: "#34D399",
//     accentActive: "#2BB07F",
//     accentStrong: "#10B981",

//     textPrimary: "#E6F3EE",
//     textSecondary: "#AAB7B0",
//     placeholderColor: "rgba(229, 245, 236, 0.6)",

//     hr: "#1F2625",
//     border: "#1B2421",
//     shadow: "rgba(0,0,0,0.6)",

//     success: "#34D399",
//     danger: "#F87171",
//     warning: "#FBBF24",
//     disabled: "#54615A",
//   } as const,
// export const tokens = {
//   light: {
//     background: "#F4F5F9",
//     surface: "#FFFFFF",
//     surface2: "#ECEEF5",
//     input: "#E5E7F2",

//     accent: "#5B52E8",
//     accentActive: "#4A42C7",
//     accentStrong: "#7B74F0",

//     textPrimary: "#10162A",
//     textSecondary: "#515977",
//     placeholderColor: "rgba(81, 89, 119, 0.6)",

//     hr: "#E4E6F0",
//     border: "#E8EAF4",
//     shadow: "rgba(16, 22, 42, 0.06)",

//     success: "#10B981",
//     danger: "#EF4444",
//     warning: "#F5AB00",
//     disabled: "#A8ADCC",
//   } as const,
//   dark: {
//     background: "#0D0E18",
//     surface: "#161825",
//     surface2: "#1E2030",
//     input: "#252840",

//     accent: "#7B74F0",
//     accentActive: "#6058D0",
//     accentStrong: "#5B52E8",

//     textPrimary: "#E8EAFF",
//     textSecondary: "#9097B8",
//     placeholderColor: "rgba(232, 234, 255, 0.5)",

//     hr: "#1A1C2E",
//     border: "#16192C",
//     shadow: "rgba(0, 0, 0, 0.6)",

//     success: "#34D399",
//     danger: "#F87171",
//     warning: "#FBBF24",
//     disabled: "#474D6E",
//   } as const,

export const tokens = {
  light: {
    background: "#F0F2F5",
    surface: "#FFFFFF",
    surface2: "#E8EAEF",
    input: "#E2E5EB",

    accent: "#1A7EC0",
    accentActive: "#1264A0",
    accentStrong: "#2294D8",

    textPrimary: "#080C10",
    textSecondary: "#424C5C",
    placeholderColor: "rgba(66, 76, 92, 0.55)",

    hr: "#D5D9E0",
    border: "#DDE0E8",
    shadow: "rgba(8, 12, 16, 0.07)",

    success: "#059669",
    danger: "#CC1F1F",
    warning: "#D97706",
    disabled: "#A0AAB8",
  } as const,
  dark: {
    background: "#16191D",
    surface: "#1E2228",
    surface2: "#252A30",
    input: "#2C3138",

    accent: "#1A7EC0",
    accentActive: "#1264A0",
    accentStrong: "#2294D8",

    textPrimary: "#E8ECF0",
    textSecondary: "#7A8694",
    placeholderColor: "rgba(232, 236, 240, 0.4)",

    hr: "#1E2228",
    border: "#252A30",
    shadow: "rgba(0, 0, 0, 0.5)",

    success: "#059669",
    danger: "#E53E3E",
    warning: "#D97706",
    disabled: "#4A5568",
  } as const,

  spacing: {
    xs: 4,
    label: 6, // spacing for labels
    sm: 8,
    md: 12, // page margin for small screens
    lg: 16, // default page margin for phones input -> inputs, buttons, etc.
    xl: 24, // section -> sections, larger components
    xxl: 32,
    buttonHeight: 48, // standard button height
    inputHeight: 48, // standard input height
    screenPadding: 16, // consistent screen padding for phones
    headerBottomMargin: 16, // margin below headers
    sectionGap: 24, // gap between sections
  } as const,
  fonts: {
    heading: "RussoOne-Regular",
    headerBody: "Inter-Bold",
    body: "Inter-Regular",
    stats: "Orbitron-Bold",
  } as const,
};
