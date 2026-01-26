import { useState, useRef } from "react";
import { View, Text, Pressable, TextInput, Platform } from "react-native";
import { Controller, useFormContext } from "react-hook-form";
import DateTimePicker from "@react-native-community/datetimepicker";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useWorkout } from "@/context/workoutContext";
import { Checkbox } from "expo-checkbox";
import { useColorTheme } from "@/context/colorThemeContext";
import DurationWheelPicker from "./durationWheelPicker";
import { workoutService } from "@/services/workoutService";
import { useDatabase } from "@/context/databaseContext";
import { formatDateForDatabase } from "@/utils/date";
import Toast from "react-native-toast-message";

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
  const [isDateFocused, setIsDateFocused] = useState<boolean>(false);
  const { resetField, reset, control, getValues, setValue, watch } =
    useFormContext();
  const [backupDate, setBackupDate] = useState(getValues("date"));
  const { updateContextWorkoutField, updateContextWorkoutCompleted } =
    useWorkout();
  const { theme } = useColorTheme();
  const { db } = useDatabase();
  const DurationInputRef = useRef<TextInput>(null);

  return (
    <View
      style={{
        flexDirection: "column",
        gap: theme.spacing.lg,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.xl * 2,
        //paddingBottom: 100,
      }}
    >
      <DurationWheelPicker />

      <View style={{ gap: theme.spacing.label }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "bold",
            color: theme.color.textPrimary,
          }}
        >
          Date & Time
        </Text>

        <Pressable
          style={({ pressed }) => [
            {
              backgroundColor: pressed ? "gray" : theme.color.surface,
            },
            {
              padding: 10,
              borderColor: isDateFocused
                ? theme.color.accentActive
                : theme.color.border,
              borderWidth: 1,
              borderRadius: 8,
            },
          ]}
          onPress={() => {
            setIsDateFocused(true);
            openDatePicker();
          }}
          onBlur={() => setIsDateFocused(false)}
        >
          <View
            style={{
              flexDirection: "row",
              gap: 5,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <AntDesign name="calendar" size={24} color={theme.color.accent} />
              <Text
                style={{ textAlign: "center", color: theme.color.textPrimary }}
              >
                {mode}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 5 }}>
              <Text style={{ margin: 5, color: theme.color.textPrimary }}>
                {getValues().date.toLocaleDateString()}
              </Text>
              <Text style={{ margin: 5, color: theme.color.textPrimary }}>
                {getValues().date.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }).length > 7
                  ? getValues().date.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : `  ${getValues().date.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`}
              </Text>
            </View>
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
              onTouchStart={() => {
                setIsDateFocused(true);
                console.log("picker tapped!");
              }}
              onBlur={() => {
                setIsDateFocused(false);
                onBlur();
              }}
              onChange={async (event: any, selectedDate?: Date) => {
                // Set focus state
                setIsDateFocused(true);

                // Handle Android dismiss cases
                const isAndroidDismiss =
                  Platform.OS === "android" &&
                  (event?.type === "dismissed" ||
                    event?.type === "neutral" ||
                    event?.type === undefined ||
                    event?.type !== "set");

                // Handle dismiss
                if (isAndroidDismiss) {
                  setValue("date", backupDate, { shouldDirty: false });
                  setIsDateFocused(false);
                  setShow(false);
                  setMode("date");
                  return;
                }

                // user clicked SET on date step
                // save selected date and move to time step
                if (mode === "date" && selectedDate) {
                  setMode("time");
                  setValue("date", selectedDate, { shouldDirty: false });
                  return;
                }

                // user clicked SET on time step (final)
                if (mode === "time" && selectedDate) {
                  onChange(selectedDate);
                  setBackupDate(selectedDate);
                  setShow(false);
                  setMode("date");
                  const localDateString = formatDateForDatabase(selectedDate);

                  // Update the workout session date in the context and database
                  //
                  if (db) {
                    try {
                      const response = await workoutService.updateWorkoutField(
                        db,
                        getValues().id,
                        "scheduled_datetime",
                        localDateString
                      );

                      // Update context if successful, otherwise revert to backup date
                      if (response.success) {
                        updateContextWorkoutField(
                          getValues().id,
                          "scheduled_datetime",
                          localDateString
                        );
                      } else {
                        // Revert on failure
                        setValue("date", backupDate);
                        console.error("Failed to update workout date");
                        Toast.show({
                          type: "error",
                          text1: "Failed to update date",
                          text2: "Please try again",
                        });
                      }
                    } catch (error) {
                      console.error("Error updating workout date:", error);
                      setValue("date", backupDate);
                      Toast.show({
                        type: "error",
                        text1: "Failed to update date",
                        text2: "Please try again",
                      });
                    }
                  }
                }

                // Clear focus state
                setIsDateFocused(false);
              }}
            />
          )}
        />
      )}

      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "bold",
            alignSelf: "baseline",
            color: theme.color.textPrimary,
          }}
        >
          Workout completed
        </Text>

        <Controller
          name="isCompleted"
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <Checkbox
              style={{
                backgroundColor: theme.color.surface,
                borderColor: theme.color.accent,
              }}
              value={value}
              onValueChange={async (newValue) => {
                if (!db) return;
                const response = await workoutService.updateCompleted(
                  db,
                  getValues().id,
                  newValue,
                  newValue ? new Date().toISOString() : null
                );
                if (response.success) {
                  onChange(newValue);
                  updateContextWorkoutCompleted(
                    getValues().id,
                    newValue,
                    newValue ? new Date().toISOString() : null
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
