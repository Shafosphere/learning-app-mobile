import { useSettings } from "@/src/contexts/SettingsContext";
import { getCoursePlayRoute } from "@/src/features/customCourse/coursePlayRoute";
import FlashcardsScreen from "@/src/screens/flashcards/FlashcardsScreen/FlashcardsScreen";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";

type FlashcardsSession = { courseId: number | null };

export default function FlashcardsRoute() {
  const router = useRouter();
  const isFocused = useIsFocused();
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
  const [session, setSession] = useState<FlashcardsSession | null>(null);
  const shouldRenderFlashcards = isFocused
    ? route === "/flashcards"
    : session !== null && session.courseId === activeCustomCourseId;

  // Reconcile before rendering children: an effect would let the old screen
  // initialize persistence for the new course while this route is unfocused.
  // Keep ordinary blur state, but only focus may reopen an invalidated session.
  if (!shouldRenderFlashcards && session !== null) {
    setSession(null);
  } else if (
    shouldRenderFlashcards &&
    (session === null || session.courseId !== activeCustomCourseId)
  ) {
    setSession({ courseId: activeCustomCourseId });
  }

  useEffect(() => {
    if (isFocused && route === "/course-entry-settings") {
      router.replace(route);
    }
  }, [isFocused, route, router]);

  if (!shouldRenderFlashcards) {
    return <ActivityIndicator testID="flashcards-route-loading" />;
  }

  return <FlashcardsScreen />;
}
