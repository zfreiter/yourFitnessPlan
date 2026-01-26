import { Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { signUpSupabase } from "@/hooks/auth/authHelpers";
import { useRouter } from "expo-router";
import { useColorTheme } from "@/context/colorThemeContext";
import { useState } from "react";

type FormValues = {
  firstName: string;
  lastName: string;
  age: number;
  weight: number;
  height: number;
  email: string;
  password: string;
  confirmPassword: string;
};

export default function Index() {
  const [isFirstNameFocused, setIsFirstNameFocused] = useState<boolean>(false);
  const [isLastNameFocused, setIsLastNameFocused] = useState<boolean>(false);
  const [isAgeFocused, setIsAgeFocused] = useState<boolean>(false);
  const [isWeightFocused, setIsWeightFocused] = useState<boolean>(false);
  const [isHeightFocused, setIsHeightFocused] = useState<boolean>(false);
  const [isEmailFocused, setIsEmailFocused] = useState<boolean>(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState<boolean>(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] =
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
      age: 37,
      weight: 285,
      height: 250,
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
    const { firstName, lastName, age, height, weight, email, password } = data;
    try {
      const { data, error } = await signUpSupabase(
        email,
        password,
        `${firstName} ${lastName}`,
        age,
        height,
        weight,
      );
      console.log("data from sign up:", data);
      if (error) {
        console.log("Error during sign up:", error.message);
      }
      if (data.user) {
        router.replace("/login");
      }
    } catch (error) {
      console.log("Error during registration:", error);
    }
  };

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
        register
      </Text>

      <View style={{ gap: theme.spacing.label, width: "100%" }}>
        <Text style={[styles.text, { color: theme.color.textPrimary }]}>
          First name:
        </Text>
        <Controller
          control={control}
          name="firstName"
          rules={{
            required: true,
            maxLength: 40,
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              placeholder="First name..."
              placeholderTextColor={theme.color.placeholderColor}
              onFocus={() => setIsFirstNameFocused(true)}
              style={[
                styles.input,
                {
                  padding: 10,
                  backgroundColor: theme.color.surface,
                  borderColor: isFirstNameFocused
                    ? theme.color.accent
                    : theme.color.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  color: theme.color.textPrimary,
                },
              ]}
              onBlur={() => {
                onBlur();
                setIsFirstNameFocused(false);
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
          Last name:
        </Text>
        <Controller
          control={control}
          name="lastName"
          rules={{
            required: true,
            maxLength: 40,
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              placeholder="Last name..."
              placeholderTextColor={theme.color.placeholderColor}
              onFocus={() => setIsLastNameFocused(true)}
              style={[
                styles.input,
                {
                  padding: 10,
                  backgroundColor: theme.color.surface,
                  borderColor: isLastNameFocused
                    ? theme.color.accent
                    : theme.color.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  color: theme.color.textPrimary,
                },
              ]}
              onBlur={() => {
                onBlur();
                setIsLastNameFocused(false);
              }}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.email && (
          <Text style={styles.textError}>This is required.</Text>
        )}
      </View>

      <View style={{ gap: theme.spacing.label, width: "100%" }}>
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
              style={[
                styles.input,
                {
                  padding: 10,
                  backgroundColor: theme.color.surface,
                  borderColor: isAgeFocused
                    ? theme.color.accent
                    : theme.color.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  color: theme.color.textPrimary,
                },
              ]}
              onBlur={() => {
                onBlur();
                setIsAgeFocused(false);
              }}
              onChangeText={() => {
                onChange(Number(value));
              }}
              value={value.toString()}
              inputMode="numeric"
              keyboardType="numeric"
            />
          )}
        />
        {errors.age && <Text style={styles.textError}>This is required.</Text>}
      </View>

      <View style={{ gap: theme.spacing.label, width: "100%" }}>
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
              style={[
                styles.input,
                {
                  padding: 10,
                  backgroundColor: theme.color.surface,
                  borderColor: isHeightFocused
                    ? theme.color.accent
                    : theme.color.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  color: theme.color.textPrimary,
                },
              ]}
              onBlur={() => {
                onBlur();
                setIsHeightFocused(false);
              }}
              onChangeText={() => {
                onChange(Number(value));
              }}
              value={value.toString()}
              inputMode="numeric"
              keyboardType="numeric"
            />
          )}
        />
        {errors.height && (
          <Text style={styles.textError}>This is required.</Text>
        )}
      </View>

      <View style={{ gap: theme.spacing.label, width: "100%" }}>
        <Text style={[styles.text, { color: theme.color.textPrimary }]}>
          weight:
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
              style={[
                styles.input,
                {
                  padding: 10,
                  backgroundColor: theme.color.surface,
                  borderColor: isWeightFocused
                    ? theme.color.accent
                    : theme.color.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  color: theme.color.textPrimary,
                },
              ]}
              onBlur={() => {
                onBlur();
                setIsWeightFocused(false);
              }}
              onChangeText={() => {
                onChange(Number(value));
              }}
              value={value.toString()}
              inputMode="numeric"
              keyboardType="numeric"
            />
          )}
        />
        {errors.weight && (
          <Text style={styles.textError}>This is required.</Text>
        )}
      </View>

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
          <Text style={styles.textError}>This is required.</Text>
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
              onChangeText={onChange}
              value={value}
              secureTextEntry={true}
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

      <View style={{ gap: theme.spacing.label, width: "100%" }}>
        <Text style={[styles.text, { color: theme.color.textPrimary }]}>
          Confirm Password
        </Text>
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
              onFocus={() => setIsConfirmPasswordFocused(true)}
              style={[
                styles.input,
                {
                  padding: 10,
                  backgroundColor: theme.color.surface,
                  borderColor: isConfirmPasswordFocused
                    ? theme.color.accent
                    : theme.color.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  color: theme.color.textPrimary,
                },
              ]}
              onBlur={() => {
                onBlur();
                setIsConfirmPasswordFocused(false);
              }}
              onChangeText={onChange}
              value={value}
              secureTextEntry={true}
            />
          )}
        />
        {errors.confirmPassword && (
          <Text style={[styles.textError, { color: theme.color.danger }]}>
            {errors.confirmPassword.type === "minLength" &&
              "Password must be at least 6 characters."}
            {errors.confirmPassword.type === "required" && "This is required."}
            {errors.confirmPassword.type === "validate" &&
              "Passwords do not match."}
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
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    width: "100%",
  },
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
    fontWeight: "500",
  },
  textError: {
    fontSize: 14,
    marginBottom: 8,
  },
});
