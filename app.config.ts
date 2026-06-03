import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "yourFitnessPlan",
  slug: "yourFitnessPlan",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "myapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    icon: {
      dark: ".assets/images/ios-dark.png",
      light: ".assets/images/ios-light.png",
      tinted: ".assets/images/ios-tinted.png",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      monochromeImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    permissions: [
      "android.permission.SCHEDULE_EXACT_ALARM",
      "android.permission.USE_EXACT_ALARM",
      "android.permission.RECEIVE_BOOT_COMPLETED",
      "android.permission.VIBRATE",
    ],
    softwareKeyboardLayoutMode: "pan",
    package: "com.anonymous.yourFitnessPlan",
  },
  updates: {
    enabled: true,
    fallbackToCacheTimeout: 0,
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "@react-native-community/datetimepicker",
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon-dark.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          image: "./assets/images/splash-icon-light.png",
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/images/adaptive-icon.png",
        color: "#ffffff",
        androidMode: "default",
        androidCollapsedTitle: "Timer Alert",
      },
    ],
    "expo-font",
    "expo-sqlite",
    "expo-web-browser",
    "expo-secure-store",
    "expo-localization",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    supabaseUrl: "https://bojjxwudhkvcjipglwps.supabase.co",
    supabaseAnonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvamp4d3VkaGt2Y2ppcGdsd3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MTAyNzgsImV4cCI6MjA3NzM4NjI3OH0.x4fadMS2dlh-K_lq0TrvFXoRAKlVWsr-icjEP2eLuAU",
    eas: {
      projectId: "7c964fc5-d47e-419c-aa49-b87b28a2a7e2",
    },
  },
});
