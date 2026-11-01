import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import { BaseCardioInterval, CardioEntry } from "@/types/interfaces/types";
import { CardioCard } from "@/features/create-workout/components/cardioCard";

const hasDuration = (value: number | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export function summarizeIntervals(intervals: BaseCardioInterval[]) {
  const count = `${intervals.length} ${intervals.length === 1 ? "interval" : "intervals"}`;
  if (!intervals.length) return { summary: count, totalSeconds: undefined };
  const first = intervals[0];
  const complete = intervals.every(interval =>
    hasDuration(interval.work_duration) && hasDuration(interval.rest_duration));
  const identical = complete && intervals.every(interval =>
    interval.work_duration === first.work_duration && interval.rest_duration === first.rest_duration);
  // A missing rest (including the final rest) is unknown, not zero.
  // Entry duration is in minutes and must not be added to interval seconds.
  const total = complete ? intervals.reduce((sum, interval) =>
    sum + interval.work_duration! + interval.rest_duration!, 0) : undefined;
  return {
    summary: `${count} · ${identical ? `${first.work_duration}s work / ${first.rest_duration}s rest` : "Custom durations"}`,
    totalSeconds: total !== undefined && Number.isFinite(total) ? total : undefined,
  };
}

export function SavedCardioCard({ entry, entryOrder, onRemove }: {
  entry: CardioEntry;
  entryOrder: number;
  onRemove?: () => void;
}) {
  const { theme } = useColorTheme();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const intervals = [...entry.intervals].sort((a, b) => a.interval_order - b.interval_order);
  const { summary, totalSeconds } = summarizeIntervals(intervals);
  const textStyle = { color: theme.color.textSecondary, fontSize: 11 };
  const metric = (label: string, value: number | string | null | undefined, suffix = "") =>
    value !== null && value !== undefined && value !== "" ? (
      <Text key={label} style={textStyle}>{`${label}: ${value}${suffix}`}</Text>
    ) : null;
  const action = (label: string, onPress: () => void, expandedState?: boolean) => (
    <Pressable accessibilityRole="button" accessibilityState={expandedState === undefined ? undefined : { expanded: expandedState }}
      onPress={onPress} hitSlop={8}>
      <Text style={[styles.action, { color: theme.color.accent }]}>{label}</Text>
    </Pressable>
  );

  if (editing) return (
    <View style={{ gap: theme.spacing.lg }}>
      <CardioCard entry={entry} entryOrder={entryOrder} onRemove={onRemove} />
      {action("Done editing", () => setEditing(false))}
    </View>
  );

  return (
    <View style={[styles.card, { backgroundColor: theme.color.surface, borderColor: theme.color.border, gap: theme.spacing.lg }]}>
      <Text style={[styles.name, { color: theme.color.textPrimary }]}>{entry.activity.replace(/_/g, " ")}</Text>
      {entry.is_finisher ? <Text style={textStyle}>Finisher</Text> : null}
      {entry.mode === "simple" ? (
        <View style={styles.metrics}>
          {metric("Duration", entry.duration, " min")}
          {metric("Distance", entry.distance, " km")}
          {metric("Calories", entry.calories)}
          {metric("AVG HR (BPM)", entry.heart_rate_avg)}
          {metric("Heart Rate Zone", entry.heart_rate_zone?.toUpperCase())}
        </View>
      ) : (
        <>
          <Text style={textStyle}>{summary}</Text>
          {metric("Total duration", totalSeconds, "s")}
          {action(expanded ? "Hide intervals" : "View intervals", () => setExpanded(value => !value), expanded)}
          {expanded && (
            <View style={{ gap: theme.spacing.lg }}>
              {intervals.length === 0 && <Text style={textStyle}>No intervals</Text>}
              {intervals.map(interval => (
                <View key={interval.id} style={styles.metrics}>
                  <Text style={[styles.action, { color: theme.color.textPrimary }]}>{`Interval ${interval.interval_order}`}</Text>
                  {metric("Work", interval.work_duration, "s")}
                  {metric("Rest", interval.rest_duration, "s")}
                  {metric("Distance", interval.distance, " km")}
                  {metric("Calories", interval.calories)}
                  {metric("Notes", interval.notes)}
                </View>
              ))}
            </View>
          )}
        </>
      )}
      {action("Edit cardio", () => setEditing(true))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 10, padding: 12 },
  name: { fontSize: 15, fontWeight: "700", textTransform: "capitalize" },
  action: { fontSize: 11, fontWeight: "600" },
  metrics: { gap: 4 },
});
