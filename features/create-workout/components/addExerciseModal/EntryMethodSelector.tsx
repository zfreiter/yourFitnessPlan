import { useColorTheme } from "@/context/colorThemeContext";
import { View, Text, StyleSheet, Pressable } from "react-native";
import React, { useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

type EntryMethod = "quick_add" | "manual" | "auto_fill";

const options: EntryMethod[] = ["quick_add", "manual", "auto_fill"];
export function EntryMethodSelector({
  exercisesTotal,
  entryMethodSelector,
  setEntryMethodSelector,
}: {
  exercisesTotal: number;
  entryMethodSelector: EntryMethod;
  setEntryMethodSelector: (value: EntryMethod) => void;
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
                  entryMethodSelector === option
                    ? theme.color.accent
                    : theme.color.input,
              },
            ]}
            disabled={exercisesTotal !== 1 && option === "auto_fill"}
            onPress={() =>
              setEntryMethodSelector(
                option as "quick_add" | "manual" | "auto_fill",
              )
            }
          >
            {option === "auto_fill" && exercisesTotal > 1 ? (
              <MaterialIcons
                name="block"
                size={24}
                color={theme.color.textSecondary}
              />
            ) : (
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      entryMethodSelector === option
                        ? theme.color.textPrimary
                        : theme.color.textSecondary,
                  },
                ]}
              >
                {option}
              </Text>
            )}
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
