import type { WordWithTranslations } from "@/src/types/boxes";
import type { CEFRLevel } from "@/src/types/language";
import { getDB } from "../core";
import {
  addAnswerIfPresent,
  computeNextReviewFromStage,
  createEmptyLevelCounts,
  dedupeOrdered,
  splitBackTextIntoAnswers,
} from "../utils";
import { CustomFlashcardRecord } from "./flashcards";

export interface CustomReviewFlashcard extends CustomFlashcardRecord {
  stage: number;
  nextReview: number;
}

export async function scheduleReview(
  wordId: number,
  sourceLangId: number,
  targetLangId: number,
  level: string,
  stage: number
) {
  const db = await getDB();
  const now = Date.now();
  const nextReview = computeNextReviewFromStage(stage, now);
  await db.runAsync(
    `INSERT INTO reviews (word_id, source_lang_id, target_lang_id, level, learned_at, next_review, stage)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(word_id, source_lang_id, target_lang_id) DO UPDATE SET
       level = excluded.level,
       next_review = excluded.next_review,
       stage = excluded.stage,
       learned_at = CASE WHEN reviews.learned_at IS NULL THEN excluded.learned_at ELSE reviews.learned_at END;
    `,
    wordId,
    sourceLangId,
    targetLangId,
    level,
    now,
    nextReview,
    stage
  );
  return { nextReview, stage };
}

export async function scheduleCustomReview(
  flashcardId: number,
  courseId: number,
  stage: number
) {
  const db = await getDB();
  const now = Date.now();
  const nextReview = computeNextReviewFromStage(stage, now);
  await db.runAsync(
    `INSERT INTO custom_reviews (flashcard_id, course_id, learned_at, next_review, stage)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(flashcard_id) DO UPDATE SET
       course_id = excluded.course_id,
       next_review = excluded.next_review,
       stage = excluded.stage,
       learned_at = CASE WHEN custom_reviews.learned_at IS NULL THEN excluded.learned_at ELSE custom_reviews.learned_at END;`,
    flashcardId,
    courseId,
    now,
    nextReview,
    stage
  );
  return { nextReview, stage };
}

export async function advanceCustomReview(
  flashcardId: number,
  courseId: number
) {
  const db = await getDB();
  const row = await db.getFirstAsync<{ stage: number }>(
    `SELECT stage FROM custom_reviews WHERE flashcard_id = ? AND course_id = ? LIMIT 1;`,
    flashcardId,
    courseId
  );
  if (!row) {
    return scheduleCustomReview(flashcardId, courseId, 0);
  }
  const newStage = ((row.stage ?? 0) + 1) | 0;
  const now = Date.now();
  const nextReview = computeNextReviewFromStage(newStage, now);
  await db.runAsync(
    `UPDATE custom_reviews SET stage = ?, next_review = ? WHERE flashcard_id = ? AND course_id = ?;`,
    newStage,
    nextReview,
    flashcardId,
    courseId
  );
  return { nextReview, stage: newStage };
}

export async function removeCustomReview(
  flashcardId: number,
  courseId: number
): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `DELETE FROM custom_reviews WHERE flashcard_id = ? AND course_id = ?;`,
    flashcardId,
    courseId
  );
}

export async function clearCustomReviewsForCourse(
  courseId: number
): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `DELETE FROM custom_reviews WHERE course_id = ?;`,
    courseId
  );
}

export async function countDueCustomReviews(
  courseId: number,
  nowMs: number = Date.now()
): Promise<number> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM custom_reviews WHERE course_id = ? AND next_review <= ?;`,
    courseId,
    nowMs
  );
  return row?.cnt ?? 0;
}

export async function getDueCustomReviewFlashcards(
  courseId: number,
  limit: number,
  nowMs: number = Date.now()
): Promise<CustomReviewFlashcard[]> {
  if (!courseId || limit <= 0) {
    return [];
  }
  const db = await getDB();
  const seedRows = await db.getAllAsync<{
    id: number;
    stage: number;
    nextReview: number;
  }>(
    `SELECT
       cr.flashcard_id AS id,
       cr.stage        AS stage,
       cr.next_review  AS nextReview
     FROM custom_reviews cr
     WHERE cr.course_id = ?
       AND cr.next_review <= ?
     ORDER BY RANDOM()
     LIMIT ?;`,
    courseId,
    nowMs,
    limit
  );
  if (seedRows.length === 0) {
    return [];
  }
  const ids = seedRows.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(",");
  const flashcardRows = await db.getAllAsync<{
    id: number;
    courseId: number;
    frontText: string;
    backText: string;
    position: number | null;
    flipped: number;
    createdAt: number;
    updatedAt: number;
    answerText: string | null;
  }>(
    `SELECT
       cf.id            AS id,
       cf.course_id    AS courseId,
       cf.front_text    AS frontText,
       cf.back_text     AS backText,
       cf.position      AS position,
       cf.created_at    AS createdAt,
       cf.updated_at    AS updatedAt,
       cf.flipped       AS flipped,
       cfa.answer_text  AS answerText
     FROM custom_flashcards cf
     LEFT JOIN custom_flashcard_answers cfa ON cfa.flashcard_id = cf.id
     WHERE cf.id IN (${placeholders})
     ORDER BY cf.id ASC, cfa.id ASC;`,
    ...ids
  );
  const stageMap = new Map<number, { stage: number; nextReview: number }>();
  for (const item of seedRows) {
    stageMap.set(item.id, { stage: item.stage, nextReview: item.nextReview });
  }
  const map = new Map<number, CustomReviewFlashcard>();
  for (const row of flashcardRows) {
    let record = map.get(row.id);
    if (!record) {
      const stageInfo = stageMap.get(row.id);
      if (!stageInfo) {
        continue;
      }
      record = {
        id: row.id,
        courseId: row.courseId,
        frontText: row.frontText,
        backText: row.backText,
        answers: [],
        position: row.position,
        flipped: row.flipped === 1,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        stage: stageInfo.stage,
        nextReview: stageInfo.nextReview,
      };
      map.set(row.id, record);
    }
    addAnswerIfPresent(record.answers, row.answerText);
  }
  const ordered: CustomReviewFlashcard[] = [];
  const seen = new Set<number>();
  for (const seed of seedRows) {
    const record = map.get(seed.id);
    if (!record || seen.has(seed.id)) {
      continue;
    }
    if (record.answers.length === 0) {
      record.answers = splitBackTextIntoAnswers(record.backText);
    } else {
      record.answers = dedupeOrdered(record.answers);
    }
    ordered.push(record);
    seen.add(seed.id);
  }
  return ordered;
}

export async function getDueReviews(
  sourceLangId: number,
  targetLangId: number,
  nowMs: number
) {
  const db = await getDB();
  return db.getAllAsync<{
    word_id: number;
    text: string;
    stage: number;
    level: string;
    next_review: number;
  }>(
    `SELECT r.word_id, w.text, r.stage, r.level, r.next_review
     FROM reviews r
     JOIN words w ON w.id = r.word_id
     WHERE r.source_lang_id = ?
       AND r.target_lang_id = ?
       AND r.next_review <= ?
     ORDER BY r.next_review ASC;`,
    sourceLangId,
    targetLangId,
    nowMs
  );
}

export async function advanceReview(
  wordId: number,
  sourceLangId: number,
  targetLangId: number
) {
  const db = await getDB();
  const row = await db.getFirstAsync<{ stage: number }>(
    `SELECT stage FROM reviews WHERE word_id = ? AND source_lang_id = ? AND target_lang_id = ? LIMIT 1;`,
    wordId,
    sourceLangId,
    targetLangId
  );
  const newStage = ((row?.stage ?? 0) + 1) | 0;
  const now = Date.now();
  const nextReview = computeNextReviewFromStage(newStage, now);
  await db.runAsync(
    `UPDATE reviews SET stage = ?, next_review = ? WHERE word_id = ? AND source_lang_id = ? AND target_lang_id = ?;`,
    newStage,
    nextReview,
    wordId,
    sourceLangId,
    targetLangId
  );
  return { nextReview, stage: newStage };
}

export async function removeReview(
  wordId: number,
  sourceLangId: number,
  targetLangId: number
): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `DELETE FROM reviews WHERE word_id = ? AND source_lang_id = ? AND target_lang_id = ?;`,
    wordId,
    sourceLangId,
    targetLangId
  );
}

export async function countDueReviewsByLevel(
  sourceLangId: number,
  targetLangId: number,
  nowMs: number
): Promise<Record<CEFRLevel, number>> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ level: CEFRLevel; cnt: number }>(
    `SELECT level, COUNT(*) AS cnt
     FROM reviews
     WHERE source_lang_id = ? AND target_lang_id = ? AND next_review <= ?
     GROUP BY level;`,
    sourceLangId,
    targetLangId,
    nowMs
  );
  const counts = createEmptyLevelCounts();
  for (const r of rows) {
    if (r.level in counts) counts[r.level as CEFRLevel] = r.cnt | 0;
  }
  return counts;
}

export async function countTotalDueReviews(
  sourceLangId: number,
  targetLangId: number,
  nowMs: number
): Promise<number> {
  const counts = await countDueReviewsByLevel(
    sourceLangId,
    targetLangId,
    nowMs
  );
  let total = 0;
  for (const value of Object.values(counts)) {
    total += value | 0;
  }
  return total;
}

export async function countLearnedWordsByLevel(
  sourceLangId: number,
  targetLangId: number
): Promise<Record<CEFRLevel, number>> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ level: CEFRLevel; cnt: number }>(
    `SELECT level, COUNT(*) AS cnt
     FROM reviews
     WHERE source_lang_id = ? AND target_lang_id = ?
     GROUP BY level;`,
    sourceLangId,
    targetLangId
  );

  const counts = createEmptyLevelCounts();
  for (const row of rows) {
    if (row.level in counts) counts[row.level as CEFRLevel] = row.cnt | 0;
  }
  return counts;
}

export async function getRandomDueReviewWord(
  sourceLangId: number,
  targetLangId: number,
  level: CEFRLevel,
  nowMs: number = Date.now()
): Promise<WordWithTranslations | null> {
  const db = await getDB();

  const due = await db.getFirstAsync<{ id: number }>(
    `SELECT r.word_id AS id
     FROM reviews r
     WHERE r.source_lang_id = ?
       AND r.target_lang_id = ?
       AND r.level = ?
       AND r.next_review <= ?
     ORDER BY RANDOM()
     LIMIT 1;`,
    sourceLangId,
    targetLangId,
    level,
    nowMs
  );

  if (!due) return null;

  const wordRow = await db.getFirstAsync<{ text: string }>(
    `SELECT text FROM words WHERE id = ? LIMIT 1;`,
    due.id
  );

  const translations = await db.getAllAsync<{ translation_text: string }>(
    `SELECT translation_text
     FROM translations
     WHERE source_word_id = ? AND target_language_id = ?
     ORDER BY translation_text ASC;`,
    due.id,
    targetLangId
  );

  return {
    id: due.id,
    text: wordRow?.text ?? "",
    translations: translations.map((t) => t.translation_text),
    flipped: true,
  };
}

export async function getDueReviewWordsBatch(
  sourceLangId: number,
  targetLangId: number,
  level: CEFRLevel,
  limit: number,
  nowMs: number = Date.now()
): Promise<WordWithTranslations[]> {
  if (limit <= 0) {
    return [];
  }

  const db = await getDB();

  const rows = await db.getAllAsync<{ id: number; text: string }>(
    `SELECT w.id, w.text
     FROM reviews r
     JOIN words w ON w.id = r.word_id
     WHERE r.source_lang_id = ?
       AND r.target_lang_id = ?
       AND r.level = ?
       AND r.next_review <= ?
     ORDER BY RANDOM()
     LIMIT ?;`,
    sourceLangId,
    targetLangId,
    level,
    nowMs,
    limit
  );

  if (rows.length === 0) {
    return [];
  }

  const wordIds = rows.map((row) => row.id);
  const placeholders = wordIds.map(() => "?").join(",");

  const translations = await db.getAllAsync<{
    source_word_id: number;
    translation_text: string;
  }>(
    `SELECT source_word_id, translation_text
     FROM translations
     WHERE source_word_id IN (${placeholders})
       AND target_language_id = ?
     ORDER BY translation_text ASC;`,
    [...wordIds, targetLangId]
  );

  const translationsMap = new Map<number, string[]>();
  for (const item of translations) {
    if (!translationsMap.has(item.source_word_id)) {
      translationsMap.set(item.source_word_id, []);
    }
    translationsMap.get(item.source_word_id)!.push(item.translation_text);
  }

  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    translations: translationsMap.get(row.id) ?? [],
    flipped: true,
  }));
}

export async function addRandomReviewsForPair(
  sourceLangId: number,
  targetLangId: number,
  level: CEFRLevel,
  count: number = 10
): Promise<number> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ id: number }>(
    `SELECT w.id
     FROM words w
     WHERE w.language_id = ?
       AND w.cefr_level = ?
       AND EXISTS (
         SELECT 1 FROM translations t
         WHERE t.source_word_id = w.id AND t.target_language_id = ?
       )
       AND NOT EXISTS (
         SELECT 1 FROM reviews r
         WHERE r.word_id = w.id AND r.source_lang_id = ? AND r.target_lang_id = ?
       )
     ORDER BY RANDOM()
     LIMIT ?;`,
    sourceLangId,
    level,
    targetLangId,
    sourceLangId,
    targetLangId,
    count
  );

  let inserted = 0;
  for (const row of rows) {
    await scheduleReview(row.id, sourceLangId, targetLangId, level, 0);
    inserted += 1;
  }
  return inserted;
}

export async function addRandomCustomReviews(
  courseId: number,
  count: number = 10
): Promise<number> {
  if (!courseId || count <= 0) {
    return 0;
  }
  const db = await getDB();
  const rows = await db.getAllAsync<{ id: number }>(
    `SELECT cf.id
     FROM custom_flashcards cf
     LEFT JOIN custom_reviews cr ON cr.flashcard_id = cf.id
     WHERE cf.course_id = ?
       AND cr.id IS NULL
     ORDER BY RANDOM()
     LIMIT ?;`,
    courseId,
    count
  );
  for (const row of rows) {
    await scheduleCustomReview(row.id, courseId, 0);
  }
  return rows.length;
}

export async function resetReviewsForPair(
  sourceLangId: number,
  targetLangId: number
): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    `DELETE FROM reviews WHERE source_lang_id = ? AND target_lang_id = ?;`,
    sourceLangId,
    targetLangId
  );
  return Number(result?.changes ?? 0);
}

export async function resetCustomReviewsForCourse(
  courseId: number
): Promise<number> {
  if (!courseId) return 0;
  const db = await getDB();
  const result = await db.runAsync(
    `DELETE FROM custom_reviews WHERE course_id = ?;`,
    courseId
  );
  return Number(result?.changes ?? 0);
}

export async function countTotalLearnedWordsGlobal(): Promise<number> {
  const db = await getDB();
  const r1 = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM reviews;`
  );
  const r2 = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM custom_reviews;`
  );
  return (r1?.cnt ?? 0) + (r2?.cnt ?? 0);
}

export async function countCustomLearnedForCourse(
  courseId: number
): Promise<number> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM custom_reviews WHERE course_id = ?;`,
    courseId
  );
  return row?.cnt ?? 0;
}
