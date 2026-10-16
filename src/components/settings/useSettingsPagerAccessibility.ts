import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useSettingsPagerAccessibility() {
  const [screenReader, setScreenReader] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let alive = true;
    let readerChanged = false;
    let motionChanged = false;
    const reader = AccessibilityInfo.addEventListener("screenReaderChanged", (value) => {
      readerChanged = true;
      setScreenReader(value);
    });
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      motionChanged = true;
      setReduceMotion(value);
    });
    void AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (alive && !readerChanged) setScreenReader(value);
    }).catch(() => {});
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive && !motionChanged) setReduceMotion(value);
    }).catch(() => {});
    return () => { alive = false; reader.remove(); motion.remove(); };
  }, []);
  return { screenReader, reduceMotion };
}
