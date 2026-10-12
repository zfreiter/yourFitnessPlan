import {
  View,
  Text,
  Switch,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import RadioGroup, { RadioButtonProps } from "react-native-radio-buttons-group";
import { useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/authContext";
import { UserPreferencesUpdate } from "@/types/interfaces/types";
import { useForm, Controller } from "react-hook-form";
import Toast from "react-native-toast-message";
import { useFocusEffect } from "expo-router";
import { useUserPreference } from "@/context/userPreferenceContext";
import { tokens } from "@/utils/colorTheme";

export default function Preferences() {
  const { updateThemePreference, themePreference, theme } = useColorTheme();

  const { user } = useAuth();
  const { userPreferences, updateUserPreferences } = useUserPreference();
  const [tempTheme, setTempTheme] = useState<"light" | "dark">(
    userPreferences?.theme ?? "light",
  );

  const [isSaving, setIsSaving] = useState(false);

  const c = tokens[tempTheme];

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { isDirty },
  } = useForm<UserPreferencesUpdate>({
    defaultValues: {
      user_id: user?.id || "",
      theme: userPreferences?.theme || "light",
      unit_system: userPreferences?.unit_system || "us",
      set_progression_style:
        userPreferences?.set_progression_style || "straight",
      rm_formula: userPreferences?.rm_formula || "epley",
      weight_rounding: userPreferences?.weight_rounding || "2.5",
      allow_analytics: userPreferences?.allow_analytics ?? true,
      default_workout_visibility:
        userPreferences?.default_workout_visibility || "private",
      allow_friend_requests: userPreferences?.allow_friend_requests ?? true,
      who_can_send_workouts:
        userPreferences?.who_can_send_workouts || "everyone",
      notifications_enabled: userPreferences?.notifications_enabled ?? true,
      email_product_updates: userPreferences?.email_product_updates ?? false,
      email_tips: userPreferences?.email_tips ?? false,
    },
  });

  const currentRmFormula = watch("rm_formula");
  const currentSetProgression = watch("set_progression_style");

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (themePreference !== "system") setTempTheme(themePreference);
      };
    }, []),
  );

  const makeRadio = (id: string, label: string): RadioButtonProps => ({
    id,
    label,
    value: id,
    color: c.accentStrong,
    labelStyle: { color: c.textPrimary },
  });

  const themeRadioButtons = useMemo(
    () => [makeRadio("light", "Light"), makeRadio("dark", "Dark")],
    [tempTheme],
  );
  const unitSystemRadioButtons = useMemo(
    () => [makeRadio("us", "US Units"), makeRadio("metric", "Metric Units")],
    [tempTheme],
  );

  const setProgressionRadioButtons = useMemo(
    () => [
      makeRadio("straight", "Straight Sets"),
      makeRadio("ramp", "Ramp Sets"),
    ],
    [tempTheme],
  );
  const rmFormulaRadioButtons = useMemo(
    () => [
      makeRadio("epley", "Epley"),
      makeRadio("brzycki", "Brzycki"),
      makeRadio("lombardi", "Lombardi"),
    ],
    [tempTheme],
  );
  const weightRoundingRadioButtons = useMemo(
    () => [
      makeRadio("2.5", "2.5"),
      makeRadio("5", "5"),
      makeRadio("10", "10"),
      makeRadio("none", "None"),
    ],
    [tempTheme],
  );
  const workoutVisibilityRadioButtons = useMemo(
    () => [
      makeRadio("private", "Private"),
      makeRadio("shareable", "Shareable"),
    ],
    [tempTheme],
  );
  const whoCanSendWorkoutsRadioButtons = useMemo(
    () => [
      makeRadio("everyone", "Everyone"),
      makeRadio("friends", "Friends Only"),
      makeRadio("none", "None"),
    ],
    [tempTheme],
  );

  const getRmFormulaDescription = (formula: string) => {
    switch (formula) {
      case "epley":
        return "Weight × (1 + Reps/30) — most common, generous for higher rep ranges.";
      case "brzycki":
        return "Weight × (36 / (37 - Reps)) — conservative, accurate for 1–10 reps.";
      case "lombardi":
        return "Weight × Reps^0.10 — simplest formula, works across all rep ranges.";
      default:
        return "";
    }
  };

  const getSetProgressionDescription = (style: string) => {
    switch (style) {
      case "straight":
        return "Same weight for all sets — e.g., 3 × 225 lbs.";
      case "ramp":
        return "Increase weight each set — e.g., 185, 205, 225 lbs.";
      default:
        return "";
    }
  };

  const onSubmit = async (data: UserPreferencesUpdate) => {
    setIsSaving(true);

    try {
      const response = await updateUserPreferences(data);
      console.log("response and theme ", response, data?.theme);
      if (response) {
        reset(data);
        Toast.show({
          type: "success",
          text1: "Saved",
          text2: "Preferences updated.",
          position: "top",
        });
        console.log("response and theme ", response, data?.theme);
        if (data?.theme) {
          console.log("new theme for toggletheme ", data?.theme);
          updateThemePreference(data?.theme);
        }
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to save preferences.",
          position: "top",
        });
      }
    } catch {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "An unexpected error occurred.",
        position: "top",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const SectionCard = ({ children }: { children: React.ReactNode }) => (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
        },
      ]}
    >
      {children}
    </View>
  );

  const ToggleRow = ({
    label,
    name,
  }: {
    label: string;
    name: keyof UserPreferencesUpdate;
  }) => (
    <View style={styles.toggleRow}>
      <Text style={[styles.rowLabel, { color: c.textPrimary }]}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <Switch
            value={value as boolean}
            onValueChange={onChange}
            trackColor={{
              false: "#767577",
              true: c.accentStrong,
            }}
            thumbColor="#fff"
          />
        )}
      />
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: c.background,
          padding: tokens.spacing.screenPadding,
        },
      ]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: theme.spacing.xl, paddingBottom: 100 }}
        scrollEnabled={!isSaving}
      >
        <View
          pointerEvents={isSaving ? "none" : "auto"}
          style={{ flex: 1, gap: theme.spacing.lg }}
        >
          {isSaving && (
            <View style={styles.loadingOverlay}>
              <View
                style={[
                  styles.loadingContainer,
                  {
                    backgroundColor: c.surface,
                    borderColor: c.border,
                  },
                ]}
              >
                <ActivityIndicator size="large" color={c.accentStrong} />
                <Text style={[styles.loadingText, { color: c.textPrimary }]}>
                  Saving...
                </Text>
              </View>
            </View>
          )}

          {/* APPEARANCE */}
          <View>
            <Text
              style={[
                styles.sectionLabel,
                { color: c.textSecondary, marginBottom: theme.spacing.label },
              ]}
            >
              APPEARANCE
            </Text>
            <SectionCard>
              <Text style={[styles.rowLabel, { color: c.textPrimary }]}>
                Theme
              </Text>
              <Controller
                control={control}
                name="theme"
                render={({ field: { onChange, value } }) => (
                  <RadioGroup
                    radioButtons={themeRadioButtons}
                    onPress={(v) => {
                      onChange(v);
                      setTempTheme(v as "light" | "dark");
                    }}
                    selectedId={value}
                    layout="row"
                    containerStyle={styles.radioContainer}
                  />
                )}
              />
            </SectionCard>
          </View>

          {/* UNITS */}
          {/* <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>
            UNITS
          </Text>
          <SectionCard>
            <Text style={[styles.rowLabel, { color: c.textPrimary }]}>
              Weight Unit
            </Text>
            <Controller
              control={control}
              name="unit_system"
              render={({ field: { onChange, value } }) => (
                <RadioGroup
                  radioButtons={unitSystemRadioButtons}
                  onPress={onChange}
                  selectedId={value}
                  layout="row"
                  containerStyle={styles.radioContainer}
                />
              )}
            />
            <View style={[styles.divider, { backgroundColor: c.border }]} />
          </SectionCard> */}

          {/* WORKOUT SETTINGS */}
          <View>
            <Text
              style={[
                styles.sectionLabel,
                { color: c.textSecondary, marginBottom: theme.spacing.label },
              ]}
            >
              WORKOUT SETTINGS
            </Text>
            <SectionCard>
              <Text style={[styles.rowLabel, { color: c.textPrimary }]}>
                Set Progression
              </Text>
              <Controller
                control={control}
                name="set_progression_style"
                render={({ field: { onChange, value } }) => (
                  <>
                    <RadioGroup
                      radioButtons={setProgressionRadioButtons}
                      onPress={onChange}
                      selectedId={value}
                      layout="row"
                      containerStyle={styles.radioContainer}
                    />
                    <Text style={[styles.infoText, { color: c.textSecondary }]}>
                      {getSetProgressionDescription(
                        currentSetProgression || "straight",
                      )}
                    </Text>
                  </>
                )}
              />

              <View style={[styles.divider, { backgroundColor: c.border }]} />

              <Text style={[styles.rowLabel, { color: c.textPrimary }]}>
                1RM Formula
              </Text>
              <Text style={[styles.sublabel, { color: c.textSecondary }]}>
                Used to estimate your one-rep max from multi-rep sets
              </Text>
              <Controller
                control={control}
                name="rm_formula"
                render={({ field: { onChange, value } }) => (
                  <>
                    <RadioGroup
                      radioButtons={rmFormulaRadioButtons}
                      onPress={onChange}
                      selectedId={value}
                      layout="column"
                      containerStyle={styles.radioContainer}
                    />
                    <Text style={[styles.infoText, { color: c.textSecondary }]}>
                      {getRmFormulaDescription(currentRmFormula || "epley")}
                    </Text>
                  </>
                )}
              />

              <View style={[styles.divider, { backgroundColor: c.border }]} />

              <Text style={[styles.rowLabel, { color: c.textPrimary }]}>
                Weight Rounding
              </Text>
              <Controller
                control={control}
                name="weight_rounding"
                render={({ field: { onChange, value } }) => (
                  <RadioGroup
                    radioButtons={weightRoundingRadioButtons}
                    onPress={onChange}
                    selectedId={value}
                    layout="row"
                    containerStyle={styles.radioContainer}
                  />
                )}
              />

              <View style={[styles.divider, { backgroundColor: c.border }]} />

              <Text style={[styles.rowLabel, { color: c.textPrimary }]}>
                Default Workout Visibility
              </Text>
              <Controller
                control={control}
                name="default_workout_visibility"
                render={({ field: { onChange, value } }) => (
                  <RadioGroup
                    radioButtons={workoutVisibilityRadioButtons}
                    onPress={onChange}
                    selectedId={value}
                    layout="row"
                    containerStyle={styles.radioContainer}
                  />
                )}
              />
            </SectionCard>
          </View>

          {/* PRIVACY & SOCIAL */}
          <View>
            <Text
              style={[
                styles.sectionLabel,
                { color: c.textSecondary, marginBottom: theme.spacing.label },
              ]}
            >
              PRIVACY & SOCIAL
            </Text>
            <SectionCard>
              <ToggleRow
                label="Allow Friend Requests"
                name="allow_friend_requests"
              />
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <Text style={[styles.rowLabel, { color: c.textPrimary }]}>
                Who Can Send Workouts
              </Text>
              <Controller
                control={control}
                name="who_can_send_workouts"
                render={({ field: { onChange, value } }) => (
                  <RadioGroup
                    radioButtons={whoCanSendWorkoutsRadioButtons}
                    onPress={onChange}
                    selectedId={value}
                    layout="row"
                    containerStyle={styles.radioContainer}
                  />
                )}
              />
            </SectionCard>
          </View>

          {/* DATA & ANALYTICS */}
          <View>
            <Text
              style={[
                styles.sectionLabel,
                { color: c.textSecondary, marginBottom: theme.spacing.label },
              ]}
            >
              DATA & ANALYTICS
            </Text>
            <SectionCard>
              <ToggleRow label="Allow Analytics" name="allow_analytics" />
            </SectionCard>
          </View>

          {/* NOTIFICATIONS */}
          <View>
            <Text
              style={[
                styles.sectionLabel,
                { color: c.textSecondary, marginBottom: theme.spacing.label },
              ]}
            >
              NOTIFICATIONS
            </Text>
            <SectionCard>
              <ToggleRow
                label="Enable Notifications"
                name="notifications_enabled"
              />
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <ToggleRow
                label="Email Product Updates"
                name="email_product_updates"
              />
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <ToggleRow label="Email Tips & Advice" name="email_tips" />
            </SectionCard>
          </View>

          {/* Save */}
          <Pressable
            onPress={handleSubmit(onSubmit)}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: isDirty ? c.accentStrong : c.surface,
                borderColor: c.border,
                opacity: isDirty ? (pressed ? 0.8 : 1) : 0.5,
              },
            ]}
            disabled={!isDirty}
          >
            <Text
              style={[
                styles.saveText,
                { color: isDirty ? "#fff" : c.textSecondary },
              ]}
            >
              Save Changes
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 8,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  sublabel: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: -6,
  },
  radioContainer: {
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: "italic",
  },
  saveButton: {
    borderWidth: 1,
    padding: 15,
    borderRadius: 8,
    marginTop: 8,
    alignItems: "center",
  },
  saveText: {
    fontWeight: "600",
    fontSize: 16,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingContainer: {
    borderWidth: 1,
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "600",
  },
});
