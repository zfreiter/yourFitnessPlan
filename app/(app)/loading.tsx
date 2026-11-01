import { useEffect } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/context/authContext";
import { AuthLoadingView } from "@/components/navigation/AuthLoadingView";
import { traceAuth } from "@/utils/authDiagnostics";

// Compatibility entry routes share one resolver. Stack guards handle normal
// login/logout, so neither transition needs to pass through this route.
export default function LoadingScreen() {
  const { user, isAuthInitialized } = useAuth();
  useEffect(() => {
    traceAuth("route-mount", { decision: "auth-entry" });
    return () => traceAuth("route-cleanup", { decision: "auth-entry" });
  }, []);
  return <>
    <AuthLoadingView />
    {isAuthInitialized && <Redirect href={user ? "/(app)/main/" : "/login"} />}
  </>;
}
