import { View, Text, StyleSheet, Pressable } from "react-native";
import React, { useEffect, useState } from "react";
import { Controller, useWatch, useFormContext } from "react-hook-form";
import { useColorTheme } from "@/context/colorThemeContext";
import { CreateWorkoutForm } from "@/types/interfaces/types";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams } from "expo-router";
import AntDesign from "@expo/vector-icons/AntDesign";
import * as Localization from "expo-localization";

const getCurrentDateInLocalTimezone = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const DEFAULT_TIME = "12:00";

const getDatePart = (dateTime: string) =>
  dateTime && dateTime.includes(" ") ? dateTime.split(" ")[0] : dateTime;

const getTimePart = (dateTime: string) => {
  if (!dateTime) return DEFAULT_TIME;
  if (dateTime.includes(" ")) return dateTime.split(" ")[1].slice(0, 5);
  const candidate = dateTime.slice(0, 5);
  return /\d{2}:\d{2}/.test(candidate) ? candidate : DEFAULT_TIME;
};

const combineDateTime = (datePart: string, timePart: string) =>
  `${datePart} ${timePart}`;

const parseDateInLocalTimezone = (dateString: string) => {
  if (!dateString) return new Date();

  // Handle ISO format from new Date().toISOString()
  if (dateString.includes("T")) {
    return new Date(dateString);
  }

  // Handle custom format "2024-01-01 12:00"
  const datePart = getDatePart(dateString) || getCurrentDateInLocalTimezone();
  const timePart = getTimePart(dateString) || DEFAULT_TIME;
  return new Date(`${datePart}T${timePart}:00`);
};

export function DateTimePickerInput() {
  const [inputFieldFocused, setInputFieldFocused] = useState("");
  const [mode, setMode] = useState<"date" | "time">("date");
  const [show, setShow] = useState(false);
  const { theme } = useColorTheme();
  const { date } = useLocalSearchParams();
  const {
    register,
    control,
    formState: { errors },
    setValue,
  } = useFormContext<CreateWorkoutForm>();

  const userLocale = Localization.getLocales()[0]?.languageTag || "en-US";
  const userTimeZone = Localization.getCalendars()[0]?.timeZone;

  const scheduledDateTime = useWatch({ control, name: "scheduled_datetime" });

  useEffect(() => {
    register("scheduled_datetime");
    // Set default to current date and time in local format
    setValue(
      "scheduled_datetime",
      combineDateTime(getCurrentDateInLocalTimezone(), DEFAULT_TIME),
      { shouldDirty: false, shouldValidate: false, shouldTouch: false },
    );
  }, []);

  useEffect(() => {
    if (date) {
      setValue(
        "scheduled_datetime",
        combineDateTime(date as string, DEFAULT_TIME),
        { shouldDirty: true, shouldValidate: false, shouldTouch: false },
      );
    }
  }, [date]);

  const openDatePicker = () => {
    setMode("date");
    setShow(true);
  };

  return (
    <>
      <View style={{ gap: theme.spacing.label }}>
        <Text style={[styles.fieldLabel, { color: theme.color.textSecondary }]}>
          DATE & TIME
        </Text>

        <Pressable
          onFocus={() => setInputFieldFocused("dateTime")}
          onBlur={() => setInputFieldFocused("")}
          style={({ pressed }) => [
            styles.dateButton,
            {
              backgroundColor: pressed
                ? theme.color.surface2
                : theme.color.input,
              borderColor:
                inputFieldFocused === "dateTime"
                  ? theme.color.accentActive
                  : theme.color.border,
              height: theme.spacing.buttonHeight,
              borderWidth: 1,
            },
          ]}
          onPress={openDatePicker}
        >
          <View style={styles.dateButtonLeft}>
            <AntDesign name="calendar" size={18} color={theme.color.accent} />
            <Text
              style={[styles.fieldLabel, { color: theme.color.textSecondary }]}
            >
              {mode.toUpperCase()}
            </Text>
          </View>
          <View style={styles.dateButtonRight}>
            <Text
              style={[styles.dateValue, { color: theme.color.textPrimary }]}
            >
              {scheduledDateTime
                ? parseDateInLocalTimezone(
                    scheduledDateTime,
                  ).toLocaleDateString(userLocale, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    timeZone: userTimeZone || undefined,
                  })
                : "Select date"}
            </Text>
            <Text
              style={[styles.dateValue, { color: theme.color.textPrimary }]}
            >
              {scheduledDateTime
                ? parseDateInLocalTimezone(
                    scheduledDateTime,
                  ).toLocaleTimeString(userLocale, {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                    timeZone: userTimeZone || undefined,
                  })
                : "Select time"}
            </Text>
          </View>
        </Pressable>
      </View>

      {show && (
        <Controller
          name="scheduled_datetime"
          control={control}
          render={({ field: { onChange, value } }) => (
            <DateTimePicker
              value={parseDateInLocalTimezone(value)}
              mode={mode}
              is24Hour={false}
              display="default"
              onChange={(_, selectedDate) => {
                if (selectedDate) {
                  if (mode === "date") {
                    const yyyy = selectedDate.getFullYear();
                    const mm = String(selectedDate.getMonth() + 1).padStart(
                      2,
                      "0",
                    );
                    const dd = String(selectedDate.getDate()).padStart(2, "0");
                    onChange(
                      combineDateTime(
                        `${yyyy}-${mm}-${dd}`,
                        getTimePart(value) || DEFAULT_TIME,
                      ),
                    );
                    setMode("time");
                  } else {
                    const hh = String(selectedDate.getHours()).padStart(2, "0");
                    const min = String(selectedDate.getMinutes()).padStart(
                      2,
                      "0",
                    );
                    onChange(
                      combineDateTime(
                        getDatePart(value) || getCurrentDateInLocalTimezone(),
                        `${hh}:${min}`,
                      ),
                    );
                    setMode("date");
                    setShow(false);
                  }
                }
              }}
            />
          )}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  dateButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateButtonRight: {
    flexDirection: "row",
    gap: 8,
  },
  dateValue: {
    fontSize: 14,
  },
});
