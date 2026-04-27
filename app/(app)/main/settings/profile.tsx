import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useColorTheme } from "@/context/colorThemeContext";
import { useState } from "react";
import Toast from "react-native-toast-message";
import { useForm, Controller } from "react-hook-form";
import { ProfileUpdate, ProfileInterface } from "@/types/user/type";
import { useProfile } from "@/context/profileContext";

export default function Profile() {
  const { profile, updateProfile } = useProfile();
  const { theme } = useColorTheme();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<ProfileUpdate>({
    defaultValues: {
      id: profile?.id,
      age: profile?.age || null,
      current_height: profile?.current_height,
      current_weight: profile?.current_weight,
      first_name: profile?.full_name?.split(" ")[0] || "",
      last_name: profile?.full_name?.split(" ")[1] || "",
      username: profile?.username || "",
      avatar_url: profile?.avatar_url || "",
      created_at: profile?.created_at,
    },
  });

  const onSubmit = async (data: ProfileUpdate) => {
    setIsSaving(true);
    try {
      const updatedUser: ProfileInterface = {
        id: data.id,
        age: data.age,
        current_height: data.current_height,
        current_weight: data.current_weight,
        full_name: `${data.first_name} ${data.last_name}`.trim(),
        username: data.username || null,
        avatar_url: data.avatar_url || null,
        created_at: data.created_at,
        updated_at: new Date().toISOString(),
      };
      const response = await updateProfile(updatedUser);
      if (response === false) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to save. Please try again.",
          position: "top",
        });
        return;
      }
      reset(data);

      Toast.show({
        type: "success",
        text1: "Saved",
        text2: "Profile updated successfully.",
        position: "top",
      });
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

  const fields = [
    {
      name: "first_name",
      label: "FIRST NAME",
      placeholder: "First name...",
      keyboard: "default",
    },
    {
      name: "last_name",
      label: "LAST NAME",
      placeholder: "Last name...",
      keyboard: "default",
    },
    {
      name: "username",
      label: "USERNAME",
      placeholder: "Username...",
      keyboard: "default",
      autoCapitalize: "none",
    },
    {
      name: "age",
      label: "AGE",
      placeholder: "Age...",
      keyboard: "number-pad",
      numeric: true,
    },
    {
      name: "current_height",
      label: "HEIGHT",
      placeholder: "Height...",
      keyboard: "decimal-pad",
      float: true,
    },
    {
      name: "current_weight",
      label: "WEIGHT",
      placeholder: "Weight...",
      keyboard: "decimal-pad",
      float: true,
    },
  ] as const;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.color.background }]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          gap: 16,
          paddingBottom: 100,
        }}
      >
        {fields.map((field) => (
          <View key={field.name} style={{ gap: theme.spacing.label }}>
            <Text
              style={[styles.fieldLabel, { color: theme.color.textSecondary }]}
            >
              {field.label}
            </Text>
            <Controller
              name={field.name as keyof ProfileUpdate}
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  placeholder={field.placeholder}
                  placeholderTextColor={theme.color.placeholderColor}
                  value={value?.toString() || ""}
                  keyboardType={field.keyboard as any}
                  autoCapitalize={(field as any).autoCapitalize || "sentences"}
                  onFocus={() => setFocusedField(field.name)}
                  onBlur={() => {
                    setFocusedField(null);
                    onBlur();
                  }}
                  onChangeText={(text) => {
                    if ((field as any).float)
                      onChange(text ? parseFloat(text) : 0);
                    else if ((field as any).numeric)
                      onChange(text ? parseInt(text) : null);
                    else onChange(text.trim());
                  }}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.color.input,
                      borderColor:
                        focusedField === field.name
                          ? theme.color.accentActive
                          : theme.color.border,
                      color: theme.color.textPrimary,
                    },
                  ]}
                />
              )}
            />
          </View>
        ))}

        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          style={[
            styles.saveButton,
            {
              backgroundColor: isDirty
                ? theme.color.accentStrong
                : theme.color.surface,
              borderColor: theme.color.border,
              opacity: isDirty ? 1 : 0.5,
            },
          ]}
          disabled={!isDirty}
        >
          <Text
            style={[styles.saveButtonText, { color: theme.color.textPrimary }]}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    fontSize: 15,
  },
  saveButton: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    alignItems: "center",
  },
  saveButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
});
