import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import { useColorTheme } from "@/context/colorThemeContext";
import {
  useFormContext,
  useFieldArray,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
} from "react-hook-form";
import { CardioEntry, CreateWorkoutForm } from "@/types/interfaces/types";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { CardioLibrary } from "./cardioLibrary";
import { AddCardioButton } from "./addCardioButton";

interface AddCardioModalProps {
  append: UseFieldArrayAppend<CreateWorkoutForm, "cardio_entries">;
  remove: UseFieldArrayRemove;
  cardioEntriesCount: number;
}
export default function AddCardioModal({
  append,
  remove,
  cardioEntriesCount,
}: AddCardioModalProps) {
  const [cardioLibraryKey, setCardioLibraryKey] = useState(0);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedCardioEntry, setSelectedCardioEntry] =
    useState<CardioEntry | null>(null);
  const { theme } = useColorTheme();
  const { control, watch, getValues } = useFormContext<CreateWorkoutForm>();
  console.log("carioLibraryKey", cardioLibraryKey);
  const resetCardioLibrary = () => {
    setSelectedCardioEntry(null);
    setCardioLibraryKey((prev) => prev + 1);
  };

  return (
    <View style={{ flex: 1, gap: 0 }}>
      <Pressable
        onPress={() => {
          (resetCardioLibrary(), setModalVisible(true));
        }}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
          {
            height: theme.spacing.buttonHeight,
            backgroundColor: theme.color.accent,
            borderColor: theme.color.border,
          },
        ]}
      >
        <Text>+ Cardio</Text>
      </Pressable>
      {modalVisible && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          statusBarTranslucent={true}
          onRequestClose={() => {
            setModalVisible(false);
          }}
        >
          <SafeAreaView
            style={{ flex: 1, backgroundColor: theme.color.accent }}
            edges={["top", "bottom"]}
          >
            <View
              style={{
                flex: 1,
                paddingHorizontal: theme.spacing.screenPadding,
                backgroundColor: theme.color.background,
              }}
            >
              <Pressable
                onPress={() => {
                  setModalVisible(false);
                  resetCardioLibrary();
                }}
              >
                <MaterialIcons
                  name="cancel"
                  size={30}
                  style={{ marginTop: 10, alignSelf: "flex-end" }}
                  color={theme.color.accent}
                />
              </Pressable>

              <CardioLibrary
                key={cardioLibraryKey}
                isFinisher={true}
                workoutId={getValues("id")}
                cardioEntriesCount={cardioEntriesCount}
                onEntryChange={setSelectedCardioEntry}
              />

              <AddCardioButton
                setModalVisible={setModalVisible}
                disabled={!selectedCardioEntry}
                appendCardio={() => {
                  if (!selectedCardioEntry) return;

                  console.log(
                    "1 BEFORE APPEND:",
                    JSON.stringify(selectedCardioEntry, null, 2),
                  );

                  append(selectedCardioEntry);

                  console.log(
                    "2 AFTER APPEND FORM:",
                    JSON.stringify(getValues("cardio_entries"), null, 2),
                  );

                  resetCardioLibrary();
                }}
              />
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
