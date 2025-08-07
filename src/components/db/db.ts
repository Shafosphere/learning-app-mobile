// src/components/db/db.ts

import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";
import Papa from "papaparse";

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

export async function getLanguagePairs() {
  const db = await getDB();
  return db.getAllAsync<{
    id: number;
    source_code: string;
    target_code: string;
  }>(
    `SELECT lp.rowid AS id, s.code AS source_code, t.code AS target_code
     FROM language_pairs lp
     JOIN languages s ON lp.source_language_id = s.id
     JOIN languages t ON lp.target_language_id = t.id;`
  );
}
