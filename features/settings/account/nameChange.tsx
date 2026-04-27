// import {
//   View,
//   Text,
//   TextInput,
//   Pressable,
//   Modal,
//   StyleSheet,
// } from "react-native";
// import { useColorTheme } from "@/context/colorThemeContext";
// import Toast from "react-native-toast-message";
// import { useState } from "react";
// import MaterialIcons from "@expo/vector-icons/MaterialIcons";
// import { supabase } from "@/lib/supabaseClient";
// import { useAuth } from "@/context/authContext";
// import { useProfile } from "@/context/profileContext";
// import { syncService } from "@/services/syncService";

// export default function NameChange() {
//   const { user, setUser } = useAuth();
//   const {} = useProfile();
//   const firstName = user?.full_name?.split(" ")[0] || "";
//   const lastName = user?.full_name?.split(" ")[1] || "";
//   const [modalVisible, setModalVisible] = useState(false);
//   const [updateFirstName, setUpdateFirstName] = useState(firstName);
//   const [updateLastName, setUpdateLastName] = useState(lastName);
//   const [nameError, setNameError] = useState("");
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [focusedField, setFocusedField] = useState<string | null>(null);
//   const { theme } = useColorTheme();

//   const closeModal = () => {
//     setNameError("");
//     setModalVisible(false);
//   };

//   const handleSubmit = async () => {
//     if (!updateFirstName || !updateLastName) {
//       setNameError("Please enter both first and last name");
//       return;
//     }
//     setIsSubmitting(true);
//     try {
//       const fullName = `${updateFirstName} ${updateLastName}`.trim();
//       const { error } = await supabase
//         .from("profiles")
//         .update({ full_name: fullName })
//         .eq("id", user?.id)
//         .select();
//       if (error) throw error;
//       setUser((prev) => (prev ? { ...prev, full_name: fullName } : prev));
//       Toast.show({ type: "success", text1: "Name updated successfully" });
//       setModalVisible(false);
//     } catch {
//       setNameError("Failed to update name");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <View>
//       <Pressable
//         onPress={() => setModalVisible(true)}
//         style={({ pressed }) => [
//           styles.triggerButton,
//           {
//             backgroundColor: pressed
//               ? theme.color.surface2
//               : theme.color.surface,
//             borderColor: theme.color.border,
//           },
//         ]}
//       >
//         <Text
//           style={[
//             styles.triggerText,
//             { color: theme.color.textPrimary, fontFamily: theme.fonts.body },
//           ]}
//         >
//           Update Name
//         </Text>
//       </Pressable>

//       <Modal
//         animationType="slide"
//         transparent
//         visible={modalVisible}
//         onRequestClose={closeModal}
//       >
//         <Pressable style={styles.backdrop} onPress={closeModal}>
//           <Pressable
//             style={styles.sheetWrapper}
//             onPress={(e) => e.stopPropagation()}
//           >
//             <View
//               style={[
//                 styles.sheet,
//                 {
//                   backgroundColor: theme.color.surface,
//                   borderColor: theme.color.border,
//                 },
//               ]}
//             >
//               <Pressable onPress={closeModal} style={styles.closeButton}>
//                 <MaterialIcons
//                   name="cancel"
//                   size={24}
//                   color={theme.color.textSecondary}
//                 />
//               </Pressable>

//               <Text
//                 style={[
//                   styles.modalTitle,
//                   {
//                     color: theme.color.textPrimary,
//                     fontFamily: theme.fonts.heading,
//                   },
//                 ]}
//               >
//                 Update Name
//               </Text>

//               <View style={{ gap: theme.spacing.label }}>
//                 <Text
//                   style={[
//                     styles.fieldLabel,
//                     { color: theme.color.textSecondary },
//                   ]}
//                 >
//                   FIRST NAME
//                 </Text>
//                 <TextInput
//                   style={[
//                     styles.input,
//                     {
//                       backgroundColor: theme.color.input,
//                       borderColor: nameError
//                         ? theme.color.danger
//                         : focusedField === "first"
//                           ? theme.color.accentActive
//                           : theme.color.border,
//                       color: theme.color.textPrimary,
//                     },
//                   ]}
//                   placeholder="Enter first name"
//                   placeholderTextColor={theme.color.placeholderColor}
//                   autoCapitalize="words"
//                   autoCorrect={false}
//                   returnKeyType="next"
//                   onFocus={() => setFocusedField("first")}
//                   onBlur={() => setFocusedField(null)}
//                   value={updateFirstName}
//                   onChangeText={(t) => setUpdateFirstName(t.trim())}
//                 />
//               </View>

//               <View style={{ gap: theme.spacing.label }}>
//                 <Text
//                   style={[
//                     styles.fieldLabel,
//                     { color: theme.color.textSecondary },
//                   ]}
//                 >
//                   LAST NAME
//                 </Text>
//                 <TextInput
//                   style={[
//                     styles.input,
//                     {
//                       backgroundColor: theme.color.input,
//                       borderColor: nameError
//                         ? theme.color.danger
//                         : focusedField === "last"
//                           ? theme.color.accentActive
//                           : theme.color.border,
//                       color: theme.color.textPrimary,
//                     },
//                   ]}
//                   placeholder="Enter last name"
//                   placeholderTextColor={theme.color.placeholderColor}
//                   autoCapitalize="words"
//                   autoCorrect={false}
//                   returnKeyType="done"
//                   onFocus={() => setFocusedField("last")}
//                   onBlur={() => setFocusedField(null)}
//                   value={updateLastName}
//                   onChangeText={(t) => setUpdateLastName(t.trim())}
//                 />
//               </View>

//               {nameError.length > 0 && (
//                 <Text style={[styles.errorText, { color: theme.color.danger }]}>
//                   {nameError}
//                 </Text>
//               )}

//               <Pressable
//                 onPress={handleSubmit}
//                 style={({ pressed }) => [
//                   styles.submitButton,
//                   {
//                     backgroundColor: pressed
//                       ? theme.color.accentStrong
//                       : theme.color.accent,
//                   },
//                 ]}
//               >
//                 <Text
//                   style={[styles.submitText, { fontFamily: theme.fonts.body }]}
//                 >
//                   {isSubmitting ? "Submitting..." : "Submit Name Change"}
//                 </Text>
//               </Pressable>
//             </View>
//           </Pressable>
//         </Pressable>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   triggerButton: {
//     height: 48,
//     justifyContent: "center",
//     alignItems: "center",
//     borderWidth: 1,
//     borderRadius: 8,
//   },
//   triggerText: { fontSize: 15 },
//   backdrop: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   sheetWrapper: { width: "100%", padding: 20 },
//   sheet: { gap: 16, borderWidth: 1, padding: 20, borderRadius: 10 },
//   closeButton: { alignSelf: "flex-end" },
//   modalTitle: { fontSize: 18, textAlign: "center", fontWeight: "700" },
//   fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
//   input: { borderWidth: 1, padding: 10, borderRadius: 8, fontSize: 15 },
//   errorText: { fontSize: 12 },
//   submitButton: {
//     height: 48,
//     justifyContent: "center",
//     alignItems: "center",
//     borderRadius: 8,
//   },
//   submitText: { fontSize: 15, color: "#fff", fontWeight: "600" },
// });
