import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { LanguageCourse } from "@/src/types/course";

import { useCourseSelectionSettings } from "../useCourseSelectionSettings";

const baseCourse: LanguageCourse = {
  sourceLang: "en",
  targetLang: "pl",
  sourceLangId: 1,
  targetLangId: 2,
};

const secondCourse: LanguageCourse = {
  sourceLang: "de",
  targetLang: "pl",
  sourceLangId: 3,
  targetLangId: 2,
  level: "A2",
};

describe("useCourseSelectionSettings", () => {
  beforeEach(async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("keeps official and custom active selections mutually exclusive", async () => {
    const { result } = renderHook(() => useCourseSelectionSettings());

    await act(async () => {
      await result.current.setActiveCustomCourseId(42);
    });

    await waitFor(() => {
      expect(result.current.activeCustomCourseId).toBe(42);
      expect(result.current.activeCourseIdx).toBeNull();
    });

    await act(async () => {
      await result.current.setActiveCourseIdx(1);
    });

    await waitFor(() => {
      expect(result.current.activeCourseIdx).toBe(1);
      expect(result.current.activeCustomCourseId).toBeNull();
    });

    await act(async () => {
      await result.current.setActiveCustomCourseId(99);
    });

    await waitFor(() => {
      expect(result.current.activeCustomCourseId).toBe(99);
      expect(result.current.activeCourseIdx).toBeNull();
    });
  });

  it("adds unique courses and upgrades legacy level-less matches", async () => {
    const { result } = renderHook(() => useCourseSelectionSettings());

    await act(async () => {
      await result.current.addCourse(baseCourse);
    });

    await waitFor(() => {
      expect(result.current.courses).toEqual([baseCourse]);
    });

    await act(async () => {
      await result.current.addCourse(baseCourse);
    });

    await waitFor(() => {
      expect(result.current.courses).toHaveLength(1);
    });

    const leveledCourse: LanguageCourse = { ...baseCourse, level: "B1" };
    await act(async () => {
      await result.current.addCourse(leveledCourse);
    });

    await waitFor(() => {
      expect(result.current.courses).toEqual([leveledCourse]);
    });
  });

  it("updates active official index when removing courses", async () => {
    const { result } = renderHook(() => useCourseSelectionSettings());

    await act(async () => {
      await result.current.addCourse(baseCourse);
    });
    await act(async () => {
      await result.current.addCourse(secondCourse);
    });
    await act(async () => {
      await result.current.setActiveCourseIdx(1);
    });

    await waitFor(() => {
      expect(result.current.activeCourseIdx).toBe(1);
    });

    await act(async () => {
      await result.current.removeCourse(baseCourse);
    });

    await waitFor(() => {
      expect(result.current.courses).toEqual([secondCourse]);
      expect(result.current.activeCourseIdx).toBe(0);
    });

    await act(async () => {
      await result.current.removeCourse(secondCourse);
    });

    await waitFor(() => {
      expect(result.current.courses).toEqual([]);
      expect(result.current.activeCourseIdx).toBeNull();
    });
  });

  it("pins and unpins official courses idempotently", async () => {
    const { result } = renderHook(() => useCourseSelectionSettings());

    await act(async () => {
      await result.current.pinOfficialCourse(7);
    });
    await act(async () => {
      await result.current.pinOfficialCourse(7);
    });

    await waitFor(() => {
      expect(result.current.pinnedOfficialCourseIds).toEqual([7]);
    });

    await act(async () => {
      await result.current.unpinOfficialCourse(7);
    });
    await act(async () => {
      await result.current.unpinOfficialCourse(7);
    });

    await waitFor(() => {
      expect(result.current.pinnedOfficialCourseIds).toEqual([]);
    });
  });

  it("hydrates and marks custom course entry settings by string key", async () => {
    await AsyncStorage.setItem(
      "flashcards.customCourseEntrySettingsSeen",
      JSON.stringify({ "7": true })
    );
    const { result } = renderHook(() => useCourseSelectionSettings());

    await waitFor(() => {
      expect(result.current.customCourseEntrySettingsSeenHydrated).toBe(true);
      expect(result.current.hasSeenCustomCourseEntrySettings(7)).toBe(true);
    });

    await act(async () => {
      await result.current.markCustomCourseEntrySettingsSeen(8);
    });

    await waitFor(async () => {
      expect(result.current.hasSeenCustomCourseEntrySettings(8)).toBe(true);
      await expect(
        AsyncStorage.getItem("flashcards.customCourseEntrySettingsSeen")
      ).resolves.toBe(JSON.stringify({ "7": true, "8": true }));
    });
  });

  it("migrates legacy profiles and active ids", async () => {
    await AsyncStorage.multiSet([
      ["profiles", JSON.stringify([baseCourse])],
      ["activeProfileIdx", JSON.stringify(0)],
      ["activeCustomProfileId", JSON.stringify(55)],
    ]);

    const { result } = renderHook(() => useCourseSelectionSettings());

    await waitFor(() => {
      expect(result.current.courses).toEqual([baseCourse]);
      expect(result.current.activeCustomCourseId).toBe(55);
      expect(result.current.activeCourseIdx).toBeNull();
    });

    await waitFor(async () => {
      await expect(AsyncStorage.getItem("profiles")).resolves.toBeNull();
      await expect(AsyncStorage.getItem("activeProfileIdx")).resolves.toBeNull();
      await expect(
        AsyncStorage.getItem("activeCustomProfileId")
      ).resolves.toBeNull();
    });
  });
});
