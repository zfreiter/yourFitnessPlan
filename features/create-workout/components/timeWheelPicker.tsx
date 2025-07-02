import React, { useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import WheelPicker from "react-native-wheel-picker-expo";

export function TimeWheelPicker() {
  const hours = Array.from({ length: 24 }, (__, i) => ({
    label: i.toString().padStart(2, "0"),
    value: i,
  }));

  const minutes = Array.from({ length: 60 }, (_, i) => ({
    label: i.toString().padStart(2, "0"),
    value: i,
  }));

  const [selectedHour, setSelectedHour] = useState(0);
  const [selectedMinute, setSelectedMinute] = useState(0);

  return (
    <View style={styles.container}>
      <View>
        <Text style={{ textAlign: "center" }}>Hour</Text>
        <WheelPicker
          initialSelectedIndex={selectedHour}
          height={100}
          items={hours}
          onChange={({ index }) => setSelectedHour(index)}
        />
      </View>
      <View style={{ marginHorizontal: 20 }}>
        <Text style={{ textAlign: "center" }}>Minute</Text>
        <WheelPicker
          initialSelectedIndex={selectedMinute}
          height={100}
          items={minutes}
          onChange={({ index }) => setSelectedMinute(index)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
