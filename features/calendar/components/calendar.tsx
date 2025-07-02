import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { Calendar, CalendarList, Agenda } from "react-native-calendars";
import { StyleSheet } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import DailyWorkoutSchedule from "@/features/calendar/components/DailyWorkoutSchedule";
import { CreateWorkoutButton } from "./calendarButtons";
import { Workout } from "@/types/type";

interface CalendarDay {
  dateString: string;
  day: number;
  month: number;
  timestamp: number;
  year: number;
}

interface MarkedDate {
  key: string;
  color: string;
}

interface MarkedDates {
  [date: string]: {
    dots: MarkedDate[];
  };
}

// const strength = { key: "strength", color: "red" };
// const cardio = { key: "cardio", color: "blue" };
// const circuit = { key: "circuit", color: "green" };
// const mobility = { key: "mobility", color: "yellow" };

const convertType = (type: string, index: number) => {
  switch (type) {
    case "strength":
      return { key: `strength-${index}`, color: "red" };
    case "cardio":
      return { key: `cardio-${index}`, color: "blue" };
    case "circuit":
      return { key: `circuit-${index}`, color: "green" };
    case "mobility":
      return { key: `mobility-${index}`, color: "yellow" };
    default:
      return { key: `strength-${index}`, color: "red" };
  }
};

export default function CalendarIndex({ workouts }: { workouts: Workout[] }) {
  const router = useRouter();
  // Contains the list of workouts for the current selected day
  const [currentDayList, setCurrentDayList] = useState<Workout[]>([]);
  const [currentDay, setCurrentDay] = useState<string | null>(null);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});

  useEffect(() => {
    const formatWorkoutDate: MarkedDates = {};

    workouts.forEach((workout, index) => {
      if (!(workout.date in formatWorkoutDate)) {
        formatWorkoutDate[workout.date] = { dots: [] };
      }
      formatWorkoutDate[workout.date].dots.push(
        convertType(workout.workoutType, index)
      );
    });
    setMarkedDates(formatWorkoutDate);
  }, [workouts]);

  // Add effect to update currentDayList when workouts or currentDay changes
  useEffect(() => {
    if (currentDay) {
      setCurrentDayList(
        workouts.filter((workout) => workout.date === currentDay)
      );
    }
  }, [workouts, currentDay]);

  return (
    <View style={{ flex: 1, margin: 0 }}>
      <View>
        <Calendar
          markingType={"multi-dot"}
          markedDates={markedDates}
          renderHeader={(date: Date) => {
            return (
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                {new Date(date).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            );
          }}
          onDayPress={(day: CalendarDay) => {
            setCurrentDay(day?.dateString);
          }}
        />
      </View>
      <View style={{ flex: 1, margin: 10 }}>
        <CreateWorkoutButton
          onPress={() => router.push("/(app)/create-workout")}
        />
        <ScrollView>
          <DailyWorkoutSchedule
            currentDay={currentDay}
            workoutList={currentDayList}
          />
        </ScrollView>
      </View>
    </View>
  );
}
