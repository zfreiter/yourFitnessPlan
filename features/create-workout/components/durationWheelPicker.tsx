import WheelPicker from "@quidone/react-native-wheel-picker";
import { useState } from "react";
import { Text, View, StyleSheet, Pressable } from "react-native";
import { useFormContext } from "react-hook-form";
import { useColorTheme } from "@/context/colorThemeContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

const dataHours = [...Array(25).keys()].map((index) => ({
  value: index,
  label: index.toString(),
}));
const dataMinutes = [...Array(60).keys()].map((index) => ({
  value: index,
  label: index.toString(),
}));

export default function DurationWheelPicker() {
  const { setValue, getValues } = useFormContext();
  const [hour, setHour] = useState(
    getValues("duration") ? Math.floor(getValues("duration") / 60) : 0,
  );
  const [minute, setMinute] = useState(
    getValues("duration")
      ? getValues("duration") - Math.floor(getValues("duration") / 60) * 60
      : 0,
  );
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useColorTheme();

  const totalMinutes = hour * 60 + minute;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.color.input,
          borderColor: theme.color.border,
        },
      ]}
    >
      <Pressable
        style={styles.headerRow}
        onPress={() => setIsOpen((prev) => !prev)}
      >
        <View style={styles.headerLeft}>
          <MaterialIcons
            name="access-time-filled"
            size={18}
            color={theme.color.accent}
          />
          <Text
            style={[styles.fieldLabel, { color: theme.color.textSecondary }]}
          >
            DURATION
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text
            style={[styles.durationValue, { color: theme.color.textPrimary }]}
          >
            {totalMinutes} min
          </Text>
          <FontAwesome6
            name={isOpen ? "circle-chevron-up" : "circle-chevron-down"}
            size={18}
            color={theme.color.accent}
          />
        </View>
      </Pressable>

      {isOpen && (
        <View style={styles.pickerRow}>
          <View style={styles.pickerColumn}>
            <WheelPicker
              style={{ backgroundColor: theme.color.surface2 }}
              itemTextStyle={{ color: theme.color.textPrimary }}
              visibleItemCount={3}
              width={90}
              data={dataHours}
              value={hour}
              onValueChanged={({ item: { value } }) => {
                setHour(value);
                setValue("duration", value * 60 + minute);
              }}
              enableScrollByTapOnItem
            />
            <Text
              style={[styles.fieldLabel, { color: theme.color.textSecondary }]}
            >
              HRS
            </Text>
          </View>

          <Text
            style={[styles.separator, { color: theme.color.textSecondary }]}
          >
            :
          </Text>

          <View style={styles.pickerColumn}>
            <WheelPicker
              style={{ backgroundColor: theme.color.surface2 }}
              itemTextStyle={{ color: theme.color.textPrimary }}
              visibleItemCount={3}
              width={90}
              data={dataMinutes}
              value={minute}
              onValueChanged={({ item: { value } }) => {
                setMinute(value);
                setValue("duration", hour * 60 + value);
              }}
              enableScrollByTapOnItem
            />
            <Text
              style={[styles.fieldLabel, { color: theme.color.textSecondary }]}
            >
              MIN
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  durationValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  pickerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
    gap: 4,
  },
  pickerColumn: {
    alignItems: "center",
    gap: 6,
  },
  separator: {
    fontSize: 24,
    fontWeight: "300",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
});
