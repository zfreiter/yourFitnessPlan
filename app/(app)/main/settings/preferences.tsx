import { View, Text, Switch, StyleSheet } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import RadioGroup, { RadioButtonProps } from "react-native-radio-buttons-group";
import { useState, useMemo } from "react";

export default function Preferences() {
  const { theme, userPreference, toggleTheme } = useColorTheme();

  const [selectedId, setSelectedId] = useState<string>(userPreference);

  const radioButtons: RadioButtonProps[] = useMemo(
    () => [
      {
        id: "light", // acts as primary key, should be unique and non-empty string
        label: "Light",
        value: "light",
        color: theme.accentStrong,
        labelStyle: { color: theme.textPrimary },
      },
      {
        id: "dark", // acts as primary key, should be unique and non-empty string
        label: "Dark",
        value: "dark",
        color: theme.accentStrong,
        labelStyle: { color: theme.textPrimary },
      },
      {
        id: "system", // acts as primary key, should be unique and non-empty string
        label: "System",
        value: "system",
        color: theme.accentStrong,
        labelStyle: { color: theme.textPrimary },
      },
    ],
    [theme]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "bold",
          textAlign: "center",
          marginTop: 50,
          color: theme.textPrimary,
        }}
      >
        Preferences
      </Text>

      <View style={{ padding: 20 }}>
        <Text
          style={{ fontSize: 16, fontWeight: "600", color: theme.textPrimary }}
        >
          Theme
        </Text>
        <RadioGroup
          radioButtons={radioButtons}
          onPress={(value) => {
            setSelectedId(value);
            toggleTheme(value as "light" | "dark" | "system");
          }}
          selectedId={selectedId}
          layout="column"
          containerStyle={{
            alignItems: "flex-start",
            gap: 5,
            marginTop: 20,
          }}
        />
      </View>
    </View>
  );
}
