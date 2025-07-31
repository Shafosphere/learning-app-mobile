// src/components/db/db.ts

import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";
import Papa from "papaparse";

const db = SQLite.openDatabaseAsync("mygame.db");

// Zwraca globalną instancję bazy danych
export async function getDB() {
  return db;
}

export async function initDB() {
  const database = await getDB();

  // 1) Otwórz połączenie - NIEPOTRZEBNE, JUŻ MAMY
  // const db = await SQLite.openDatabaseAsync("mygame.db");

  // 2) Utwórz tabele zgodnie z projektem
  await database.execAsync(`
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
    -- Indeksy dla szybkich zapytań
    CREATE INDEX IF NOT EXISTS idx_words_lang_cefr ON words(language_id, cefr_level);
    CREATE INDEX IF NOT EXISTS idx_trans_src_tgtlang ON translations(source_word_id, target_language_id);
  `);

  // 3) Ustawienia PRAGMA dla wydajności
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = 10000;
    PRAGMA page_size = 4096;
  `);

  // 4) Sprawdź, czy trzeba importować
  const countRow = await database.getFirstAsync<{ cnt: number }>(`
    SELECT COUNT(*) AS cnt
      FROM words
     WHERE language_id = (
       SELECT id FROM languages WHERE code = 'en'
     );
  `);
  const cnt = countRow?.cnt ?? 0;
  if (cnt > 0) {
    console.log("DB już załadowana → pomijam import");
    return;
  }

  // 5) Parsuj CSV
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

  // 6) Wstaw języki i pobierz ich ID
  await database.runAsync(
    `INSERT OR IGNORE INTO languages (code,name) VALUES ('en','English'),('pl','Polski');`
  );
  const langs = await database.getAllAsync<{ id: number; code: string }>(
    `SELECT id, code FROM languages WHERE code IN (?,?);`,
    "en",
    "pl"
  );
  const langMap: Record<string, number> = {};
  langs.forEach((l) => {
    langMap[l.code] = l.id;
  });

  // 7) Import danych wewnątrz transakcji
  await database.execAsync("BEGIN TRANSACTION;");
  try {
    for (const row of data) {
      if (!row.word || !row.wordpl) continue;

      // 7a) Wstaw / pobierz słowo angielskie
      await database.runAsync(
        `INSERT OR IGNORE INTO words (language_id, text, cefr_level) VALUES (?, ?, ?);`,
        langMap.en,
        row.word,
        row.cefr_level
      );
      const enRow = await database.getFirstAsync<{ id: number }>(
        `SELECT id FROM words WHERE language_id = ? AND text = ?;`,
        langMap.en,
        row.word
      );
      if (!enRow) throw new Error(`Brak wpisu EN: ${row.word}`);
      const srcId = enRow.id;

      // 7b) Tłumaczenia: wstaw do translations z translation_text
      for (const plw of row.wordpl.split(/\s*,\s*/)) {
        // Sprawdź, czy tłumaczenie istnieje w words (opcjonalne)
        const plRow = await database.getFirstAsync<{ id: number }>(
          `SELECT id FROM words WHERE language_id = ? AND text = ?;`,
          langMap.pl,
          plw
        );
        const targetId = plRow ? plRow.id : null;

        // Wstaw do translations
        await database.runAsync(
          `INSERT OR IGNORE INTO translations (source_word_id, target_language_id, translation_text, target_word_id) 
           VALUES (?, ?, ?, ?);`,
          srcId,
          langMap.pl,
          plw,
          targetId
        );
      }
    }

    // 7c) Wstaw do language_pairs (en -> pl)
    await database.runAsync(
      `INSERT OR IGNORE INTO language_pairs (source_language_id, target_language_id) VALUES (?, ?);`,
      langMap.en,
      langMap.pl
    );

    await database.execAsync("COMMIT;");
    console.log("Import CSV zakończony ✔️");
  } catch (e) {
    await database.execAsync("ROLLBACK;");
    console.error("Błąd podczas importu, wycofuję zmiany:", e);
  }
}

// Pozostałe funkcje również powinny używać globalnej instancji

// Zwraca losowe słowo angielskie
export async function getRandomEnglishWord(): Promise<string | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ text: string }>(
    `SELECT text 
       FROM words 
      WHERE language_id = (
        SELECT id FROM languages WHERE code = 'en'
      )
   ORDER BY RANDOM()
      LIMIT 1;`
  );
  return row?.text ?? null;
}

// Wyświetla zawartość tabel
export async function logTableContents() {
  const db = await getDB();

  // Languages
  const languages = await db.getAllAsync("SELECT * FROM languages");
  console.log("Languages:");
  console.table(languages);

  // Random 10 words
  const words = await db.getAllAsync(
    "SELECT * FROM words ORDER BY RANDOM() LIMIT 10"
  );
  console.log("Random 10 words:");
  console.table(words);

  // Random 10 translations
  const translations = await db.getAllAsync(
    "SELECT * FROM translations ORDER BY RANDOM() LIMIT 10"
  );
  console.log("Random 10 translations:");
  console.table(translations);

  // Language pairs
  const languagePairs = await db.getAllAsync("SELECT * FROM language_pairs");
  console.log("Language pairs:");
  console.table(languagePairs);
}
