import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAuth } from "@/context/authContext";
import { ShimmerSkeleton, SkeletonTextLines } from "@/components/ui/skeleton";
import HomeHeader from "@/features/home/HomeHeader";
import TodaysWorkout from "@/features/home/TodaysWorkout/TodaysWorkout";
import QuickActions from "@/features/home/QuickActions";
import ProgressCard from "@/features/home/ProgressCard";
import LastWorkoutCard from "@/features/home/LastWorkoutCard";
import Carousel from "@/features/home/Carousel";
import FabButton from "@/components/fabButton";
import { useColorTheme } from "@/context/colorThemeContext";

export default function Index() {
  const { isAuthInitialized, isLoading, user } = useAuth();
  const { theme } = useColorTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.color.background,
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.xl,
        },
      ]}
    >
      <View style={{ gap: theme.spacing.lg }}>
        <HomeHeader />
        <TodaysWorkout />
        <QuickActions />
        <ProgressCard />
        <LastWorkoutCard />
        <Carousel />
        {isLoading || !isAuthInitialized ? (
          <View style={{ width: "100%" }}>
            <ShimmerSkeleton
              height={35}
              width="100%"
              borderRadius={8}
              style={{ marginBottom: 12, color: theme.color.textPrimary }}
            />
            <SkeletonTextLines lines={3} lastLineWidth="40%" />
          </View>
        ) : (
          <>
            <Text
              style={[styles.text, { color: theme.color.textPrimary }]}
            >{`Home page, welcome back $`}</Text>
            <Text style={[styles.text, { color: theme.color.textPrimary }]}>
              CREATE AND FINISH ALL THE FUNCTIONS FOR WORKOUT CONTEXT, IMPLEMENT
              THESE ON WORKOUT-SESSION LAYOUT AND PAGE
            </Text>
          </>
        )}
      </View>
      <FabButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 60,
  },
  content: {},
  text: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
  },
});
