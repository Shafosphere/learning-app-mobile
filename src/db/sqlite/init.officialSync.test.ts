import * as SQLite from "expo-sqlite";
import { seedOfficialPacksWithDb } from "./init";
import { ensureOfficialCourse } from "./repositories/courses";

jest.mock("@/src/constants/officialPacks", () => ({
  OFFICIAL_PACKS: [{ slug: "eng_to_pl_a1", name: "Ang A1", packVersion: 3,
    iconId: "flag:en", iconColor: "#10B981", reviewsEnabled: true },
    { slug: "fiszki_podstawy_en_pl_slowa", retired: true, packVersion: 3 }],
}));
jest.mock("@/assets/data/sqlite/prebuilt.db", () => 1);
jest.mock("expo-sqlite", () => ({ importDatabaseFromAssetAsync: jest.fn(), openDatabaseAsync: jest.fn() }));
jest.mock("./repositories/courses", () => ({ ensureOfficialCourse: jest.fn() }));
jest.mock("./core", () => ({ notifyDbInitializationListeners: jest.fn() }));
jest.mock("./schema", () => ({ applySchema: jest.fn(), configurePragmas: jest.fn() }));
jest.mock("@/src/services/imageService", () => ({ deleteImage: jest.fn(), prepareImagesDirectory: jest.fn(), saveImageInDirectory: jest.fn() }));

const card = (id: number, externalId: string, word: string) => ({
  id, externalId, frontText: word, backText: word, answerText: word,
  hintFront: null, hintBack: null, imageFront: null, imageBack: null,
  explanation: null, position: id, flipped: 1, answerOnly: 0,
  type: "text", isOfficial: 1, isUserEdited: 0, resetProgressOnUpdate: 0,
  createdAt: 1, updatedAt: 1,
});

it("updates an older A1 by stable IDs, adding new cards without clearing existing reviews", async () => {
  const existing = card(42, "0001", "and");
  const added = card(1267, "1267", "panic");
  const local = {
    getFirstAsync: jest.fn().mockResolvedValue({ flashcardsCount: 1061 }),
    getAllAsync: jest.fn().mockResolvedValue([existing]),
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 10000 }),
  };
  const bundled = {
    getFirstAsync: jest.fn().mockResolvedValue({ id: 5, packVersion: 3, flashcardsCount: 1267 }),
    getAllAsync: jest.fn().mockResolvedValue([existing, added]),
    closeAsync: jest.fn().mockResolvedValue(undefined),
  };
  (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(bundled);
  (ensureOfficialCourse as jest.Mock).mockResolvedValue({ id: 7, packVersion: 2 });

  await seedOfficialPacksWithDb(local as any, { reportStartupProgress: false });

  expect(ensureOfficialCourse).not.toHaveBeenCalledWith(
    local, "fiszki_podstawy_en_pl_slowa", expect.anything(), expect.anything(), expect.anything(), expect.anything()
  );
  const calls = local.runAsync.mock.calls;
  expect(calls.filter(([sql]) => sql.includes("INSERT INTO custom_flashcards"))).toHaveLength(1);
  expect(calls.find(([sql]) => sql.includes("INSERT INTO custom_flashcards"))).toContain("1267");
  expect(calls.find(([sql]) => sql.includes("UPDATE custom_flashcards"))?.at(-1)).toBe(42);
  expect(calls.some(([sql]) => sql.includes("DELETE FROM custom_reviews"))).toBe(false);
  expect(calls.some(([sql]) => sql.includes("DELETE FROM custom_flashcards"))).toBe(false);
  expect(local.runAsync).toHaveBeenCalledWith(expect.stringContaining("SET pack_version"), 3, expect.any(Number), 7);
  expect(local.execAsync).toHaveBeenLastCalledWith("COMMIT;");
  expect(bundled.closeAsync).toHaveBeenCalled();
});
