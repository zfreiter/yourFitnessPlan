import { router } from "expo-router";
import {
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Image,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { useAuth } from "@/context/authContext";
import { useState } from "react";
import { useColorTheme } from "@/context/colorThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";

type FormData = {
  email: string;
  password: string;
};

export default function SignIn() {
  const { signIn, isLoading, isAuthInitialized } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState<boolean>(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const { theme } = useColorTheme();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    const { email, password } = data;
    setIsSubmitting(true);
    const success = await signIn(email, password);
    if (!success) setIsSubmitting(false);
  };

  const inputStyle = (isFocused: boolean) => ({
    height: theme.spacing.inputHeight,
    paddingHorizontal: 12,
    paddingRight: 44,
    backgroundColor: theme.color.surface,
    borderColor: isFocused ? theme.color.accent : theme.color.border,
    borderWidth: 1,
    borderRadius: 8,
    color: theme.color.textPrimary,
  });

  return (
    <>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.color.background }}
        edges={["top", "bottom"]}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: theme.spacing.screenPadding,
            paddingTop: 48,
            paddingBottom: 32,
            alignItems: "center",
            gap: theme.spacing.md,
            backgroundColor: theme.color.background,
          }}
        >
          {/* Header */}
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <Image
              source={require("@/assets/images/adaptive-icon.png")}
              style={{ width: 80, height: 80, resizeMode: "contain" }}
            />
            <Text
              style={{
                color: theme.color.textPrimary,
                fontSize: 24,
                fontWeight: "bold",
                marginTop: 12,
                marginBottom: 4,
              }}
            >
              Sign In
            </Text>
            <Text
              style={{
                color: theme.color.placeholderColor,
                fontSize: 14,
                textAlign: "center",
              }}
            >
              Welcome back
            </Text>
          </View>

          {/* Email */}
          <View style={[styles.fieldGroup, { width: "100%" }]}>
            <Text style={[styles.label, { color: theme.color.textPrimary }]}>
              Email
            </Text>
            <Controller
              control={control}
              name="email"
              rules={{ required: true, maxLength: 40 }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  placeholder="Email..."
                  placeholderTextColor={theme.color.placeholderColor}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  onFocus={() => setIsEmailFocused(true)}
                  style={inputStyle(isEmailFocused)}
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
              <Text style={[styles.errorText, { color: theme.color.danger }]}>
                This is required.
              </Text>
            )}
          </View>

          {/* Password */}
          <View style={[styles.fieldGroup, { width: "100%" }]}>
            <Text style={[styles.label, { color: theme.color.textPrimary }]}>
              Password
            </Text>
            <Controller
              control={control}
              name="password"
              rules={{ required: true, minLength: 6, maxLength: 40 }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={{ position: "relative" }}>
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
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    hitSlop={8}
                  >
                    <Text style={styles.eyeIcon}>
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </Text>
                  </Pressable>
                </View>
              )}
            />
            {errors.password && (
              <Text style={[styles.errorText, { color: theme.color.danger }]}>
                {errors.password.type === "minLength"
                  ? "Password must be at least 6 characters."
                  : "This is required."}
              </Text>
            )}
          </View>

          {/* Login button */}
          <Pressable
            onPress={handleSubmit(onSubmit)}
            style={({ pressed }) => ({
              height: theme.spacing.buttonHeight,
              backgroundColor: pressed
                ? theme.color.accentActive
                : theme.color.accent,
              width: "100%",
              borderRadius: 10,
              marginTop: 16,
              justifyContent: "center",
              alignItems: "center",
            })}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: theme.color.textPrimary,
              }}
            >
              Login
            </Text>
          </Pressable>

          {/* Sign up link */}
          <Pressable onPress={() => router.push("/register")} hitSlop={8}>
            {({ pressed }) => (
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "500",
                  textAlign: "center",
                  color: theme.color.textPrimary,
                }}
              >
                Don't have an account?{" "}
                <Text
                  style={{
                    fontWeight: "700",
                    color: pressed
                      ? theme.color.accentActive
                      : theme.color.accent,
                  }}
                >
                  Sign up
                </Text>
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Loading overlay */}
      <Modal transparent visible={isSubmitting} animationType="none">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color={theme.color.accent} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  errorText: {
    fontSize: 13,
    marginTop: 2,
  },
  eyeButton: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  eyeIcon: {
    fontSize: 16,
  },
});
