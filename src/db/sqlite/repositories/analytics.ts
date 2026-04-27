import type * as SQLite from "expo-sqlite";

import { getDB } from "../core";

type DailyCount = { date: string; count: number };
type DailyTime = { date: string; ms: number };
export type DailyActivitySummary = {
  date: string;
  learnedCount: number;
  timeMs: number;
  correctCount: number;
  wrongCount: number;
  promotionsCount: number;
  totalCount: number;
};
export type WeekdayActivityDistribution = number[];
export type LearningEventsSummary = {
  totalEvents: number;
  activeDays: number;
};
export type CourseCompletionSummary = {
  totalAnswers: number;
  correctCount: number;
  wrongCount: number;
  timeMs: number;
};
export type HardFlashcard = {
  id: number;
  frontText: string;
  backText: string;
  imageFront: string | null;
  imageBack: string | null;
  type: string;
  wrongCount: number;
};

function formatLocalDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export async function clearCustomLearningEventsForCourseWithDb(
  db: SQLite.SQLiteDatabase,
  courseId: number
): Promise<number> {
  if (!courseId) return 0;
  const result = await db.runAsync(
    `DELETE FROM custom_learning_events WHERE course_id = ?;`,
    courseId
  );
  return Number(result?.changes ?? 0);
}

export async function clearCustomLearningEventsForCourse(
  courseId: number
): Promise<number> {
  const db = await getDB();
  return clearCustomLearningEventsForCourseWithDb(db, courseId);
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

export async function getDailyLearningTimeMsCustom(
  fromMs: number,
  toMs: number
): Promise<DailyTime[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ d: string; ms: number }>(
    `SELECT strftime('%Y-%m-%d', created_at/1000, 'unixepoch') AS d,
            SUM(COALESCE(duration_ms, 0)) AS ms
     FROM custom_learning_events
     WHERE created_at BETWEEN ? AND ?
     GROUP BY d
     ORDER BY d ASC;`,
    fromMs,
    toMs
  );
  return rows.map((r) => ({ date: r.d, ms: r.ms | 0 }));
}

export async function getDailyActivitySummariesCustom(
  fromMs: number,
  toMs: number
): Promise<DailyActivitySummary[]> {
  const db = await getDB();
  const [learnedRows, eventRows] = await Promise.all([
    db.getAllAsync<{ d: string; learnedCount: number }>(
      `SELECT strftime('%Y-%m-%d', learned_at/1000, 'unixepoch', 'localtime') AS d,
              COUNT(*) AS learnedCount
       FROM custom_reviews
       WHERE learned_at BETWEEN ? AND ?
       GROUP BY d
       ORDER BY d ASC;`,
      fromMs,
      toMs
    ),
    db.getAllAsync<{
      d: string;
      timeMs: number;
      correctCount: number;
      wrongCount: number;
      promotionsCount: number;
      totalCount: number;
    }>(
      `SELECT strftime('%Y-%m-%d', created_at/1000, 'unixepoch', 'localtime') AS d,
              SUM(COALESCE(duration_ms, 0)) AS timeMs,
              SUM(CASE WHEN result = 'ok' THEN 1 ELSE 0 END) AS correctCount,
              SUM(CASE WHEN result = 'wrong' THEN 1 ELSE 0 END) AS wrongCount,
              SUM(CASE
                    WHEN result = 'ok' AND box IN ('boxOne', 'boxTwo', 'boxThree', 'boxFour')
                    THEN 1
                    ELSE 0
                  END) AS promotionsCount,
              COUNT(*) AS totalCount
       FROM custom_learning_events
       WHERE created_at BETWEEN ? AND ?
       GROUP BY d
       ORDER BY d ASC;`,
      fromMs,
      toMs
    ),
  ]);

  const merged = new Map<string, DailyActivitySummary>();

  for (const row of learnedRows) {
    merged.set(row.d, {
      date: row.d,
      learnedCount: row.learnedCount | 0,
      timeMs: 0,
      correctCount: 0,
      wrongCount: 0,
      promotionsCount: 0,
      totalCount: 0,
    });
  }

  for (const row of eventRows) {
    const prev = merged.get(row.d);
    merged.set(row.d, {
      date: row.d,
      learnedCount: prev?.learnedCount ?? 0,
      timeMs: row.timeMs | 0,
      correctCount: row.correctCount | 0,
      wrongCount: row.wrongCount | 0,
      promotionsCount: row.promotionsCount | 0,
      totalCount: row.totalCount | 0,
    });
  }

  return Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getLearningEventsHourlyDistribution(
  fromMs: number,
  toMs: number
): Promise<number[]> {
  const db = await getDB();
  const hours = Array.from({ length: 24 }, () => 0);
  const rows = await db.getAllAsync<{ h: string; cnt: number }>(
    `SELECT strftime('%H', created_at/1000, 'unixepoch', 'localtime') AS h,
            COUNT(*) AS cnt
     FROM custom_learning_events
     WHERE created_at BETWEEN ? AND ?
     GROUP BY h;`,
    fromMs,
    toMs
  );
  for (const r of rows) {
    const idx = parseInt(r.h, 10) | 0;
    if (idx >= 0 && idx < 24) {
      hours[idx] += r.cnt | 0;
    }
  }
  return hours;
}

export async function getLearningEventsWeekdayDistribution(
  fromMs: number,
  toMs: number
): Promise<WeekdayActivityDistribution> {
  const db = await getDB();
  const weekdays = Array.from({ length: 7 }, () => 0);
  const rows = await db.getAllAsync<{ weekday: string; cnt: number }>(
    `SELECT strftime('%w', created_at/1000, 'unixepoch', 'localtime') AS weekday,
            COUNT(*) AS cnt
     FROM custom_learning_events
     WHERE created_at BETWEEN ? AND ?
     GROUP BY weekday;`,
    fromMs,
    toMs
  );
  for (const r of rows) {
    const idx = parseInt(r.weekday, 10) | 0;
    if (idx >= 0 && idx < 7) {
      weekdays[idx] += r.cnt | 0;
    }
  }
  return weekdays;
}

export async function getLearningEventsSummary(
  fromMs: number,
  toMs: number
): Promise<LearningEventsSummary> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ totalEvents: number; activeDays: number }>(
    `SELECT COUNT(*) AS totalEvents,
            COUNT(DISTINCT strftime('%Y-%m-%d', created_at/1000, 'unixepoch', 'localtime')) AS activeDays
     FROM custom_learning_events
     WHERE created_at BETWEEN ? AND ?;`,
    fromMs,
    toMs
  );
  return {
    totalEvents: row?.totalEvents ?? 0,
    activeDays: row?.activeDays ?? 0,
  };
}

export async function getCourseCompletionSummary(
  courseId: number,
  options?: { fromCreatedAtMs?: number | null }
): Promise<CourseCompletionSummary> {
  if (!courseId) {
    return {
      totalAnswers: 0,
      correctCount: 0,
      wrongCount: 0,
      timeMs: 0,
    };
  }

  const db = await getDB();
  const fromCreatedAtMs =
    options?.fromCreatedAtMs != null ? Math.max(0, options.fromCreatedAtMs) : null;
  const row = await db.getFirstAsync<{
    totalAnswers: number;
    correctCount: number;
    wrongCount: number;
    timeMs: number;
  }>(
    `SELECT
       COUNT(*) AS totalAnswers,
       SUM(CASE WHEN result = 'ok' THEN 1 ELSE 0 END) AS correctCount,
       SUM(CASE WHEN result = 'wrong' THEN 1 ELSE 0 END) AS wrongCount,
       SUM(COALESCE(duration_ms, 0)) AS timeMs
     FROM custom_learning_events
     WHERE course_id = ?
       ${fromCreatedAtMs == null ? "" : "AND created_at >= ?"};`,
    ...(fromCreatedAtMs == null ? [courseId] : [courseId, fromCreatedAtMs])
  );

  return {
    totalAnswers: row?.totalAnswers ?? 0,
    correctCount: row?.correctCount ?? 0,
    wrongCount: row?.wrongCount ?? 0,
    timeMs: row?.timeMs ?? 0,
  };
}

export async function hasLearningProgressOnDate(date: Date): Promise<boolean> {
  const db = await getDB();
  const start = new Date(date.getTime());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + 1);

  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt
     FROM custom_learning_events
     WHERE created_at >= ?
       AND created_at < ?
       AND result = 'ok'
       AND box IN ('boxZero', 'boxOne', 'boxTwo', 'boxThree', 'boxFour');`,
    start.getTime(),
    end.getTime()
  );

  return (row?.cnt ?? 0) > 0;
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

export async function getGlobalDailyStreakDays(
  nowMs: number = Date.now()
): Promise<number> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ d: string }>(
    `SELECT strftime('%Y-%m-%d', created_at/1000, 'unixepoch', 'localtime') AS d
     FROM custom_learning_events
     WHERE result = 'ok'
       AND box IN ('boxOne', 'boxTwo', 'boxThree', 'boxFour')
     GROUP BY d
     HAVING COUNT(*) >= 10
     ORDER BY d DESC;`
  );

  const activeDays = new Set(rows.map((row) => row.d).filter(Boolean));
  if (activeDays.size === 0) {
    return 0;
  }

  const cursor = new Date(nowMs);
  cursor.setHours(0, 0, 0, 0);
  let streak = 0;

  while (true) {
    const dateKey = formatLocalDateOnly(cursor);
    if (!activeDays.has(dateKey)) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export async function countGlobalBoxPromotions(): Promise<number> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt
     FROM custom_learning_events
     WHERE result = 'ok'
       AND box IN ('boxOne', 'boxTwo', 'boxThree', 'boxFour');`
  );
  return row?.cnt ?? 0;
}

export async function getHardFlashcards(
  courseId?: number | null,
  limit: number = 10
): Promise<HardFlashcard[]> {
  if (limit <= 0) return [];
  if (courseId != null && !courseId) return [];
  const db = await getDB();
  const hasCourseFilter = courseId != null;
  const rows = await db.getAllAsync<{
    id: number;
    frontText: string;
    backText: string;
    imageFront: string | null;
    imageBack: string | null;
    type: string;
    wrongCount: number;
  }>(
    `SELECT
       cf.id AS id,
       cf.front_text AS frontText,
       cf.back_text AS backText,
       cf.image_front AS imageFront,
       cf.image_back AS imageBack,
       cf.type AS type,
       COALESCE(SUM(CASE WHEN e.result = 'wrong' THEN 1 ELSE 0 END), 0) AS wrongCount
     FROM custom_flashcards cf
     LEFT JOIN custom_learning_events e ON e.flashcard_id = cf.id
     ${hasCourseFilter ? "WHERE cf.course_id = ?" : ""}
     GROUP BY cf.id, cf.front_text, cf.back_text, cf.image_front, cf.image_back, cf.type
     HAVING wrongCount > 0
     ORDER BY wrongCount DESC, cf.id ASC
     LIMIT ?;`,
    ...(hasCourseFilter ? [courseId, limit] : [limit])
  );
  return rows.map((r) => ({
    id: r.id,
    frontText: r.frontText,
    backText: r.backText,
    imageFront: r.imageFront ?? null,
    imageBack: r.imageBack ?? null,
    type: r.type,
    wrongCount: r.wrongCount | 0,
  }));
}
