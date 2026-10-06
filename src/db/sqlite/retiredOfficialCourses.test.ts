import cards from "@/assets/data/sqlite/retired-basic-english.json";
import { restoreRetiredOfficialCourseWithDb } from "./retiredOfficialCourses";

const slug = "fiszki_podstawy_en_pl_slowa";
const makeDb = () => ({
  execAsync: jest.fn().mockResolvedValue(undefined),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 700 }),
});

it("recreates all 474 legacy cards with stable identities and answers", async () => {
  const db = makeDb();
  expect(await restoreRetiredOfficialCourseWithDb(db as never, slug)).toBe(700);
  const inserts = db.runAsync.mock.calls.filter(([sql]) => sql.includes("INSERT INTO custom_flashcards"));
  expect(cards).toHaveLength(474);
  expect(inserts).toHaveLength(cards.length);
  for (const [index, card] of cards.entries()) {
    expect(inserts[index].slice(1, 14)).toEqual([
      700, card.front_text, card.back_text, card.hint_front, card.hint_back,
      card.image_front, card.image_back, card.explanation, card.position,
      card.flipped, card.answer_only, card.type, card.external_id,
    ]);
  }
  expect(db.runAsync.mock.calls.filter(([sql]) => sql.includes("INSERT INTO custom_flashcard_answers")))
    .toHaveLength(cards.reduce((count, card) => count + card.answers.length, 0));
  expect(db.execAsync).toHaveBeenLastCalledWith("COMMIT;");
});

it("keeps an existing owner's course untouched", async () => {
  const db = makeDb();
  db.getFirstAsync.mockResolvedValue({ id: 12 });
  expect(await restoreRetiredOfficialCourseWithDb(db as never, slug)).toBe(12);
  expect(db.runAsync).not.toHaveBeenCalled();
});

it("does not create courses for unrelated slugs", async () => {
  const db = makeDb();
  expect(await restoreRetiredOfficialCourseWithDb(db as never, "unknown")).toBeNull();
  expect(db.execAsync).not.toHaveBeenCalled();
  expect(db.runAsync).not.toHaveBeenCalled();
});

it("rolls back a failed recreation instead of leaving a partial course", async () => {
  const db = makeDb();
  db.runAsync.mockResolvedValueOnce({ lastInsertRowId: 700 }).mockRejectedValueOnce(new Error("write failed"));
  await expect(restoreRetiredOfficialCourseWithDb(db as never, slug)).rejects.toThrow("write failed");
  expect(db.execAsync).toHaveBeenLastCalledWith("ROLLBACK;");
});
