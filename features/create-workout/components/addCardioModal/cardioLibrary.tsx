import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useColorTheme } from "@/context/colorThemeContext";
import {
  CardioActivity,
  CardioMode,
  HeartRateZone,
  CardioEntry,
} from "@/types/interfaces/types";
import * as Crypto from "expo-crypto";

interface CardioLibraryProps {
  isFinisher?: boolean;
  workoutId: string;
  onEntryChange: React.Dispatch<React.SetStateAction<CardioEntry | null>>;
  cardioEntriesCount?: number;
}

const ACTIVITIES: {
  label: string;
  value: CardioActivity;
  intervalOnly?: boolean;
}[] = [
  { label: "Run", value: "run" },
  { label: "Sprint", value: "sprint", intervalOnly: true },
  { label: "Bike", value: "bike" },
  { label: "Row", value: "row" },
  { label: "Swim", value: "swim" },
  { label: "Jump Rope", value: "jump_rope" },
  { label: "Hike", value: "hike" },
  { label: "Walk", value: "walk" },
];

const HEART_RATE_ZONES: {
  label: string;
  value: HeartRateZone;
  description: string;
}[] = [
  { label: "Z1", value: "z1", description: "Very Light" },
  { label: "Z2", value: "z2", description: "Light" },
  { label: "Z3", value: "z3", description: "Moderate" },
  { label: "Z4", value: "z4", description: "Hard" },
  { label: "Z5", value: "z5", description: "Max" },
];

export function CardioLibrary({
  isFinisher = false,
  workoutId,
  onEntryChange,
  cardioEntriesCount = 0,
}: CardioLibraryProps) {
  const { theme } = useColorTheme();
  const [selectedActivity, setSelectedActivity] =
    useState<CardioActivity | null>(null);
  const [mode, setMode] = useState<CardioMode>("simple");
  const [duration, setDuration] = useState<number | undefined>();
  const [distance, setDistance] = useState<number | undefined>();
  const [calories, setCalories] = useState<number | undefined>();
  const [heartRateZone, setHeartRateZone] = useState<
    HeartRateZone | undefined
  >();
  const [workDuration, setWorkDuration] = useState<number | undefined>();
  const [restDuration, setRestDuration] = useState<number | undefined>();
  const [numIntervals, setNumIntervals] = useState<number | undefined>();
  const [distancePerInterval, setDistancePerInterval] = useState<
    number | undefined
  >();

  const isIntervalOnly = ACTIVITIES.find(
    (a) => a.value === selectedActivity,
  )?.intervalOnly;

  const reportChange = (
    overrides: Partial<{
      activity: CardioActivity | null;
      mode: CardioMode;
      duration: number | undefined;
      distance: number | undefined;
      calories: number | undefined;
      heartRateZone: HeartRateZone | undefined;
      workDuration: number | undefined;
      restDuration: number | undefined;
      numIntervals: number | undefined;
      distancePerInterval: number | undefined;
    }>,
  ) => {
    const hasOverride = (key: keyof typeof overrides) =>
      Object.prototype.hasOwnProperty.call(overrides, key);

    const activity = hasOverride("activity")
      ? overrides.activity
      : selectedActivity;

    if (!activity) {
      onEntryChange(null);
      return;
    }

    const currentMode = hasOverride("mode") ? overrides.mode! : mode;

    const currentNumIntervals = hasOverride("numIntervals")
      ? overrides.numIntervals
      : numIntervals;

    const currentDuration = hasOverride("duration")
      ? overrides.duration
      : duration;

    const currentDistance = hasOverride("distance")
      ? overrides.distance
      : distance;

    const currentCalories = hasOverride("calories")
      ? overrides.calories
      : calories;

    const currentHeartRateZone = hasOverride("heartRateZone")
      ? overrides.heartRateZone
      : heartRateZone;

    const currentWorkDuration = hasOverride("workDuration")
      ? overrides.workDuration
      : workDuration;

    const currentRestDuration = hasOverride("restDuration")
      ? overrides.restDuration
      : restDuration;

    const currentDistancePerInterval = hasOverride("distancePerInterval")
      ? overrides.distancePerInterval
      : distancePerInterval;

    const entryId = Crypto.randomUUID();

    const intervals =
      currentMode === "intervals" && currentNumIntervals
        ? Array.from({ length: currentNumIntervals }, (_, i) => ({
            id: Crypto.randomUUID(),
            cardio_entry_id: entryId,
            interval_order: i + 1,
            work_duration: currentWorkDuration,
            rest_duration: currentRestDuration,
            distance: currentDistancePerInterval,
          }))
        : [];

    onEntryChange({
      id: entryId,
      workout_id: workoutId,
      activity,
      mode: currentMode,
      duration: currentDuration || null,
      distance: currentDistance || null,
      calories: currentCalories || null,
      heart_rate_zone: currentHeartRateZone || null,
      is_finisher: isFinisher ? 1 : 0,
      entry_order: cardioEntriesCount ? cardioEntriesCount + 1 : 1,
      notes: undefined,
      intervals,
    });
  };

  const handleActivityChange = (activity: CardioActivity) => {
    setSelectedActivity(activity);
    if (ACTIVITIES.find((a) => a.value === activity)?.intervalOnly) {
      setMode("intervals");
      reportChange({ activity, mode: "intervals" });
    } else {
      reportChange({ activity });
    }
  };

  const handleModeChange = (m: CardioMode) => {
    setMode(m);
    reportChange({ mode: m });
  };

  const handleDurationChange = (val: number | undefined) => {
    setDuration(val);
    reportChange({ duration: val });
  };

  const handleDistanceChange = (val: number | undefined) => {
    setDistance(val);
    reportChange({ distance: val });
  };

  const handleCaloriesChange = (val: number | undefined) => {
    setCalories(val);
    reportChange({ calories: val });
  };

  const handleHeartRateZoneChange = (zone: HeartRateZone) => {
    const newZone = heartRateZone === zone ? undefined : zone;
    setHeartRateZone(newZone);
    reportChange({ heartRateZone: newZone });
  };

  const handleWorkDurationChange = (val: number | undefined) => {
    setWorkDuration(val);
    reportChange({ workDuration: val });
  };

  const handleRestDurationChange = (val: number | undefined) => {
    setRestDuration(val);
    reportChange({ restDuration: val });
  };

  const handleNumIntervalsChange = (val: number | undefined) => {
    setNumIntervals(val);
    reportChange({ numIntervals: val });
  };

  const handleDistancePerIntervalChange = (val: number | undefined) => {
    setDistancePerInterval(val);
    reportChange({ distancePerInterval: val });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* ACTIVITY PICKER */}
      <Text style={[styles.sectionLabel, { color: theme.color.textSecondary }]}>
        ACTIVITY
      </Text>
      <View style={styles.wrapContainer}>
        {ACTIVITIES.map((activity) => (
          <Pressable
            key={activity.value}
            onPress={() => handleActivityChange(activity.value)}
            style={[
              styles.tab,
              {
                backgroundColor:
                  selectedActivity === activity.value
                    ? theme.color.accent
                    : theme.color.input,
                borderColor: theme.color.border,
              },
            ]}
          >
            <Text
              style={{
                color:
                  selectedActivity === activity.value
                    ? theme.color.textPrimary
                    : theme.color.textSecondary,
                fontWeight: "600",
              }}
            >
              {activity.label}
            </Text>
            {activity.intervalOnly && (
              <Text style={{ color: theme.color.textSecondary, fontSize: 10 }}>
                Intervals only
              </Text>
            )}
          </Pressable>
        ))}
      </View>

      {selectedActivity && (
        <>
          {/* MODE PICKER */}
          {!isIntervalOnly && (
            <>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: theme.color.textSecondary },
                ]}
              >
                MODE
              </Text>
              <View
                style={[styles.segmentRow, { borderColor: theme.color.border }]}
              >
                {(["simple", "intervals"] as CardioMode[]).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => handleModeChange(m)}
                    style={[
                      styles.segment,
                      {
                        backgroundColor:
                          mode === m ? theme.color.accent : theme.color.input,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          mode === m
                            ? theme.color.textPrimary
                            : theme.color.textSecondary,
                        fontWeight: "700",
                        fontSize: 12,
                      }}
                    >
                      {m === "simple" ? "Simple" : "Intervals"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* SIMPLE FIELDS */}
          {mode === "simple" && (
            <>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: theme.color.textSecondary },
                ]}
              >
                DETAILS
              </Text>
              <View style={styles.fieldsRow}>
                <NumberField
                  label="Duration (min)"
                  value={duration}
                  onChange={handleDurationChange}
                  theme={theme}
                />
                <NumberField
                  label="Distance (km)"
                  value={distance}
                  onChange={handleDistanceChange}
                  theme={theme}
                  decimal
                />
              </View>
              <View style={styles.fieldsRow}>
                <NumberField
                  label="Calories"
                  value={calories}
                  onChange={handleCaloriesChange}
                  theme={theme}
                />
              </View>

              {/* HEART RATE ZONE */}
              <Text
                style={[
                  styles.sectionLabel,
                  { color: theme.color.textSecondary },
                ]}
              >
                HEART RATE ZONE
              </Text>
              <View style={styles.zoneRow}>
                {HEART_RATE_ZONES.map((zone) => (
                  <Pressable
                    key={zone.value}
                    onPress={() => handleHeartRateZoneChange(zone.value)}
                    style={[
                      styles.zoneButton,
                      {
                        backgroundColor:
                          heartRateZone === zone.value
                            ? theme.color.accent
                            : theme.color.input,
                        borderColor: theme.color.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          heartRateZone === zone.value
                            ? theme.color.textPrimary
                            : theme.color.textSecondary,
                        fontWeight: "700",
                        fontSize: 12,
                      }}
                    >
                      {zone.label}
                    </Text>
                    <Text
                      style={{
                        color:
                          heartRateZone === zone.value
                            ? theme.color.textPrimary
                            : theme.color.textSecondary,
                        fontSize: 10,
                      }}
                    >
                      {zone.description}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {/* INTERVAL FIELDS */}
          {mode === "intervals" && (
            <>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: theme.color.textSecondary },
                ]}
              >
                INTERVAL DETAILS
              </Text>
              <View style={styles.fieldsRow}>
                <NumberField
                  label="Work (sec)"
                  value={workDuration}
                  onChange={handleWorkDurationChange}
                  theme={theme}
                />
                <NumberField
                  label="Rest (sec)"
                  value={restDuration}
                  onChange={handleRestDurationChange}
                  theme={theme}
                />
              </View>
              <View style={styles.fieldsRow}>
                <NumberField
                  label="Intervals"
                  value={numIntervals}
                  onChange={handleNumIntervalsChange}
                  theme={theme}
                />
                <NumberField
                  label="Dist per interval (km)"
                  value={distancePerInterval}
                  onChange={handleDistancePerIntervalChange}
                  theme={theme}
                  decimal
                />
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

interface NumberFieldProps {
  label: string;
  value: number | undefined;
  onChange: (val: number | undefined) => void;
  theme: any;
  decimal?: boolean;
}

function NumberField({
  label,
  value,
  onChange,
  theme,
  decimal,
}: NumberFieldProps) {
  return (
    <View style={styles.numberField}>
      <Text style={[styles.fieldLabel, { color: theme.color.textSecondary }]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.numberInput,
          {
            backgroundColor: theme.color.input,
            borderColor: theme.color.border,
            color: theme.color.textPrimary,
          },
        ]}
        keyboardType={decimal ? "decimal-pad" : "numeric"}
        placeholder="-"
        placeholderTextColor={theme.color.textSecondary}
        textAlign="center"
        value={value?.toString() ?? ""}
        onChangeText={(val) => onChange(val === "" ? undefined : Number(val))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 12,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 8,
  },
  wrapContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
    columnGap: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentRow: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  fieldsRow: {
    flexDirection: "row",
    gap: 10,
  },
  numberField: {
    flex: 1,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  numberInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 14,
  },
  zoneRow: {
    flexDirection: "row",
    gap: 6,
  },
  zoneButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    gap: 2,
  },
});
