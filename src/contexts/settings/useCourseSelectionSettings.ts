import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect } from "react";

import {
  useHydratedPersistedState,
  usePersistedState,
} from "@/src/hooks/usePersistedState";
import type { LanguageCourse } from "@/src/types/course";

import { findCourseIndex } from "./courseKeys";
import { DEFAULT_CUSTOM_COURSE_ENTRY_SETTINGS_SEEN } from "./defaults";
import type { CustomCourseEntrySettingsSeenMap } from "./types";

export type CourseSelectionStateToApply = {
  pinnedOfficialCourseIds: number[];
  activeCustomCourseId: number | null;
  activeCourseIdx: number | null;
};

export function useCourseSelectionSettings() {
  const [courses, setCourses] = usePersistedState<LanguageCourse[]>(
    "courses",
    []
  );
  const [activeCourseIdx, setActiveCourseIdxState] = usePersistedState<
    number | null
  >("activeCourseIdx", null);
  const [activeCustomCourseId, setActiveCustomCourseIdState] =
    usePersistedState<number | null>("activeCustomCourseId", null);
  const [
    customCourseEntrySettingsSeen,
    setCustomCourseEntrySettingsSeen,
    customCourseEntrySettingsSeenHydrated,
  ] = useHydratedPersistedState<CustomCourseEntrySettingsSeenMap>(
    "flashcards.customCourseEntrySettingsSeen",
    DEFAULT_CUSTOM_COURSE_ENTRY_SETTINGS_SEEN
  );
  const [pinnedOfficialCourseIds, setPinnedOfficialCourseIds] =
    usePersistedState<number[]>("officialPinnedCourseIds", []);

  const setActiveCourseIdx = useCallback(
    async (idx: number | null) => {
      if (idx != null) {
        await setActiveCustomCourseIdState(null);
      }
      await setActiveCourseIdxState(idx);
    },
    [setActiveCustomCourseIdState, setActiveCourseIdxState]
  );

  const setActiveCustomCourseId = useCallback(
    async (courseId: number | null) => {
      if (courseId != null) {
        await setActiveCourseIdxState(null);
      }
      await setActiveCustomCourseIdState(courseId);
    },
    [setActiveCustomCourseIdState, setActiveCourseIdxState]
  );

  const hasSeenCustomCourseEntrySettings = useCallback(
    (courseId: number) =>
      customCourseEntrySettingsSeen[courseId.toString()] === true,
    [customCourseEntrySettingsSeen]
  );

  const markCustomCourseEntrySettingsSeen = useCallback(
    async (courseId: number) => {
      const key = courseId.toString();
      if (customCourseEntrySettingsSeen[key] === true) {
        return;
      }
      await setCustomCourseEntrySettingsSeen({
        ...customCourseEntrySettingsSeen,
        [key]: true,
      });
    },
    [customCourseEntrySettingsSeen, setCustomCourseEntrySettingsSeen]
  );

  const pinOfficialCourse = useCallback(
    async (id: number) => {
      if (pinnedOfficialCourseIds.includes(id)) {
        return;
      }
      await setPinnedOfficialCourseIds([...pinnedOfficialCourseIds, id]);
    },
    [pinnedOfficialCourseIds, setPinnedOfficialCourseIds]
  );

  const unpinOfficialCourse = useCallback(
    async (id: number) => {
      if (!pinnedOfficialCourseIds.includes(id)) {
        return;
      }
      await setPinnedOfficialCourseIds(
        pinnedOfficialCourseIds.filter((currentId) => currentId !== id)
      );
    },
    [pinnedOfficialCourseIds, setPinnedOfficialCourseIds]
  );

  useEffect(() => {
    if (activeCourseIdx != null && activeCustomCourseId != null) {
      void setActiveCustomCourseId(null);
    }
  }, [activeCourseIdx, activeCustomCourseId, setActiveCustomCourseId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [legacyCoursesRaw, legacyActiveIdxRaw, legacyCustomIdRaw] =
          await Promise.all([
            AsyncStorage.getItem("profiles"),
            AsyncStorage.getItem("activeProfileIdx"),
            AsyncStorage.getItem("activeCustomProfileId"),
          ]);

        if (!cancelled && legacyCoursesRaw && courses.length === 0) {
          try {
            const parsed = JSON.parse(legacyCoursesRaw) as LanguageCourse[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              await setCourses(parsed);
            }
          } catch (error) {
            console.warn(
              "[SettingsContext] Failed to migrate legacy profiles",
              error
            );
          } finally {
            await AsyncStorage.removeItem("profiles");
          }
        }

        if (!cancelled && legacyActiveIdxRaw && activeCourseIdx == null) {
          try {
            const parsedIdx = JSON.parse(legacyActiveIdxRaw);
            if (typeof parsedIdx === "number") {
              await setActiveCourseIdx(parsedIdx);
            }
          } catch (error) {
            console.warn(
              "[SettingsContext] Failed to migrate legacy activeProfileIdx",
              error
            );
          } finally {
            await AsyncStorage.removeItem("activeProfileIdx");
          }
        }

        if (!cancelled && legacyCustomIdRaw && activeCustomCourseId == null) {
          try {
            const parsedId = JSON.parse(legacyCustomIdRaw);
            if (typeof parsedId === "number") {
              await setActiveCustomCourseId(parsedId);
            }
          } catch (error) {
            console.warn(
              "[SettingsContext] Failed to migrate legacy activeCustomProfileId",
              error
            );
          } finally {
            await AsyncStorage.removeItem("activeCustomProfileId");
          }
        }
      } catch (error) {
        console.warn("[SettingsContext] Legacy migration failed", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeCourseIdx,
    activeCustomCourseId,
    courses.length,
    setActiveCourseIdx,
    setActiveCustomCourseId,
    setCourses,
  ]);

  const addCourse = useCallback(
    async (course: LanguageCourse) => {
      const existsIdx = findCourseIndex(courses, course);
      if (existsIdx !== -1) {
        const existing = courses[existsIdx];
        if (existing.level == null && course.level != null) {
          const updated = [...courses];
          updated[existsIdx] = { ...existing, ...course };
          await setCourses(updated);
        }
        return;
      }

      await setCourses([...courses, course]);
    },
    [courses, setCourses]
  );

  const removeCourse = useCallback(
    async (course: LanguageCourse) => {
      const indexToRemove = findCourseIndex(courses, course);
      if (indexToRemove === -1) {
        return;
      }

      await setCourses(courses.filter((_, idx) => idx !== indexToRemove));

      if (activeCourseIdx == null) {
        return;
      }

      if (activeCourseIdx === indexToRemove) {
        await setActiveCourseIdx(null);
        return;
      }

      if (activeCourseIdx > indexToRemove) {
        await setActiveCourseIdx(activeCourseIdx - 1);
      }
    },
    [activeCourseIdx, courses, setActiveCourseIdx, setCourses]
  );

  const applyCourseSelectionState = useCallback(
    async (state: CourseSelectionStateToApply) => {
      await Promise.all([
        setPinnedOfficialCourseIds(state.pinnedOfficialCourseIds),
        setActiveCustomCourseIdState(
          state.activeCourseIdx != null ? null : state.activeCustomCourseId
        ),
        setActiveCourseIdxState(state.activeCourseIdx),
      ]);
    },
    [
      setActiveCourseIdxState,
      setActiveCustomCourseIdState,
      setPinnedOfficialCourseIds,
    ]
  );

  const resetCourseSelectionSettings = useCallback(async () => {
    await Promise.all([
      setCourses([]),
      setPinnedOfficialCourseIds([]),
      setActiveCourseIdxState(null),
      setActiveCustomCourseIdState(null),
      setCustomCourseEntrySettingsSeen(DEFAULT_CUSTOM_COURSE_ENTRY_SETTINGS_SEEN),
    ]);
  }, [
    setActiveCourseIdxState,
    setActiveCustomCourseIdState,
    setCustomCourseEntrySettingsSeen,
    setCourses,
    setPinnedOfficialCourseIds,
  ]);

  const activeCourse =
    activeCourseIdx != null ? courses[activeCourseIdx] ?? null : null;

  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    if (activeCustomCourseId != null) {
      console.log("[ActiveCourse] custom", { id: activeCustomCourseId });
      return;
    }
    if (activeCourse) {
      console.log("[ActiveCourse] builtin", {
        sourceLang: activeCourse.sourceLang,
        targetLang: activeCourse.targetLang,
        level: activeCourse.level ?? null,
      });
      return;
    }
    console.log("[ActiveCourse] none");
  }, [activeCourse, activeCustomCourseId]);

  return {
    courses,
    addCourse,
    removeCourse,
    activeCourseIdx,
    setActiveCourseIdx,
    activeCourse,
    activeCustomCourseId,
    setActiveCustomCourseId,
    customCourseEntrySettingsSeenHydrated,
    hasSeenCustomCourseEntrySettings,
    markCustomCourseEntrySettingsSeen,
    pinnedOfficialCourseIds,
    pinOfficialCourse,
    unpinOfficialCourse,
    applyCourseSelectionState,
    resetCourseSelectionSettings,
  };
}
