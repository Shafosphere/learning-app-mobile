import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";
import { seedOfficialPacksWithDb } from "./init";
import { ensureOfficialCourse } from "./repositories/courses";

jest.mock("@/src/constants/officialPacks", () => ({
  OFFICIAL_PACKS: [{ slug: "eng_to_pl_first_50", name: "Pierwsze 50 słów", packVersion: 2,
    iconId: "flag:en", iconColor: "#10B981", settings: { boxZeroEnabled: true, boxZeroAnswerSide: "front" } }],
}));
jest.mock("@/assets/data/sqlite/prebuilt.db", () => 1);
jest.mock("expo-sqlite", () => ({ importDatabaseFromAssetAsync: jest.fn(), openDatabaseAsync: jest.fn() }));
jest.mock("./repositories/courses", () => ({ ensureOfficialCourse: jest.fn() }));
jest.mock("./core", () => ({ notifyDbInitializationListeners: jest.fn() }));
jest.mock("./schema", () => ({ applySchema: jest.fn(), configurePragmas: jest.fn() }));
jest.mock("@/src/services/imageService", () => ({ deleteImage: jest.fn(), prepareImagesDirectory: jest.fn(), saveImageInDirectory: jest.fn() }));

const key = "flashcards.courseBoxZeroAnswerSideOverrides";
const enabledKey = "flashcards.courseBoxZeroOverrides";

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

it.each([7, 42])("sets front for 50-word course %s, preserves manual back", async (courseId) => {
  const local = { getFirstAsync: jest.fn().mockResolvedValue({ flashcardsCount: 50 }) };
  const bundled = {
    getFirstAsync: jest.fn().mockResolvedValue({ id: 1, packVersion: 2, flashcardsCount: 50 }),
    closeAsync: jest.fn().mockResolvedValue(undefined),
  };
  (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(bundled);
  (ensureOfficialCourse as jest.Mock).mockResolvedValue({ id: courseId, packVersion: 2 });
  await seedOfficialPacksWithDb(local as any, { reportStartupProgress: false });
  expect(JSON.parse((await AsyncStorage.getItem(key))!)).toEqual({ builtin: {}, custom: { [courseId]: "front" } });
  expect(JSON.parse((await AsyncStorage.getItem(enabledKey))!)).toEqual({ builtin: {}, custom: { [courseId]: true } });
  await AsyncStorage.setItem(enabledKey, JSON.stringify({ builtin: {}, custom: { [courseId]: false } }));
  await AsyncStorage.setItem(key, JSON.stringify({ builtin: {}, custom: { [courseId]: "back", "8": "front" } }));
  await seedOfficialPacksWithDb(local as any, { reportStartupProgress: false });
  expect(JSON.parse((await AsyncStorage.getItem(key))!)).toEqual({ builtin: {}, custom: { [courseId]: "back", "8": "front" } });
  expect(JSON.parse((await AsyncStorage.getItem(enabledKey))!)).toEqual({ builtin: {}, custom: { [courseId]: false } });
});
