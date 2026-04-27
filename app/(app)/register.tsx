import {
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { signUpSupabase } from "@/hooks/auth/authHelpers";
import { useRouter } from "expo-router";
import { useColorTheme } from "@/context/colorThemeContext";
import { useState } from "react";
import Toast from "react-native-toast-message";
import { Picker } from "@react-native-picker/picker";

type FormValues = {
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
};

export default function Index() {
  const [isFirstNameFocused, setIsFirstNameFocused] = useState<boolean>(false);
  const [isLastNameFocused, setIsLastNameFocused] = useState<boolean>(false);
  const [isAgeFocused, setIsAgeFocused] = useState<boolean>(false);
  const [isWeightFocused, setIsWeightFocused] = useState<boolean>(false);
  const [isHeightFocused, setIsHeightFocused] = useState<boolean>(false);
  const [isEmailFocused, setIsEmailFocused] = useState<boolean>(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] =
    useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);

  const { theme } = useColorTheme();
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      age: 0,
      gender: "",
      height: 0,
      weight: 0,
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
    const {
      firstName,
      lastName,
      age,
      height,
      weight,
      email,
      password,
      gender,
    } = data;
    try {
      const { data, error } = await signUpSupabase(
        email,
        password,
        `${firstName} ${lastName}`,
        age,
        height,
        weight,
        gender,
      );

      if (data.user) {
        router.replace("/login");
      }
    } catch (error) {
      console.log("Error during registration:", error);
      Toast.show({
        type: "error",
        text1: "Registration Error",
      });
    }
  };

  // Reusable input style builder
  const inputStyle = (isFocused: boolean) => ({
    height: theme.spacing.inputHeight,
    padding: 10,
    backgroundColor: theme.color.surface,
    borderColor: isFocused ? theme.color.accent : theme.color.border,
    borderWidth: 1,
    borderRadius: 8,
    color: theme.color.textPrimary,
  });

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View
            style={{
              padding: theme.spacing.screenPadding,
              paddingVertical: 20,
              gap: theme.spacing.sm,
              backgroundColor: theme.color.background,
            }}
          >
            {/* Title now inside ScrollView so it scrolls with content */}
            <Text
              style={{
                color: theme.color.textPrimary,
                fontSize: 24,
                fontWeight: "bold",
                marginBottom: theme.spacing.label,
                textAlign: "center",
              }}
            >
              register
            </Text>

            {/* First Name */}
            <View style={{ gap: theme.spacing.label, width: "100%" }}>
              <Text style={[styles.text, { color: theme.color.textPrimary }]}>
                First name:
              </Text>
              <Controller
                control={control}
                name="firstName"
                rules={{ required: true, maxLength: 40 }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    placeholder="First name..."
                    placeholderTextColor={theme.color.placeholderColor}
                    onFocus={() => setIsFirstNameFocused(true)}
                    style={inputStyle(isFirstNameFocused)}
                    onBlur={() => {
                      onBlur();
                      setIsFirstNameFocused(false);
                    }}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.firstName && (
                <Text style={[styles.textError, { color: theme.color.danger }]}>
                  This is required.
                </Text>
              )}
            </View>

            {/* Last Name */}
            <View style={{ gap: theme.spacing.label, width: "100%" }}>
              <Text style={[styles.text, { color: theme.color.textPrimary }]}>
                Last name:
              </Text>
              <Controller
                control={control}
                name="lastName"
                rules={{ required: true, maxLength: 40 }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    placeholder="Last name..."
                    placeholderTextColor={theme.color.placeholderColor}
                    onFocus={() => setIsLastNameFocused(true)}
                    style={inputStyle(isLastNameFocused)}
                    onBlur={() => {
                      onBlur();
                      setIsLastNameFocused(false);
                    }}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.lastName && (
                <Text style={[styles.textError, { color: theme.color.danger }]}>
                  This is required.
                </Text>
              )}
            </View>

            {/* Email */}
            <View style={{ gap: theme.spacing.label, width: "100%" }}>
              <Text style={[styles.text, { color: theme.color.textPrimary }]}>
                Email:
              </Text>
              <Controller
                control={control}
                name="email"
                rules={{ required: true, maxLength: 40 }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    placeholder="Email..."
                    placeholderTextColor={theme.color.placeholderColor}
                    onFocus={() => setIsEmailFocused(true)}
                    style={inputStyle(isEmailFocused)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    onBlur={() => {
                      onBlur();
                      setIsEmailFocused(false);
                    }}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.email && (
                <Text style={[styles.textError, { color: theme.color.danger }]}>
                  This is required.
                </Text>
              )}
            </View>

            {/* Password */}
            <View style={{ gap: theme.spacing.label, width: "100%" }}>
              <Text style={[styles.text, { color: theme.color.textPrimary }]}>
                Password
              </Text>
              <View style={{ position: "relative" }}>
                <Controller
                  control={control}
                  name="password"
                  rules={{ required: true, minLength: 6, maxLength: 40 }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      placeholder="Password..."
                      placeholderTextColor={theme.color.placeholderColor}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password"
                      textContentType="password"
                      onFocus={() => setIsPasswordFocused(true)}
                      style={inputStyle(isPasswordFocused)}
                      onBlur={() => {
                        onBlur();
                        setIsPasswordFocused(false);
                      }}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    padding: 10,
                  }}
                >
                  <Text>{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
                </Pressable>
              </View>
              {errors.password && (
                <Text style={[styles.textError, { color: theme.color.danger }]}>
                  {errors.password.type === "minLength"
                    ? "Password must be at least 6 characters."
                    : "This is required."}
                </Text>
              )}
            </View>

            {/* Confirm Password */}
            <View style={{ gap: theme.spacing.label, width: "100%" }}>
              <Text style={[styles.text, { color: theme.color.textPrimary }]}>
                Confirm Password
              </Text>
              <View style={{ position: "relative" }}>
                <Controller
                  control={control}
                  name="confirmPassword"
                  rules={{
                    required: true,
                    minLength: 6,
                    maxLength: 40,
                    validate: (value, formValues) =>
                      value === formValues.password || "Passwords do not match",
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      placeholder="Confirm Password..."
                      placeholderTextColor={theme.color.placeholderColor}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password"
                      textContentType="password"
                      onFocus={() => setIsConfirmPasswordFocused(true)}
                      style={inputStyle(isConfirmPasswordFocused)}
                      onBlur={() => {
                        onBlur();
                        setIsConfirmPasswordFocused(false);
                      }}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    padding: 10,
                  }}
                >
                  <Text>{showConfirmPassword ? "👁️" : "👁️‍🗨️"}</Text>
                </Pressable>
              </View>
              {errors.confirmPassword && (
                <Text style={[styles.textError, { color: theme.color.danger }]}>
                  {errors.confirmPassword.type === "minLength" &&
                    "Password must be at least 6 characters."}
                  {errors.confirmPassword.type === "required" &&
                    "This is required."}
                  {errors.confirmPassword.type === "validate" &&
                    "Passwords do not match."}
                </Text>
              )}
            </View>

            {/* Age + Gender row */}
            <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
              <View style={{ flex: 1, gap: theme.spacing.label }}>
                <Text style={[styles.text, { color: theme.color.textPrimary }]}>
                  Age:
                </Text>
                <Controller
                  control={control}
                  name="age"
                  rules={{}}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      placeholder="Age..."
                      placeholderTextColor={theme.color.placeholderColor}
                      onFocus={() => setIsAgeFocused(true)}
                      style={inputStyle(isAgeFocused)}
                      onBlur={() => {
                        onBlur();
                        setIsAgeFocused(false);
                      }}
                      onChangeText={(value) => onChange(Number(value))}
                      value={value.toString()}
                      inputMode="numeric"
                      keyboardType="numeric"
                    />
                  )}
                />
                {errors.age && (
                  <Text
                    style={[styles.textError, { color: theme.color.danger }]}
                  >
                    This is required.
                  </Text>
                )}
              </View>

              <View style={{ flex: 1, gap: theme.spacing.label }}>
                <Text style={[styles.text, { color: theme.color.textPrimary }]}>
                  Gender:
                </Text>
                <View
                  style={{
                    overflow: "hidden",
                    height: theme.spacing.inputHeight,
                    borderWidth: 1,
                    borderColor: theme.color.border,
                    borderRadius: 8,
                    backgroundColor: theme.color.surface,
                    justifyContent: "center",
                  }}
                >
                  <Controller
                    control={control}
                    name="gender"
                    rules={{}}
                    render={({ field: { onChange, value } }) => (
                      <Picker
                        selectedValue={value}
                        onValueChange={(itemValue) => onChange(itemValue)}
                        dropdownIconColor={theme.color.accent}
                        itemStyle={{ color: theme.color.textPrimary }}
                        selectionColor={theme.color.textPrimary}
                        style={{
                          color: theme.color.textPrimary,
                          borderRadius: 8,
                          height: 50,
                          backgroundColor: theme.color.surface,
                        }}
                      >
                        <Picker.Item label="Select gender..." value="NULL" />
                        <Picker.Item label="Male" value="male" />
                        <Picker.Item label="Female" value="female" />
                        <Picker.Item label="Other" value="other" />
                      </Picker>
                    )}
                  />
                </View>
                {errors.gender && (
                  <Text
                    style={[styles.textError, { color: theme.color.danger }]}
                  >
                    This is required.
                  </Text>
                )}
              </View>
            </View>

            {/* Height + Weight row */}
            <View
              style={{
                width: "100%",
                flexDirection: "row",
                gap: theme.spacing.md,
              }}
            >
              <View style={{ flex: 1, gap: theme.spacing.label }}>
                <Text style={[styles.text, { color: theme.color.textPrimary }]}>
                  Height:
                </Text>
                <Controller
                  control={control}
                  name="height"
                  rules={{}}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      placeholder="Height..."
                      placeholderTextColor={theme.color.placeholderColor}
                      onFocus={() => setIsHeightFocused(true)}
                      style={inputStyle(isHeightFocused)}
                      onBlur={() => {
                        onBlur();
                        setIsHeightFocused(false);
                      }}
                      onChangeText={(value) => onChange(Number(value))}
                      value={value.toString()}
                      inputMode="numeric"
                      keyboardType="numeric"
                    />
                  )}
                />
                {errors.height && (
                  <Text
                    style={[styles.textError, { color: theme.color.danger }]}
                  >
                    This is required.
                  </Text>
                )}
              </View>

              <View style={{ flex: 1, gap: theme.spacing.label }}>
                <Text style={[styles.text, { color: theme.color.textPrimary }]}>
                  Weight:
                </Text>
                <Controller
                  control={control}
                  name="weight"
                  rules={{}}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      placeholder="Weight..."
                      placeholderTextColor={theme.color.placeholderColor}
                      onFocus={() => setIsWeightFocused(true)}
                      style={inputStyle(isWeightFocused)}
                      onBlur={() => {
                        onBlur();
                        setIsWeightFocused(false);
                      }}
                      onChangeText={(value) => onChange(Number(value))}
                      value={value.toString()}
                      inputMode="numeric"
                      keyboardType="numeric"
                    />
                  )}
                />
                {errors.weight && (
                  <Text
                    style={[styles.textError, { color: theme.color.danger }]}
                  >
                    This is required.
                  </Text>
                )}
              </View>
            </View>

            {/* Submit */}
            <Pressable
              onPress={handleSubmit(onSubmit)}
              style={({ pressed }) => ({
                height: theme.spacing.buttonHeight,
                backgroundColor: pressed
                  ? theme.color.accentActive
                  : theme.color.accent,
                width: "100%",
                padding: 10,
                borderRadius: 10,
                marginTop: 10,
              })}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  textAlign: "center",
                  color: theme.color.textPrimary,
                }}
              >
                Register
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    fontWeight: "500",
  },
  textError: {
    fontSize: 14,
    marginBottom: 8,
  },
});
