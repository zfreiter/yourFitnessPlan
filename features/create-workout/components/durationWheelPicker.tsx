import WheelPicker from "@quidone/react-native-wheel-picker";
import { useState, useRef } from "react";
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import { useFormContext } from "react-hook-form";
import { useColorTheme } from "@/context/colorThemeContext";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";

const SCREEN_HEIGHT = Dimensions.get("window").height;

const convertMinutesToHoursAndMinutes = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes} min`;
  }
  return `${hours} hr ${minutes} min`;
};

const dataMinutes = [...Array(301).keys()].map((index) => ({
  value: index,
  label: convertMinutesToHoursAndMinutes(index),
}));

export default function DurationWheelPicker() {
  const [modalVisible, setModalVisible] = useState(false);
  const { setValue, getValues } = useFormContext();
  const [minute, setMinute] = useState(getValues("duration"));
  const { theme } = useColorTheme();

  // 🔥 Animation values
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const openModal = () => {
    setModalVisible(true);
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
          speed: 20,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setModalVisible(false));
  };

  return (
    <View style={{ flex: 1 }}>
      <Modal transparent visible={modalVisible} animationType="none">
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          {/* Backdrop */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: "#000",
                opacity: backdropOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.4],
                }),
              },
            ]}
          />

          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />

          {/* Bottom Sheet */}
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.color.surface,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Handle */}
            <View
              style={[styles.handle, { backgroundColor: theme.color.border }]}
            />

            {/* Header */}
            <View style={styles.header}>
              <View></View>
              <Text style={[styles.title, { color: theme.color.textPrimary }]}>
                Workout duration
              </Text>
              <Pressable onPress={closeModal}>
                <MaterialIcons
                  name="cancel"
                  size={30}
                  style={{ alignSelf: "flex-end" }}
                  color={theme.color.accent}
                />
              </Pressable>
            </View>

            {/* Picker */}
            <View style={{ alignItems: "center", marginTop: 10 }}>
              <WheelPicker
                style={{
                  backgroundColor: theme.color.surface2,
                  borderRadius: 12,
                  width: "90%",
                }}
                itemTextStyle={{
                  color: theme.color.textPrimary,
                  fontSize: 18,
                }}
                visibleItemCount={5}
                data={dataMinutes}
                value={minute}
                width="80%"
                onValueChanged={({ item: { value } }) => {
                  setMinute(value);
                  setValue("duration", value);
                }}
                enableScrollByTapOnItem
              />
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Trigger */}
      <Pressable
        style={[
          styles.container,
          {
            backgroundColor: theme.color.input,
            borderColor: theme.color.border,
          },
        ]}
        onPress={openModal}
      >
        <View style={styles.headerLeft}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MaterialIcons
              name="access-time-filled"
              size={18}
              color={theme.color.accent}
            />
            <Text
              style={[styles.fieldLabel, { color: theme.color.textSecondary }]}
            >
              DURATION
            </Text>
          </View>

          <Text
            style={[styles.durationValue, { color: theme.color.textPrimary }]}
          >
            {convertMinutesToHoursAndMinutes(minute)}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 8,
    height: 50,
  },
  headerLeft: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  durationValue: {
    fontSize: 14,
    fontWeight: "600",
  },

  // 🔥 Bottom sheet styles
  sheet: {
    paddingTop: 10,
    paddingBottom: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#999",
    alignSelf: "center",
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
});
