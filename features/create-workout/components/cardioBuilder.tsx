import { View } from "react-native";
import React from "react";
import { useColorTheme } from "@/context/colorThemeContext";
import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { CardioEntry, CreateWorkoutForm } from "@/types/interfaces/types";
import AddCardioModal from "./addCardioModal";
import { CardioCard } from "./cardioCard";
import { SavedCardioCard } from "@/features/workout-session/components/savedCardioCard";

interface CardioBuilderProps {
  isFinisher?: boolean;
  savedDisplay?: boolean;
  onAdd?: (entry: CardioEntry) => void;
}

export function CardioBuilder({ isFinisher, onAdd, savedDisplay = false }: CardioBuilderProps) {
  const { theme } = useColorTheme();

  const { control, unregister } = useFormContext<CreateWorkoutForm>();

  const {
    fields: cardioEntries,
    append: appendCardioEntry,
    remove: removeCardioEntry,
  } = useFieldArray({
    control,
    name: "cardio_entries",
  });

  const watchedCardioEntries = useWatch({
    control,
    name: "cardio_entries",
  });

  const handleRemoveCardioEntry = (index: number) => {
    removeCardioEntry(index);
  };

  return (
    <View style={{ flex: 1 }}>
      <AddCardioModal
        isFinisher={isFinisher}
        append={appendCardioEntry}
        remove={removeCardioEntry}
        cardioEntriesCount={cardioEntries.length}
      />

      <View
        style={{
          marginTop: cardioEntries.length > 0 ? 16 : 0,
          gap: theme.spacing.lg,
        }}
      >
        {cardioEntries.map((field, index) => {
          const entry = watchedCardioEntries?.[index];

          if (!entry) return null;

          const Card = savedDisplay ? SavedCardioCard : CardioCard;
          return (
            <Card
              key={field.id}
              entry={entry}
              entryOrder={index}
              onRemove={() => handleRemoveCardioEntry(index)}
            />
          );
        })}
      </View>
    </View>
  );
}
