import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSession } from "@/context/sessionContext";
import { ShimmerSkeleton, SkeletonTextLines } from "@/components/ui/skeleton";
import HomeHeader from "@/features/home/HomeHeader";
import TodaysWorkout from "@/features/home/TodaysWorkout/TodaysWorkout";
import QuickActions from "@/features/home/QuickActions";
import ProgressCard from "@/features/home/ProgressCard";
import LastWorkoutCard from "@/features/home/LastWorkoutCard";
import Carousel from "@/features/home/Carousel";

export default function Index() {
  const { session, isLoading, signOut } = useSession();
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <HomeHeader />
        <TodaysWorkout />
        <QuickActions />
        <ProgressCard />
        <LastWorkoutCard />
        <Carousel />
        {isLoading || !session ? (
          <View style={{ width: "100%" }}>
            <ShimmerSkeleton
              height={35}
              width="100%"
              borderRadius={8}
              style={{ marginBottom: 12 }}
            />
            <SkeletonTextLines lines={3} lastLineWidth="40%" />
          </View>
        ) : (
          <>
            <Text
              style={styles.text}
            >{`Home page, welcome back ${session}`}</Text>
            <Text style={styles.text}>
              CREATE AND FINISH ALL THE FUNCTIONS FOR WORKOUT CONTEXT, IMPLEMENT
              THESE ON WORKOUT-SESSION LAYOUT AND PAGE
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    //flex: 1,
    justifyContent: "center",
  },
  content: {
    margin: 20,
    gap: 10,
  },
  text: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
  },
});
