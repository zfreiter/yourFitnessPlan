/* 
  Calendar - Get three months of workouts

     Recieved from the server
  - Get the workouts for the current month
  - Get the workouts for the next month
  - Get the workouts for the previous month

  - Show the workouts for the selected month

  - Mark the workouts on the calendar

  - Pass the selected day workouts to the WorkoutListForDay component

    WorkoutListFor Day component  
    Recieved the current day from the calendar component
  - Show the workouts for the selected day
  - Navigate to the workout detail page when the user clicks on a workout
  - Navigate to the create workout page when the user clicks on the add workout button

*/
//import { workouts } from "@/constants/workouts";
import { useWorkout } from "@/context/workoutContext";
import CalendarIndex from "@/features/calendar/components/calendar";
import { View } from "react-native";

export default function Index() {
  const { workouts } = useWorkout();

  return (
    <View style={{ flex: 1 }}>
      <CalendarIndex workouts={workouts} />
    </View>
  );
}
