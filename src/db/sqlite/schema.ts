import * as SQLite from "expo-sqlite";
import { splitBackTextIntoAnswers } from "./utils";

type TableColumnInfo = {
  name: string;
};

export async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string,
  definition: string
): Promise<void> {
  const rows = await db.getAllAsync<TableColumnInfo>(
    `PRAGMA table_info(${tableName});`
  );
  if (rows.some((column) => column.name === columnName)) {
    return;
  }
  await db.execAsync(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`
  );
}

export async function backfillCustomFlashcardAnswers(
  db: SQLite.SQLiteDatabase
): Promise<void> {
  const cardsNeedingAnswers = await db.getAllAsync<{
    id: number;
    backText: string;
  }>(
    `SELECT cf.id AS id, cf.back_text AS backText
     FROM custom_flashcards cf
     LEFT JOIN custom_flashcard_answers cfa ON cfa.flashcard_id = cf.id
     WHERE cfa.id IS NULL;`
  );

  if (cardsNeedingAnswers.length === 0) {
    return;
  }

  const now = Date.now();
  await db.execAsync("BEGIN TRANSACTION;");
  try {
    for (const card of cardsNeedingAnswers) {
      const answers = splitBackTextIntoAnswers(card.backText);
      if (answers.length === 0) {
        continue;
      }
      for (const answer of answers) {
        await db.runAsync(
          `INSERT OR IGNORE INTO custom_flashcard_answers
             (flashcard_id, answer_text, created_at)
           VALUES (?, ?, ?);`,
          card.id,
          answer,
          now
        );
      }
    }
    await db.execAsync("COMMIT;");
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
}

export async function applySchema(db: SQLite.SQLiteDatabase): Promise<void> {
  const customSchema = `
    CREATE TABLE IF NOT EXISTS custom_courses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      icon_id     TEXT    NOT NULL,
      icon_color  TEXT    NOT NULL,
      color_id    TEXT,
      reviews_enabled INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS custom_flashcards (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id  INTEGER NOT NULL REFERENCES custom_courses(id) ON DELETE CASCADE,
      front_text  TEXT    NOT NULL,
      back_text   TEXT    NOT NULL,
      hint_front  TEXT,
      hint_back   TEXT,
      image_front TEXT,
      image_back  TEXT,
      position    INTEGER,
      flipped     INTEGER NOT NULL DEFAULT 1,
      answer_only INTEGER NOT NULL DEFAULT 0,
      type        TEXT NOT NULL DEFAULT 'text',
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS custom_flashcard_answers (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      flashcard_id  INTEGER NOT NULL REFERENCES custom_flashcards(id) ON DELETE CASCADE,
      answer_text   TEXT    NOT NULL,
      created_at    INTEGER NOT NULL,
      UNIQUE(flashcard_id, answer_text)
    );
    CREATE INDEX IF NOT EXISTS idx_custom_flashcard_answers_card ON custom_flashcard_answers(flashcard_id);
    CREATE INDEX IF NOT EXISTS idx_custom_flashcards_course ON custom_flashcards(course_id, position);
    CREATE TABLE IF NOT EXISTS custom_reviews (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id     INTEGER NOT NULL REFERENCES custom_courses(id) ON DELETE CASCADE,
      flashcard_id   INTEGER NOT NULL REFERENCES custom_flashcards(id) ON DELETE CASCADE,
      learned_at     INTEGER NOT NULL,
      next_review    INTEGER NOT NULL,
      stage          INTEGER NOT NULL DEFAULT 0,
      UNIQUE(flashcard_id)
    );
    CREATE INDEX IF NOT EXISTS idx_custom_reviews_course ON custom_reviews(course_id);
    CREATE INDEX IF NOT EXISTS idx_custom_reviews_due ON custom_reviews(next_review);
    CREATE TABLE IF NOT EXISTS custom_learning_events (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      flashcard_id   INTEGER NOT NULL,
      course_id      INTEGER,
      box            TEXT,
      result         TEXT NOT NULL,
      duration_ms    INTEGER,
      created_at     INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_custom_learning_events_card ON custom_learning_events(flashcard_id);
    CREATE INDEX IF NOT EXISTS idx_custom_learning_events_time ON custom_learning_events(created_at);
  `;

  await db.execAsync(customSchema);

  await ensureColumn(
    db,
    "custom_courses",
    "reviews_enabled",
    "INTEGER NOT NULL DEFAULT 0"
  );
  await ensureColumn(db, "custom_flashcards", "hint_front", "TEXT");
  await ensureColumn(db, "custom_flashcards", "hint_back", "TEXT");
  await ensureColumn(db, "custom_flashcards", "image_front", "TEXT");
  await ensureColumn(db, "custom_flashcards", "image_back", "TEXT");
  await ensureColumn(
    db,
    "custom_flashcards",
    "answer_only",
    "INTEGER NOT NULL DEFAULT 0"
  );
  await ensureColumn(
    db,
    "custom_flashcards",
    "type",
    "TEXT NOT NULL DEFAULT 'text'"
  );

  // Official pack metadata (idempotent, safe for existing DBs)
  await ensureColumn(
    db,
    "custom_courses",
    "is_official",
    "INTEGER NOT NULL DEFAULT 0"
  );
  await ensureColumn(db, "custom_courses", "slug", "TEXT");
  await db.execAsync(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_courses_slug
       ON custom_courses(slug)
       WHERE slug IS NOT NULL;`
  );

  const achievementsSchema = `
    CREATE TABLE IF NOT EXISTS user_achievements (
      id TEXT PRIMARY KEY,
      unlocked_at INTEGER NOT NULL
    );
  `;
  await db.execAsync(achievementsSchema);

  await backfillCustomFlashcardAnswers(db);
}

export async function configurePragmas(
  db: SQLite.SQLiteDatabase
): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = 10000;
    PRAGMA page_size = 4096;
  `);
}
