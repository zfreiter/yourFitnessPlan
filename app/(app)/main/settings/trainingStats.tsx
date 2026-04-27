import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  StyleSheet,
} from "react-native";
import RepMaxModal from "@/features/settings/trainingStats/repMaxModal";
import { useForm, Controller } from "react-hook-form";
import { useColorTheme } from "@/context/colorThemeContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMaxLift } from "@/context/maxLiftContext";
//import { insertMultipleMaxLifts } from "@/lib/api/maxs";
import { useWeightRounding } from "@/hooks/useWeightRounding";
import { useUserPreference } from "@/context/userPreferenceContext";

interface TrainingStatsForm {
  squat_1rm: string | null;
  bench_press_1rm: string | null;
  deadlift_1rm: string | null;
  overhead_press_1rm: string | null;
  power_clean_1rm: string | null;
  squat_tested_date: string | null;
  bench_press_tested_date: string | null;
  deadlift_tested_date: string | null;
  overhead_press_tested_date: string | null;
  power_clean_tested_date: string | null;
}

export const calculate1RM = (
  weight: number,
  reps: number,
  formula: "epley" | "brzycki" | "lombardi",
): number => {
  if (reps === 1) return weight;
  switch (formula) {
    case "epley":
      return weight * (1 + reps / 30);
    case "brzycki":
      return weight * (36 / (37 - reps));
    case "lombardi":
      return weight * Math.pow(reps, 0.1);
    default:
      return weight;
  }
};

export default function TrainingStatsForm() {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [reps, setReps] = useState(0);
  const [weight, setWeight] = useState(0);
  const [oneRepMax, setOneRepMax] = useState<number | null>(null);
  const { userPreferences } = useUserPreference();
  const { exerciseMaxes, isMaxLiftLoading, insertMaxLifts } = useMaxLift();
  const { theme } = useColorTheme();
  const { roundWeight } = useWeightRounding();

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { isDirty, dirtyFields },
  } = useForm<TrainingStatsForm>({
    defaultValues: {
      squat_1rm: null,
      bench_press_1rm: null,
      deadlift_1rm: null,
      overhead_press_1rm: null,
      power_clean_1rm: null,
      squat_tested_date: null,
      bench_press_tested_date: null,
      deadlift_tested_date: null,
      overhead_press_tested_date: null,
      power_clean_tested_date: null,
    },
  });

  const [calculateRepMax, setCalculateRepMax] = useState<
    | { name: ""; label: "" }
    | { name: "squat_1rm"; label: "Squat 1RM" }
    | { name: "bench_press_1rm"; label: "Bench Press 1RM" }
    | { name: "deadlift_1rm"; label: "Deadlift 1RM" }
    | { name: "overhead_press_1rm"; label: "Overhead Press 1RM" }
    | { name: "power_clean_1rm"; label: "Power Clean 1RM" }
  >({ name: "", label: "" });

  const onSubmit = async (data: TrainingStatsForm) => {
    const processedData = {
      squat_1rm: data.squat_1rm ? parseFloat(data.squat_1rm) : null,
      bench_press_1rm: data.bench_press_1rm
        ? parseFloat(data.bench_press_1rm)
        : null,
      deadlift_1rm: data.deadlift_1rm ? parseFloat(data.deadlift_1rm) : null,
      overhead_press_1rm: data.overhead_press_1rm
        ? parseFloat(data.overhead_press_1rm)
        : null,
      power_clean_1rm: data.power_clean_1rm
        ? parseFloat(data.power_clean_1rm)
        : null,
      squat_tested_date: data.squat_tested_date,
      bench_press_tested_date: data.bench_press_tested_date,
      deadlift_tested_date: data.deadlift_tested_date,
      overhead_press_tested_date: data.overhead_press_tested_date,
      power_clean_tested_date: data.power_clean_tested_date,
    };
    const result = await insertMaxLifts(
      userPreferences!.user_id,
      processedData,
      dirtyFields,
    );
    if (result) {
      reset(data);
    }
  };

  const liftInputs = [
    { name: "squat_1rm", label: "Squat 1RM", dateName: "squat_tested_date" },
    {
      name: "bench_press_1rm",
      label: "Bench Press 1RM",
      dateName: "bench_press_tested_date",
    },
    {
      name: "deadlift_1rm",
      label: "Deadlift 1RM",
      dateName: "deadlift_tested_date",
    },
    {
      name: "overhead_press_1rm",
      label: "Overhead Press 1RM",
      dateName: "overhead_press_tested_date",
    },
    {
      name: "power_clean_1rm",
      label: "Power Clean 1RM",
      dateName: "power_clean_tested_date",
    },
  ] as const;

  useEffect(() => {
    if (isMaxLiftLoading) return;

    for (const [key, value] of Object.entries(exerciseMaxes)) {
      setValue(
        key as keyof TrainingStatsForm,
        value.one_rep_max?.toString() ?? null,
        { shouldDirty: false, shouldValidate: false, shouldTouch: false },
      );
      setValue(
        `${key.replace("_1rm", "_tested_date")}` as keyof TrainingStatsForm,
        value.tested_date ?? null,
        { shouldDirty: false, shouldValidate: false, shouldTouch: false },
      );
    }
  }, [isMaxLiftLoading, exerciseMaxes, setValue]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.color.background,
          padding: theme.spacing.screenPadding,
        },
      ]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: theme.spacing.xl, paddingBottom: 100 }}
      >
        {liftInputs.map((lift) => (
          <View
            key={lift.name}
            style={[
              styles.liftCard,
              {
                backgroundColor: theme.color.surface,
                borderColor: theme.color.border,
              },
            ]}
          >
            {/* 1RM input */}
            <View style={{ gap: theme.spacing.label }}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: theme.color.textSecondary },
                ]}
              >
                {lift.label.toUpperCase()}
              </Text>
              <Controller
                name={lift.name as keyof TrainingStatsForm}
                control={control}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    placeholder={`${lift.label} (${userPreferences?.weight_unit || "lbs"})...`}
                    value={value?.toString() || ""}
                    placeholderTextColor={theme.color.placeholderColor}
                    onChangeText={(text) => {
                      if (text === "" || /^\d*\.?\d{0,2}$/.test(text))
                        onChange(text);
                    }}
                    onFocus={() => setFocusedField(lift.name)}
                    onBlur={() => {
                      setFocusedField(null);
                      onBlur();
                    }}
                    keyboardType="numeric"
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.color.input,
                        borderColor:
                          focusedField === lift.name
                            ? theme.color.accentActive
                            : theme.color.border,
                        color: theme.color.textPrimary,
                      },
                    ]}
                  />
                )}
              />
            </View>

            {/* Date input */}
            <View style={{ gap: theme.spacing.label }}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: theme.color.textSecondary },
                ]}
              >
                LAST TESTED
              </Text>
              <Controller
                name={lift.dateName as keyof TrainingStatsForm}
                control={control}
                render={({ field: { onChange, value } }) => (
                  <>
                    <Pressable
                      onPress={() => setShowDatePicker(lift.dateName)}
                      style={({ pressed }) => [
                        styles.input,
                        {
                          backgroundColor: theme.color.input,
                          borderColor:
                            showDatePicker === lift.dateName
                              ? theme.color.accentActive
                              : theme.color.border,
                          opacity: pressed ? 0.7 : 1,
                          justifyContent: "center",
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: value
                            ? theme.color.textPrimary
                            : theme.color.placeholderColor,
                        }}
                      >
                        {value || "YYYY-MM-DD"}
                      </Text>
                    </Pressable>
                    {showDatePicker === lift.dateName && (
                      <DateTimePicker
                        value={value ? new Date(value) : new Date()}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={(_, selectedDate) => {
                          setShowDatePicker(null);
                          if (selectedDate)
                            onChange(selectedDate.toISOString().split("T")[0]);
                        }}
                      />
                    )}
                  </>
                )}
              />
            </View>

            {/* Calculate button */}
            <Pressable
              style={({ pressed }) => [
                styles.calcButton,
                {
                  borderColor: theme.color.accent,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={() => {
                setCalculateRepMax({
                  name: lift.name,
                  label: lift.label,
                } as Parameters<typeof setCalculateRepMax>[0]);
                setShowModal(true);
              }}
            >
              <Text
                style={[styles.calcButtonText, { color: theme.color.accent }]}
              >
                Calculate from Rep Max
              </Text>
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={handleSubmit(onSubmit)}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: !isDirty
                ? theme.color.surface
                : theme.color.accentStrong,
              borderColor: theme.color.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          disabled={!isDirty}
        >
          <Text
            style={[
              styles.saveButtonText,
              { color: isDirty ? "#fff" : theme.color.textSecondary },
            ]}
          >
            Save Training Stats
          </Text>
        </Pressable>
      </ScrollView>

      <RepMaxModal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          setReps(0);
          setWeight(0);
          setOneRepMax(null);
        }}
        title={calculateRepMax.label}
      >
        <View style={{ gap: theme.spacing.label }}>
          <Text
            style={[styles.fieldLabel, { color: theme.color.textSecondary }]}
          >
            REPS
          </Text>
          <TextInput
            placeholder="Reps..."
            value={reps > 0 ? reps.toString() : ""}
            placeholderTextColor={theme.color.placeholderColor}
            onChangeText={(v) => setReps(v === "" ? 0 : Number(v))}
            onFocus={() => setFocusedField("reps")}
            onBlur={() => setFocusedField(null)}
            keyboardType="numeric"
            style={[
              styles.input,
              {
                backgroundColor: theme.color.input,
                borderColor:
                  focusedField === "reps"
                    ? theme.color.accentActive
                    : theme.color.border,
                color: theme.color.textPrimary,
              },
            ]}
          />
        </View>

        <View style={{ gap: theme.spacing.label }}>
          <Text
            style={[styles.fieldLabel, { color: theme.color.textSecondary }]}
          >
            WEIGHT
          </Text>
          <TextInput
            placeholder="Weight..."
            value={weight > 0 ? weight.toString() : ""}
            placeholderTextColor={theme.color.placeholderColor}
            onChangeText={(v) => setWeight(v === "" ? 0 : Number(v))}
            onFocus={() => setFocusedField("weight")}
            onBlur={() => setFocusedField(null)}
            keyboardType="numeric"
            style={[
              styles.input,
              {
                backgroundColor: theme.color.input,
                borderColor:
                  focusedField === "weight"
                    ? theme.color.accentActive
                    : theme.color.border,
                color: theme.color.textPrimary,
              },
            ]}
          />
        </View>

        {oneRepMax !== null && (
          <View
            style={[
              styles.resultCard,
              {
                backgroundColor: theme.color.surface2,
                borderColor: theme.color.border,
              },
            ]}
          >
            <Text
              style={[styles.fieldLabel, { color: theme.color.textSecondary }]}
            >
              ESTIMATED 1RM
            </Text>
            <Text
              style={[styles.resultValue, { color: theme.color.textPrimary }]}
            >
              {oneRepMax} {userPreferences?.weight_unit || "lbs"}
            </Text>
          </View>
        )}

        <Pressable
          onPress={() => {
            if (userPreferences?.rm_formula !== undefined) {
              setOneRepMax(
                parseFloat(
                  calculate1RM(
                    weight,
                    reps,
                    userPreferences.rm_formula,
                  ).toFixed(2),
                ),
              );
            }
          }}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor:
                oneRepMax === null
                  ? theme.color.accentStrong
                  : theme.color.surface,
              borderColor: theme.color.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          disabled={oneRepMax !== null}
        >
          <Text
            style={{
              color: oneRepMax === null ? "#fff" : theme.color.textSecondary,
              fontSize: 15,
              fontWeight: "600",
            }}
          >
            Calculate 1RM
          </Text>
        </Pressable>

        {oneRepMax !== null && (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() => {
                if (calculateRepMax.name)
                  setValue(calculateRepMax.name, oneRepMax.toFixed(2), {
                    shouldDirty: true,
                    shouldValidate: true,
                    shouldTouch: true,
                  });
                setShowModal(false);
                setReps(0);
                setWeight(0);
                setOneRepMax(null);
              }}
              style={({ pressed }) => [
                styles.saveButton,
                {
                  flex: 1,
                  backgroundColor: theme.color.accentStrong,
                  borderColor: theme.color.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
                Use This Value
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setReps(0);
                setWeight(0);
                setOneRepMax(null);
              }}
              style={({ pressed }) => [
                styles.saveButton,
                {
                  flex: 1,
                  backgroundColor: theme.color.surface,
                  borderColor: theme.color.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: theme.color.textPrimary,
                  fontSize: 15,
                  fontWeight: "600",
                }}
              >
                Reset
              </Text>
            </Pressable>
          </View>
        )}
      </RepMaxModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  input: { borderWidth: 1, padding: 10, borderRadius: 8, fontSize: 15 },
  liftCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 12,
  },
  calcButton: {
    padding: 11,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  calcButtonText: { fontWeight: "600", fontSize: 14 },
  saveButton: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: { fontSize: 15, fontWeight: "600" },
  resultCard: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  resultValue: { fontSize: 24, fontWeight: "700" },
});
