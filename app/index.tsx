import HomeScreen from "@/src/screens/home/HomeScreen";
import { useSettings } from "@/src/contexts/SettingsContext";
import { getOnboardingCheckpoint } from "@/src/services/onboardingCheckpoint";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

type StartupRoute = "/" | "/createprofile" | "/createcourse" | "/coursepanel";

function parseStoredJson<T>(value: string | null, fallback: T): T {
  if (value == null) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function resolveStartupRoute(): Promise<StartupRoute> {
  const [checkpoint, coursesRaw, pinnedRaw, activeCourseIdxRaw, activeCustomCourseIdRaw] =
    await Promise.all([
      getOnboardingCheckpoint(),
      AsyncStorage.getItem("courses"),
      AsyncStorage.getItem("officialPinnedCourseIds"),
      AsyncStorage.getItem("activeCourseIdx"),
      AsyncStorage.getItem("activeCustomCourseId"),
    ]);

  const courses = parseStoredJson<unknown[]>(coursesRaw, []);
  const pinnedOfficialCourseIds = parseStoredJson<number[]>(pinnedRaw, []);
  const activeCourseIdx = parseStoredJson<number | null>(activeCourseIdxRaw, null);
  const activeCustomCourseId = parseStoredJson<number | null>(
    activeCustomCourseIdRaw,
    null
  );
  const hasActiveCourse = activeCourseIdx != null || activeCustomCourseId != null;
  const hasPinnedCourses = courses.length > 0 || pinnedOfficialCourseIds.length > 0;

  if (hasActiveCourse) {
    return "/";
  }

  if (hasPinnedCourses) {
    return "/coursepanel";
  }

  if (checkpoint === "language_required") {
    return "/createprofile";
  }

  if (checkpoint === "activate_required") {
    return "/coursepanel";
  }

  return "/createcourse";
}

export default function StartupIndexRoute() {
  const { colors } = useSettings();
  const [targetRoute, setTargetRoute] = useState<StartupRoute | null>(null);

  useEffect(() => {
    let mounted = true;

    void resolveStartupRoute().then((route) => {
      if (mounted) {
        setTargetRoute(route);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (targetRoute == null) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (targetRoute !== "/") {
    return <Redirect href={targetRoute} />;
  }

  return <HomeScreen />;
}
