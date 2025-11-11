import { router } from "expo-router";
import { Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { useAuth } from "@/context/authContext";
import { useEffect } from "react";
import { signInSupabase } from "@/hooks/auth/authHelpers";
import Feather from "@expo/vector-icons/Feather";

type FormData = {
  email: string;
  password: string;
};

export default function SignIn() {
  const { signIn, isLoading, isAuthInitialized } = useAuth();

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
      style={{ flex: 1, padding: 16, alignItems: "center", marginVertical: 40 }}
    >
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        Sign In
      </Text>

      <View style={{ width: "100%" }}>
        <Text style={styles.text}>Email:</Text>
        <Controller
          control={control}
          name="email"
          rules={{
            required: true,
            maxLength: 40,
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.email && (
          <Text style={styles.textError}>This is required.</Text>
        )}
      </View>

      <View style={{ width: "100%" }}>
        <Text style={styles.text}>Password</Text>
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
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              secureTextEntry={true}
            />
          )}
        />
        {errors.password && (
          <Text style={styles.textError}>
            {errors.password.type === "minLength"
              ? "Password must be at least 6 characters."
              : "This is required."}
          </Text>
        )}
      </View>

      <Pressable
        onPress={handleSubmit(onSubmit)}
        style={({ pressed }) => ({
          backgroundColor: pressed ? "gray" : "blue",
          width: "100%",
          padding: 10,
          borderRadius: 10,
          marginTop: 10,
        })}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "500",
            textAlign: "center",
            color: "white",
          }}
        >
          Login
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/register")}
        style={({ pressed }) => ({
          color: "black",
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
              color: pressed ? "gray" : "black",
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
    fontWeight: "500",
  },
  textError: {
    fontSize: 14,
    color: "red",
    marginBottom: 8,
  },
});
