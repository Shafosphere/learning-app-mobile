import { getDB } from "../core";

export type DailyCount = { date: string; count: number };
export type HardFlashcard = { id: number; frontText: string; wrongCount: number };

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
  const rows = await db.getAllAsync<{ h: string; cnt: number }>(
    `SELECT strftime('%H', created_at/1000, 'unixepoch') AS h, COUNT(*) AS cnt
     FROM custom_learning_events WHERE created_at BETWEEN ? AND ?
     GROUP BY h;`,
    fromMs,
    toMs
  );
  for (const r of rows) {
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
    `SELECT SUM(COALESCE(duration_ms, 0)) AS ms
     FROM custom_learning_events
     WHERE created_at BETWEEN ? AND ?;`,
    fromMs,
    toMs
  );
  return row?.ms ?? 0;
}

export async function getHardFlashcards(
  courseId: number,
  limit: number = 10
): Promise<HardFlashcard[]> {
  if (!courseId || limit <= 0) return [];
  const db = await getDB();
  const rows = await db.getAllAsync<{
    id: number;
    frontText: string;
    wrongCount: number;
  }>(
    `SELECT
       cf.id AS id,
       cf.front_text AS frontText,
       COALESCE(SUM(CASE WHEN e.result = 'wrong' THEN 1 ELSE 0 END), 0) AS wrongCount
     FROM custom_flashcards cf
     LEFT JOIN custom_learning_events e ON e.flashcard_id = cf.id
     WHERE cf.course_id = ?
     GROUP BY cf.id, cf.front_text
     HAVING wrongCount > 0
     ORDER BY wrongCount DESC, cf.id ASC
     LIMIT ?;`,
    courseId,
    limit
  );
  return rows.map((r) => ({
    id: r.id,
    frontText: r.frontText,
    wrongCount: r.wrongCount | 0,
  }));
}
