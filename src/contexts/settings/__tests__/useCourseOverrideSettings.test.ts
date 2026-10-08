import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { DEFAULT_LETTER_HINT_SETTINGS } from "@/src/utils/letterHints";
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

  it("persists both answer sides explicitly and keeps courses independent after remount", async () => {
    const params = { courses: [course], activeCourseIdx: null, activeCustomCourseId: 7 };
    const hook = renderHook(() => useCourseOverrideSettings(params));
    await waitFor(() => expect(hook.result.current.boxZeroAnswerSide).toBe("back"));
    await act(async () => { await hook.result.current.setCustomCourseBoxZeroAnswerSide(7, "front"); });
    await act(async () => { await hook.result.current.setCustomCourseBoxZeroAnswerSide(7, "back"); });
    await act(async () => { await hook.result.current.setCustomCourseBoxZeroAnswerSide(8, "front"); });
    await act(async () => { await hook.result.current.setBuiltinCourseBoxZeroAnswerSide(course, "back"); });
    expect(JSON.parse((await AsyncStorage.getItem("flashcards.courseBoxZeroAnswerSideOverrides"))!)).toEqual({
      builtin: { "en|pl|A1": "back" }, custom: { "7": "back", "8": "front" },
    });
    hook.unmount();
    const restored = renderHook(() => useCourseOverrideSettings({ ...params, activeCustomCourseId: 8 }));
    await waitFor(() => expect(restored.result.current.boxZeroAnswerSide).toBe("front"));
    expect(restored.result.current.getCustomCourseBoxZeroAnswerSide(7)).toBe("back");
    expect(restored.result.current.getCustomCourseBoxZeroAnswerSide(9)).toBe("back");
  });

  it("persists personalized letter hints and resolves the active course after remount", async () => {
    const initialProps = { activeCourseIdx: null as number | null, activeCustomCourseId: 7 as number | null };
    const hook = renderHook<ReturnType<typeof useCourseOverrideSettings>, typeof initialProps>(({ activeCourseIdx, activeCustomCourseId }) => useCourseOverrideSettings({
      courses: [course], activeCourseIdx, activeCustomCourseId,
    }), { initialProps });
    await waitFor(() => expect(hook.result.current.letterHintSettingsHydrated).toBe(true));
    expect(hook.result.current.letterHintSettings).toEqual(DEFAULT_LETTER_HINT_SETTINGS);
    const custom = { enabled: true, profile: "custom" as const, boxOneLimit: 3, boxTwoLimit: 0 };
    const disabled = { ...custom, enabled: false };
    await act(async () => { await hook.result.current.setCustomCourseLetterHintSettings(7, custom); });
    await act(async () => { await hook.result.current.setCustomCourseLetterHintSettings(8, disabled); });
    await act(async () => { await hook.result.current.setBuiltinCourseLetterHintSettings(course, { ...DEFAULT_LETTER_HINT_SETTINGS, enabled: true }); });
    expect(hook.result.current.letterHintSettings).toEqual(custom);
    hook.rerender({ activeCourseIdx: 0, activeCustomCourseId: null });
    expect(hook.result.current.letterHintSettings).toEqual({ ...DEFAULT_LETTER_HINT_SETTINGS, enabled: true });
    expect(hook.result.current.getCustomCourseLetterHintSettings(9)).toEqual(DEFAULT_LETTER_HINT_SETTINGS);
    expect(JSON.parse((await AsyncStorage.getItem("flashcards.courseLetterHintOverrides"))!)).toEqual({
      builtin: { "en|pl|A1": { ...DEFAULT_LETTER_HINT_SETTINGS, enabled: true } }, custom: { "7": custom, "8": disabled },
    });
    hook.unmount();
    const restored = renderHook(() => useCourseOverrideSettings({ courses: [course], activeCourseIdx: null, activeCustomCourseId: 8 }));
    await waitFor(() => expect(restored.result.current.letterHintSettingsHydrated).toBe(true));
    expect(restored.result.current.letterHintSettings).toEqual(disabled);
    expect(restored.result.current.getCustomCourseLetterHintSettings(7)).toEqual(custom);
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
