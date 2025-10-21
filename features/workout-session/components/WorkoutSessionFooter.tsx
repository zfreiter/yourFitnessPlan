import { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, Platform } from "react-native";
import { Controller, useFormContext } from "react-hook-form";
import DateTimePicker from "@react-native-community/datetimepicker";
import AntDesign from "@expo/vector-icons/AntDesign";
import { GenericTextInput } from "../../../components/ui/GenericTextInput";
import { useDebouncedFieldUpdate } from "@/hooks/useDebouncedFieldUpdate";
import { useWorkout } from "@/context/workoutContent";
import { workoutService } from "@/services/workoutService";
import { useDatabase } from "@/context/databaseContext";
import { convertDate } from "@/utils/date";
import { dateToUnixEpoch } from "@/utils/date";
import { Checkbox } from "expo-checkbox";
import { format } from "date-fns";
import { useHome } from "@/context/HomeContext";
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
  const { control, getValues, setValue, watch } = useFormContext();
  const [backupDate, setBackupDate] = useState(getValues("date"));
  const { updateContextWorkoutField, updateContextWorkoutCompleted } =
    useWorkout();
  const watchDuration = watch("duration");
  const [duration, setDuration] = useState(watchDuration);
  const workoutId = getValues("id");
  const { db } = useDatabase();
  const { setResetFlag } = useHome();
  const debouncedUpdateDuration = useDebouncedFieldUpdate({
    fieldName: "duration",
    workoutId,
    onSuccess: (workoutId, field, value) => {
      setValue("duration", value);
      setDuration(value);
      updateContextWorkoutField(workoutId, "duration", value);
    },
    onError: (field, error) => {
      setValue("duration", watchDuration);
      setDuration(watchDuration);
      console.error("Error updating duration:", error);
    },
  });

  useEffect(() => {
    if (watchDuration !== duration) {
      debouncedUpdateDuration(watchDuration);
    }
  }, [watchDuration]);

  return (
    <View style={{ flexDirection: "column", gap: 10, marginVertical: 10 }}>
      <GenericTextInput
        name="duration"
        placeholder="Workout Duration(minutes)"
        title="Workout Duration"
        keyboardType="number-pad"
      />
      <View style={{ gap: 5 }}>
        <Text style={{ fontSize: 16, fontWeight: "bold" }}>Date & Time</Text>
        <Pressable
          style={({ pressed }) => [
            {
              backgroundColor: pressed ? "gray" : "white",
            },
            {
              padding: 10,
              borderColor: "black",
              borderWidth: 1,
              borderRadius: 8,
            },
          ]}
          onPress={openDatePicker}
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
              <AntDesign name="calendar" size={24} color="black" />
              <Text style={{ textAlign: "center" }}>{mode}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 5 }}>
              <Text style={{ margin: 5 }}>
                {getValues().date.toLocaleDateString()}
              </Text>
              <Text style={{ margin: 5 }}>
                {getValues().date.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
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
              onChange={async (event: any, selectedDate?: Date) => {
                // On Android, the picker emits a 'dismissed' type when Cancel is pressed.

                if (
                  Platform.OS === "android" &&
                  event?.type &&
                  event.type !== "set"
                ) {
                  onChange(backupDate);
                  setShow(false);
                  setMode("date");

                  return;
                }

                if (!selectedDate) {
                  return;
                }

                onChange(selectedDate);

                // Set to time picker
                if (mode === "date") {
                  setMode("time");
                }

                // We need to update the db and the context with the new date
                if (mode === "time") {
                  // update the date in the db and context
                  // console.log(
                  //   "updating date in the db and context toISOString, yyyy, month, day, hours, mins",
                  //   selectedDate.toISOString(),
                  //   selectedDate.getFullYear(),
                  //   String(selectedDate.getMonth() + 1).padStart(2, "0"),
                  //   String(selectedDate.getDate()).padStart(2, "0"),
                  //   String(selectedDate.getHours()).padStart(2, "0"),
                  //   String(selectedDate.getMinutes()).padStart(2, "0")
                  // );
                  // console.log(
                  //   "formated date with library ",
                  //   format(selectedDate, "yyyy-MM-d'T'HH':'mm")
                  // );
                  console.log(
                    "date in workout footer ",
                    format(selectedDate, "yyyy-MM-d' 'HH':'mm':'ss")
                  );
                  const convertedDate = convertDate(selectedDate);
                  try {
                    if (!db) {
                      console.log("Database error. Can not connect");
                      onChange(backupDate);
                      setShow(false);
                      setMode("date");
                      return;
                    }
                    const convertedDate = format(
                      selectedDate,
                      "yyyy-MM-d' 'HH':'mm"
                    );
                    const result = await workoutService.updateWorkoutField(
                      db,
                      workoutId,
                      "scheduled_datetime",
                      convertedDate
                    );

                    if (result) {
                      console.log(
                        "new date to check ",
                        selectedDate.toISOString()
                      );
                      updateContextWorkoutField(
                        workoutId,
                        "scheduled_datetime",
                        convertedDate
                      );
                    }
                  } catch (error) {
                    onChange(backupDate);
                    setShow(false);
                    setMode("date");
                    return;
                  }

                  setBackupDate(selectedDate);

                  setMode("date");
                  setShow(false);
                }
              }}
            />
          )}
        />
      )}
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: "bold" }}>
          Workout completed
        </Text>
        <Controller
          name="isCompleted"
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <Checkbox
              style={{ backgroundColor: "white" }}
              value={value}
              onValueChange={async (newValue) => {
                const workoutId = getValues().id;
                const scheduledDate = getValues().date;
                const completedDate = format(
                  new Date(),
                  "yyyy-MM-d' 'HH':'mm':'ss"
                );

                if (db) {
                  const result = await workoutService.updateCompleted(
                    db,
                    workoutId,
                    newValue,
                    newValue ? completedDate : null
                  );
                  if (result) {
                    setResetFlag(true);
                    updateContextWorkoutCompleted(
                      workoutId,
                      newValue,
                      newValue ? completedDate : null
                    );
                    setValue("isCompleted", newValue);
                    setValue("completed_at", newValue ? completedDate : null);
                  } else {
                    console.log("Could not update database");
                  }
                } else {
                  console.log("Database error, unable to connect");
                }

                onChange(newValue);
              }}
              color={value ? "#00994C" : undefined}
            />
          )}
        />
      </View>
    </View>
  );
}
