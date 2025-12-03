import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { Calendar, CalendarList, Agenda } from "react-native-calendars";
import { StyleSheet } from "react-native";
import { useRouter, useNavigation, useFocusEffect } from "expo-router";
import DailyWorkoutSchedule from "@/features/calendar/components/DailyWorkoutSchedule";
import { CreateWorkoutButton } from "./calendarButtons";
import { Workout } from "@/types/type";
import { colors } from "@/utils/colors";
import FabButton from "@/components/fabButton";
import { useColorTheme } from "@/context/colorThemeContext";

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
      return {
        key: `strength-${index}`,
        color: colors.strength,
      };
    case "cardio":
      return { key: `cardio-${index}`, color: colors.cardio };
    case "circuit":
      return { key: `circuit-${index}`, color: colors.circuit };
    case "mobility":
      return { key: `mobility-${index}`, color: colors.mobility };
    default:
      return { key: `strength-${index}`, color: "" };
  }
};

export default function CalendarIndex({
  workouts,
  today,
}: {
  workouts: Workout[];
  today: string;
}) {
  const [currentDayList, setCurrentDayList] = useState<Workout[]>([]);
  const [currentDay, setCurrentDay] = useState<string>(today);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const router = useRouter();
  const { theme } = useColorTheme();

  useFocusEffect(
    useCallback(() => {
      return () => {
        setCurrentDay(today);
      };
    }, [today])
  );

  useEffect(() => {
    const formatWorkoutDate: MarkedDates = {};

    workouts.forEach((workout, index) => {
      if (!(workout.scheduled_datetime in formatWorkoutDate)) {
        formatWorkoutDate[workout.scheduled_datetime.split(" ")[0]] = {
          dots: [],
        };
      }
      formatWorkoutDate[workout.scheduled_datetime.split(" ")[0]].dots.push(
        convertType(workout.workoutType, index)
      );
    });

    setMarkedDates(formatWorkoutDate);
  }, [workouts]);

  // Add effect to update currentDayList when workouts or currentDay changes
  useEffect(() => {
    if (currentDay) {
      setCurrentDayList(
        workouts.filter(
          (workout) => workout.scheduled_datetime.split(" ")[0] === currentDay
        )
      );
    }
  }, [workouts, currentDay]);

  return (
    <View style={{ flex: 1, margin: 0 }}>
      <View style={{}}>
        <Calendar
          key={theme.background}
          markingType={"multi-dot"}
          markedDates={markedDates}
          style={
            {
              //backgroundColor: theme.surface,
              //borderColor: theme.border,
              //borderBottomWidth: 1,
            }
          }
          theme={{
            backgroundColor: theme.surface,
            calendarBackground: theme.surface,
            arrowColor: theme.accent,
            //textSectionTitleColor: "#b6c1cd",
            //selectedDayBackgroundColor: "#00adf5",
            //selectedDayTextColor: "#ffffff",
            todayTextColor: theme.accent,
            dayTextColor: theme.textPrimary,
            textDisabledColor: theme.textSecondary,
          }}
          renderHeader={(date: Date) => {
            return (
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: theme.textPrimary,
                  backgroundColor: theme.surface,
                }}
              >
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
      <View
        style={[
          styles.scheduleContainer,
          { backgroundColor: theme.background },
        ]}
      >
        <DailyWorkoutSchedule
          currentDay={currentDay}
          workoutList={currentDayList}
        />
      </View>
      <FabButton today={currentDay} />
    </View>
  );
}

const styles = StyleSheet.create({
  scheduleContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});
