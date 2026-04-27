import { View, Text, Pressable, Modal, TextInput } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import { useState, useEffect, use } from "react";
import CustomModal from "@/components/ui/customModal";
import { UseFieldArrayReplace } from "react-hook-form";
import { Exercise } from "@/types/common/workoutInterface";
import * as Crypto from "expo-crypto";

export default function SetManager({
  replace,
  optionsChoice,
  chosenExerciseName,
  setCount,
  setSetCount,
}: {
  replace: UseFieldArrayReplace<Exercise, "sets">;
  optionsChoice: string | null;
  chosenExerciseName: string;
  setCount: number;
  setSetCount: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [customButtonActive, setCustomButtonActive] = useState<boolean>(false);
  const [isCountValid, setIsCountValid] = useState<boolean>(true);
  const [isFocusedCustomInput, setIsFocusedCustomInput] =
    useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const { theme } = useColorTheme();

  useEffect(() => {
    return () => {
      setSetCount(0);
      setCustomButtonActive(false);
      setIsCountValid(true);
      setIsFocusedCustomInput(false);
      setIsModalVisible(false);
    };
  }, [optionsChoice, chosenExerciseName]);

  return (
    <View>
      <Text
        style={{
          marginBottom: theme.spacing.label,
          fontFamily: theme.fonts.headerBody,
          color: theme.color.textPrimary,
        }}
      >
        Set count
      </Text>
      <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
        {[3, 4, 5, 6, 7].map((count) => (
          <Pressable
            key={count}
            onPress={() => {
              setSetCount(count);
              setCustomButtonActive(false);
              replace(
                Array.from({ length: count }, (_, index) => ({
                  id: Crypto.randomUUID(),
                  workout_exercise_id: "",
                  reps: 0,
                  weight: 0,
                  duration: 0,
                  distance: 0,
                  set_order: index + 1,
                })),
              );
            }}
            style={({ pressed }) => [
              {
                padding: 10,
                borderWidth: 1,
                borderColor:
                  setCount === count
                    ? theme.color.accentStrong
                    : theme.color.border,
                borderRadius: 8,
                backgroundColor:
                  setCount === count
                    ? theme.color.accentStrong
                    : theme.color.surface,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={{
                fontFamily: theme.fonts.stats,
                color: theme.color.textPrimary,
              }}
            >
              {count}
            </Text>
          </Pressable>
        ))}

        <Pressable
          onPress={() => {
            setSetCount(0);
            setCustomButtonActive(true);
            setIsModalVisible(true);
          }}
          style={({ pressed }) => [
            {
              padding: 10,
              borderWidth: 1,
              borderColor:
                customButtonActive === true
                  ? theme.color.accentStrong
                  : theme.color.border,
              borderRadius: 8,
              backgroundColor:
                customButtonActive === true
                  ? theme.color.accentStrong
                  : theme.color.surface,
            },
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={{
              fontFamily: theme.fonts.stats,
              color: theme.color.textPrimary,
            }}
          >
            Custom
            {setCount !== null && setCount >= 1 && setCount <= 20
              ? ` (${setCount})`
              : ""}
          </Text>
        </Pressable>
      </View>
      <CustomModal
        visible={isModalVisible}
        onDismiss={() => {
          setCustomButtonActive(false);
          setSetCount(0);
          setIsModalVisible(false);
        }}
        onClose={() => {
          if (setCount === 0 || setCount < 1 || setCount > 20) {
            setIsCountValid(false);
            setSetCount(0);
            return;
          }
          replace(
            Array.from({ length: setCount }, (_, index) => ({
              id: Crypto.randomUUID(),
              workout_exercise_id: "",
              reps: 0,
              weight: 0,
              duration: 0,
              distance: 0,
              set_order: index + 1,
            })),
          );
          setCustomButtonActive(false);
          setIsModalVisible(false);
        }}
        title="Custom Set Count"
        closeButtonText="Confirm"
      >
        <View>
          <Text
            style={{
              marginBottom: theme.spacing.label,
              fontFamily: theme.fonts.body,
              color: theme.color.textPrimary,
            }}
          >
            Enter a number between 1 and 20
          </Text>
          <TextInput
            keyboardType="numeric"
            placeholder="Custom Set Count (1-20)"
            placeholderTextColor={theme.color.placeholderColor}
            value={setCount?.toString() || ""}
            onFocus={() => setIsFocusedCustomInput(true)}
            onBlur={() => {
              setIsFocusedCustomInput(false);
            }}
            onChangeText={(text) => {
              const numericValue = parseInt(text, 10);
              const oldValue = setCount;
              if (!isNaN(numericValue)) {
                setIsCountValid(numericValue >= 1 && numericValue <= 20);
                if (numericValue >= 1 && numericValue <= 20) {
                  setSetCount(numericValue);
                }
              } else {
                setSetCount(0);
              }
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
                borderColor: isFocusedCustomInput
                  ? theme.color.accentStrong
                  : theme.color.border,
              },
            ]}
          />
          {isCountValid === false && (
            <Text
              style={{
                fontFamily: theme.fonts.body,
                color: theme.color.danger,
                marginTop: theme.spacing.xs,
              }}
            >
              Please enter a number between 1 and 20.
            </Text>
          )}
        </View>
      </CustomModal>
    </View>
  );
}

const styles = {
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
};
