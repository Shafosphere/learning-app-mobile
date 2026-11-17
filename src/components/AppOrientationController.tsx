import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import { useTutorialOrientationState } from "@/src/contexts/TutorialOrientationContext";
import * as ScreenOrientation from "expo-screen-orientation";
import { useEffect } from "react";
import { Platform } from "react-native";

// Display resizing and unmounting may overlap a native rotation request.
// Apply them in order so an older request cannot override the latest display policy.
let orientationQueue = Promise.resolve();
function applyOrientation(lock: ScreenOrientation.OrientationLock) {
  orientationQueue = orientationQueue
    .then(() => ScreenOrientation.lockAsync(lock))
    .catch((error) => console.warn("[AppOrientation] Could not set screen orientation", error));
}

export function AppOrientationController() {
  const { isTabletLayout } = useDeviceLayout({ sizeSource: "physicalScreen" });
  const tutorialOrientation = useTutorialOrientationState();
  const portraitOnly = !isTabletLayout || tutorialOrientation?.portraitRequired === true;

  useEffect(() => {
    if (Platform.OS === "web") return;
    applyOrientation(portraitOnly
      ? ScreenOrientation.OrientationLock.PORTRAIT_UP
      : ScreenOrientation.OrientationLock.DEFAULT);
  }, [portraitOnly]);

  useEffect(() => () => {
    if (Platform.OS !== "web") applyOrientation(ScreenOrientation.OrientationLock.DEFAULT);
  }, []);

  return null;
}
