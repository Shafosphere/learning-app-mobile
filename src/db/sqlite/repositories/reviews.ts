import { getDB } from "../core";
import {
  addAnswerIfPresent,
  computeNextReviewFromStage,
  dedupeOrdered,
  splitBackTextIntoAnswers,
} from "../utils";
import { type CustomFlashcardRecord } from "./flashcards";

export interface CustomReviewFlashcard extends CustomFlashcardRecord {
  stage: number;
  nextReview: number;
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
    hintFront: string | null;
    hintBack: string | null;
    imageFront: string | null;
    imageBack: string | null;
    position: number | null;
    flipped: number;
    answerOnly: number;
    createdAt: number;
    updatedAt: number;
    answerText: string | null;
    type: string | null;
  }>(
    `SELECT
       cf.id            AS id,
       cf.course_id    AS courseId,
       cf.front_text    AS frontText,
       cf.back_text     AS backText,
       cf.hint_front    AS hintFront,
       cf.hint_back     AS hintBack,
       cf.image_front   AS imageFront,
       cf.image_back    AS imageBack,
       cf.position      AS position,
       cf.created_at    AS createdAt,
       cf.updated_at    AS updatedAt,
       cf.flipped       AS flipped,
       cf.answer_only  AS answerOnly,
       cf.type          AS type,
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
        hintFront: row.hintFront,
        hintBack: row.hintBack,
        imageFront: row.imageFront,
        imageBack: row.imageBack,
        answers: [],
        position: row.position,
        flipped: row.flipped === 1,
        answerOnly: row.answerOnly === 1,
        type: (row.type as "text" | "image" | "true_false") || "text",
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
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM custom_reviews;`
  );
  return row?.cnt ?? 0;
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
