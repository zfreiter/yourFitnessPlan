export interface ProfileInterface {
  id: string;
  age?: number | null;
  current_height?: number | null;
  current_weight?: number | null;
  full_name: string;
  username?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate {
  id: string;
  age?: number | null;
  current_height?: number | null;
  current_weight?: number | null;
  first_name: string;
  last_name: string;
  username?: string | null;
  avatar_url?: string | null;
  created_at: string;
}

export interface ProfileUpdateFunction {
  age?: number | null;
  current_height?: number | null;
  current_weight?: number | null;
  full_name: string;
  username?: string | null;
}

export interface UserPreferences {
  user_id: string;
  theme: "light" | "dark";
  weight_unit: "lbs" | "kg";
  height_unit: "in" | "cm";
  set_progression_style: "straight" | "ramp" | "custom";
  rm_formula: "epley" | "brzycki" | "lombardi";
  weight_rounding: "2.5" | "5" | "10" | "none";
  allow_analytics: boolean;
  default_workout_visibility: "private" | "shareable";
  allow_friend_requests: boolean;
  who_can_send_workouts: "everyone" | "friends" | "none";
  notifications_enabled: boolean;
  email_product_updates: boolean;
  email_tips: boolean;
  created_at: string; // ISO 8601 timestamp string
  updated_at: string; // ISO 8601 timestamp string
}

// Optional: Interface for inserting/updating (where some fields might be optional)
export interface UserPreferencesInsert {
  user_id: string;
  theme?: "light" | "dark";
  weight_unit?: "lbs" | "kg";
  height_unit?: "in" | "cm";
  set_progression_style?: "straight" | "ramp" | "custom";
  rm_formula?: "epley" | "brzycki" | "lombardi";
  weight_rounding?: "2.5" | "5" | "10" | "none";
  allow_analytics?: boolean;
  default_workout_visibility?: "private" | "shareable";
  allow_friend_requests?: boolean;
  who_can_send_workouts?: "everyone" | "friends" | "none";
  notifications_enabled?: boolean;
  email_product_updates?: boolean;
  email_tips?: boolean;
}

// Optional: Interface for updates (all fields optional except user_id)
export interface UserPreferencesUpdate {
  user_id: string;
  theme?: "light" | "dark";
  weight_unit?: "lbs" | "kg";
  height_unit?: "in" | "cm";
  set_progression_style?: "straight" | "ramp" | "custom";
  rm_formula?: "epley" | "brzycki" | "lombardi";
  weight_rounding?: "2.5" | "5" | "10" | "none";
  allow_analytics?: boolean;
  default_workout_visibility?: "private" | "shareable";
  allow_friend_requests?: boolean;
  who_can_send_workouts?: "everyone" | "friends" | "none";
  notifications_enabled?: boolean;
  email_product_updates?: boolean;
  email_tips?: boolean;
}
