import WheelPicker from "@quidone/react-native-wheel-picker";
import { Controller, useFormContext } from "react-hook-form";
import { useState } from "react";
import { Text, View } from "react-native";
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
    getValues("duration") ? Math.floor(getValues("duration") / 60) : 0
  );
  const [minute, setMinute] = useState(
    getValues("duration")
      ? getValues("duration") - Math.floor(getValues("duration") / 60) * 60
      : 0
  );
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useColorTheme();
  console.log("value of duration", getValues("duration"));
  return (
    <View
      style={{
        backgroundColor: theme.color.surface,
        borderColor: theme.color.border,
        borderWidth: 1,
        borderRadius: 8,
        //padding: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        flexDirection: "column",
        justifyContent: "center",
        height: isOpen ? "auto" : 48,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: theme.spacing.sm,
          }}
        >
          <MaterialIcons
            name="access-time-filled"
            size={30}
            color={theme.color.textPrimary}
          />
          <Text
            style={{
              color: theme.color.textPrimary,
              padding: theme.spacing.label,
              fontSize: 16,
              fontWeight: "bold",
            }}
          >
            Duration
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",

            gap: 8,
            paddingVertical: theme.spacing.sm,
          }}
        >
          <Text
            style={{
              color: theme.color.textPrimary,
              padding: theme.spacing.label,
              fontSize: 16,
              fontWeight: "bold",
            }}
          >
            Minutes: {hour * 60 + minute}
          </Text>
          {isOpen ? (
            <FontAwesome6
              name="circle-chevron-up"
              size={30}
              color={theme.color.accent}
              onPress={() => setIsOpen(false)}
            />
          ) : (
            <FontAwesome6
              name="circle-chevron-down"
              size={30}
              color={theme.color.accent}
              onPress={() => setIsOpen(true)}
            />
          )}
        </View>
      </View>

      {isOpen && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginVertical: theme.spacing.lg,
          }}
        >
          <WheelPicker
            style={{ backgroundColor: theme.color.surface2 }}
            itemTextStyle={{ color: theme.color.textPrimary }}
            visibleItemCount={3}
            width={100}
            data={dataHours}
            value={hour}
            onValueChanged={({ item: { value } }) => {
              setHour(value);
              setValue("duration", value * 60 + minute);
            }}
            enableScrollByTapOnItem={true}
          />
          <Text
            style={{
              alignSelf: "center",
              marginHorizontal: 8,
              color: theme.color.textPrimary,
            }}
          >
            Hour
          </Text>
          <WheelPicker
            style={{ backgroundColor: theme.color.surface2 }}
            itemTextStyle={{ color: theme.color.textPrimary }}
            visibleItemCount={3}
            width={100}
            data={dataMinutes}
            value={minute}
            onValueChanged={({ item: { value } }) => {
              setMinute(value);
              setValue("duration", hour * 60 + value);
            }}
            enableScrollByTapOnItem={true}
          />
          <Text
            style={{
              alignSelf: "center",
              marginHorizontal: 8,
              color: theme.color.textPrimary,
            }}
          >
            mins
          </Text>
        </View>
      )}
    </View>
  );
}
