import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { LanguageCourse } from "@/src/types/course";

import { useCourseOverrideSettings } from "../useCourseOverrideSettings";

const course: LanguageCourse = {
  sourceLang: "en",
  targetLang: "pl",
  level: "A1",
};

describe("useCourseOverrideSettings", () => {
  beforeEach(async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sets the global skip-correction value while preserving course overrides", async () => {
    await AsyncStorage.multiSet([
      ["flashcards.skipCorrectionEnabled", JSON.stringify(false)],
      [
        "flashcards.courseSkipCorrectionOverrides",
        JSON.stringify({
          builtin: { "en|pl|A1": true },
          custom: { "7": false },
        }),
      ],
    ]);
    const { result, rerender } = renderHook<
      ReturnType<typeof useCourseOverrideSettings>,
      { activeCourseIdx: number | null; activeCustomCourseId: number | null }
    >(
      ({ activeCourseIdx, activeCustomCourseId }) =>
        useCourseOverrideSettings({
          courses: [course],
          activeCourseIdx,
          activeCustomCourseId,
        }),
      { initialProps: { activeCourseIdx: null, activeCustomCourseId: 7 } }
    );

    await waitFor(() => {
      expect(result.current.skipCorrectionEnabled).toBe(false);
    });

    await act(async () => {
      await result.current.setSkipCorrectionDefaultEnabled(true);
    });

    await waitFor(async () => {
      expect(result.current.skipCorrectionDefaultEnabled).toBe(true);
      expect(result.current.skipCorrectionEnabled).toBe(false);
      await expect(
        AsyncStorage.getItem("flashcards.courseSkipCorrectionOverrides")
      ).resolves.toBe(
        JSON.stringify({
          builtin: { "en|pl|A1": true },
          custom: { "7": false },
        })
      );
    });

    rerender({ activeCourseIdx: 0, activeCustomCourseId: null });

    await waitFor(() => {
      expect(result.current.skipCorrectionEnabled).toBe(true);
    });
  });
});
