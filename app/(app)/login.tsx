import { router } from "expo-router";
import {
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  Keyboard,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { useAuth } from "@/context/authContext";
import { useEffect, useState } from "react";
import { signInSupabase } from "@/hooks/auth/authHelpers";
import Feather from "@expo/vector-icons/Feather";
import { useColorTheme } from "@/context/colorThemeContext";

type FormData = {
  email: string;
  password: string;
};

export default function SignIn() {
  const { signIn, isLoading, isAuthInitialized } = useAuth();
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

    await signIn(email, password);
  };
  console.log("Rendering Login, isAuthInitialized:", isAuthInitialized);
  return (
    <View
      style={{
        flex: 1,
        padding: 16,
        alignItems: "center",
        paddingVertical: 40,
        backgroundColor: theme.color.background,
      }}
    >
      <Text
        style={{
          color: theme.color.textPrimary,
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        Sign In
      </Text>

      <View style={{ gap: theme.spacing.label, width: "100%" }}>
        <Text style={[styles.text, { color: theme.color.textPrimary }]}>
          Email:
        </Text>
        <Controller
          control={control}
          name="email"
          rules={{
            required: true,
            maxLength: 40,
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              placeholder="Email..."
              placeholderTextColor={theme.color.placeholderColor}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              onFocus={() => setIsEmailFocused(true)}
              style={[
                styles.input,
                {
                  padding: 10,
                  backgroundColor: theme.color.surface,
                  borderColor: isEmailFocused
                    ? theme.color.accent
                    : theme.color.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  color: theme.color.textPrimary,
                },
              ]}
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

      <View style={{ gap: theme.spacing.label, width: "100%" }}>
        <Text style={[styles.text, { color: theme.color.textPrimary }]}>
          Password
        </Text>
        <Controller
          control={control}
          name="password"
          rules={{
            required: true,
            minLength: 6,
            maxLength: 40,
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              placeholder="Password..."
              placeholderTextColor={theme.color.placeholderColor}
              onFocus={() => setIsPasswordFocused(true)}
              style={[
                styles.input,
                {
                  padding: 10,
                  backgroundColor: theme.color.surface,
                  borderColor: isPasswordFocused
                    ? theme.color.accent
                    : theme.color.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  color: theme.color.textPrimary,
                },
              ]}
              onBlur={() => {
                onBlur();
                setIsPasswordFocused(false);
              }}
              secureTextEntry={!showPassword}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.password && (
          <Text style={[styles.textError, { color: theme.color.danger }]}>
            {errors.password.type === "minLength"
              ? "Password must be at least 6 characters."
              : "This is required."}
          </Text>
        )}
      </View>

      <Pressable
        onPress={handleSubmit(onSubmit)}
        style={({ pressed }) => ({
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
          Login
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/register")}
        style={({ pressed }) => ({
          color: "blue",
          padding: 10,
          borderRadius: 5,
          marginTop: 10,
        })}
      >
        {({ pressed }) => (
          <Text
            style={{
              fontSize: 16,
              fontWeight: "500",
              textAlign: "center",
              color: pressed ? theme.color.accentActive : theme.color.accent,
            }}
          >
            Don't have an account? Sign up
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 40,
    backgroundColor: "#e2e0e0ff",
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  text: {
    fontSize: 16,
    fontWeight: "bold",
  },
  textError: {
    fontSize: 14,
    marginBottom: 8,
  },
});
