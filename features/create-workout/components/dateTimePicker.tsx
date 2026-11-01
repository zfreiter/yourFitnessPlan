import { View, Text, StyleSheet, Pressable } from "react-native";
import React, { useState } from "react";
import { Controller, useWatch, useFormContext } from "react-hook-form";
import { useColorTheme } from "@/context/colorThemeContext";
import { CreateWorkoutForm } from "@/types/interfaces/types";
import DateTimePicker from "@react-native-community/datetimepicker";
import { parseScheduledDate, changeScheduledDate } from "@/utils/scheduledDate";
import AntDesign from "@expo/vector-icons/AntDesign";
import * as Localization from "expo-localization";

export function DateTimePickerInput() {
  const [inputFieldFocused, setInputFieldFocused] = useState("");
  const [mode, setMode] = useState<"date" | "time">("date");
  const [show, setShow] = useState(false);
  const { theme } = useColorTheme();
  const { control } = useFormContext<CreateWorkoutForm>();

  const userLocale = Localization.getLocales()[0]?.languageTag || "en-US";
  const userTimeZone = Localization.getCalendars()[0]?.timeZone;

  const scheduledDateTime = useWatch({ control, name: "scheduled_datetime" });

  const parsedDate = parseScheduledDate(scheduledDateTime);

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
              {parsedDate
                ? parsedDate.toLocaleDateString(userLocale, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    timeZone: userTimeZone || undefined,
                  })
                : scheduledDateTime ? "Invalid scheduled date" : "Select date"}
            </Text>
            <Text
              style={[styles.dateValue, { color: theme.color.textPrimary }]}
            >
              {parsedDate
                ? parsedDate.toLocaleTimeString(userLocale, {
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
              value={parseScheduledDate(value) ?? new Date(2000, 0, 1, 12)}
              mode={mode}
              is24Hour={false}
              display="default"
              onChange={(event, selectedDate) => {
                if (event.type !== "set" || !selectedDate) {
                  setShow(false);
                  return;
                }
                onChange(changeScheduledDate(value, selectedDate, mode));
                if (mode === "date") setMode("time");
                else {
                  setMode("date");
                  setShow(false);
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
