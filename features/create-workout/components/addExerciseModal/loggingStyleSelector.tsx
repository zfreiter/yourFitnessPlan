import { View, Text, StyleSheet, Pressable } from "react-native";
import React, { useState } from "react";
import { useColorTheme } from "@/context/colorThemeContext";

const options = ["regular", "superset", "compound_set"];
export function LoggingStyleSelector({
  selectedLoggingStyle,
  setSelectedLoggingStyle,
}: {
  selectedLoggingStyle: "regular" | "superset" | "compound_set";
  setSelectedLoggingStyle: (
    style: "regular" | "superset" | "compound_set",
  ) => void;
}) {
  const { theme } = useColorTheme();

  return (
    <View
      style={[styles.segmentedControl, { borderColor: theme.color.border }]}
    >
      {options.map((option, index) => (
        <React.Fragment key={option}>
          <Pressable
            style={[
              styles.segment,
              {
                backgroundColor:
                  selectedLoggingStyle === option
                    ? theme.color.accent
                    : theme.color.input,
              },
            ]}
            onPress={() =>
              setSelectedLoggingStyle(
                option as "regular" | "superset" | "compound_set",
              )
            }
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    selectedLoggingStyle === option
                      ? theme.color.textPrimary
                      : theme.color.textSecondary,
                },
              ]}
            >
              {option}
            </Text>
          </Pressable>

          {index < options.length - 1 && (
            <View
              style={[
                styles.segmentDivider,
                { backgroundColor: theme.color.background },
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 8,
    marginVertical: 12,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  segmentDivider: {
    width: 4,
  },
});
