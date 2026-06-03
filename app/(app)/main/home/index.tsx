import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
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
          padding: theme.spacing.screenPadding,
          gap: theme.spacing.lg,
        },
      ]}
    >
      <HomeHeader />
      <ScrollView style={{ flex: 1 }}>
        <TodaysWorkout />
        {/* <QuickActions />
      <ProgressCard />
      <LastWorkoutCard />
      <Carousel /> */}
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
            >{`Home page, welcome back ${user?.full_name || "User"}`}</Text>
          </>
        )}
      </ScrollView>
      <FabButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {},
  text: {},
});
