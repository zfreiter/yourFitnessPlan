import { Redirect } from "expo-router";
import { useAuth } from "@/context/authContext";

export default function Index() {
  const { user, isAuthInitialized } = useAuth();

  if (!isAuthInitialized) {
    return null; // or splash/loading screen
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(app)/main/" />;
}
