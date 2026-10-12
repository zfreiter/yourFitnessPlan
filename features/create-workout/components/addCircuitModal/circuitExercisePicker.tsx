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
import {
  Exercise,
  CreateCircuitForm,
  ValidUnit,
} from "@/types/interfaces/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useWorkout } from "@/context/workoutContext";
import { UseFieldArrayAppend } from "react-hook-form";
import * as Crypto from "expo-crypto";

interface CircuitExercisePickerProps {
  append: UseFieldArrayAppend<CreateCircuitForm, "exercises">;
  workoutId: string;
  roundNumber: number;
  exerciseCount: number;
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
  legs: ["glutes", "hamstrings", "quadriceps", "calves", "hips"],
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

export function CircuitExercisePicker({
  append,
  workoutId,
  roundNumber,
  exerciseCount,
}: CircuitExercisePickerProps) {
  const { theme } = useColorTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [chosenExercises, setChosenExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [activeMuscle, setActiveMuscle] = useState(["All"]);
  const [activeEquipment, setActiveEquipment] = useState(["All"]);
  const [showFilters, setShowFilters] = useState(false);

  const { exercises } = useWorkout();

  const isSelected = (item: Exercise) =>
    chosenExercises.some((ex) => ex.id === item.id);

  const handleToggleExercise = (item: Exercise) => {
    if (isSelected(item)) {
      setChosenExercises((prev) => prev.filter((ex) => ex.id !== item.id));
    } else {
      setChosenExercises((prev) => [...prev, item]);
    }
  };

  const handleConfirm = () => {
    chosenExercises.forEach((ex, index) => {
      const exerciseId = Crypto.randomUUID();
      console.log("units ", ex.validUnits);
      append({
        id: exerciseId,
        workout_id: workoutId,
        exercise_id: ex.id,
        exercise_name: ex.name,
        description: ex.description,
        track_reps: ex.validUnits.some((units) => units.includes("reps"))
          ? 1
          : 0,
        track_weight: ex.validUnits.some((units) => units.includes("weight"))
          ? 1
          : 0,
        track_time: ex.validUnits.some((units) => units.includes("time"))
          ? 1
          : 0,
        track_distance: ex.validUnits.some((units) =>
          units.includes("distance"),
        )
          ? 1
          : 0,
        validUnits: ex.validUnits,
        musclesTargeted: ex.musclesTargeted,
        equipment: ex.equipment,
        exercise_order: exerciseCount + index,
        group_id: null,
        group_type: "circuit",
        round_number: roundNumber,
        sets: [
          {
            id: Crypto.randomUUID(),
            workout_exercise_id: exerciseId,
            reps: ex.validUnits.some((units) => units.includes("reps"))
              ? 0
              : undefined,
            weight: ex.validUnits.some((units) => units.includes("weight"))
              ? 0
              : undefined,
            time: ex.validUnits.some((units) => units.includes("time"))
              ? 0
              : undefined,
            distance: ex.validUnits.some((units) => units.includes("distance"))
              ? 0
              : undefined,
            is_warmup: 0,
            is_max: 0,
            set_order: 1,
          },
        ],
      });
    });
    setModalVisible(false);
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

  useEffect(() => {
    if (!modalVisible) {
      setSearch("");
      setActiveMuscle(["All"]);
      setActiveEquipment(["All"]);
      setShowFilters(false);
      setChosenExercises([]);
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
        <Ionicons name="add" size={18} color={theme.color.textPrimary} />
        <Text style={{ color: theme.color.textPrimary }}>{`Exercise(s)`}</Text>
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
              Add Exercises for {roundNumber} Round circuit
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
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={theme.color.textSecondary}
                  />
                </Pressable>
              )}
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
              {activeFilterCount > 0 && (
                <View
                  style={[
                    styles.filterBadge,
                    { backgroundColor: theme.color.danger },
                  ]}
                >
                  <Text style={styles.filterBadgeText}>
                    {activeFilterCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* FILTERS */}
          {showFilters && (
            <View style={{ gap: 12, marginTop: 12 }}>
              <Text
                style={[
                  styles.filterLabel,
                  { color: theme.color.textSecondary },
                ]}
              >
                MUSCLE GROUP
              </Text>
              <View style={styles.wrapContainer}>
                {MUSCLE_GROUPS.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setActiveMuscle((prev) => {
                        if (prev.includes(item)) {
                          return item === "All"
                            ? []
                            : prev.filter((m) => m !== item);
                        } else {
                          return item === "All"
                            ? ["All"]
                            : [...prev, item].filter((e) => e !== "All");
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

              <Text
                style={[
                  styles.filterLabel,
                  { color: theme.color.textSecondary },
                ]}
              >
                EQUIPMENT
              </Text>
              <View style={styles.wrapContainer}>
                {EQUIPMENT_OPTIONS.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setActiveEquipment((prev) => {
                        if (prev.includes(item)) {
                          return item === "All"
                            ? []
                            : prev.filter((e) => e !== item);
                        } else {
                          return item === "All"
                            ? ["All"]
                            : [...prev, item].filter((e) => e !== "All");
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
            </View>
          )}

          {/* SELECTED CHIPS */}
          {chosenExercises.length > 0 ? (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                margin: 12,
                gap: 8,
              }}
            >
              {chosenExercises.map((ex) => (
                <Pressable
                  key={ex.id}
                  onPress={() => handleToggleExercise(ex)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: theme.color.accent,
                      borderColor: theme.color.border,
                    },
                  ]}
                >
                  <Text
                    style={{ color: theme.color.textPrimary, fontSize: 12 }}
                  >
                    {ex.name}
                  </Text>
                  <Ionicons
                    name="close"
                    size={14}
                    color={theme.color.textPrimary}
                  />
                </Pressable>
              ))}
            </View>
          ) : (
            // </ScrollView>
            <View style={{ paddingTop: 50 }}></View>
          )}

          {/* EXERCISE LIST */}
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const selected = isSelected(item);
              return (
                <Pressable
                  style={[
                    styles.exerciseRow,
                    {
                      borderBottomColor: theme.color.border,
                      backgroundColor: selected
                        ? theme.color.accent + "33"
                        : "transparent",
                    },
                  ]}
                  onPress={() => handleToggleExercise(item)}
                >
                  <View style={{ flex: 1, paddingVertical: 4 }}>
                    <Text
                      style={[
                        styles.exerciseName,
                        { color: theme.color.textPrimary },
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
                  {selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={theme.color.accent}
                    />
                  ) : (
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color={theme.color.textSecondary}
                    />
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text
                style={[styles.emptyText, { color: theme.color.textSecondary }]}
              >
                No exercises found
              </Text>
            }
          />

          {/* FOOTER */}
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
              {chosenExercises.length === 0
                ? "Select exercises"
                : `${chosenExercises.length} selected`}
            </Text>
            <Pressable
              onPress={handleConfirm}
              disabled={chosenExercises.length === 0}
              style={[
                styles.confirmButton,
                {
                  backgroundColor:
                    chosenExercises.length > 0
                      ? theme.color.accent
                      : theme.color.input,
                  height: theme.spacing.buttonHeight,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    chosenExercises.length > 0
                      ? theme.color.textPrimary
                      : theme.color.textSecondary,
                  fontWeight: "700",
                }}
              >
                Add{" "}
                {chosenExercises.length > 0
                  ? `(${chosenExercises.length})`
                  : ""}
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
    flexDirection: "row",
    gap: 6,
  },
  pressed: {
    opacity: 0.8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
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
  chipsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 0,
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
