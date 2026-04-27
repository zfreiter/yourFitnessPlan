import { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Calendar, CalendarList, Agenda } from "react-native-calendars";
import { StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import DailyWorkoutSchedule from "@/features/calendar/components/DailyWorkoutSchedule";
import { Workout } from "@/types/type";
import { colors } from "@/utils/colors";
import FabButton from "@/components/fabButton";
import { useColorTheme } from "@/context/colorThemeContext";
import { format, set } from "date-fns";
import { useWorkout } from "@/context/workoutContext";
import { toLocalDateString } from "@/utils/date";
import { useAuth } from "@/context/authContext";

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

export default function CalendarIndex({}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [currentDayList, setCurrentDayList] = useState<Workout[]>([]);
  const [currentDay, setCurrentDay] = useState<string>(today);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const { workouts, updateCachedMonths } = useWorkout();
  const { theme } = useColorTheme();
  const { user } = useAuth();

  useFocusEffect(
    useCallback(() => {
      return () => {
        //setCurrentDay(today);
      };
    }, [today]),
  );

  useEffect(() => {
    const formatWorkoutDate: MarkedDates = {};

    workouts.forEach((workout, index) => {
      const localDate = toLocalDateString(workout.scheduled_datetime);
      if (!(localDate in formatWorkoutDate)) {
        formatWorkoutDate[localDate] = { dots: [] };
      }
      formatWorkoutDate[localDate].dots.push(
        convertType(workout.workoutType, index),
      );
    });

    setMarkedDates(formatWorkoutDate);
  }, [workouts]);

  useEffect(() => {
    if (currentDay) {
      setCurrentDayList(
        workouts.filter(
          (workout) =>
            toLocalDateString(workout.scheduled_datetime) === currentDay,
        ),
      );
    } else {
      setCurrentDayList([]);
    }
  }, [workouts, currentDay]);

  return (
    <View style={{ flex: 1, margin: 0 }}>
      <View style={{}}>
        <Calendar
          key={theme.color.background}
          markingType={"multi-dot"}
          markedDates={markedDates}
          enableSwipeMonths={true}
          style={{}}
          theme={{
            backgroundColor: theme.color.surface,
            calendarBackground: theme.color.surface,
            arrowColor: theme.color.accent,
            todayTextColor: theme.color.accent,
            dayTextColor: theme.color.textPrimary,
            textDisabledColor: theme.color.textSecondary,
          }}
          onPressArrowLeft={(subtractMonth, month) => {
            subtractMonth();
            setCurrentDay("");
          }}
          onPressArrowRight={(addMonth, currentDate) => {
            addMonth();
            setCurrentDay("");
          }}
          onMonthChange={(date) => {
            // console.log("month change ", date);
            const month = String(date.month).padStart(2, "0");
            const year = String(date.year);
            // console.log("month year ", month, year);
            if (user) updateCachedMonths(user.id, { month, year });
          }}
          renderHeader={(date: Date) => {
            return (
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: theme.color.textPrimary,
                  backgroundColor: theme.color.surface,
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
          {
            backgroundColor: theme.color.background,
            padding: theme.spacing.screenPadding,
          },
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
  },
});
