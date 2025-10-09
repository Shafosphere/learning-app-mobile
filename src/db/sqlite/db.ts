// sqlite helpers and persistence primitives

import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy";
import { Asset } from "expo-asset";
import Papa from "papaparse";

export type LanguagePair = {
  id: number;
  source_code: string;
  target_code: string;
  source_id: number;   // NEW
  target_id: number;   // NEW
};

export interface CustomProfileRecord {
  id: number;
  name: string;
  iconId: string;
  iconColor: string;
  colorId: string | null;
  reviewsEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CustomProfileInput {
  name: string;
  iconId: string;
  iconColor: string;
  colorId?: string | null;
  reviewsEnabled?: boolean;
}

export interface CustomProfileSummary extends CustomProfileRecord {
  cardsCount: number;
}

export interface CustomFlashcardRecord {
  id: number;
  profileId: number;
  frontText: string;
  backText: string;
  answers: string[];
  position: number | null;
  createdAt: number;
  updatedAt: number;
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
}

type CustomProfileSqlRow = {
  id: number;
  name: string;
  iconId: string;
  iconColor: string;
  colorId: string | null;
  reviewsEnabled: number;
  createdAt: number;
  updatedAt: number;
};

type CustomProfileSummarySqlRow = CustomProfileSqlRow & {
  cardsCount: number;
};

type TableColumnInfo = {
  name: string;
};

function mapCustomProfileRow(row: CustomProfileSqlRow): CustomProfileRecord {
  return {
    ...row,
    reviewsEnabled: row.reviewsEnabled === 1,
  };
}

function mapCustomProfileSummaryRow(
  row: CustomProfileSummarySqlRow
): CustomProfileSummary {
  const { cardsCount, ...rest } = row;
  const base = mapCustomProfileRow(rest as CustomProfileSqlRow);
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
  rawAnswers: Array<string | null | undefined> | undefined
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
    CREATE TABLE IF NOT EXISTS custom_profiles (
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
      profile_id  INTEGER NOT NULL REFERENCES custom_profiles(id) ON DELETE CASCADE,
      front_text  TEXT    NOT NULL,
      back_text   TEXT    NOT NULL,
      position    INTEGER,
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
    CREATE INDEX IF NOT EXISTS idx_custom_flashcards_profile ON custom_flashcards(profile_id, position);
    CREATE TABLE IF NOT EXISTS custom_reviews (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id     INTEGER NOT NULL REFERENCES custom_profiles(id) ON DELETE CASCADE,
      flashcard_id   INTEGER NOT NULL REFERENCES custom_flashcards(id) ON DELETE CASCADE,
      learned_at     INTEGER NOT NULL,
      next_review    INTEGER NOT NULL,
      stage          INTEGER NOT NULL DEFAULT 0,
      UNIQUE(flashcard_id)
    );
    CREATE INDEX IF NOT EXISTS idx_custom_reviews_profile ON custom_reviews(profile_id);
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
  `);

  await ensureColumn(
    db,
    "custom_profiles",
    "reviews_enabled",
    "INTEGER NOT NULL DEFAULT 0"
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

export async function getCustomProfiles(): Promise<CustomProfileRecord[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<CustomProfileSqlRow>(
    `SELECT
       id,
       name,
       icon_id     AS iconId,
       icon_color  AS iconColor,
       color_id    AS colorId,
       COALESCE(reviews_enabled, 0) AS reviewsEnabled,
       created_at  AS createdAt,
       updated_at  AS updatedAt
     FROM custom_profiles
     ORDER BY created_at DESC, id DESC;`
  );
  return rows.map(mapCustomProfileRow);
}

export async function getCustomProfilesWithCardCounts(): Promise<CustomProfileSummary[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<CustomProfileSummarySqlRow>(
    `SELECT
       cp.id,
       cp.name,
       cp.icon_id     AS iconId,
       cp.icon_color  AS iconColor,
       cp.color_id    AS colorId,
       COALESCE(cp.reviews_enabled, 0) AS reviewsEnabled,
       cp.created_at  AS createdAt,
       cp.updated_at  AS updatedAt,
       (
         SELECT COUNT(*)
         FROM custom_flashcards cf
         WHERE cf.profile_id = cp.id
       ) AS cardsCount
     FROM custom_profiles cp
     ORDER BY cp.created_at DESC, cp.id DESC;`
  );
  return rows.map(mapCustomProfileSummaryRow);
}

export async function getCustomProfileById(
  id: number
): Promise<CustomProfileRecord | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<CustomProfileSqlRow>(
    `SELECT
       id,
       name,
       icon_id     AS iconId,
       icon_color  AS iconColor,
       color_id    AS colorId,
       COALESCE(reviews_enabled, 0) AS reviewsEnabled,
       created_at  AS createdAt,
       updated_at  AS updatedAt
     FROM custom_profiles
     WHERE id = ?
     LIMIT 1;`,
    id
  );
  return row ? mapCustomProfileRow(row) : null;
}

export async function createCustomProfile(
  profile: CustomProfileInput
): Promise<number> {
  const db = await getDB();
  const now = Date.now();
  const name = profile.name.trim();
  if (!name) {
    throw new Error("Custom profile name cannot be empty");
  }
  const reviewsEnabled = profile.reviewsEnabled === true ? 1 : 0;
  const result = await db.runAsync(
    `INSERT INTO custom_profiles (name, icon_id, icon_color, color_id, reviews_enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    name,
    profile.iconId,
    profile.iconColor,
    profile.colorId ?? null,
    reviewsEnabled,
    now,
    now
  );
  return Number(result.lastInsertRowId ?? 0);
}

export async function updateCustomProfile(
  id: number,
  profile: CustomProfileInput
): Promise<void> {
  const db = await getDB();
  const now = Date.now();
  const name = profile.name.trim();
  if (!name) {
    throw new Error("Custom profile name cannot be empty");
  }
  const reviewsEnabled = profile.reviewsEnabled === true ? 1 : 0;
  await db.runAsync(
    `UPDATE custom_profiles
     SET name = ?, icon_id = ?, icon_color = ?, color_id = ?, reviews_enabled = ?, updated_at = ?
     WHERE id = ?;`,
    name,
    profile.iconId,
    profile.iconColor,
    profile.colorId ?? null,
    reviewsEnabled,
    now,
    id
  );
}

export async function deleteCustomProfile(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM custom_profiles WHERE id = ?;`, id);
}

export async function getCustomFlashcards(
  profileId: number
): Promise<CustomFlashcardRecord[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<{
    id: number;
    profileId: number;
    frontText: string;
    backText: string;
    position: number | null;
    createdAt: number;
    updatedAt: number;
    answerText: string | null;
  }>(
    `SELECT
       cf.id             AS id,
       cf.profile_id     AS profileId,
       cf.front_text     AS frontText,
       cf.back_text      AS backText,
       cf.position       AS position,
       cf.created_at     AS createdAt,
       cf.updated_at     AS updatedAt,
       cfa.answer_text   AS answerText
     FROM custom_flashcards cf
     LEFT JOIN custom_flashcard_answers cfa ON cfa.flashcard_id = cf.id
     WHERE cf.profile_id = ?
     ORDER BY cf.position IS NULL,
              cf.position ASC,
              cf.id ASC,
              cfa.id ASC;`,
    profileId
  );

  const byId = new Map<number, CustomFlashcardRecord>();
  const ordered: CustomFlashcardRecord[] = [];

  for (const row of rows) {
    let record = byId.get(row.id);
    if (!record) {
      record = {
        id: row.id,
        profileId: row.profileId,
        frontText: row.frontText,
        backText: row.backText,
        answers: [],
        position: row.position,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
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

export async function replaceCustomFlashcards(
  profileId: number,
  cards: CustomFlashcardInput[]
): Promise<void> {
  const db = await getDB();
  await db.execAsync("BEGIN TRANSACTION;");
  const now = Date.now();
  try {
    await db.runAsync(
      `DELETE FROM custom_flashcards WHERE profile_id = ?;`,
      profileId
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
           (profile_id, front_text, back_text, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        profileId,
        front,
        serializedBackText,
        position,
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
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    throw error;
  }
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

  const asset = Asset.fromModule(
    require("@/assets/data/wordsENGtoPL.csv")
  );
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
  const db = await openDatabase();
  await applySchema(db);
  await configurePragmas(db);

  const countRow = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM words WHERE language_id = (SELECT id FROM languages WHERE code = 'en');`
  );

  if ((countRow?.cnt ?? 0) > 0) {
    console.log("DB już załadowana → pomijam import");
    return db;
  }

  await importInitialCsv(db);
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
  const customProfiles = await db.getAllAsync(
    "SELECT * FROM custom_profiles ORDER BY id DESC LIMIT 5"
  );
  console.log("Custom profiles (latest 5):");
  console.table(customProfiles);
  const customFlashcards = await db.getAllAsync(
    "SELECT * FROM custom_flashcards ORDER BY id DESC LIMIT 5"
  );
  console.log("Custom flashcards (latest 5):");
  console.table(customFlashcards);
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
import { REVIEW_INTERVALS_MS } from "@/src/config/appConfig";
import type { CEFRLevel } from "@/src/types/language";
import type { WordWithTranslations } from "@/src/types/boxes";

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

export async function scheduleCustomReview(
  flashcardId: number,
  profileId: number,
  stage: number
) {
  const db = await getDB();
  const now = Date.now();
  const nextReview = computeNextReviewFromStage(stage, now);
  await db.runAsync(
    `INSERT INTO custom_reviews (flashcard_id, profile_id, learned_at, next_review, stage)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(flashcard_id) DO UPDATE SET
       profile_id = excluded.profile_id,
       next_review = excluded.next_review,
       stage = excluded.stage,
       learned_at = CASE WHEN custom_reviews.learned_at IS NULL THEN excluded.learned_at ELSE custom_reviews.learned_at END;`,
    flashcardId,
    profileId,
    now,
    nextReview,
    stage
  );
  return { nextReview, stage };
}

export async function advanceCustomReview(
  flashcardId: number,
  profileId: number
) {
  const db = await getDB();
  const row = await db.getFirstAsync<{ stage: number }>(
    `SELECT stage FROM custom_reviews WHERE flashcard_id = ? AND profile_id = ? LIMIT 1;`,
    flashcardId,
    profileId
  );
  if (!row) {
    return scheduleCustomReview(flashcardId, profileId, 0);
  }
  const newStage = ((row.stage ?? 0) + 1) | 0;
  const now = Date.now();
  const nextReview = computeNextReviewFromStage(newStage, now);
  await db.runAsync(
    `UPDATE custom_reviews SET stage = ?, next_review = ? WHERE flashcard_id = ? AND profile_id = ?;`,
    newStage,
    nextReview,
    flashcardId,
    profileId
  );
  return { nextReview, stage: newStage };
}

export async function removeCustomReview(
  flashcardId: number,
  profileId: number
): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `DELETE FROM custom_reviews WHERE flashcard_id = ? AND profile_id = ?;`,
    flashcardId,
    profileId
  );
}

export async function clearCustomReviewsForProfile(
  profileId: number
): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `DELETE FROM custom_reviews WHERE profile_id = ?;`,
    profileId
  );
}

export async function countDueCustomReviews(
  profileId: number,
  nowMs: number = Date.now()
): Promise<number> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM custom_reviews WHERE profile_id = ? AND next_review <= ?;`,
    profileId,
    nowMs
  );
  return row?.cnt ?? 0;
}

export async function getDueCustomReviewFlashcards(
  profileId: number,
  limit: number,
  nowMs: number = Date.now()
): Promise<CustomReviewFlashcard[]> {
  if (!profileId || limit <= 0) {
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
     WHERE cr.profile_id = ?
       AND cr.next_review <= ?
     ORDER BY RANDOM()
     LIMIT ?;`,
    profileId,
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
    profileId: number;
    frontText: string;
    backText: string;
    position: number | null;
    createdAt: number;
    updatedAt: number;
    answerText: string | null;
  }>(
    `SELECT
       cf.id            AS id,
       cf.profile_id    AS profileId,
       cf.front_text    AS frontText,
       cf.back_text     AS backText,
       cf.position      AS position,
       cf.created_at    AS createdAt,
       cf.updated_at    AS updatedAt,
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
        profileId: row.profileId,
        frontText: row.frontText,
        backText: row.backText,
        answers: [],
        position: row.position,
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
  }));
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
  profileId: number,
  count: number = 10
): Promise<number> {
  if (!profileId || count <= 0) {
    return 0;
  }
  const db = await getDB();
  const rows = await db.getAllAsync<{ id: number }>(
    `SELECT cf.id
     FROM custom_flashcards cf
     LEFT JOIN custom_reviews cr ON cr.flashcard_id = cf.id
     WHERE cf.profile_id = ?
       AND cr.id IS NULL
     ORDER BY RANDOM()
     LIMIT ?;`,
    profileId,
    count
  );
  for (const row of rows) {
    await scheduleCustomReview(row.id, profileId, 0);
  }
  return rows.length;
}
