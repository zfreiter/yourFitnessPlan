import { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, Platform } from "react-native";
import { Controller, useFormContext } from "react-hook-form";
import DateTimePicker from "@react-native-community/datetimepicker";
import AntDesign from "@expo/vector-icons/AntDesign";
import { GenericTextInput } from "../../../components/ui/GenericTextInput";
import { useDebouncedFieldUpdate } from "@/hooks/useDebouncedFieldUpdate";
import { useWorkout } from "@/context/workoutContent";

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
  const { updateContextWorkoutField } = useWorkout();
  const watchDuration = watch("duration");
  const [duration, setDuration] = useState(watchDuration);
  const workoutId = getValues("id");

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
              onChange={(event: any, selectedDate?: Date) => {
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

                if (mode === "date") {
                  setMode("time");
                } else {
                  // update the date in the db and context
                  updateContextWorkoutField(
                    workoutId,
                    "date",
                    selectedDate.toISOString()
                  );
                  setBackupDate(selectedDate);

                  setMode("date");
                  setShow(false);
                }
              }}
            />
          )}
        />
      )}
    </View>
  );
}
