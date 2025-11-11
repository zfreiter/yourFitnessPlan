import { Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { signUpSupabase } from "@/hooks/auth/authHelpers";
import { useRouter } from "expo-router";

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
        weight
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
      style={{ flex: 1, padding: 16, alignItems: "center", marginVertical: 40 }}
    >
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        register
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.text}>First name:</Text>
        <Controller
          control={control}
          name="firstName"
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

      <View style={styles.inputContainer}>
        <Text style={styles.text}>Last name:</Text>
        <Controller
          control={control}
          name="lastName"
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

      <View style={styles.inputContainer}>
        <Text style={styles.text}>Age:</Text>
        <Controller
          control={control}
          name="age"
          rules={{}}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              onBlur={onBlur}
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

      <View style={styles.inputContainer}>
        <Text style={styles.text}>Height:</Text>
        <Controller
          control={control}
          name="height"
          rules={{}}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              onBlur={onBlur}
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

      <View style={styles.inputContainer}>
        <Text style={styles.text}>weight:</Text>
        <Controller
          control={control}
          name="weight"
          rules={{}}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={styles.input}
              onBlur={onBlur}
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

      <View style={styles.inputContainer}>
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

      <View style={styles.inputContainer}>
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

      <View style={styles.inputContainer}>
        <Text style={styles.text}>Confirm Password</Text>
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
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              secureTextEntry={true}
            />
          )}
        />
        {errors.confirmPassword && (
          <Text style={styles.textError}>
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
    color: "red",
    marginBottom: 8,
  },
});
