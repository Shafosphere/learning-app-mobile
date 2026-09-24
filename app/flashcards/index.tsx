import { useSettings } from "@/src/contexts/SettingsContext";
import { getCoursePlayRoute } from "@/src/features/customCourse/coursePlayRoute";
import FlashcardsScreen from "@/src/screens/flashcards/FlashcardsScreen/FlashcardsScreen";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator } from "react-native";

export default function FlashcardsRoute() {
  const router = useRouter();
  const {
    activeCustomCourseId,
    activeCustomCourseIdHydrated,
    customCourseEntrySettingsSeenHydrated,
    hasSeenCustomCourseEntrySettings,
  } = useSettings();
  const route = activeCustomCourseIdHydrated
    ? getCoursePlayRoute(
        activeCustomCourseId,
        customCourseEntrySettingsSeenHydrated,
        hasSeenCustomCourseEntrySettings,
      )
    : null;

  useEffect(() => {
    if (route === "/course-entry-settings") {
      router.replace(route);
    }
  }, [route, router]);

  if (route !== "/flashcards") {
    return <ActivityIndicator testID="flashcards-route-loading" />;
  }

  return <FlashcardsScreen />;
}
