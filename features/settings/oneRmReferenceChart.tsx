import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { LineChart } from "react-native-chart-kit";

// Expo-friendly single-file component that renders a reference chart for % of 1RM up to 600
// Install: expo install react-native-chart-kit react-native-svg

export default function OneRmReferenceChart() {
  const [oneRmRaw, setOneRmRaw] = useState("200");
  const [unit, setUnit] = useState("lb"); // 'lb' or 'kg'
  const width = Dimensions.get("window").width - 32;

  const oneRm = useMemo(() => {
    const parsed = parseFloat(oneRmRaw.replace(/[^0-9.]/g, "")) || 0;
    return parsed;
  }, [oneRmRaw]);

  // percentages to display on the chart (common training percentages)
  const percents = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40];

  // compute weights for each percent, cap at 600 (or 272 kg ≈ 600lb)
  const maxCap = unit === "lb" ? 600 : Math.round(600 / 2.20462); // cap in kg converted

  const weights = useMemo(() => {
    return percents.map((p) => {
      const w = Math.round(oneRm * (p / 100) * 10) / 10; // one decimal
      return w > maxCap ? maxCap : w;
    });
  }, [oneRm, percents, maxCap]);

  // labels for chart (show only a few to avoid overlap)
  const labels = percents.map((p) => `${p}%`);

  // small helper to format a displayed weight with rounding to gym-friendly increments
  function roundToNearest(value: number, increment = unit === "lb" ? 2.5 : 1) {
    return Math.round(value / increment) * increment;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
    >
      <Text style={styles.title}>
        1RM → % Reference Chart (cap {maxCap} {unit})
      </Text>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Enter 1RM ({unit}):</Text>
          <TextInput
            value={oneRmRaw}
            onChangeText={setOneRmRaw}
            keyboardType="numeric"
            placeholder="e.g. 200"
            style={styles.input}
          />
        </View>

        <View style={{ marginLeft: 12, justifyContent: "flex-end" }}>
          <TouchableOpacity
            onPress={() => setUnit((u) => (u === "lb" ? "kg" : "lb"))}
            style={styles.unitBtn}
          >
            <Text style={styles.unitBtnText}>
              Switch to {unit === "lb" ? "kg" : "lb"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.subtitle}>Chart — % of 1RM</Text>

      <LineChart
        data={{
          labels,
          datasets: [{ data: weights }],
        }}
        width={width}
        height={220}
        yAxisSuffix={` ${unit}`}
        yAxisInterval={1}
        chartConfig={{
          backgroundGradientFrom: "#ffffff",
          backgroundGradientTo: "#ffffff",
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(34, 150, 243, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(100,100,100, ${opacity})`,
          style: { borderRadius: 8 },
          propsForDots: { r: "4" },
        }}
        bezier
        style={{ marginVertical: 8, borderRadius: 8 }}
        fromZero
        yLabelsOffset={8}
      />

      <Text style={styles.subtitle}>Quick reference table</Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.cell, styles.cellHeader]}>% of 1RM</Text>
        <Text style={[styles.cell, styles.cellHeader]}>Weight ({unit})</Text>
        <Text style={[styles.cell, styles.cellHeader]}>Rounded</Text>
      </View>

      {percents.map((p, i) => {
        const w = weights[i];
        const rounded = roundToNearest(w, unit === "lb" ? 2.5 : 1);
        const capped = w >= maxCap;
        return (
          <View key={p} style={styles.tableRow}>
            <Text style={styles.cell}>{p}%</Text>
            <Text style={styles.cell}>{capped ? `${w} (cap)` : w}</Text>
            <Text style={styles.cell}>{rounded}</Text>
          </View>
        );
      })}

      <Text style={styles.note}>
        Notes: Values are simple percentage calculations of the entered 1RM.
        Caps values at {maxCap} {unit}. Use rounding to match gym increments;
        consider rounding down for safety.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f8fb" },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  subtitle: { fontSize: 16, fontWeight: "600", marginTop: 12 },
  label: { fontSize: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  unitBtn: { backgroundColor: "#2266f3", padding: 10, borderRadius: 8 },
  unitBtnText: { color: "#fff", fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "flex-end" },
  tableHeader: {
    flexDirection: "row",
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
    marginTop: 8,
    borderRadius: 8,
  },
  cellHeader: { fontWeight: "700" },
  cell: { flex: 1, textAlign: "center" },
  note: { marginTop: 12, color: "#555" },
});
