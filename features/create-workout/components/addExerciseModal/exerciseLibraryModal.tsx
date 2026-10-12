import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useMemo, useEffect } from "react";
import { useColorTheme } from "@/context/colorThemeContext";
import { AddExerciseForm, Exercise, ValidUnit } from "@/types/interfaces/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useWorkout } from "@/context/workoutContext";
import { UseFieldArrayAppend, UseFieldArrayRemove } from "react-hook-form";
import * as Crypto from "expo-crypto";

interface ExerciseLibraryModalProps {
  selectedLoggingStyle: string;
  append: UseFieldArrayAppend<AddExerciseForm, "exercises">;
  remove: UseFieldArrayRemove;
  workoutId: string;
  exerciseCount: number | undefined;
}

const MUSCLE_GROUPS = [
  "All",
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
];

const MUSCLE_GROUP_COLECTION: { [key: string]: string[] } = {
  chest: ["pectoralis major", "pectoralis minor"],
  back: ["latissimus dorsi", "trapezius", "rhomboids"],
  legs: [
    "glutes",
    "hamstrings",
    "quadriceps",
    "hamstrings",
    "glutes",
    "calves",
    "hips",
  ],
  shoulders: ["shoulders", "deltoids", "rotator cuff"],
  arms: ["biceps", "triceps", "forearms"],
  core: ["rectus abdominis", "obliques", "transverse abdominis"],
};

const EQUIPMENT_OPTIONS = [
  "All",
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "kettlebell",
  "bands",
];

export function ExerciseLibraryModal({
  selectedLoggingStyle,
  append,
  remove,
  workoutId,
  exerciseCount,
}: ExerciseLibraryModalProps) {
  const { theme } = useColorTheme();
  const [chosenExercises, setChosenExercises] = useState<Exercise[] | null>(
    null,
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [activeMuscle, setActiveMuscle] = useState(["All"]);
  const [activeEquipment, setActiveEquipment] = useState(["All"]);
  const [showFilters, setShowFilters] = useState(false);

  const { exercises } = useWorkout();

  const handleExerciseConfirm = (selected: Exercise[]) => {
    remove();

    const groupType: "superset" | "compound_set" | null =
      selectedLoggingStyle === "superset" ||
      selectedLoggingStyle === "compound_set"
        ? selectedLoggingStyle
        : null;

    const groupId =
      groupType !== null && selected.length > 1 ? Crypto.randomUUID() : null;

    selected.forEach((exercise, index) => {
      append({
        id: Crypto.randomUUID(),
        workout_id: workoutId,
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        description: exercise.description,

        validUnits: [...exercise.validUnits],

        musclesTargeted: [...exercise.musclesTargeted],
        equipment: [...exercise.equipment],

        exercise_order: (exerciseCount ?? 0) + index,

        group_id: groupId,
        group_type: groupType,
        round_number: null,

        sets: [],
      });
    });
  };

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesSearch = ex.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesMuscle = activeMuscle.includes("All")
        ? true
        : (ex.musclesTargeted ?? []).some((m) =>
            activeMuscle.some((group) =>
              MUSCLE_GROUP_COLECTION[group]?.includes(m.toLowerCase()),
            ),
          );

      const matchesEquipment = activeEquipment.includes("All")
        ? true
        : (ex.equipment ?? []).some((e) =>
            activeEquipment.some((a) => a === e.toLowerCase()),
          );

      return matchesSearch && matchesMuscle && matchesEquipment;
    });
  }, [exercises, search, activeMuscle, activeEquipment]);

  const activeFilterCount =
    (activeMuscle.includes("All") ? 0 : activeMuscle.length) +
    (activeEquipment.includes("All") ? 0 : activeEquipment.length);

  const isReadyToConfirm =
    selectedLoggingStyle === "regular"
      ? chosenExercises?.length === 1
      : chosenExercises?.length === 2;

  useEffect(() => {
    if (!modalVisible) {
      setSearch("");
      setActiveMuscle(["All"]);
      setActiveEquipment(["All"]);
      setShowFilters(false);
      setChosenExercises(null);
    }
  }, [modalVisible]);

  return (
    <View>
      {/* OPEN MODAL BUTTON */}
      <Pressable
        onPress={() => setModalVisible(true)}
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
        <Text style={{ color: theme.color.textPrimary }}>Choose Exercise</Text>
      </Pressable>

      {/* MODAL */}
      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView
          style={{ flex: 1, backgroundColor: theme.color.background }}
          edges={["top", "bottom"]}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.color.textPrimary }]}>
              Select Exercise
            </Text>
            <Pressable onPress={() => setModalVisible(false)}>
              <Ionicons
                name="close"
                size={24}
                color={theme.color.textPrimary}
              />
            </Pressable>
          </View>

          {/* SEARCH + FILTER BUTTON */}
          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: theme.color.input,
                  borderColor: theme.color.border,
                },
              ]}
            >
              <Ionicons
                name="search"
                size={18}
                color={theme.color.textSecondary}
              />
              <TextInput
                style={[styles.searchInput, { color: theme.color.textPrimary }]}
                placeholder="Search exercises..."
                placeholderTextColor={theme.color.textSecondary}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <Pressable
              onPress={() => setShowFilters((prev) => !prev)}
              style={[
                styles.filterButton,
                {
                  backgroundColor:
                    activeFilterCount > 0
                      ? theme.color.accent
                      : theme.color.input,
                  borderColor: theme.color.border,
                },
              ]}
            >
              <Ionicons
                name="options"
                size={18}
                color={theme.color.textPrimary}
              />
            </Pressable>
          </View>

          {/* FILTERS */}
          {showFilters && (
            <View style={{ gap: 12 }}>
              {/* MUSCLE */}
              <Text
                style={[styles.filterLabel, { color: theme.color.textPrimary }]}
              >
                MUSCLE GROUP
              </Text>

              <ScrollView>
                <View style={styles.wrapContainer}>
                  {MUSCLE_GROUPS.map((item) => (
                    <Pressable
                      key={item}
                      onPress={() => {
                        setActiveMuscle((prev) => {
                          if (prev.includes(item)) {
                            if (item === "All") {
                              return [];
                            }
                            return prev.filter((m) => m !== item);
                          } else {
                            if (item === "All") {
                              return ["All"];
                            }
                            return [...prev, item].filter((e) => e !== "All");
                          }
                        });
                      }}
                      style={[
                        styles.tab,
                        {
                          backgroundColor: activeMuscle.includes(item)
                            ? theme.color.accent
                            : theme.color.input,
                          borderColor: theme.color.border,
                        },
                      ]}
                    >
                      <Text style={{ color: theme.color.textPrimary }}>
                        {item}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {/* EQUIPMENT */}
              <Text
                style={[styles.filterLabel, { color: theme.color.textPrimary }]}
              >
                EQUIPMENT
              </Text>

              <ScrollView>
                <View style={styles.wrapContainer}>
                  {EQUIPMENT_OPTIONS.map((item) => (
                    <Pressable
                      key={item}
                      onPress={() => {
                        setActiveEquipment((prev) => {
                          if (prev.includes(item)) {
                            if (item === "All") {
                              return [];
                            }
                            return prev.filter((e) => e !== item);
                          } else {
                            if (item === "All") {
                              return ["All"];
                            }
                            return [...prev, item].filter((e) => e !== "All");
                          }
                        });
                      }}
                      style={[
                        styles.tab,
                        {
                          backgroundColor: activeEquipment.includes(item)
                            ? theme.color.accent
                            : theme.color.input,
                          borderColor: theme.color.border,
                        },
                      ]}
                    >
                      <Text style={{ color: theme.color.textPrimary }}>
                        {item}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* EXERCISE LIST */}
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.exerciseRow,
                  {
                    borderBottomColor: theme.color.border,
                    backgroundColor: chosenExercises?.find(
                      (ex) => ex.id === item.id,
                    )
                      ? theme.color.accent + "33"
                      : "transparent",
                  },
                ]}
                onPress={() => {
                  if (selectedLoggingStyle !== "regular") {
                    if (chosenExercises?.find((ex) => ex.id === item.id)) {
                      setChosenExercises((prev) =>
                        prev ? prev.filter((ex) => ex.id !== item.id) : null,
                      );
                    } else {
                      if (chosenExercises?.length === 2) {
                        setChosenExercises((prev) =>
                          prev ? [prev[0], item] : [item],
                        );
                      } else {
                        setChosenExercises((prev) =>
                          prev ? [...prev, item] : [item],
                        );
                      }
                    }
                  } else {
                    if (chosenExercises?.find((ex) => ex.id === item.id)) {
                      setChosenExercises(null);
                    } else {
                      setChosenExercises([item]);
                    }
                  }
                }}
              >
                <View
                  style={{
                    paddingVertical: 4,
                    flex: 1,
                  }}
                >
                  <Text
                    style={[
                      styles.exerciseName,
                      {
                        color: theme.color.textPrimary,
                      },
                    ]}
                  >
                    {item.name}
                  </Text>

                  <Text
                    style={[
                      styles.exerciseSubtext,
                      { color: theme.color.textSecondary },
                    ]}
                  >
                    {(item.musclesTargeted ?? []).join(", ")} ·{" "}
                    {(item.equipment ?? []).join(", ")}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.color.textSecondary}
                />
              </Pressable>
            )}
            ListEmptyComponent={
              <Text
                style={[styles.emptyText, { color: theme.color.textSecondary }]}
              >
                No exercises found
              </Text>
            }
          />
          {/* Sticky Footer */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: theme.color.border,
                backgroundColor: theme.color.background,
              },
            ]}
          >
            <Text
              style={[
                styles.footerSubtext,
                { color: theme.color.textSecondary },
              ]}
            >
              {selectedLoggingStyle === "regular"
                ? chosenExercises?.length === 1
                  ? "1 exercise selected"
                  : "Select an exercise"
                : `${chosenExercises?.length ?? 0} of 2 selected`}
            </Text>
            <Pressable
              onPress={() => {
                handleExerciseConfirm(chosenExercises ?? []);
                setModalVisible(false);
              }}
              disabled={!isReadyToConfirm}
              style={[
                styles.confirmButton,
                {
                  backgroundColor: isReadyToConfirm
                    ? theme.color.accent
                    : theme.color.input,
                  height: theme.spacing.buttonHeight,
                },
              ]}
            >
              <Text
                style={{
                  color: isReadyToConfirm
                    ? theme.color.textPrimary
                    : theme.color.textSecondary,
                }}
              >
                Confirm
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  searchRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  wrapContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
    columnGap: 8,
    paddingHorizontal: 16,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: "600",
  },
  exerciseSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  footerSubtext: {
    fontSize: 13,
  },
  confirmButton: {
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
