import { View, Text, TextInput } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import RadioGroup, { RadioButtonProps } from "react-native-radio-buttons-group";
import { Dispatch, useMemo, useState, useEffect } from "react";
import { ExerciseFormData } from "@/types/common/workoutInterface";
import { UseFieldArrayReplace } from "react-hook-form";
import { useWeightRounding } from "@/hooks/useWeightRounding";
import { useUserPreference } from "@/context/userPreferenceContext";
import { Exercise } from "@/types/type";
import * as Crypto from "expo-crypto";

interface SetWeightConfiguratorProps {
  setCount: number;
  reps: number;
  replace: UseFieldArrayReplace<Exercise, "sets">;
}

export default function SetWeightConfigurator({
  setCount,
  reps,
  replace,
}: SetWeightConfiguratorProps) {
  const { theme } = useColorTheme();
  const { userPreferences } = useUserPreference();

  const [selectedId, setSelectedId] = useState<string>("1");
  const [isFocusedCustomInput, setIsFocusedCustomInput] = useState<string>("");
  const [startWeight, setStartWeight] = useState<number | null>(0);
  const [endWeight, setEndWeight] = useState<number | undefined>(0);

  const radioButtons = useMemo(
    () => [
      {
        id: "1", // acts as primary key, should be unique and non-empty string
        label: "Fill Later",
        value: "option1",
        color: theme.color.accentStrong,
        labelStyle: { color: theme.color.textPrimary },
        containerStyle: { marginLeft: 0 },
      },
      {
        id: "2",
        label: "Straight Sets",
        value: "option2",
        color: theme.color.accentStrong,
        labelStyle: { color: theme.color.textPrimary },
        containerStyle: { marginLeft: 0 },
      },
      {
        id: "3",
        label: "Ramp Sets",
        value: "option3",
        color: theme.color.accentStrong,
        labelStyle: { color: theme.color.textPrimary },
        containerStyle: { marginLeft: 0 },
      },
    ],
    [],
  );

  function calculateRampSets(
    setCount: number,
    startWeight: number,
    endWeight: number = 0,
  ): number[] {
    const weights: number[] = [];
    if (endWeight > 0) {
      const increment = (endWeight - startWeight) / (setCount - 1);

      for (let i = 0; i < setCount; i++) {
        const weight = startWeight + increment * i;
        weights.push(weight);
      }
    } else {
      for (let i = 0; i < setCount; i++) {
        weights.push(startWeight);
      }
    }
    return weights;
  }

  const calculatedWeights = useMemo(() => {
    if (startWeight !== null && startWeight > 0 && setCount >= 3) {
      return calculateRampSets(setCount, startWeight, endWeight);
    }
    return [];
  }, [setCount, startWeight, endWeight]);

  useEffect(() => {
    if (calculatedWeights.length > 0) {
      replace(
        Array.from({ length: setCount }, (_, index) => ({
          id: Crypto.randomUUID(),
          workout_exercise_id: "",
          reps: reps,
          weight: calculatedWeights[index],
          duration: 0,
          distance: 0,
          set_order: index + 1,
        })),
      );
    }
  }, [calculatedWeights, setCount, reps, replace]);

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View
        style={{
          flexDirection: "column",
          gap: theme.spacing.label,
        }}
      >
        <Text style={{ color: theme.color.textPrimary }}>Set weight</Text>
        <RadioGroup
          radioButtons={radioButtons}
          onPress={(id) => {
            setSelectedId(id);
            if (id === "1") {
              setStartWeight(0);
              setEndWeight(0);
            }
          }}
          selectedId={selectedId}
          layout="column"
          containerStyle={{
            alignItems: "flex-start",
            gap: 5,
            marginLeft: 0,
            paddingLeft: 0,
          }}
        />
      </View>

      {selectedId !== "1" && (
        <>
          <View>
            <Text
              style={{
                marginBottom: theme.spacing.label,
                fontFamily: theme.fonts.body,
                color: theme.color.textPrimary,
              }}
            >
              {selectedId === "2" ? "Weight for each set" : "Starting weight"}
            </Text>
            <TextInput
              keyboardType="numeric"
              placeholder={
                selectedId === "2"
                  ? "Weight for each set..."
                  : "Starting weight..."
              }
              placeholderTextColor={theme.color.placeholderColor}
              value={startWeight?.toString() || ""}
              onFocus={() => {
                setIsFocusedCustomInput("focusedFirst");
                if (startWeight === 0) setStartWeight(null);
              }}
              onBlur={() => {
                setIsFocusedCustomInput("");
                if (startWeight === null) setStartWeight(0);
              }}
              onChangeText={(text) => {
                const numericValue = parseInt(text, 10);
                if (isNaN(numericValue)) {
                  setStartWeight(0);
                } else {
                  setStartWeight(numericValue);
                }
              }}
              onSubmitEditing={() => {
                console.log("submit");
              }}
              editable
              style={[
                {
                  borderRadius: 8,
                  borderWidth: 1,
                  height: theme.spacing.inputHeight,
                  paddingHorizontal: theme.spacing.lg,
                  color: theme.color.textPrimary,
                  backgroundColor: theme.color.surface2,
                  borderColor:
                    isFocusedCustomInput === "focusedFirst"
                      ? theme.color.accentStrong
                      : theme.color.border,
                },
              ]}
            />
          </View>
          {startWeight !== 0 && (
            <Text style={{ color: theme.color.textPrimary }}>
              {`${startWeight} ${userPreferences?.unit_system === "metric" ? "kg" : "lbs"}`}
            </Text>
          )}
        </>
      )}

      {selectedId === "3" && (
        <>
          <View>
            <Text
              style={{
                marginBottom: theme.spacing.label,
                fontFamily: theme.fonts.body,
                color: theme.color.textPrimary,
              }}
            >
              {`Final weight`}
            </Text>
            <TextInput
              keyboardType="numeric"
              placeholder="Final Weight..."
              placeholderTextColor={theme.color.placeholderColor}
              value={endWeight?.toString() || ""}
              onFocus={() => {
                setIsFocusedCustomInput("focusedFinal");
                if (endWeight === 0) setEndWeight(undefined);
              }}
              onBlur={() => {
                setIsFocusedCustomInput("");
                if (endWeight === undefined) setEndWeight(0);
              }}
              onChangeText={(text) => {
                const numericValue = parseInt(text, 10);
                if (isNaN(numericValue)) {
                  setEndWeight(0);
                } else {
                  setEndWeight(numericValue);
                }
              }}
              onSubmitEditing={() => {
                console.log("submit");
              }}
              editable
              style={[
                {
                  borderRadius: 8,
                  borderWidth: 1,
                  height: theme.spacing.inputHeight,
                  paddingHorizontal: theme.spacing.lg,
                  color: theme.color.textPrimary,
                  backgroundColor: theme.color.surface2,
                  borderColor:
                    isFocusedCustomInput === "focusedFinal"
                      ? theme.color.accentStrong
                      : theme.color.border,
                },
              ]}
            />
          </View>
          {endWeight !== 0 && (
            <Text style={{ color: theme.color.textPrimary }}>
              {`${endWeight} ${userPreferences?.unit_system === "metric" ? "kg" : "lbs"}`}
            </Text>
          )}
        </>
      )}
      {startWeight !== null && startWeight > 0 && (
        <View
          style={{
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.lg,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: theme.color.textPrimary,
              marginBottom: theme.spacing.sm,
            }}
          >
            Ramp Preview
          </Text>
          <View
            style={{
              backgroundColor: theme.color.surface,
              borderRadius: 8,
              padding: theme.spacing.sm,
              gap: theme.spacing.xs,
            }}
          >
            {calculatedWeights.map((weight, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    width: 50,
                    color: theme.color.textSecondary,
                    fontSize: 14,
                    fontWeight: "500",
                  }}
                >
                  Set {index + 1}
                </Text>
                <Text
                  style={{
                    flex: 1,
                    color: theme.color.textPrimary,
                    fontSize: 15,
                  }}
                >
                  {reps} reps
                </Text>
                <Text
                  style={{
                    color: theme.color.accent,
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  {weight}{" "}
                  {userPreferences?.unit_system === "metric" ? "kg" : "lbs"}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
