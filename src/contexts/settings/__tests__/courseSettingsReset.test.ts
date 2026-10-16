import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { resolveCourseSettingsDefaults } from "../courseSettingsDefaults";
import { useCourseOverrideSettings } from "../useCourseOverrideSettings";
import { COURSE_AUDIO_STORAGE_KEY } from "../courseAudioSettings";
import { COURSE_FRONT_IMAGE_ROLE_STORAGE_KEY } from "@/src/utils/frontImageRole";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";

const params = { sourceLang: "en", targetLang: "pl", level: "A1" as const };
const hookOptions = { courses: [params], activeCourseIdx: null, activeCustomCourseId: 7 };
beforeEach(async () => { await AsyncStorage.clear(); });
afterEach(() => { jest.restoreAllMocks(); });

it.each(["custom", "builtin"] as const)("persists explicit %s defaults, preserving other courses, progress and general settings", async (kind) => {
  const pack = OFFICIAL_PACKS.find((pack) => pack.slug === "eng_to_pl_first_50")!;
  const values = resolveCourseSettingsDefaults(pack);
  const stores: Record<string, unknown> = {
    "flashcards.courseBoxZeroOverrides": values.boxZeroEnabled,
    "flashcards.courseBoxZeroAnswerSideOverrides": values.boxZeroAnswerSide,
    "flashcards.courseAutoflowOverrides": values.autoflowEnabled,
    "flashcards.courseShowExplanationOverrides": values.showExplanationEnabled,
    "flashcards.courseExplanationOnlyOnWrongOverrides": values.explanationOnlyOnWrong,
    "flashcards.courseSkipCorrectionOverrides": values.skipCorrectionEnabled,
    "flashcards.courseTrueFalseButtonsOverrides": values.trueFalseButtonsVariant,
    "flashcards.courseCardSizeOverrides": values.cardSize,
    "flashcards.courseImageSizeOverrides": values.imageSize,
    "flashcards.courseImageFrameOverrides": values.imageFrameEnabled,
    "flashcards.courseLetterHintOverrides": values.letterHintSettings,
    [COURSE_AUDIO_STORAGE_KEY]: values.audioSettings,
    [COURSE_FRONT_IMAGE_ROLE_STORAGE_KEY]: values.frontImageRole,
  };
  for (const [key, value] of Object.entries(stores)) {
    await AsyncStorage.setItem(key, JSON.stringify({ builtin: { "fr|pl|A1": value }, custom: { "8": value } }));
  }
  const preserved = { "flashcards.autoflowEnabled": "false", "flashcards.cardSize": '"small"', "customBoxes:7": '{"progress":42}', "courseCompletionRun:7": '"done"' };
  await AsyncStorage.multiSet(Object.entries(preserved));
  const hook = renderHook(() => useCourseOverrideSettings(hookOptions));
  await waitFor(() => expect(hook.result.current.courseSettingsResetHydrated).toBe(true));
  await act(async () => {
    if (kind === "custom") await hook.result.current.resetCustomCourseSettings(7, values);
    else await hook.result.current.resetBuiltinCourseSettings(params, values);
  });
  for (const [key, value] of Object.entries(stores)) {
    const persisted = JSON.parse((await AsyncStorage.getItem(key))!);
    expect(persisted[kind][kind === "custom" ? "7" : "en|pl|A1"]).toEqual(value);
    expect(persisted.custom["8"]).toEqual(value);
    expect(persisted.builtin["fr|pl|A1"]).toEqual(value);
  }
  for (const [key, value] of Object.entries(preserved)) expect(await AsyncStorage.getItem(key)).toBe(value);
  hook.unmount();
  const restored = renderHook(() => useCourseOverrideSettings(hookOptions));
  await waitFor(() => expect(restored.result.current.courseSettingsResetHydrated).toBe(true));
  expect(kind === "custom" ? restored.result.current.getCustomCourseCardSize(7) : restored.result.current.getBuiltinCourseCardSize(params)).toBe("large");
  expect(kind === "custom" ? restored.result.current.getCustomCourseBoxZeroAnswerSide(7) : restored.result.current.getBuiltinCourseBoxZeroAnswerSide(params)).toBe("front");
});

it("reports persistence failure and permits a successful retry", async () => {
  const hook = renderHook(() => useCourseOverrideSettings(hookOptions));
  await waitFor(() => expect(hook.result.current.courseSettingsResetHydrated).toBe(true));
  jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("Disk full"));
  await act(async () => {
    await expect(hook.result.current.resetCustomCourseSettings(7, resolveCourseSettingsDefaults())).rejects.toThrow("Disk full");
  });
  await act(async () => { await hook.result.current.resetCustomCourseSettings(7, resolveCourseSettingsDefaults()); });
  expect(hook.result.current.getCustomCourseCardSize(7)).toBe("large");
});
