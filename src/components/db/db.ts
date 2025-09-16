// src/components/db/db.ts

import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";
import Papa from "papaparse";

export type LanguagePair = {
  id: number;
  source_code: string;
  target_code: string;
  source_id: number;   // NEW
  target_id: number;   // NEW
};

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
}

async function configurePragmas(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = 10000;
    PRAGMA page_size = 4096;
  `);
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
    require("../../../assets/data/wordsENGtoPL.csv")
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
  const base: Record<CEFRLevel, number> = {
    A1: 0,
    A2: 0,
    B1: 0,
    B2: 0,
    C1: 0,
    C2: 0,
  };
  for (const r of rows) {
    // Ensure only valid CEFR keys are assigned
    if (r.level in base) base[r.level as CEFRLevel] = r.cnt | 0;
  }
  return base;
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
