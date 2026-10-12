import { Text, Pressable, StyleSheet } from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import { UseFieldArrayAppend, useFormContext } from "react-hook-form";
import { AddExerciseForm, CreateWorkoutForm } from "@/types/interfaces/types";

interface AddExerciseButtonProps {
  setModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  appendExercise: UseFieldArrayAppend<CreateWorkoutForm, "exercises">;
  activeSave?: () => Promise<void>;
}

export function AddExerciseButton({
  setModalVisible,
  appendExercise,
  activeSave,
}: AddExerciseButtonProps) {
  const { theme } = useColorTheme();
  const { getValues } = useFormContext<AddExerciseForm>();

  return (
    <Pressable
      onPress={() => {
        const currentExercises = getValues("exercises");

        currentExercises.forEach((ex) => {
          if (ex.exercise_name !== undefined) appendExercise(ex);
        });

        setModalVisible(false);
      }}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        {
          marginTop: "auto",
          marginBottom: theme.spacing.headerBottomMargin,
          height: theme.spacing.buttonHeight,
          backgroundColor: theme.color.accent,
          borderColor: theme.color.border,
        },
      ]}
    >
      <Text style={{ color: theme.color.textPrimary }}>Add exercise(s)</Text>
    </Pressable>
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
