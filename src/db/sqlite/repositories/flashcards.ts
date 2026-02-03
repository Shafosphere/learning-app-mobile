import { deleteImage } from "@/src/services/imageService";
import * as SQLite from "expo-sqlite";
import { getDB } from "../core";
import {
  addAnswerIfPresent,
  dedupeOrdered,
  normalizeAnswersInput,
  splitBackTextIntoAnswers,
} from "../utils";

export interface CustomFlashcardRow {
  id: number;
  courseId: number;
  frontText: string;
  backText: string;
  hintFront: string | null;
  hintBack: string | null;
  imageFront: string | null;
  imageBack: string | null;
  explanation: string | null;
  answers: string[];
  position: number | null;
  flipped: number;
  answerOnly: number;
  type: string;
  createdAt: number;
  updatedAt: number;
}

export interface CustomFlashcardRecord
  extends Omit<CustomFlashcardRow, "flipped" | "answerOnly"> {
  flipped: boolean;
  answerOnly: boolean;
  type: string;
}

export interface CustomFlashcardInput {
  frontText: string;
  backText?: string;
  answers?: string[];
  hintFront?: string | null;
  hintBack?: string | null;
  imageFront?: string | null;
  imageBack?: string | null;
  explanation?: string | null;
  position?: number | null;
  flipped?: boolean;
  answerOnly?: boolean;
  type?: "text" | "image" | "true_false";
}

export async function getCustomFlashcards(
  courseId: number
): Promise<CustomFlashcardRecord[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{
    id: number;
    courseId: number;
    frontText: string;
    backText: string;
    hintFront: string | null;
    hintBack: string | null;
    imageFront: string | null;
    imageBack: string | null;
    explanation: string | null;
    position: number | null;
    flipped: number;
    answerOnly: number;
    type: string;
    createdAt: number;
    updatedAt: number;
    answerText: string | null;
  }>(
    `SELECT
       cf.id             AS id,
       cf.course_id     AS courseId,
       cf.front_text     AS frontText,
       cf.back_text      AS backText,
       cf.hint_front     AS hintFront,
       cf.hint_back      AS hintBack,
       cf.image_front    AS imageFront,
       cf.image_back     AS imageBack,
       cf.explanation    AS explanation,
       cf.position       AS position,
       cf.flipped        AS flipped,
       cf.answer_only    AS answerOnly,
       cf.type           AS type,
       cf.created_at     AS createdAt,
       cf.updated_at     AS updatedAt,
       cfa.answer_text   AS answerText
     FROM custom_flashcards cf
     LEFT JOIN custom_flashcard_answers cfa ON cfa.flashcard_id = cf.id
     WHERE cf.course_id = ?
     ORDER BY cf.position IS NULL,
              cf.position ASC,
              cf.id ASC,
              cfa.id ASC;`,
    courseId
  );

  const byId = new Map<number, CustomFlashcardRecord>();
  const ordered: CustomFlashcardRecord[] = [];

  for (const row of rows) {
    let record = byId.get(row.id);
    if (!record) {
      const rowData: CustomFlashcardRow = {
        id: row.id,
        courseId: row.courseId,
        frontText: row.frontText,
        backText: row.backText,
        hintFront: row.hintFront,
        hintBack: row.hintBack,
        imageFront: row.imageFront,
        imageBack: row.imageBack,
        explanation: row.explanation,
        answers: [],
        position: row.position,
        flipped: row.flipped,
        answerOnly: row.answerOnly,
        type: row.type,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
      record = {
        ...rowData,
        flipped: rowData.flipped === 1,
        answerOnly: rowData.answerOnly === 1,
      };
      byId.set(row.id, record);
      ordered.push(record);
    }

    addAnswerIfPresent(record.answers, row.answerText);
  }

  for (const record of ordered) {
    if (record.answers.length === 0) {
      record.answers = splitBackTextIntoAnswers(record.backText);
    } else {
      record.answers = dedupeOrdered(record.answers);
    }
  }

  return ordered;
}

export async function replaceCustomFlashcardsWithDb(
  db: SQLite.SQLiteDatabase,
  courseId: number,
  cards: CustomFlashcardInput[]
): Promise<void> {
  console.log("[DB] replaceCustomFlashcardsWithDb: start", {
    courseId,
    count: cards.length,
  });
  const existingImages = new Set<string>();
  const newImages = new Set<string>();
  const imageRows = await db.getAllAsync<{ imageFront: string | null; imageBack: string | null }>(
    `SELECT image_front AS imageFront, image_back AS imageBack FROM custom_flashcards WHERE course_id = ?;`,
    courseId
  );
  for (const row of imageRows) {
    if (row.imageFront) existingImages.add(row.imageFront);
    if (row.imageBack) existingImages.add(row.imageBack);
  }

  await db.execAsync("BEGIN TRANSACTION;");
  const now = Date.now();
  try {
    await db.runAsync(
      `DELETE FROM custom_flashcards WHERE course_id = ?;`,
      courseId
    );

    let fallbackPosition = 0;
    for (const card of cards) {
      const front = (card.frontText ?? "").trim();
      const normalizedAnswers = normalizeAnswersInput(card.answers);
      const backSource = (card.backText ?? "").trim();
      const derivedAnswers =
        normalizedAnswers.length > 0
          ? normalizedAnswers
          : splitBackTextIntoAnswers(backSource);

      if (!front && derivedAnswers.length === 0) {
        continue; // ignore completely empty cards
      }

      const position =
        card.position != null ? Number(card.position) : fallbackPosition;
      const serializedBackText =
        derivedAnswers.length > 0 ? derivedAnswers.join("; ") : backSource;

      const flippedValue =
        card.flipped == null ? 1 : card.flipped ? 1 : 0;
      const answerOnlyValue =
        card.answerOnly == null ? 0 : card.answerOnly ? 1 : 0;
      const typeValue = card.type || "text";

      const imageFront = card.imageFront ?? null;
      const imageBack = card.imageBack ?? null;
      if (imageFront) newImages.add(imageFront);
      if (imageBack) newImages.add(imageBack);

      const insertResult = await db.runAsync(
        `INSERT INTO custom_flashcards
           (course_id, front_text, back_text, hint_front, hint_back, image_front, image_back, explanation, position, flipped, answer_only, type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        courseId,
        front,
        serializedBackText,
        card.hintFront ?? null,
        card.hintBack ?? null,
        imageFront,
        imageBack,
        card.explanation ?? null,
        position,
        flippedValue, // domyślnie 1 (można odwracać)
        answerOnlyValue,
        typeValue,
        now,
        now
      );
      const flashcardId = Number(insertResult.lastInsertRowId ?? 0);

      const answersToPersist =
        derivedAnswers.length > 0
          ? derivedAnswers
          : splitBackTextIntoAnswers(serializedBackText);

      for (const answer of answersToPersist) {
        await db.runAsync(
          `INSERT OR IGNORE INTO custom_flashcard_answers
             (flashcard_id, answer_text, created_at)
           VALUES (?, ?, ?);`,
          flashcardId,
          answer,
          now
        );
      }

      fallbackPosition += 1;
    }

    await db.execAsync("COMMIT;");
    console.log("[DB] replaceCustomFlashcardsWithDb: committed");
    const toDelete = [...existingImages].filter((uri) => !newImages.has(uri));
    for (const uri of toDelete) {
      await deleteImage(uri);
    }
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    console.warn(
      "[DB] replaceCustomFlashcardsWithDb: rollback due to error",
      error
    );
    throw error;
  }
}

export async function replaceCustomFlashcards(
  courseId: number,
  cards: CustomFlashcardInput[]
): Promise<void> {
  const db = await getDB();
  console.log("[DB] replaceCustomFlashcards: delegating to WithDb");
  return replaceCustomFlashcardsWithDb(db, courseId, cards);
}

export async function countCustomFlashcardsForCourse(
  courseId: number
): Promise<number> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM custom_flashcards WHERE course_id = ?;`,
    courseId
  );
  return row?.cnt ?? 0;
}

export async function updateCustomFlashcardHints(
  flashcardId: number,
  hints: { hintFront: string | null; hintBack: string | null }
): Promise<void> {
  const db = await getDB();
  const now = Date.now();
  await db.runAsync(
    `UPDATE custom_flashcards
       SET hint_front = ?, hint_back = ?, updated_at = ?
     WHERE id = ?;`,
    hints.hintFront,
    hints.hintBack,
    now,
    flashcardId
  );
}
