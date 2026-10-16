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

  it.each([
    "BoxZeroEnabled", "AutoflowEnabled", "ShowExplanationEnabled",
    "ExplanationOnlyOnWrong", "SkipCorrectionEnabled", "ImageFrameEnabled",
  ] as const)("preserves %s for custom and built-in courses after remount", async (setting) => {
    const params = { courses: [course], activeCourseIdx: null, activeCustomCourseId: 7 };
    const hook = renderHook(() => useCourseOverrideSettings(params));
    await waitFor(() => expect(hook.result.current.boxZeroSettingsHydrated).toBe(true));
    const getCustom = `getCustomCourse${setting}` as const;
    const setCustom = `setCustomCourse${setting}` as const;
    const getBuiltin = `getBuiltinCourse${setting}` as const;
    const setBuiltin = `setBuiltinCourse${setting}` as const;
    const value = !hook.result.current[getCustom](7);
    await act(async () => { await hook.result.current[setCustom](7, value); });
    await act(async () => { await hook.result.current[setCustom](8, !value); });
    await act(async () => { await hook.result.current[setBuiltin](course, value); });
    hook.unmount();
    const restored = renderHook(() => useCourseOverrideSettings(params));
    await waitFor(() => {
      expect(restored.result.current[getCustom](7)).toBe(value);
      expect(restored.result.current[getCustom](8)).toBe(!value);
      expect(restored.result.current[getBuiltin](course)).toBe(value);
    });
  });

  it("preserves card size, image size and button labels independently after remount", async () => {
    const params = { courses: [course], activeCourseIdx: null, activeCustomCourseId: 7 };
    const hook = renderHook(() => useCourseOverrideSettings(params));
    await waitFor(() => expect(hook.result.current.boxZeroSettingsHydrated).toBe(true));
    await act(async () => { await hook.result.current.setCustomCourseCardSize(7, "small"); });
    await act(async () => { await hook.result.current.setCustomCourseImageSize(7, "very_large"); });
    await act(async () => { await hook.result.current.setCustomCourseTrueFalseButtonsVariant(7, "know_dont_know"); });
    await act(async () => { await hook.result.current.setBuiltinCourseCardSize(course, "small"); });
    await act(async () => { await hook.result.current.setBuiltinCourseImageSize(course, "medium"); });
    await act(async () => { await hook.result.current.setBuiltinCourseTrueFalseButtonsVariant(course, "know_dont_know"); });
    hook.unmount();
    const restored = renderHook(() => useCourseOverrideSettings(params));
    await waitFor(() => {
      expect(restored.result.current.getCustomCourseCardSize(7)).toBe("small");
      expect(restored.result.current.getCustomCourseImageSize(7)).toBe("very_large");
      expect(restored.result.current.getCustomCourseTrueFalseButtonsVariant(7)).toBe("know_dont_know");
      expect(restored.result.current.getBuiltinCourseCardSize(course)).toBe("small");
      expect(restored.result.current.getBuiltinCourseImageSize(course)).toBe("medium");
      expect(restored.result.current.getBuiltinCourseTrueFalseButtonsVariant(course)).toBe("know_dont_know");
      expect(restored.result.current.getCustomCourseCardSize(8)).toBe("large");
      expect(restored.result.current.getCustomCourseImageSize(8)).toBe("dynamic");
      expect(restored.result.current.getCustomCourseTrueFalseButtonsVariant(8)).toBe("true_false");
    });
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

  it("persists explicit image roles, switches courses and restores them after remount", async () => {
    const props = { courses: [course], activeCourseIdx: null as number | null, activeCustomCourseId: 7 as number | null };
    const hook = renderHook((params: typeof props) => useCourseOverrideSettings(params), { initialProps: props });
    await waitFor(() => expect(hook.result.current.courseFrontImageRoleHydrated).toBe(true));
    expect(hook.result.current.courseFrontImageRole).toBe("standard");
    await act(async () => { await hook.result.current.setCustomCourseFrontImageRole(7, "replace_back"); });
    await act(async () => { await hook.result.current.setCustomCourseFrontImageRole(8, "standard"); });
    await act(async () => { await hook.result.current.setBuiltinCourseFrontImageRole(course, "replace_front"); });
    expect(hook.result.current.courseFrontImageRole).toBe("replace_back");
    hook.rerender({ ...props, activeCustomCourseId: 8 });
    expect(hook.result.current.courseFrontImageRole).toBe("standard");
    hook.rerender({ ...props, activeCustomCourseId: null, activeCourseIdx: 0 });
    expect(hook.result.current.courseFrontImageRole).toBe("replace_front");
    expect(JSON.parse((await AsyncStorage.getItem("flashcards.courseFrontImageRoleOverrides"))!)).toEqual({
      builtin: { "en|pl|A1": "replace_front" }, custom: { 7: "replace_back", 8: "standard" },
    });
    hook.unmount();
    const restored = renderHook(() => useCourseOverrideSettings(props));
    await waitFor(() => expect(restored.result.current.courseFrontImageRole).toBe("replace_back"));
    await AsyncStorage.setItem("flashcards.courseFrontImageRoleOverrides", JSON.stringify({ custom: { 7: "replace_front" } }));
    await act(async () => { await restored.result.current.reloadCourseFrontImageRoleSettings(); });
    expect(restored.result.current.courseFrontImageRole).toBe("replace_front");
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


it("hydrates course audio and persists explicit OFF and languages across remounts", async () => {
  await AsyncStorage.clear();
  const params = { courses: [course], activeCourseIdx: null, activeCustomCourseId: 7 };
  const hook = renderHook(() => useCourseOverrideSettings(params));
  await waitFor(() => expect(hook.result.current.courseAudioSettingsHydrated).toBe(true));
  expect(hook.result.current.getCustomCourseAudioSettings(7)).toEqual({ enabled: false, frontLanguage: null, backLanguage: null });
  const selected = { enabled: true, frontLanguage: "es-ES" as const, backLanguage: "pl-PL" as const };
  await act(async () => { await hook.result.current.setCustomCourseAudioSettings(7, selected); });
  await act(async () => { await hook.result.current.setCustomCourseAudioSettings(7, { ...selected, enabled: false }); });
  await act(async () => { await hook.result.current.setCustomCourseAudioSettings(8, selected); });
  await act(async () => { await hook.result.current.setBuiltinCourseAudioSettings(course, { ...selected, enabled: false }); });
  hook.unmount();
  const restored = renderHook(() => useCourseOverrideSettings(params));
  await waitFor(() => expect(restored.result.current.courseAudioSettingsHydrated).toBe(true));
  expect(restored.result.current.getCustomCourseAudioSettings(7)).toEqual({ ...selected, enabled: false });
  expect(restored.result.current.getCustomCourseAudioSettings(8)).toEqual(selected);
  expect(restored.result.current.getBuiltinCourseAudioSettings(course)).toEqual({ ...selected, enabled: false });
  expect(JSON.parse((await AsyncStorage.getItem("flashcards.courseAudioOverrides"))!).custom[7].enabled).toBe(false);
});
