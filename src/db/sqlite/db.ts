// sqlite helpers and persistence primitives

import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";
import Papa from "papaparse";
import wordsENGtoPLCsv from "@/assets/data/wordsENGtoPL.csv";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { REVIEW_INTERVALS_MS } from "@/src/config/appConfig";
import type { WordWithTranslations } from "@/src/types/boxes";
import type { CEFRLevel } from "@/src/types/language";

export type LanguagePair = {
  id: number;
  source_code: string;
  target_code: string;
  source_id: number;   // NEW
  target_id: number;   // NEW
};

export interface CustomCourseRecord {
  id: number;
  name: string;
  iconId: string;
  iconColor: string;
  colorId: string | null;
  reviewsEnabled: boolean;
  createdAt: number;
  updatedAt: number;
  // optional metadata
  isOfficial?: boolean;
  slug?: string | null;
}

export interface CustomCourseInput {
  name: string;
  iconId: string;
  iconColor: string;
  colorId?: string | null;
  reviewsEnabled?: boolean;
}

export interface CustomCourseSummary extends CustomCourseRecord {
  cardsCount: number;
}

export interface CustomFlashcardRow {
  id: number;
  courseId: number;
  frontText: string;
  backText: string;
  answers: string[];
  position: number | null;
  flipped: number;
  createdAt: number;
  updatedAt: number;
}

export interface CustomFlashcardRecord extends Omit<CustomFlashcardRow, 'flipped'> {
  flipped: boolean;
}

export interface CustomReviewFlashcard extends CustomFlashcardRecord {
  stage: number;
  nextReview: number;
}

export interface CustomFlashcardInput {
  frontText: string;
  backText?: string;
  answers?: string[];
  position?: number | null;
  flipped?: boolean;
}

type CustomCourseSqlRow = {
  id: number;
  name: string;
  iconId: string;
  iconColor: string;
  colorId: string | null;
  reviewsEnabled: number;
  createdAt: number;
  updatedAt: number;
  isOfficial?: number;
  slug?: string | null;
};

type CustomCourseSummarySqlRow = CustomCourseSqlRow & {
  cardsCount: number;
};

type TableColumnInfo = {
  name: string;
};

function mapCustomCourseRow(row: CustomCourseSqlRow): CustomCourseRecord {
  return {
    ...row,
    reviewsEnabled: row.reviewsEnabled === 1,
    isOfficial: row.isOfficial === 1,
    slug: row.slug ?? null,
  };
}

function mapCustomCourseSummaryRow(
  row: CustomCourseSummarySqlRow
): CustomCourseSummary {
  const { cardsCount, ...rest } = row;
  const base = mapCustomCourseRow(rest as CustomCourseSqlRow);
  return {
    ...base,
    cardsCount,
  };
}

async function ensureColumn(
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

const ANSWER_SPLIT_REGEX = /[;,\n]/;

function dedupeOrdered(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

function splitBackTextIntoAnswers(raw: string | null | undefined): string[] {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return [];
  }

  const tentative = trimmed
    .split(ANSWER_SPLIT_REGEX)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const candidates = tentative.length > 0 ? tentative : [trimmed];
  return dedupeOrdered(candidates);
}

function normalizeAnswersInput(
  rawAnswers: (string | null | undefined)[] | undefined
): string[] {
  if (!rawAnswers || rawAnswers.length === 0) {
    return [];
  }
  const cleaned = rawAnswers
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);

  return dedupeOrdered(cleaned);
}

function addAnswerIfPresent(target: string[], answer: string | null | undefined) {
  if (!answer) {
    return;
  }
  const trimmed = answer.trim();
  if (!trimmed) {
    return;
  }
  if (!target.includes(trimmed)) {
    target.push(trimmed);
  }
}

let dbInitializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export type DbInitializationEvent =
  | { type: "start" }
  | { type: "import-start" }
  | { type: "import-finish" }
  | { type: "ready"; initialImport: boolean }
  | { type: "error"; error: unknown };

export type DbInitializationListener = (event: DbInitializationEvent) => void;

const dbInitializationListeners = new Set<DbInitializationListener>();
let lastDbInitializationEvent: DbInitializationEvent | null = null;

export function addDbInitializationListener(
  listener: DbInitializationListener
): () => void {
  dbInitializationListeners.add(listener);
  if (lastDbInitializationEvent) {
    try {
      listener(lastDbInitializationEvent);
    } catch (error) {
      console.warn("[DB] DbInitializationListener threw on subscribe", error);
    }
  }
  return () => {
    dbInitializationListeners.delete(listener);
  };
}

function notifyDbInitializationListeners(event: DbInitializationEvent): void {
  lastDbInitializationEvent = event;
  dbInitializationListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.warn("[DB] DbInitializationListener threw", error);
    }
  });
}

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  return SQLite.openDatabaseAsync("mygame.db");
}

async function applySchema(db: SQLite.SQLiteDatabase): Promise<void> {
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
  await ensureColumn(db, "custom_courses", "is_official", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "custom_courses", "slug", "TEXT");
  await db.execAsync(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_courses_slug
       ON custom_courses(slug)
       WHERE slug IS NOT NULL;`
  );

  await backfillCustomFlashcardAnswers(db);
}

async function backfillCustomFlashcardAnswers(
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

async function configurePragmas(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = 10000;
    PRAGMA page_size = 4096;
  `);
}

export async function getCustomCourses(): Promise<CustomCourseRecord[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<CustomCourseSqlRow>(
    `SELECT
       id,
       name,
       icon_id     AS iconId,
       icon_color  AS iconColor,
       color_id    AS colorId,
       COALESCE(reviews_enabled, 0) AS reviewsEnabled,
       created_at  AS createdAt,
       updated_at  AS updatedAt,
       COALESCE(is_official, 0) AS isOfficial,
       slug AS slug
     FROM custom_courses
     ORDER BY created_at DESC, id DESC;`
  );
  return rows.map(mapCustomCourseRow);
}

export async function getCustomCoursesWithCardCounts(): Promise<CustomCourseSummary[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<CustomCourseSummarySqlRow>(
    `SELECT
       cp.id,
       cp.name,
       cp.icon_id     AS iconId,
       cp.icon_color  AS iconColor,
       cp.color_id    AS colorId,
       COALESCE(cp.reviews_enabled, 0) AS reviewsEnabled,
       cp.created_at  AS createdAt,
       cp.updated_at  AS updatedAt,
       COALESCE(cp.is_official, 0) AS isOfficial,
       cp.slug AS slug,
       (
         SELECT COUNT(*)
         FROM custom_flashcards cf
         WHERE cf.course_id = cp.id
       ) AS cardsCount
     FROM custom_courses cp
     ORDER BY cp.created_at DESC, cp.id DESC;`
  );
  return rows.map(mapCustomCourseSummaryRow);
}

export async function getCustomCourseById(
  id: number
): Promise<CustomCourseRecord | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<CustomCourseSqlRow>(
    `SELECT
       id,
       name,
       icon_id     AS iconId,
       icon_color  AS iconColor,
       color_id    AS colorId,
       COALESCE(reviews_enabled, 0) AS reviewsEnabled,
       created_at  AS createdAt,
       updated_at  AS updatedAt,
       COALESCE(is_official, 0) AS isOfficial,
       slug
     FROM custom_courses
     WHERE id = ?
     LIMIT 1;`,
    id
  );
  return row ? mapCustomCourseRow(row) : null;
}

export async function createCustomCourse(
  course: CustomCourseInput
): Promise<number> {
  const db = await getDB();
  const now = Date.now();
  const name = course.name.trim();
  if (!name) {
    throw new Error("Custom course name cannot be empty");
  }
  const reviewsEnabled = course.reviewsEnabled === true ? 1 : 0;
  const result = await db.runAsync(
    `INSERT INTO custom_courses (name, icon_id, icon_color, color_id, reviews_enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    name,
    course.iconId,
    course.iconColor,
    course.colorId ?? null,
    reviewsEnabled,
    now,
    now
  );
  return Number(result.lastInsertRowId ?? 0);
}

export async function updateCustomCourse(
  id: number,
  course: CustomCourseInput
): Promise<void> {
  const db = await getDB();
  const now = Date.now();
  const name = course.name.trim();
  if (!name) {
    throw new Error("Custom course name cannot be empty");
  }
  const reviewsEnabled = course.reviewsEnabled === true ? 1 : 0;
  await db.runAsync(
    `UPDATE custom_courses
     SET name = ?, icon_id = ?, icon_color = ?, color_id = ?, reviews_enabled = ?, updated_at = ?
     WHERE id = ?;`,
    name,
    course.iconId,
    course.iconColor,
    course.colorId ?? null,
    reviewsEnabled,
    now,
    id
  );
}

export async function deleteCustomCourse(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM custom_courses WHERE id = ?;`, id);
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
    position: number | null;
    flipped: number;
    createdAt: number;
    updatedAt: number;
    answerText: string | null;
  }>(
    `SELECT
       cf.id             AS id,
       cf.course_id     AS courseId,
       cf.front_text     AS frontText,
       cf.back_text      AS backText,
       cf.position       AS position,
       cf.flipped        AS flipped,
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
        answers: [],
        position: row.position,
        flipped: row.flipped,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
      record = {
        ...rowData,
        flipped: rowData.flipped === 1
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
  console.log("[DB] replaceCustomFlashcardsWithDb: start", { courseId, count: cards.length });
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

      const insertResult = await db.runAsync(
        `INSERT INTO custom_flashcards
           (course_id, front_text, back_text, position, flipped, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        courseId,
        front,
        serializedBackText,
        position,
        card.flipped ?? 1, // domyślnie 1 (można odwracać)
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
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    console.warn("[DB] replaceCustomFlashcardsWithDb: rollback due to error", error);
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

async function seedLanguages(
  db: SQLite.SQLiteDatabase
): Promise<Record<string, number>> {
  await db.runAsync(
    `INSERT OR IGNORE INTO languages (code,name) VALUES ('en','English'),('pl','Polski');`
  );
  const langs = await db.getAllAsync<{ id: number; code: string }>(
    `SELECT id, code FROM languages WHERE code IN (?,?);`,
    "en",
    "pl"
  );
  const langMap: Record<string, number> = {};
  langs.forEach((l) => {
    langMap[l.code] = l.id;
  });
  return langMap;
}

async function importInitialCsv(db: SQLite.SQLiteDatabase): Promise<void> {
  console.log("Baza danych jest pusta. Rozpoczynam import z CSV...");

  const asset = Asset.fromModule(wordsENGtoPLCsv);
  await asset.downloadAsync();
  const csv = await FileSystem.readAsStringAsync(asset.localUri!);
  const { data } = Papa.parse<{
    word: string;
    cefr_level: string;
    wordpl: string;
  }>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  const langMap = await seedLanguages(db);

  await db.execAsync("BEGIN TRANSACTION;");
  try {
    for (const row of data) {
      if (!row.word || !row.wordpl) continue;

      await db.runAsync(
        `INSERT OR IGNORE INTO words (language_id, text, cefr_level) VALUES (?, ?, ?);`,
        langMap.en,
        row.word,
        row.cefr_level
      );

      const enRow = await db.getFirstAsync<{ id: number }>(
        `SELECT id FROM words WHERE language_id = ? AND text = ?;`,
        langMap.en,
        row.word
      );

      if (!enRow) throw new Error(`Brak wpisu EN: ${row.word}`);
      const srcId = enRow.id;

      for (const plw of row.wordpl.split(/\s*,\s*/)) {
        const plRow = await db.getFirstAsync<{ id: number }>(
          `SELECT id FROM words WHERE language_id = ? AND text = ?;`,
          langMap.pl,
          plw
        );
        const targetId = plRow ? plRow.id : null;

        await db.runAsync(
          `INSERT OR IGNORE INTO translations (source_word_id, target_language_id, translation_text, target_word_id) VALUES (?, ?, ?, ?);`,
          srcId,
          langMap.pl,
          plw,
          targetId
        );
      }
    }

    await db.runAsync(
      `INSERT OR IGNORE INTO language_pairs (source_language_id, target_language_id) VALUES (?, ?);`,
      langMap.en,
      langMap.pl
    );

    await db.execAsync("COMMIT;");
    console.log("Import CSV zakończony ✔️");
  } catch (e) {
    await db.execAsync("ROLLBACK;");
    console.error("Błąd podczas importu, wycofuję zmiany:", e);
    throw e;
  }
}

async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  notifyDbInitializationListeners({ type: "start" });
  const db = await openDatabase();
  console.log("[DB] initializeDatabase: openDatabase done");
  await applySchema(db);
  console.log("[DB] initializeDatabase: applySchema done");
  await configurePragmas(db);
  console.log("[DB] initializeDatabase: configurePragmas done");

  const countRow = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM words WHERE language_id = (SELECT id FROM languages WHERE code = 'en');`
  );

  const requiresInitialImport = (countRow?.cnt ?? 0) === 0;

  if (!requiresInitialImport) {
    console.log("DB już załadowana → pomijam import");
  } else {
    notifyDbInitializationListeners({ type: "import-start" });
    try {
      await importInitialCsv(db);
      notifyDbInitializationListeners({ type: "import-finish" });
    } catch (error) {
      notifyDbInitializationListeners({ type: "error", error });
      throw error;
    }
  }

  try {
    await seedOfficialPacksWithDb(db);
  } catch (e) {
    console.warn(
      "[DB] Seeding official packs failed" +
        (requiresInitialImport ? " after initial import" : ""),
      e
    );
  }
  notifyDbInitializationListeners({
    type: "ready",
    initialImport: requiresInitialImport,
  });
  return db;
}

export function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInitializationPromise) {
    dbInitializationPromise = initializeDatabase();
  }
  return dbInitializationPromise;
}

export async function getRandomEnglishWord(): Promise<string | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ text: string }>(
    `SELECT text FROM words WHERE language_id = (SELECT id FROM languages WHERE code = 'en') ORDER BY RANDOM() LIMIT 1;`
  );
  return row?.text ?? null;
}

export async function logTableContents() {
  const db = await getDB();
  const languages = await db.getAllAsync("SELECT * FROM languages");
  console.log("Languages:");
  console.table(languages);
  const words = await db.getAllAsync(
    "SELECT * FROM words ORDER BY RANDOM() LIMIT 10"
  );
  console.log("Random 10 words:");
  console.table(words);
  const translations = await db.getAllAsync(
    "SELECT * FROM translations ORDER BY RANDOM() LIMIT 10"
  );
  console.log("Random 10 translations:");
  console.table(translations);
  const languagePairs = await db.getAllAsync("SELECT * FROM language_pairs");
  console.log("Language pairs:");
  console.table(languagePairs);
  const customCourses = await db.getAllAsync(
    "SELECT * FROM custom_courses ORDER BY id DESC LIMIT 5"
  );
  console.log("Custom courses (latest 5):");
  console.table(customCourses);
  const customFlashcards = await db.getAllAsync(
    "SELECT * FROM custom_flashcards ORDER BY id DESC LIMIT 5"
  );
  console.log("Custom flashcards (latest 5):");
  console.table(customFlashcards);
}


async function readCsvAsset(assetModule: any): Promise<
  { frontText: string; backText: string; answers: string[]; position: number }[]
> {
  console.log("[DB] readCsvAsset: create asset from module");
  const asset = Asset.fromModule(assetModule);
  console.log("[DB] readCsvAsset: start download", asset);
  await asset.downloadAsync();
  console.log("[DB] readCsvAsset: downloaded");
  const uri = asset.localUri ?? asset.uri;
  console.log("[DB] readCsvAsset: uri=", uri);
  const csv = await FileSystem.readAsStringAsync(uri);
  console.log("[DB] readCsvAsset: file read, length=", csv?.length ?? 0);
  console.log("[DB] readCsvAsset: start parse");
  const { data } = Papa.parse<{ front?: string; back?: string }>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  console.log("[DB] readCsvAsset: parsed rows=", data?.length ?? 0);
  const cards = data
    .map((row, idx) => {
      const front = (row.front ?? "").trim();
      const backRaw = (row.back ?? "").trim();
      const answers = splitBackTextIntoAnswers(backRaw);
      return {
        frontText: front,
        backText: backRaw,
        answers,
        position: idx,
      };
    })
    .filter((c) => c.frontText.length > 0 || c.answers.length > 0);
  return cards;
}

async function ensureOfficialCourse(
  db: SQLite.SQLiteDatabase,
  slug: string,
  name: string,
  iconId: string,
  iconColor: string,
  reviewsEnabled: boolean
): Promise<number> {
  console.log("[DB] ensureOfficialCourse: start", slug);
  const existing = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM custom_courses WHERE slug = ? LIMIT 1;`,
    slug
  );
  const now = Date.now();
  if (existing?.id) {
    console.log("[DB] ensureOfficialCourse: update existing", existing.id);
    await db.runAsync(
      `UPDATE custom_courses
       SET name = ?, icon_id = ?, icon_color = ?, reviews_enabled = ?, is_official = 1, updated_at = ?
       WHERE id = ?;`,
      name,
      iconId,
      iconColor,
      reviewsEnabled ? 1 : 0,
      now,
      existing.id
    );
    return existing.id;
  }
  console.log("[DB] ensureOfficialCourse: insert new", slug);
  const result = await db.runAsync(
    `INSERT INTO custom_courses
       (name, icon_id, icon_color, color_id, reviews_enabled, created_at, updated_at, is_official, slug)
     VALUES (?, ?, ?, NULL, ?, ?, ?, 1, ?);`,
    name,
    iconId,
    iconColor,
    reviewsEnabled ? 1 : 0,
    now,
    now,
    slug
  );
  console.log("[DB] ensureOfficialCourse: inserted id=", Number(result.lastInsertRowId ?? 0));
  return Number(result.lastInsertRowId ?? 0);
}

async function importOfficialPackIfEmpty(
  db: SQLite.SQLiteDatabase,
  courseId: number,
  assetModule: any
) {
  console.log("[DB] importOfficialPackIfEmpty: check courseId=", courseId);
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM custom_flashcards WHERE course_id = ?;`,
    courseId
  );
  const count = row?.cnt ?? 0;
  console.log("[DB] importOfficialPackIfEmpty: existing count=", count);
  if (count > 0) {
    console.log("[DB] importOfficialPackIfEmpty: skipping import (already has cards)");
    return;
  }
  console.log("[DB] importOfficialPackIfEmpty: reading asset");
  const cards = await readCsvAsset(assetModule);
  console.log("[DB] importOfficialPackIfEmpty: cards prepared=", cards.length);
  if (cards.length === 0) return;
  console.log("[DB] importOfficialPackIfEmpty: replacing flashcards");
  await replaceCustomFlashcardsWithDb(db, courseId, cards);
  console.log("[DB] importOfficialPackIfEmpty: replaced flashcards");
}

export async function seedOfficialPacksWithDb(
  db: SQLite.SQLiteDatabase
): Promise<void> {
  console.log("[DB] Seeding official packs: start");
  for (const def of OFFICIAL_PACKS) {
    try {
      console.log(`[DB] Seeding pack: ${def.slug}`);
      const id = await ensureOfficialCourse(
        db,
        def.slug,
        def.name,
        def.iconId,
        def.iconColor,
        def.reviewsEnabled ?? true
      );
      await importOfficialPackIfEmpty(db, id, def.csvAsset);
    } catch (e) {
      console.warn(`[DB] Failed to seed official pack ${def.slug}`, e);
    }
  }
  console.log("[DB] Seeding official packs: done");
}

export async function seedOfficialPacks(): Promise<void> {
  const db = await getDB();
  return seedOfficialPacksWithDb(db);
}

export async function getOfficialCustomCoursesWithCardCounts(): Promise<CustomCourseSummary[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<CustomCourseSummarySqlRow>(
    `SELECT
       cp.id,
       cp.name,
       cp.icon_id     AS iconId,
       cp.icon_color  AS iconColor,
       cp.color_id    AS colorId,
       COALESCE(cp.reviews_enabled, 0) AS reviewsEnabled,
       cp.created_at  AS createdAt,
       cp.updated_at  AS updatedAt,
       COALESCE(cp.is_official, 0) AS isOfficial,
       cp.slug AS slug,
       (
         SELECT COUNT(*) FROM custom_flashcards cf WHERE cf.course_id = cp.id
       ) AS cardsCount
     FROM custom_courses cp
     WHERE COALESCE(cp.is_official, 0) = 1
     ORDER BY cp.created_at DESC, cp.id DESC;`
  );
  return rows.map(mapCustomCourseSummaryRow);
}


export async function getLanguagePairs(): Promise<LanguagePair[]> {
  const db = await getDB();
  return db.getAllAsync<LanguagePair>(`
    SELECT 
      lp.rowid AS id,
      s.code   AS source_code,
      t.code   AS target_code,
      s.id     AS source_id,   -- NEW
      t.id     AS target_id    -- NEW
    FROM language_pairs lp
    JOIN languages s ON lp.source_language_id = s.id
    JOIN languages t ON lp.target_language_id = t.id;
  `);
}


export async function getLanguageIdByCode(code: string) {
  const db = await getDB();
  const row = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM languages WHERE code = ? LIMIT 1",
    code
  );
  return row?.id ?? null;
}

export async function getTotalWordsForLevel(
  languageId: number,
  level: string
): Promise<number> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) AS cnt FROM words WHERE language_id = ? AND cefr_level = ?",
    languageId,
    level
  );
  return row?.cnt ?? 0;
}

// Review helpers

function computeNextReviewFromStage(stage: number, nowMs: number): number {
  const idx = Math.max(0, Math.min(stage, REVIEW_INTERVALS_MS.length - 1));
  return nowMs + REVIEW_INTERVALS_MS[idx];
}

function createEmptyLevelCounts(): Record<CEFRLevel, number> {
  return {
    A1: 0,
    A2: 0,
    B1: 0,
    B2: 0,
    C1: 0,
    C2: 0,
  };
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

// --- Analytics helpers ------------------------------------------------------

export async function logLearningEvent(params: {
  wordId: number;
  sourceLangId?: number | null;
  targetLangId?: number | null;
  level?: string | null;
  box?: string | null; // boxOne..boxFive
  result: 'ok' | 'wrong';
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
  result: 'ok' | 'wrong';
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

export async function countCustomFlashcardsForCourse(courseId: number): Promise<number> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM custom_flashcards WHERE course_id = ?;`,
    courseId
  );
  return row?.cnt ?? 0;
}

export async function countCustomLearnedForCourse(courseId: number): Promise<number> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM custom_reviews WHERE course_id = ?;`,
    courseId
  );
  return row?.cnt ?? 0;
}

export type DailyCount = { date: string; count: number };

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

export type StubbornWord = {
  id: number;
  text: string;
  moveCount: number;
  lastFromBox: string | null;
  lastToBox: string | null;
  lastMovedAt: number | null;
};

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

export type HardWord = { id: number; text: string; wrongCount: number };

export async function getHardWords(
  sourceLangId: number,
  targetLangId: number,
  limit: number = 10
): Promise<HardWord[]> {
  const db = await getDB();
  // Count wrong answers for a word before it was learned (first occurrence in reviews)
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
  return rows.map((r) => ({ id: r.id, text: r.text, wrongCount: r.wrongCount | 0 }));
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

// Removes a review entry for a given word and language pair
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
    // Ensure only valid CEFR keys are assigned
    if (r.level in counts) counts[r.level as CEFRLevel] = r.cnt | 0;
  }
  return counts;
}

export async function countTotalDueReviews(
  sourceLangId: number,
  targetLangId: number,
  nowMs: number
): Promise<number> {
  const counts = await countDueReviewsByLevel(sourceLangId, targetLangId, nowMs);
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

// Returns a random due review word (for given pair and CEFR level)
// with its target-language translations.
export async function getRandomDueReviewWord(
  sourceLangId: number,
  targetLangId: number,
  level: CEFRLevel,
  nowMs: number = Date.now()
): Promise<WordWithTranslations | null> {
  const db = await getDB();

  // Pick one due review at random for the selected level
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

export async function getRandomTranslationsForLevel(
  sourceLangId: number,
  targetLangId: number,
  level: CEFRLevel,
  limit: number,
  excludeWordIds: number[] = []
): Promise<string[]> {
  if (limit <= 0) {
    return [];
  }

  const db = await getDB();
  const excludeClause =
    excludeWordIds.length > 0
      ? `AND w.id NOT IN (${excludeWordIds.map(() => "?").join(",")})`
      : "";

  const query = `SELECT t.translation_text
     FROM words w
     JOIN translations t ON t.source_word_id = w.id
     WHERE w.language_id = ?
       AND w.cefr_level = ?
       AND t.target_language_id = ?
       ${excludeClause}
     ORDER BY RANDOM()
     LIMIT ?;`;

  const params: (number | string)[] = [
    sourceLangId,
    level,
    targetLangId,
    ...excludeWordIds,
    limit,
  ];

  const rows = await db.getAllAsync<{ translation_text: string }>(
    query,
    ...params
  );

  return rows
    .map((row) => row.translation_text?.trim() ?? "")
    .filter((value) => value.length > 0);
}

// Debug helper: adds random words as due reviews for a given pair/level
export async function addRandomReviewsForPair(
  sourceLangId: number,
  targetLangId: number,
  level: CEFRLevel,
  count: number = 10
): Promise<number> {
  const db = await getDB();
  // Pick random words matching level with at least one translation to target language
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
