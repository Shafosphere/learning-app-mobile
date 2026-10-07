import type { SQLiteDatabase } from "expo-sqlite";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import basicEnglishCards from "@/assets/data/sqlite/retired-basic-english.json";
import basicSpanishCards from "@/assets/data/sqlite/retired-basic-spanish.json";
import basicFrenchCards from "@/assets/data/sqlite/retired-basic-french.json";

// Frozen packs from the previously shipped database. Their external IDs and
// positions must stay unchanged so old backups can match their saved state.
const RETIRED_COURSE_CARDS = {
  fiszki_podstawy_en_pl_slowa: basicEnglishCards,
  fiszki_francuski_podstawowe_poprawione: basicFrenchCards,
  fiszki_hiszpanski_podstawowe_poprawione: basicSpanishCards,
};

export async function restoreRetiredOfficialCourseWithDb(
  db: SQLiteDatabase,
  slug: string
): Promise<number | null> {
  const pack = OFFICIAL_PACKS.find((entry) => entry.slug === slug && entry.retired);
  if (!pack || !Object.prototype.hasOwnProperty.call(RETIRED_COURSE_CARDS, slug)) {
    return null;
  }
  const cards = RETIRED_COURSE_CARDS[slug as keyof typeof RETIRED_COURSE_CARDS];

  await db.execAsync("BEGIN TRANSACTION;");
  try {
    const existing = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM custom_courses WHERE slug = ? AND is_official = 1;",
      slug
    );
    if (existing) {
      await db.execAsync("COMMIT;");
      return existing.id;
    }

    const now = Date.now();
    const result = await db.runAsync(
      `INSERT INTO custom_courses
        (name, icon_id, icon_color, reviews_enabled, is_official, slug,
         pack_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?);`,
      pack.name, pack.iconId, pack.iconColor, pack.reviewsEnabled === false ? 0 : 1,
      slug, pack.packVersion, now, now
    );
    const courseId = result.lastInsertRowId;
    for (const card of cards) {
      const inserted = await db.runAsync(
        `INSERT INTO custom_flashcards
          (course_id, front_text, back_text, hint_front, hint_back, image_front,
           image_back, explanation, position, flipped, answer_only, type,
           external_id, is_official, reset_progress_on_update, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?);`,
        courseId, card.front_text, card.back_text, card.hint_front, card.hint_back,
        card.image_front, card.image_back, card.explanation, card.position,
        card.flipped, card.answer_only, card.type, card.external_id,
        card.reset_progress_on_update, now, now
      );
      for (const answer of card.answers) {
        await db.runAsync(
          `INSERT INTO custom_flashcard_answers (flashcard_id, answer_text, created_at)
           VALUES (?, ?, ?);`,
          inserted.lastInsertRowId, answer, now
        );
      }
    }
    await db.execAsync("COMMIT;");
    return courseId;
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}
