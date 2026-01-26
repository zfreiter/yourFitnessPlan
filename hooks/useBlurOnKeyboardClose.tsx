import { useEffect } from "react";
import { Keyboard, TextInput } from "react-native";

export function useBlurOnKeyboardClose(ref: React.RefObject<TextInput | null>) {
  useEffect(() => {
    if (!ref?.current) return;
    const sub = Keyboard.addListener("keyboardDidHide", () => {
      ref.current?.blur();
    });

    return () => sub.remove();
  }, [ref]);
}

export function useBlurOnKeyboardHide() {
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidHide", () => {
      Keyboard.dismiss();
    });

    return () => sub.remove();
  }, []);
}
