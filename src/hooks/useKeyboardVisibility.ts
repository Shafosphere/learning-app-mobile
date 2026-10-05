import { useEffect, useState } from "react";
import { Keyboard, type KeyboardEvent } from "react-native";

// Visibility is independent of whether a screen animates a bottom dock.
export function useKeyboardVisibility() {
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  const [keyboardTopInWindow, setKeyboardTopInWindow] = useState<number | null>(
    () => Keyboard.metrics?.()?.screenY ?? null,
  );
  useEffect(() => {
    const show = (event: KeyboardEvent) => {
      setKeyboardVisible(true);
      setKeyboardTopInWindow(event.endCoordinates?.screenY ?? null);
    };
    const subscriptions = [
      Keyboard.addListener("keyboardWillShow", show),
      Keyboard.addListener("keyboardDidShow", show),
      Keyboard.addListener("keyboardDidChangeFrame", show),
      Keyboard.addListener("keyboardDidHide", () => {
        setKeyboardVisible(false);
        setKeyboardTopInWindow(null);
      }),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);
  return { keyboardVisible, keyboardTopInWindow };
}
