import { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Platform,
  StyleSheet,
} from "react-native";
import { Controller, useFormContext } from "react-hook-form";
import DateTimePicker from "@react-native-community/datetimepicker";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useWorkout } from "@/context/workoutContext";
import { Checkbox } from "expo-checkbox";
import { useColorTheme } from "@/context/colorThemeContext";
import DurationWheelPicker from "./durationWheelPicker";
import { workoutService } from "@/services/workoutService";
import { formatDateForDatabase } from "@/utils/date";
import Toast from "react-native-toast-message";
import { useAuth } from "@/context/authContext";

interface WorkoutSessionFooterProps {
  show: boolean;
  mode: "date" | "time";
  openDatePicker: () => void;
  setMode: (mode: "date" | "time") => void;
  setShow: (show: boolean) => void;
}

export function WorkoutSessionFooter({
  show,
  mode,
  openDatePicker,
  setMode,
  setShow,
}: WorkoutSessionFooterProps) {
  const [isDateFocused, setIsDateFocused] = useState(false);
  const { control, getValues, setValue } = useFormContext();
  const [backupDate, setBackupDate] = useState(getValues("date"));
  const { updateContextWorkoutField, updateContextWorkoutCompleted } =
    useWorkout();
  const { theme } = useColorTheme();
  const { user } = useAuth();

  return (
    <View
      style={{
        flexDirection: "column",
        gap: theme.spacing.lg,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.xl * 2,
      }}
    >
      <DurationWheelPicker />

      {/* Date & Time */}
      <View style={{ gap: theme.spacing.label }}>
        <Text style={[styles.fieldLabel, { color: theme.color.textSecondary }]}>
          DATE & TIME
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.dateButton,
            {
              backgroundColor: pressed
                ? theme.color.surface2
                : theme.color.input,
              borderColor: isDateFocused
                ? theme.color.accentActive
                : theme.color.border,
            },
          ]}
          onPress={() => {
            setIsDateFocused(true);
            openDatePicker();
          }}
          onBlur={() => setIsDateFocused(false)}
        >
          <View style={styles.dateButtonLeft}>
            <AntDesign name="calendar" size={18} color={theme.color.accent} />
            <Text
              style={[styles.dateMode, { color: theme.color.textSecondary }]}
            >
              {mode.toUpperCase()}
            </Text>
          </View>
          <View style={styles.dateButtonRight}>
            <Text
              style={[styles.dateValue, { color: theme.color.textPrimary }]}
            >
              {getValues().date.toLocaleDateString()}
            </Text>
            <Text
              style={[styles.dateValue, { color: theme.color.textPrimary }]}
            >
              {getValues().date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </Pressable>
      </View>

      {show && (
        <Controller
          name="date"
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <DateTimePicker
              value={value}
              mode={mode}
              is24Hour={false}
              display="default"
              onTouchStart={() => setIsDateFocused(true)}
              onBlur={() => {
                setIsDateFocused(false);
                onBlur();
              }}
              onChange={async (event: any, selectedDate?: Date) => {
                setIsDateFocused(true);

                const isAndroidDismiss =
                  Platform.OS === "android" &&
                  (event?.type === "dismissed" ||
                    event?.type === "neutral" ||
                    event?.type === undefined ||
                    event?.type !== "set");

                if (isAndroidDismiss) {
                  setValue("date", backupDate, { shouldDirty: false });
                  setIsDateFocused(false);
                  setShow(false);
                  setMode("date");
                  return;
                }

                if (mode === "date" && selectedDate) {
                  setMode("time");
                  setValue("date", selectedDate, { shouldDirty: false });
                  return;
                }

                if (mode === "time" && selectedDate) {
                  onChange(selectedDate);
                  setBackupDate(selectedDate);
                  setShow(false);
                  setMode("date");
                  const localDateString = formatDateForDatabase(selectedDate);

                  try {
                    const response = await workoutService.updateWorkoutField(
                      user?.id!,
                      getValues().id,
                      "scheduled_datetime",
                      localDateString,
                    );
                    if (response.success) {
                      console.log("Service success, updating context with:", {
                        userId: user?.id,
                        workoutId: getValues().id,
                        field: "scheduled_datetime",
                        value: localDateString,
                      });
                      updateContextWorkoutField(
                        user?.id!,
                        getValues().id,
                        "scheduled_datetime",
                        localDateString,
                      );
                      console.log("Context update called");
                    } else {
                      setValue("date", backupDate);
                      Toast.show({
                        type: "error",
                        text1: "Failed to update date",
                        text2: "Please try again",
                      });
                    }
                  } catch (error) {
                    setValue("date", backupDate);
                    Toast.show({
                      type: "error",
                      text1: "Failed to update date",
                      text2: "Please try again",
                    });
                  }
                }

                setIsDateFocused(false);
              }}
            />
          )}
        />
      )}

      {/* Completed */}
      <View style={styles.completedRow}>
        <Text style={[styles.fieldLabel, { color: theme.color.textSecondary }]}>
          WORKOUT COMPLETED
        </Text>
        <Controller
          name="isCompleted"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Checkbox
              style={{ borderColor: theme.color.border }}
              value={value}
              onValueChange={async (newValue) => {
                const response = await workoutService.updateCompleted(
                  user?.id!,
                  getValues().id,
                  newValue,
                  newValue ? new Date().toISOString() : null,
                );
                if (response.success) {
                  onChange(newValue);
                  updateContextWorkoutCompleted(
                    getValues().id,
                    newValue,
                    newValue ? new Date().toISOString() : null,
                  );
                }
              }}
              color={value ? theme.color.accentActive : undefined}
            />
          )}
        />
      </View>
    </View>
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
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  dateButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateMode: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  dateButtonRight: {
    flexDirection: "row",
    gap: 8,
  },
  dateValue: {
    fontSize: 14,
  },
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
});
