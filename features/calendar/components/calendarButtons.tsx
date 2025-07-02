import { Pressable, Text } from "react-native";

export function CreateWorkoutButton({
  onPress,
}: {
  onPress: () => void;
}): JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.5 : 1,
        backgroundColor: "#279AF1",
        padding: 10,
        borderRadius: 5,
        width: "100%",
        marginVertical: 10,
      })}
    >
      <Text
        selectable={false}
        style={{ textAlign: "center", fontSize: 18, fontWeight: "bold" }}
      >
        Create workout
      </Text>
    </Pressable>
  );
}
