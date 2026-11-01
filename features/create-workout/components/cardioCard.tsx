import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import { CardioEntry, CreateWorkoutForm } from "@/types/interfaces/types";
import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Controller, useFormContext } from "react-hook-form";

interface CardioCardProps {
  entry: CardioEntry;
  entryOrder: number;
  onRemove?: () => void;
}

export function CardioCard({ entry, entryOrder, onRemove }: CardioCardProps) {
  const { theme } = useColorTheme();

  // Keep registered values when cards unmount or field-array indices change.
  const { control } = useFormContext<CreateWorkoutForm>();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.color.surface,
          borderColor: theme.color.border,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text
            style={[
              styles.name,
              {
                color: theme.color.textPrimary,
              },
            ]}
          >
            {entry.activity}
          </Text>

          <Text
            style={[
              styles.mode,
              {
                color: theme.color.textSecondary,
              },
            ]}
          >
            {entry.mode}
            {entry.is_finisher ? " • Finisher" : ""}
          </Text>
        </View>

        {onRemove && (
          <Pressable
            onPress={onRemove}
            hitSlop={8}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              padding: 4,
            })}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={theme.color.danger}
            />
          </Pressable>
        )}
      </View>

      {/* Inputs */}
      <View style={styles.inputs}>
        <Controller
          control={control}
          name={`cardio_entries.${entryOrder}.duration`}
          render={({ field: { value, onChange, onBlur } }) => {
            return (
              <CardioInput
                label="Duration"
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                keyboardType="numeric"
              />
            );
          }}
        />

        <Controller
          control={control}
          name={`cardio_entries.${entryOrder}.distance`}
          render={({ field: { value, onChange, onBlur } }) => (
            <CardioInput
              label="Distance"
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              keyboardType="decimal-pad"
            />
          )}
        />

        <Controller
          control={control}
          name={`cardio_entries.${entryOrder}.calories`}
          render={({ field: { value, onChange, onBlur } }) => (
            <CardioInput
              label="Calories"
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              keyboardType="numeric"
            />
          )}
        />

        <Controller
          control={control}
          name={`cardio_entries.${entryOrder}.heart_rate_avg`}
          render={({ field: { value, onChange, onBlur } }) => (
            <CardioInput
              label="AVG HR (BPM)"
              suffix="bpm"
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              keyboardType="numeric"
            />
          )}
        />
      </View>

      {entry.mode === "intervals" && entry.intervals.map((interval, index) => (
        <View key={interval.id} style={styles.inputs}>
          <Text style={{ color: theme.color.textSecondary }}>
            Interval {interval.interval_order}
          </Text>
          {(["work_duration", "rest_duration", "distance", "calories"] as const).map((metric) => (
            <Controller
              key={metric}
              control={control}
              name={`cardio_entries.${entryOrder}.intervals.${index}.${metric}`}
              render={({ field: { value, onChange, onBlur } }) => (
                <CardioInput
                  label={{ work_duration: "Work (sec)", rest_duration: "Rest (sec)", distance: "Distance (km)", calories: "Calories" }[metric]}
                  value={value}
                  onChange={(value) => onChange(value ?? undefined)}
                  onBlur={onBlur}
                  keyboardType={metric === "distance" ? "decimal-pad" : "numeric"}
                />
              )}
            />
          ))}
        </View>
      ))}

      {/* Extra info */}
      {entry.heart_rate_zone && (
        <Text
          style={[
            styles.zone,
            {
              color: theme.color.textSecondary,
            },
          ]}
        >
          Heart Rate Zone: {entry.heart_rate_zone.toUpperCase()}
        </Text>
      )}

      {entry.mode === "intervals" && (
        <Text
          style={[
            styles.zone,
            {
              color: theme.color.textSecondary,
            },
          ]}
        >
          {entry.intervals.length}{" "}
          {entry.intervals.length === 1 ? "interval" : "intervals"}
        </Text>
      )}
    </View>
  );
}

interface CardioInputProps {
  label: string;
  value?: number | null;
  suffix?: string;
  keyboardType: "numeric" | "decimal-pad";
  onChange: (value: number | null) => void;
  onBlur: () => void;
}

function CardioInput({
  label,
  value,
  suffix,
  keyboardType,
  onChange,
  onBlur,
}: CardioInputProps) {
  const { theme } = useColorTheme();

  return (
    <View style={styles.inputGroup}>
      <Text
        style={[
          styles.inputLabel,
          {
            color: theme.color.textSecondary,
          },
        ]}
      >
        {label}
      </Text>

      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.color.textPrimary,
              backgroundColor: theme.color.input,
              borderColor: theme.color.border,
            },
          ]}
          value={value?.toString() ?? ""}
          keyboardType={keyboardType}
          onBlur={onBlur}
          onChangeText={(text) => {
            if (text === "") {
              onChange(null);
              return;
            }

            const number = Number(text);

            if (!Number.isNaN(number)) {
              onChange(number);
            }
          }}
        />

        {suffix && (
          <Text
            style={[
              styles.suffix,
              {
                color: theme.color.textSecondary,
              },
            ]}
          >
            {suffix}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  headerLeft: {
    gap: 2,
  },

  name: {
    fontSize: 15,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  mode: {
    fontSize: 11,
    textTransform: "capitalize",
  },

  inputs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  inputGroup: {
    width: "47%",
    gap: 4,
  },

  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
  },

  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },

  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingRight: 38,
    fontSize: 14,
  },

  suffix: {
    position: "absolute",
    right: 8,
    fontSize: 10,
  },

  zone: {
    fontSize: 11,
  },
});
