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
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS languages (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT    NOT NULL UNIQUE,
      name TEXT    NOT NULL
    );
    CREATE TABLE IF NOT EXISTS words (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      language_id INTEGER NOT NULL REFERENCES languages(id),
      text        TEXT    NOT NULL,
      cefr_level  TEXT    NOT NULL CHECK(cefr_level IN ('A1','A2','B1','B2','C1','C2')),
      UNIQUE(language_id, text)
    );
    CREATE TABLE IF NOT EXISTS translations (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      source_word_id      INTEGER NOT NULL REFERENCES words(id),
      target_language_id  INTEGER NOT NULL REFERENCES languages(id),
      translation_text    TEXT    NOT NULL,
      target_word_id      INTEGER REFERENCES words(id),
      UNIQUE(source_word_id, target_language_id, translation_text)
    );
    CREATE TABLE IF NOT EXISTS language_pairs (
      source_language_id INTEGER NOT NULL REFERENCES languages(id),
      target_language_id INTEGER NOT NULL REFERENCES languages(id),
      PRIMARY KEY (source_language_id, target_language_id)
    );
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
      position    INTEGER,
      flipped     INTEGER NOT NULL DEFAULT 1,
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
    CREATE INDEX IF NOT EXISTS idx_words_lang_cefr ON words(language_id, cefr_level);
    CREATE INDEX IF NOT EXISTS idx_trans_src_tgtlang ON translations(source_word_id, target_language_id);
    -- Reviews table for spaced repetition scheduling
    CREATE TABLE IF NOT EXISTS reviews (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id          INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
      source_lang_id   INTEGER NOT NULL REFERENCES languages(id),
      target_lang_id   INTEGER NOT NULL REFERENCES languages(id),
      level            TEXT    NOT NULL,
      learned_at       INTEGER NOT NULL,
      next_review      INTEGER NOT NULL,
      stage            INTEGER NOT NULL DEFAULT 0,
      UNIQUE(word_id, source_lang_id, target_lang_id)
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_due ON reviews(next_review);
    CREATE INDEX IF NOT EXISTS idx_reviews_pair ON reviews(source_lang_id, target_lang_id);

    -- Optional learning events for analytics (flashcards + reviews)
    CREATE TABLE IF NOT EXISTS learning_events (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id          INTEGER NOT NULL,
      source_lang_id   INTEGER,
      target_lang_id   INTEGER,
      level            TEXT,
      box              TEXT, -- boxOne..boxFive or NULL for reviews
      result           TEXT NOT NULL, -- 'ok' | 'wrong'
      duration_ms      INTEGER,
      created_at       INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_learning_events_word ON learning_events(word_id);
    CREATE INDEX IF NOT EXISTS idx_learning_events_time ON learning_events(created_at);

    -- Aggregated counter of how many times a word was moved between Leitner boxes
    CREATE TABLE IF NOT EXISTS word_box_moves (
      word_id        INTEGER NOT NULL,
      source_lang_id INTEGER NOT NULL,
      target_lang_id INTEGER NOT NULL,
      level          TEXT    NOT NULL,
      move_count     INTEGER NOT NULL DEFAULT 1,
      last_from_box  TEXT,
      last_to_box    TEXT,
      last_moved_at  INTEGER NOT NULL,
      PRIMARY KEY (word_id, source_lang_id, target_lang_id, level)
    );
    CREATE INDEX IF NOT EXISTS idx_word_box_moves_last ON word_box_moves(last_moved_at);

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
  `);

  await ensureColumn(
    db,
    "custom_courses",
    "reviews_enabled",
    "INTEGER NOT NULL DEFAULT 0"
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
