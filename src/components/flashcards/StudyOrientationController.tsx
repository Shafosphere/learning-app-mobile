import { useSettings } from "@/src/contexts/SettingsContext";
import { usePathname } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { useEffect } from "react";
import { Platform } from "react-native";

// Route changes and settings hydration may overlap a native rotation request.
// Apply them in order so an older request cannot leave the next screen locked.
let orientationQueue = Promise.resolve();
function applyOrientation(lock: ScreenOrientation.OrientationLock) {
  orientationQueue = orientationQueue
    .then(() => ScreenOrientation.lockAsync(lock))
    .catch((error) => console.warn("[StudyOrientation] Could not set screen orientation", error));
}

export function StudyOrientationController() {
  const pathname = usePathname();
  const { flashcardsLandscapeEnabled } = useSettings();
  const isStudyRoute = pathname === "/flashcards" || pathname === "/review/reviewflashcards";
  const portraitOnly = isStudyRoute && flashcardsLandscapeEnabled !== true;

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
