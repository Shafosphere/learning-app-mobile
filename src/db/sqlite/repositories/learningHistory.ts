import { getDB } from "../core";

export type LearningHistoryEvent = {
  id: number;
  sourceType: "builtin" | "custom";
  mode: "flashcards" | "review";
  cardId: number;
  courseId: number | null;
  courseName: string | null;
  promptText: string;
  expectedAnswerText: string;
  promptImageUri: string | null;
  expectedAnswerImageUri: string | null;
  cardType: "text" | "true_false" | "know_dont_know";
  userAnswer: string;
  reversed: boolean;
  result: "ok" | "wrong";
  fromBox: string | null;
  toBox: string | null;
  durationMs: number | null;
  createdAt: number;
};

export type LearningHistoryEventInput = Omit<
  LearningHistoryEvent,
  "id" | "createdAt"
> & { createdAt?: number };

const HISTORY_LIMIT = 100;

export async function logLearningHistoryEvent(
  input: LearningHistoryEventInput,
): Promise<void> {
  const db = await getDB();
  const createdAt = input.createdAt ?? Date.now();
  let courseName = input.courseName;

  if (!courseName && input.sourceType === "custom" && input.courseId != null) {
    const course = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM custom_courses WHERE id = ? LIMIT 1;",
      input.courseId,
    );
    courseName = course?.name ?? null;
  }

  await db.runAsync(
    `INSERT INTO learning_history_events
      (source_type, mode, card_id, course_id, course_name, prompt_text,
       expected_answer_text, reversed, result, from_box, to_box, duration_ms,
       created_at, prompt_image_uri, expected_answer_image_uri, card_type, user_answer)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    input.sourceType,
    input.mode,
    input.cardId,
    input.courseId,
    courseName,
    input.promptText,
    input.expectedAnswerText,
    input.reversed ? 1 : 0,
    input.result,
    input.fromBox,
    input.toBox,
    input.durationMs,
    createdAt,
    input.promptImageUri,
    input.expectedAnswerImageUri,
    input.cardType,
    input.userAnswer,
  );

  await db.runAsync(
    `DELETE FROM learning_history_events
     WHERE id NOT IN (
       SELECT id FROM learning_history_events
       ORDER BY created_at DESC, id DESC
       LIMIT ${HISTORY_LIMIT}
     );`,
  );
}

export async function getRecentLearningHistory(
  limit: number = HISTORY_LIMIT,
): Promise<LearningHistoryEvent[]> {
  const db = await getDB();
  const safeLimit = Math.max(1, Math.min(HISTORY_LIMIT, Math.floor(limit)));
  const rows = await db.getAllAsync<{
    id: number;
    sourceType: string;
    mode: string;
    cardId: number;
    courseId: number | null;
    courseName: string | null;
    promptText: string;
    expectedAnswerText: string;
    promptImageUri: string | null;
    expectedAnswerImageUri: string | null;
    cardType: string;
    userAnswer: string;
    reversed: number;
    result: string;
    fromBox: string | null;
    toBox: string | null;
    durationMs: number | null;
    createdAt: number;
  }>(
    `SELECT id, source_type AS sourceType, mode, card_id AS cardId,
            course_id AS courseId, course_name AS courseName,
            prompt_text AS promptText,
            expected_answer_text AS expectedAnswerText,
            reversed, result, from_box AS fromBox,
            to_box AS toBox, duration_ms AS durationMs, created_at AS createdAt,
            prompt_image_uri AS promptImageUri,
            expected_answer_image_uri AS expectedAnswerImageUri,
            card_type AS cardType, user_answer AS userAnswer
     FROM learning_history_events
     ORDER BY created_at DESC, id DESC
     LIMIT ?;`,
    safeLimit,
  );

  return rows.map((row) => ({
    ...row,
    sourceType: row.sourceType as LearningHistoryEvent["sourceType"],
    mode: row.mode as LearningHistoryEvent["mode"],
    cardType: row.cardType as LearningHistoryEvent["cardType"],
    reversed: row.reversed === 1,
    result: row.result as LearningHistoryEvent["result"],
  }));
}
