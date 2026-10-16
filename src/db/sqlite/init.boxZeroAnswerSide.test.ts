import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";
import { seedOfficialPacksWithDb } from "./init";
import { ensureOfficialCourse } from "./repositories/courses";

let mockPackSlug = "eng_to_pl_first_50";
jest.mock("@/src/constants/officialPacks", () => ({
  get OFFICIAL_PACKS() {
    return jest.requireActual("@/src/constants/officialPacks").OFFICIAL_PACKS
      .filter((pack: { slug: string }) => pack.slug === mockPackSlug);
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
  expect(await AsyncStorage.getItem(imageRoleKey)).toBe(replacesBack ? JSON.stringify({ builtin: {}, custom: { [courseId]: "replace_back" } }) : null);
  await AsyncStorage.setItem(imageRoleKey, JSON.stringify({ builtin: {}, custom: { [courseId]: "standard", 8: "replace_front" } }));
  const hintsEnabled = [
    "es_to_pl_first_50", "fr_to_pl_first_50", "eng_to_pl_first_50", "fr_to_en_first_50", "fr_to_en_first_150",
    "es_to_en_first_50", "es_to_en_first_150",
  ].includes(slug);
  expect(await AsyncStorage.getItem(hintKey)).toEqual(hintsEnabled ? JSON.stringify({
    builtin: {}, custom: {
      [courseId]: { enabled: true, profile: "standard", boxOneLimit: 2, boxTwoLimit: 1 },
    },
  }) : null);
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
    expect(JSON.parse((await AsyncStorage.getItem(key))!).custom[42]).toEqual({ enabled: true, frontLanguage: null, backLanguage: null });
    await AsyncStorage.setItem(key, JSON.stringify({ builtin: {}, custom: { 42: { enabled: false, frontLanguage: null, backLanguage: null } } }));
    await seedOfficialPacksWithDb(local as any, { reportStartupProgress: false });
    expect(JSON.parse((await AsyncStorage.getItem(key))!).custom[42].enabled).toBe(false);
  },
);
