import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type ShimmerProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  isCircle?: boolean;
  baseColor?: string;
  highlightColor?: string;
  style?: any;
};

export const ShimmerSkeleton: React.FC<ShimmerProps> = ({
  width = "100%",
  height = 16,
  borderRadius = 8,
  isCircle = false,
  baseColor = "#E6E8EC",
  highlightColor = "#F2F3F5",
  style,
}) => {
  const translate = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.timing(translate, {
        toValue: 1,
        duration: 1300,
        useNativeDriver: true,
      })
    ).start();
  }, [translate]);

  const shimmerWidth = useMemo(() => {
    const base = containerWidth || 200;
    return Math.max(60, Math.floor(base * 0.4));
  }, [containerWidth]);

  const translateX = translate.interpolate({
    inputRange: [0, 1],
    outputRange: [-shimmerWidth, (containerWidth || 200) + shimmerWidth],
  });

  return (
    <View
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={[
        {
          width,
          height,
          borderRadius:
            isCircle && typeof height === "number" ? height / 2 : borderRadius,
          backgroundColor: baseColor,
          overflow: "hidden",
        },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX }],
          },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={["transparent", highlightColor, "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: shimmerWidth, height: "100%" }}
        />
      </Animated.View>
    </View>
  );
};

export const SkeletonTextLines = ({
  lines = 3,
  lastLineWidth = "60%",
  gap = 8,
}: {
  lines?: number;
  lastLineWidth?: number | string;
  gap?: number;
}) => {
  return (
    <View>
      {Array.from({ length: lines }).map((_, idx) => (
        <ShimmerSkeleton
          key={idx}
          height={14}
          width={idx === lines - 1 ? lastLineWidth : "100%"}
          borderRadius={6}
          style={{ marginBottom: idx === lines - 1 ? 0 : gap }}
        />
      ))}
    </View>
  );
};
