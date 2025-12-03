import type { CEFRLevel } from "@/src/types/language";
import { getDB } from "../core";

export type DailyCount = { date: string; count: number };

export type StubbornWord = {
  id: number;
  text: string;
  moveCount: number;
  lastFromBox: string | null;
  lastToBox: string | null;
  lastMovedAt: number | null;
};

export type HardWord = { id: number; text: string; wrongCount: number };

export async function logLearningEvent(params: {
  wordId: number;
  sourceLangId?: number | null;
  targetLangId?: number | null;
  level?: string | null;
  box?: string | null; // boxOne..boxFive
  result: "ok" | "wrong";
  durationMs?: number | null;
}): Promise<void> {
  const db = await getDB();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO learning_events (word_id, source_lang_id, target_lang_id, level, box, result, duration_ms, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    params.wordId,
    params.sourceLangId ?? null,
    params.targetLangId ?? null,
    params.level ?? null,
    params.box ?? null,
    params.result,
    params.durationMs ?? null,
    now
  );
}

export async function logCustomLearningEvent(params: {
  flashcardId: number;
  courseId?: number | null;
  box?: string | null;
  result: "ok" | "wrong";
  durationMs?: number | null;
}): Promise<void> {
  const db = await getDB();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO custom_learning_events (flashcard_id, course_id, box, result, duration_ms, created_at)
     VALUES (?, ?, ?, ?, ?, ?);`,
    params.flashcardId,
    params.courseId ?? null,
    params.box ?? null,
    params.result,
    params.durationMs ?? null,
    now
  );
}

export async function logWordBoxMove(params: {
  wordId: number;
  sourceLangId: number;
  targetLangId: number;
  level: CEFRLevel;
  fromBox?: string | null;
  toBox?: string | null;
}): Promise<void> {
  const db = await getDB();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO word_box_moves (word_id, source_lang_id, target_lang_id, level, move_count, last_from_box, last_to_box, last_moved_at)
     VALUES (?, ?, ?, ?, 1, ?, ?, ?)
     ON CONFLICT(word_id, source_lang_id, target_lang_id, level) DO UPDATE SET
       move_count = move_count + 1,
       last_from_box = excluded.last_from_box,
       last_to_box = excluded.last_to_box,
       last_moved_at = excluded.last_moved_at;`,
    params.wordId,
    params.sourceLangId,
    params.targetLangId,
    params.level,
    params.fromBox ?? null,
    params.toBox ?? null,
    now
  );
}

export async function getDailyLearnedCountsBuiltin(
  fromMs: number,
  toMs: number
): Promise<DailyCount[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ d: string; cnt: number }>(
    `SELECT strftime('%Y-%m-%d', learned_at/1000, 'unixepoch') AS d, COUNT(*) AS cnt
     FROM reviews
     WHERE learned_at BETWEEN ? AND ?
     GROUP BY d
     ORDER BY d ASC;`,
    fromMs,
    toMs
  );
  return rows.map((r) => ({ date: r.d, count: r.cnt | 0 }));
}

export async function getDailyLearnedCountsCustom(
  fromMs: number,
  toMs: number
): Promise<DailyCount[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ d: string; cnt: number }>(
    `SELECT strftime('%Y-%m-%d', learned_at/1000, 'unixepoch') AS d, COUNT(*) AS cnt
     FROM custom_reviews
     WHERE learned_at BETWEEN ? AND ?
     GROUP BY d
     ORDER BY d ASC;`,
    fromMs,
    toMs
  );
  return rows.map((r) => ({ date: r.d, count: r.cnt | 0 }));
}

export async function getHourlyActivityCounts(
  fromMs: number,
  toMs: number
): Promise<number[]> {
  const db = await getDB();
  const hours = Array.from({ length: 24 }, () => 0);
  const rows1 = await db.getAllAsync<{ h: string; cnt: number }>(
    `SELECT strftime('%H', created_at/1000, 'unixepoch') AS h, COUNT(*) AS cnt
     FROM learning_events WHERE created_at BETWEEN ? AND ?
     GROUP BY h;`,
    fromMs,
    toMs
  );
  for (const r of rows1) {
    const idx = parseInt(r.h, 10) | 0;
    if (idx >= 0 && idx < 24) hours[idx] += r.cnt | 0;
  }
  const rows2 = await db.getAllAsync<{ h: string; cnt: number }>(
    `SELECT strftime('%H', created_at/1000, 'unixepoch') AS h, COUNT(*) AS cnt
     FROM custom_learning_events WHERE created_at BETWEEN ? AND ?
     GROUP BY h;`,
    fromMs,
    toMs
  );
  for (const r of rows2) {
    const idx = parseInt(r.h, 10) | 0;
    if (idx >= 0 && idx < 24) hours[idx] += r.cnt | 0;
  }
  return hours;
}

export async function getTotalLearningTimeMs(
  fromMs: number,
  toMs: number
): Promise<number> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ ms: number }>(
    `SELECT SUM(ms) AS ms FROM (
       SELECT COALESCE(duration_ms, 0) AS ms
       FROM learning_events
       WHERE created_at BETWEEN ? AND ?
       UNION ALL
       SELECT COALESCE(duration_ms, 0) AS ms
       FROM custom_learning_events
       WHERE created_at BETWEEN ? AND ?
     );`,
    fromMs,
    toMs,
    fromMs,
    toMs
  );
  return row?.ms ?? 0;
}

export async function getStubbornWords(
  sourceLangId: number,
  targetLangId: number,
  level: CEFRLevel,
  limit: number = 10
): Promise<StubbornWord[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{
    id: number;
    text: string;
    moveCount: number;
    lastFromBox: string | null;
    lastToBox: string | null;
    lastMovedAt: number | null;
  }>(
    `SELECT w.id AS id, w.text AS text,
            m.move_count AS moveCount,
            m.last_from_box AS lastFromBox,
            m.last_to_box AS lastToBox,
            m.last_moved_at AS lastMovedAt
     FROM word_box_moves m
     JOIN words w ON w.id = m.word_id
     WHERE m.source_lang_id = ? AND m.target_lang_id = ? AND m.level = ?
     ORDER BY m.move_count DESC, m.last_moved_at DESC
     LIMIT ?;`,
    sourceLangId,
    targetLangId,
    level,
    limit
  );
  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    moveCount: r.moveCount | 0,
    lastFromBox: r.lastFromBox,
    lastToBox: r.lastToBox,
    lastMovedAt: r.lastMovedAt,
  }));
}

export async function getHardWords(
  sourceLangId: number,
  targetLangId: number,
  limit: number = 10
): Promise<HardWord[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{
    id: number;
    text: string;
    wrongCount: number;
  }>(
    `WITH learned AS (
       SELECT word_id, MIN(learned_at) AS first_learned_at
       FROM reviews
       WHERE source_lang_id = ? AND target_lang_id = ?
       GROUP BY word_id
     )
     SELECT w.id AS id, w.text AS text,
            COALESCE(SUM(CASE WHEN e.result = 'wrong' THEN 1 ELSE 0 END), 0) AS wrongCount
     FROM learned l
     JOIN words w ON w.id = l.word_id
     LEFT JOIN learning_events e
       ON e.word_id = l.word_id AND e.created_at <= l.first_learned_at
     GROUP BY w.id, w.text
     HAVING wrongCount > 0
     ORDER BY wrongCount DESC, w.text ASC
     LIMIT ?;`,
    sourceLangId,
    targetLangId,
    limit
  );
  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    wrongCount: r.wrongCount | 0,
  }));
}
