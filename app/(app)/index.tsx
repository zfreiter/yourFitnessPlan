import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/(app)/main/" />;
}

// import { useAuth } from "@/context/authContext";
// import { Redirect } from "expo-router";
// import { View, ActivityIndicator } from "react-native";

// export default function Index() {
//   const { user, isLoading } = useAuth();

//   if (isLoading) {
//     return (
//       <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   // Redirect based on auth state
//   if (user) {
//     return <Redirect href="/(app)/main/" />;
//   }

//   return <Redirect href="/login" />;
// }
