import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";
import { resolveCourseSettingsDefaults } from "@/src/contexts/settings/courseSettingsDefaults";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useCourseOverrideSettings } from "@/src/contexts/settings/useCourseOverrideSettings";
import { seedOfficialPacksWithDb } from "./init";
import { ensureOfficialCourse } from "./repositories/courses";
import type { OfficialPackCourseSettings } from "@/src/constants/officialPacks";

let mockPackSlug = "eng_to_pl_first_50";
let mockPackSettings: OfficialPackCourseSettings | undefined;
let mockPackType: "traditional" | "true_false" | "self_assess" | undefined;
jest.mock("@/src/constants/officialPacks", () => ({
  get OFFICIAL_PACKS() {
    return jest.requireActual("@/src/constants/officialPacks").OFFICIAL_PACKS
      .filter((pack: { slug: string }) => pack.slug === mockPackSlug)
      .map((pack: Record<string, unknown>) => ({
        ...pack,
        ...(mockPackSettings === undefined ? {} : { settings: mockPackSettings }),
        ...(mockPackType === undefined ? {} : { defaultType: mockPackType }),
      }));
  },
}));
jest.mock("@/assets/data/sqlite/prebuilt.db", () => 1);
jest.mock("expo-sqlite", () => ({ importDatabaseFromAssetAsync: jest.fn(), openDatabaseAsync: jest.fn() }));
jest.mock("./repositories/courses", () => ({ ensureOfficialCourse: jest.fn() }));
jest.mock("./core", () => ({ notifyDbInitializationListeners: jest.fn() }));
jest.mock("./schema", () => ({ applySchema: jest.fn(), configurePragmas: jest.fn() }));
jest.mock("@/src/services/imageService", () => ({ deleteImage: jest.fn(), prepareImagesDirectory: jest.fn(), saveImageInDirectory: jest.fn() }));

const key = "flashcards.courseBoxZeroAnswerSideOverrides";
const enabledKey = "flashcards.courseBoxZeroOverrides";
const imageRoleKey = "flashcards.courseFrontImageRoleOverrides";
const hintKey = "flashcards.courseLetterHintOverrides";

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockPackSettings = undefined;
  mockPackType = undefined;
});

it.each([
  "es_to_pl_first_50", "fr_to_pl_first_50", "eng_to_pl_first_50", "fr_to_en_first_50", "fr_to_en_first_150", "fr_to_en_first_332",
  "french_a1", "es_to_en_first_50", "es_to_en_first_150", "es_to_en_first_327",
])("applies %s defaults and preserves manual settings", async (slug) => {
  mockPackSlug = slug;
  const courseId = 42;
  const local = {
    getFirstAsync: jest.fn().mockResolvedValue({ flashcardsCount: 50 }),
    getAllAsync: jest.fn().mockResolvedValue([]),
  };
  const bundled = {
    getFirstAsync: jest.fn().mockResolvedValue({ id: 1, packVersion: 2, flashcardsCount: 50 }),
    closeAsync: jest.fn().mockResolvedValue(undefined),
  };
  (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(bundled);
  (ensureOfficialCourse as jest.Mock).mockResolvedValue({ id: courseId, packVersion: 2 });
  await seedOfficialPacksWithDb(local as any, { reportStartupProgress: false });
  expect(JSON.parse((await AsyncStorage.getItem(key))!)).toEqual({ builtin: {}, custom: { [courseId]: "front" } });
  expect(JSON.parse((await AsyncStorage.getItem(enabledKey))!)).toEqual({ builtin: {}, custom: { [courseId]: true } });
  const replacesBack = ["eng_to_pl_first_50", "es_to_pl_first_50", "es_to_en_first_50", "fr_to_pl_first_50", "fr_to_en_first_50"].includes(slug);
  expect(await AsyncStorage.getItem(imageRoleKey)).toBe(replacesBack ? JSON.stringify({ builtin: {}, custom: { [courseId]: "replace_back" } }) : JSON.stringify({ builtin: {}, custom: { [courseId]: "standard" } }));
  await AsyncStorage.setItem(imageRoleKey, JSON.stringify({ builtin: {}, custom: { [courseId]: "standard", 8: "replace_front" } }));
  const hintsEnabled = [
    "es_to_pl_first_50", "fr_to_pl_first_50", "eng_to_pl_first_50", "fr_to_en_first_50", "fr_to_en_first_150",
    "es_to_en_first_50", "es_to_en_first_150",
  ].includes(slug);
  expect(await AsyncStorage.getItem(hintKey)).toEqual(JSON.stringify({
    builtin: {}, custom: {
      [courseId]: { enabled: hintsEnabled, profile: "standard", boxOneLimit: 2, boxTwoLimit: 1 },
    },
  }));
  const hints = { builtin: {}, custom: {
    [courseId]: { enabled: false, profile: "custom", boxOneLimit: 3, boxTwoLimit: 0 },
    "8": { enabled: true, profile: "gentle", boxOneLimit: 1, boxTwoLimit: 0 },
  } };
  await AsyncStorage.setItem(hintKey, JSON.stringify(hints));
  await AsyncStorage.setItem(enabledKey, JSON.stringify({ builtin: {}, custom: { [courseId]: false } }));
  await AsyncStorage.setItem(key, JSON.stringify({ builtin: {}, custom: { [courseId]: "back", "8": "front" } }));
  await seedOfficialPacksWithDb(local as any, { reportStartupProgress: false });
  expect(JSON.parse((await AsyncStorage.getItem(key))!)).toEqual({ builtin: {}, custom: { [courseId]: "back", "8": "front" } });
  expect(JSON.parse((await AsyncStorage.getItem(enabledKey))!)).toEqual({ builtin: {}, custom: { [courseId]: false } });
  expect(JSON.parse((await AsyncStorage.getItem(hintKey))!)).toEqual(hints);
  expect(JSON.parse((await AsyncStorage.getItem(imageRoleKey))!)).toEqual({ builtin: {}, custom: { [courseId]: "standard", 8: "replace_front" } });
});


it("opts every course with bundled Google recordings into audio by default", () => {
  const packs = jest.requireActual("@/src/constants/officialPacks").OFFICIAL_PACKS;
  const catalog = jest.requireActual("@/Audio/runtime/generated/catalog.json");
  expect(packs.filter((pack: any) => pack.settings?.audioEnabled).map((pack: any) => pack.slug).sort()).toEqual(Object.keys(catalog.courses).sort());
});

it.each(Object.keys(jest.requireActual("@/Audio/runtime/generated/catalog.json").courses))(
  "enables audio for existing %s courses and preserves explicit OFF",
  async (slug) => {
    mockPackSlug = slug;
    const local = { getFirstAsync: jest.fn().mockResolvedValue({ flashcardsCount: 50 }), getAllAsync: jest.fn().mockResolvedValue([]) };
    const bundled = { getFirstAsync: jest.fn().mockResolvedValue({ id: 1, packVersion: 3, flashcardsCount: 50 }), closeAsync: jest.fn().mockResolvedValue(undefined) };
    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(bundled);
    (ensureOfficialCourse as jest.Mock).mockResolvedValue({ id: 42, packVersion: 3 });
    const key = "flashcards.courseAudioOverrides";
    await seedOfficialPacksWithDb(local as any, { reportStartupProgress: false });
    expect(JSON.parse((await AsyncStorage.getItem(key))!).custom[42]).toEqual({ enabled: true, frontLanguage: null, backLanguage: null, autoplayMode: "non_native" });
    await AsyncStorage.setItem(key, JSON.stringify({ builtin: {}, custom: { 42: { enabled: false, frontLanguage: null, backLanguage: null } } }));
    await seedOfficialPacksWithDb(local as any, { reportStartupProgress: false });
    expect(JSON.parse((await AsyncStorage.getItem(key))!).custom[42].enabled).toBe(false);
  },
);

const settingsStorageKeys = {
  audioSettings: "flashcards.courseAudioOverrides",
  frontImageRole: "flashcards.courseFrontImageRoleOverrides",
  letterHintSettings: "flashcards.courseLetterHintOverrides",
  boxZeroAnswerSide: "flashcards.courseBoxZeroAnswerSideOverrides",
  boxZeroEnabled: "flashcards.courseBoxZeroOverrides",
  autoflowEnabled: "flashcards.courseAutoflowOverrides",
  showExplanationEnabled: "flashcards.courseShowExplanationOverrides",
  explanationOnlyOnWrong: "flashcards.courseExplanationOnlyOnWrongOverrides",
  skipCorrectionEnabled: "flashcards.courseSkipCorrectionOverrides",
  trueFalseButtonsVariant: "flashcards.courseTrueFalseButtonsOverrides",
  cardSize: "flashcards.courseCardSizeOverrides",
  imageSize: "flashcards.courseImageSizeOverrides",
  imageFrameEnabled: "flashcards.courseImageFrameOverrides",
} as const;

function prepareSeed(slug: string) {
  mockPackSlug = slug;
  const local = {
    getFirstAsync: jest.fn().mockResolvedValue({ flashcardsCount: 50 }),
    getAllAsync: jest.fn().mockResolvedValue([]),
  };
  jest.mocked(SQLite.openDatabaseAsync).mockResolvedValue({
    getFirstAsync: jest.fn().mockResolvedValue({ id: 1, packVersion: 99, flashcardsCount: 50 }),
    closeAsync: jest.fn(),
  } as any);
  jest.mocked(ensureOfficialCourse).mockResolvedValue({ id: 42, packVersion: 99 });
  return () => seedOfficialPacksWithDb(local as any, { reportStartupProgress: false });
}

const activePacks = (jest.requireActual("@/src/constants/officialPacks").OFFICIAL_PACKS as
  typeof import("@/src/constants/officialPacks").OFFICIAL_PACKS).filter((pack) => !pack.retired);

const skipCorrectionKey = "flashcards.courseSkipCorrectionOverrides";
const skipCorrectionGlobalKey = "flashcards.skipCorrectionEnabled";
const activeOfficialCourse = { courses: [], activeCourseIdx: null, activeCustomCourseId: 42 };

it.each([false, true])("inherits global skip correction %s after seeding and remount", async (initialValue) => {
  const seed = prepareSeed("eng_to_pl_first_50");
  await AsyncStorage.setItem(skipCorrectionGlobalKey, JSON.stringify(initialValue));
  const otherOverrides = { builtin: { "en|pl|A1": false }, custom: { 8: true } };
  await AsyncStorage.setItem(skipCorrectionKey, JSON.stringify(otherOverrides));
  await seed();

  const hook = renderHook(() => useCourseOverrideSettings(activeOfficialCourse));
  await waitFor(() => {
    expect(hook.result.current.courseSettingsResetHydrated).toBe(true);
    expect(hook.result.current.skipCorrectionDefaultEnabled).toBe(initialValue);
    expect(hook.result.current.skipCorrectionEnabled).toBe(initialValue);
  });
  for (const value of [!initialValue, initialValue]) {
    await act(async () => { await hook.result.current.setSkipCorrectionDefaultEnabled(value); });
    expect(hook.result.current.skipCorrectionEnabled).toBe(value);
  }
  hook.unmount();

  await seed();
  const restored = renderHook(() => useCourseOverrideSettings(activeOfficialCourse));
  await waitFor(() => {
    expect(restored.result.current.courseSettingsResetHydrated).toBe(true);
    expect(restored.result.current.skipCorrectionDefaultEnabled).toBe(initialValue);
    expect(restored.result.current.skipCorrectionEnabled).toBe(initialValue);
  });
  expect(JSON.parse((await AsyncStorage.getItem(skipCorrectionKey))!)).toEqual(otherOverrides);
  restored.unmount();
});

it.each([false, true])("keeps an explicit skip-correction choice %s equal to the global value", async (value) => {
  const seed = prepareSeed("eng_to_pl_first_50");
  await AsyncStorage.setItem(skipCorrectionGlobalKey, JSON.stringify(value));
  await seed();
  const hook = renderHook(() => useCourseOverrideSettings(activeOfficialCourse));
  await waitFor(() => {
    expect(hook.result.current.courseSettingsResetHydrated).toBe(true);
    expect(hook.result.current.skipCorrectionDefaultEnabled).toBe(value);
  });
  await act(async () => { await hook.result.current.setCustomCourseSkipCorrectionEnabled(42, value); });
  await act(async () => { await hook.result.current.setSkipCorrectionDefaultEnabled(!value); });
  expect(hook.result.current.skipCorrectionEnabled).toBe(value);
  hook.unmount();

  await seed();
  const restored = renderHook(() => useCourseOverrideSettings(activeOfficialCourse));
  await waitFor(() => {
    expect(restored.result.current.courseSettingsResetHydrated).toBe(true);
    expect(restored.result.current.skipCorrectionDefaultEnabled).toBe(!value);
    expect(restored.result.current.skipCorrectionEnabled).toBe(value);
  });
  expect(JSON.parse((await AsyncStorage.getItem(skipCorrectionKey))!).custom[42]).toBe(value);
  restored.unmount();
});

it.each<{
  type: "traditional" | "true_false" | "self_assess";
  settings: OfficialPackCourseSettings;
  expected: boolean;
}>([
  { type: "traditional", settings: { skipCorrectionEnabled: true }, expected: true },
  { type: "traditional", settings: { skipCorrectionEnabled: false }, expected: false },
  { type: "traditional", settings: { skipCorrection: true }, expected: true },
  { type: "traditional", settings: { skipCorrection: false }, expected: false },
  { type: "traditional", settings: { skipCorrectionEnabled: false, skipCorrection: true }, expected: false },
  { type: "traditional", settings: { skipCorrectionEnabled: true, skipCorrection: false }, expected: true },
  { type: "true_false", settings: {}, expected: true },
  { type: "self_assess", settings: {}, expected: true },
  { type: "true_false", settings: { skipCorrectionEnabled: false }, expected: true },
  { type: "self_assess", settings: { skipCorrection: false }, expected: true },
])("seeds skip correction for $type with $settings as $expected and preserves stored choices", async ({ type, settings, expected }) => {
  const seed = prepareSeed("eng_to_pl_first_50");
  mockPackSettings = settings;
  mockPackType = type;
  await AsyncStorage.setItem(skipCorrectionGlobalKey, JSON.stringify(!expected));
  await seed();
  expect(JSON.parse((await AsyncStorage.getItem(skipCorrectionKey))!).custom[42]).toBe(expected);

  const stored = { builtin: {}, custom: { 42: !expected, 8: expected } };
  await AsyncStorage.setItem(skipCorrectionKey, JSON.stringify(stored));
  await seed();
  expect(JSON.parse((await AsyncStorage.getItem(skipCorrectionKey))!)).toEqual(stored);
});

it.each(activePacks)("seeds pack defaults for $slug, preserves inheritance and keeps stored choices", async (pack) => {
  const seed = prepareSeed(pack.slug);
  await seed();
  const defaults = resolveCourseSettingsDefaults(pack, pack.defaultType === "true_false" || pack.defaultType === "self_assess");
  const manual = resolveCourseSettingsDefaults();
  for (const [field, storageKey] of Object.entries(settingsStorageKeys)) {
    const raw = await AsyncStorage.getItem(storageKey);
    if (field === "skipCorrectionEnabled" && pack.defaultType !== "true_false" && pack.defaultType !== "self_assess"
      && (pack.settings?.skipCorrectionEnabled ?? pack.settings?.skipCorrection) === undefined) {
      expect(raw).toBeNull();
    } else {
      expect(JSON.parse(raw!).custom[42]).toEqual(defaults[field as keyof typeof defaults]);
    }
    // Include explicit false and values equal to the generic default.
    await AsyncStorage.setItem(storageKey, JSON.stringify({ builtin: { other: manual[field as keyof typeof manual] }, custom: { 42: manual[field as keyof typeof manual], 8: defaults[field as keyof typeof defaults] } }));
  }
  await seed();
  for (const [field, storageKey] of Object.entries(settingsStorageKeys)) {
    expect(JSON.parse((await AsyncStorage.getItem(storageKey))!)).toEqual({
      builtin: { other: manual[field as keyof typeof manual] },
      custom: { 42: manual[field as keyof typeof manual], 8: defaults[field as keyof typeof defaults] },
    });
  }
});

it("keeps manual OFF and generic image size after a course is seeded again", async () => {
  const seed = prepareSeed("eng_to_pl_first_50");
  await seed();
  const hook = renderHook(() => useCourseOverrideSettings({ courses: [], activeCourseIdx: null, activeCustomCourseId: 42 }));
  await waitFor(() => expect(hook.result.current.courseSettingsResetHydrated).toBe(true));
  await act(async () => { await hook.result.current.setCustomCourseBoxZeroEnabled(42, false); });
  await act(async () => { await hook.result.current.setCustomCourseAutoflowEnabled(42, false); });
  await act(async () => { await hook.result.current.setCustomCourseAudioSettings(42, {
    enabled: false, frontLanguage: null, backLanguage: null, autoplayMode: "off",
  }); });
  hook.unmount();
  await seed();
  const restored = renderHook(() => useCourseOverrideSettings({ courses: [], activeCourseIdx: null, activeCustomCourseId: 42 }));
  await waitFor(() => expect(restored.result.current.courseSettingsResetHydrated).toBe(true));
  expect(restored.result.current.boxZeroEnabled).toBe(false);
  expect(restored.result.current.autoflowEnabled).toBe(false);
  expect(restored.result.current.getCustomCourseAudioSettings(42)).toMatchObject({ enabled: false, autoplayMode: "off" });
  restored.unmount();

  await AsyncStorage.clear();
  const seedImages = prepareSeed("znaki_drogowe");
  await seedImages();
  const imageHook = renderHook(() => useCourseOverrideSettings({ courses: [], activeCourseIdx: null, activeCustomCourseId: 42 }));
  await waitFor(() => expect(imageHook.result.current.courseSettingsResetHydrated).toBe(true));
  expect(imageHook.result.current.getCustomCourseImageSize(42)).toBe("medium");
  await act(async () => { await imageHook.result.current.setCustomCourseImageSize(42, "dynamic"); });
  imageHook.unmount();
  await seedImages();
  expect(JSON.parse((await AsyncStorage.getItem("flashcards.courseImageSizeOverrides"))!).custom[42]).toBe("dynamic");
});

it.each([undefined, "all", "off"] as const)(
  "fills missing new options in an older course without changing audio mode %s",
  async (autoplayMode) => {
    const seed = prepareSeed("eng_to_pl_first_50");
    const audio = {
      enabled: false, frontLanguage: "en-US", backLanguage: "pl-PL",
      ...(autoplayMode === undefined ? {} : { autoplayMode }),
    };
    await AsyncStorage.setItem("flashcards.courseAudioOverrides", JSON.stringify({
      builtin: {}, custom: { 42: audio },
    }));
    await AsyncStorage.setItem(enabledKey, JSON.stringify({ builtin: {}, custom: { 42: false } }));
    // No records for the options introduced after this course was installed.
    expect(await AsyncStorage.getItem(hintKey)).toBeNull();
    expect(await AsyncStorage.getItem(imageRoleKey)).toBeNull();
    await seed();
    const hook = renderHook(() => useCourseOverrideSettings({
      courses: [], activeCourseIdx: null, activeCustomCourseId: 42,
    }));
    await waitFor(() => expect(hook.result.current.courseSettingsResetHydrated).toBe(true));
    expect(hook.result.current.getCustomCourseAudioSettings(42)).toEqual(audio);
    expect(hook.result.current.boxZeroEnabled).toBe(false);
    expect(hook.result.current.courseFrontImageRole).toBe("replace_back");
    expect(hook.result.current.letterHintSettings).toEqual({
      enabled: true, profile: "standard", boxOneLimit: 2, boxTwoLimit: 1,
    });
    hook.unmount();
  },
);
