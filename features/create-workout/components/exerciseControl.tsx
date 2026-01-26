import { useColorTheme } from "@/context/colorThemeContext";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import {
  Control,
  Controller,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form";
import { ValidUnit } from "@/types/interfaces/types";
import { Exercise, ExerciseFormData } from "@/types/type";
import { Ionicons } from "@expo/vector-icons";
import Entypo from "@expo/vector-icons/Entypo";

interface ExerciseControlProps {
  chosenExercise: Exercise | null;
  control: any;
  watchSetsLen: number;
  optionsChoice: string | null;
  onOptionChange: (itemValue: string, itemIndex: number) => void;
}

export function ExerciseControl({
  chosenExercise,
  control,

  watchSetsLen,
  optionsChoice,
  onOptionChange,
}: ExerciseControlProps) {
  const { theme } = useColorTheme();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "sets",
  });

  const handleAddSet = useCallback(() => {
    append({
      reps: 0,
      weight: 0,
      duration: 0,
      distance: 0,
      set_order: 0,
    });
  }, [append]);

  const handleRemoveSet = useCallback(
    (index: number) => {
      remove(index);
    },
    [remove]
  );

  if (!chosenExercise) {
    return null;
  }

  return (
    <View style={{}}>
      <View style={{}}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.exerciseName, { color: theme.color.textPrimary }]}
            >
              {`${chosenExercise.exercise_name}`}
            </Text>

            <Text
              style={[
                styles.setDetailsHeader,
                { color: theme.color.textSecondary },
              ]}
            >
              {chosenExercise.exercise_description}
            </Text>
          </View>

          <View
            style={[
              styles.SetCardInputContainer,
              {
                height: 40,
                width: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.color.surface,
                borderWidth: 1,
                borderColor: theme.color.accentStrong,
              },
            ]}
          >
            <Pressable
              style={({ pressed }) => [
                {
                  backgroundColor: pressed
                    ? theme.color.surface
                    : "transparent",
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              onPress={handleAddSet}
            >
              <View style={[styles.addIconContainer]}>
                <Ionicons
                  name="add"
                  size={20}
                  color={theme.color.accentStrong}
                />
              </View>
            </Pressable>
          </View>

          <View
            style={[
              styles.SetCardInputContainer,
              {
                height: 40,
                width: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.color.surface,
                borderWidth: 1,
                borderColor: theme.color.accentStrong,
              },
            ]}
          >
            <Pressable
              style={({ pressed }) => [
                {
                  backgroundColor: pressed
                    ? theme.color.surface
                    : "transparent",
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              onPress={() => handleRemoveSet(watchSetsLen - 1)}
            >
              <View style={[styles.addIconContainer]}>
                <Entypo
                  name="minus"
                  size={24}
                  color={theme.color.accentStrong}
                />
              </View>
            </Pressable>
          </View>
        </View>
      </View>

      {/* If the exercise has more than one option we need to give the user the options */}
      {chosenExercise.validUnits && chosenExercise.validUnits.length > 1 && (
        <>
          <Text
            style={[styles.optionsLabel, { color: theme.color.textPrimary }]}
          >
            Options
          </Text>
          <View
            style={[
              styles.pickerContainer,
              {
                margin: 0,
                padding: 0,
                backgroundColor: theme.color.surface,
                borderWidth: 1,
                borderColor: theme.color.accentStrong,
              },
            ]}
          >
            <Picker
              mode="dialog"
              onValueChange={onOptionChange}
              accessibilityLabel="Exercise options"
              accessibilityHint="Select the type of measurement for this exercise"
              style={[
                {
                  height: 50,
                  backgroundColor: theme.color.surface,
                  color: theme.color.textPrimary,
                },
              ]}
            >
              {chosenExercise.validUnits.map((unit, index) => (
                <Picker.Item
                  key={index}
                  label={
                    Array.isArray(unit) ? unit.join(" and ") : String(unit)
                  }
                  value={Array.isArray(unit) ? unit.join("-") : String(unit)}
                />
              ))}
            </Picker>
          </View>
        </>
      )}
      {optionsChoice && (
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 20,
          }}
        >
          {fields.map((field, index) => (
            <Pressable
              key={index}
              accessibilityLabel={`Set ${index + 1}`}
              accessibilityHint="Long-press to remove this set"
              accessibilityRole="button"
              style={{
                padding: 10,
                borderWidth: 1,
                borderColor: theme.color.border,
                backgroundColor: theme.color.surface,
                borderRadius: 20,
              }}
              onLongPress={() => {
                Alert.alert("Remove set", `Set ${index + 1} `);
                handleRemoveSet(index);
              }}
            >
              {chosenExercise.validUnits &&
              chosenExercise.validUnits.length > 1 ? (
                <View
                  style={{
                    flexDirection: "column",
                  }}
                >
                  <Text style={{ color: theme.color.textPrimary }}>
                    Set {index + 1}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    {optionsChoice && (
                      <Options
                        options={optionsChoice}
                        index={index}
                        control={control}
                      />
                    )}
                  </View>
                </View>
              ) : (
                <View
                  style={{
                    flexDirection: "column",
                  }}
                >
                  <Text style={{ color: theme.color.textPrimary }}>
                    Set {index + 1}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <Options
                      options={chosenExercise.validUnits?.[0].join("-") || ""}
                      index={index}
                      control={control}
                    />
                  </View>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

interface OptionsProps {
  options: string;
  index: number;
  control: Control<ExerciseFormData>;
}

export function Options({ options, index, control }: OptionsProps) {
  const { theme } = useColorTheme();

  const renderInput = (
    name: keyof ExerciseFormData["sets"][number],
    placeholder: string,
    accessibilityLabel: string
  ) => {
    return (
      <Controller
        key={`${index}-${name}`}
        name={`sets.${index}.${name}`}
        control={control}
        render={({ field: { onChange, value } }) => (
          <View
            style={{
              gap: 2,
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <Text
              style={[
                styles.setInputLabel,
                { color: theme.color.textSecondary },
              ]}
            >
              {placeholder}
            </Text>
            <TextInput
              style={[
                styles.setInput,
                {
                  height: 50,
                  width: 70,
                  paddingHorizontal: 10,
                  textAlign: "center",
                  textAlignVertical: "center",
                  fontSize: 18,
                  color: theme.color.textPrimary,
                  backgroundColor: theme.color.surface,
                  borderWidth: 1,
                  borderColor: theme.color.accent,
                  borderRadius: 8,
                },
              ]}
              keyboardType="numeric"
              onChangeText={(text) =>
                onChange(text ? parseFloat(text) : undefined)
              }
              value={value?.toString()}
              accessibilityLabel={accessibilityLabel}
            />
          </View>
        )}
      />
    );
  };

  let content: JSX.Element | JSX.Element[] | null = null;
  switch (options) {
    case "reps":
      return renderInput("reps", "Reps", `Set ${index + 1} reps`);
      break;
    case "weight":
      return renderInput("weight", "kg", `Set ${index + 1} weight`);
      break;
    case "time":
      return renderInput("duration", "sec.", `Set ${index + 1} time`);
      break;
    case "distance":
      return renderInput("distance", "m", `Set ${index + 1} distance`);
      break;
    case "time-distance":
      return [
        renderInput("duration", "sec.", `Set ${index + 1} time`),
        renderInput("distance", "m", `Set ${index + 1} distance`),
      ];
      break;
    case "reps-weight":
      return [
        renderInput("reps", "Reps", `Set ${index + 1} reps`),
        renderInput("weight", "kg", `Set ${index + 1} weight`),
      ];
      break;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    fontWeight: "medium",
  },
  textError: {
    fontSize: 16,
    fontWeight: "semibold",
    color: "#DC2626",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "white",
    marginVertical: 4,
    color: "#1F2937",
  },
  addExerciseButton: {},
  addSetButton: {
    backgroundColor: "#2563EB",
    marginTop: 8,
  },
  removeSetButton: {
    backgroundColor: "#DC2626",
    marginTop: 4,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  pickerContainer: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    overflow: "hidden",
    padding: 0,
    backgroundColor: "white",
    marginTop: 4,
  },
  scrollViewContainer: {},
  headerContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  exerciseName: {
    marginTop: 4,
    textAlign: "left",
    fontSize: 18,
    fontWeight: "500",
  },
  setDetailsHeader: {
    marginTop: 4,
    marginBottom: 20,
    textAlign: "left",
    fontSize: 16,
    fontWeight: "500",
    color: "#4B5563",
  },
  optionsLabel: {
    marginTop: 4,
    color: "#4B5563",
    fontSize: 16,
  },
  setContainer: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  setInput: {
    width: 45,
    textAlign: "right",
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 5,
    padding: 5,
    backgroundColor: "white",
    fontSize: 16,
  },
  setInputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#4B5563",
  },
  hr: {
    borderBottomColor: "#D1D5DB",
    borderBottomWidth: 1,
    width: "100%",
  },
  inputError: {
    borderColor: "#DC2626",
  },
  SetCardInputContainer: {},
  addIconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
