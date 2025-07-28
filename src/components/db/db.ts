// src/db.ts
import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";
import Papa from "papaparse";

export async function initDB() {
  // 1) Otwórz połączenie
  const db = await SQLite.openDatabaseAsync("mygame.db");

  // 2) Utwórz tabele
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS languages (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT    NOT NULL UNIQUE,
      name TEXT    NOT NULL
    );
    CREATE TABLE IF NOT EXISTS words (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      language_id INTEGER NOT NULL,
      text        TEXT    NOT NULL,
      cefr_level  TEXT    NOT NULL
    );
    CREATE TABLE IF NOT EXISTS translations (
      source_word_id INTEGER NOT NULL,
      target_word_id INTEGER NOT NULL,
      PRIMARY KEY(source_word_id, target_word_id)
    );
  `);

  // 3) Sprawdź, czy trzeba importować
  const countRow = await db.getFirstAsync<{ cnt: number }>(`
    SELECT COUNT(*) AS cnt
      FROM words
     WHERE language_id = (
       SELECT id FROM languages WHERE code = 'en'
     );
  `);
  // jeśli brak wiersza albo cnt===0 → import, w przeciwnym razie pomiń
  const cnt = countRow?.cnt ?? 0;
  if (cnt > 0) {
    console.log("DB już załadowana → pomijam import");
    return;
  }

  // 4) Parsuj CSV
  const asset = Asset.fromModule(require("../../../assets/data/wordsENGtoPL.csv"));
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

  // 5) Wstaw języki i pobierz ich ID
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

  // 6) Import danych wewnątrz transakcji
  await db.execAsync("BEGIN TRANSACTION;");
  try {
    for (const row of data) {
      if (!row.word || !row.wordpl) continue;

      // 6a) Wstaw / pobierz słowo angielskie
      await db.runAsync(
        `INSERT OR IGNORE INTO words (language_id,text,cefr_level) VALUES (?,?,?);`,
        langMap.en,
        row.word,
        row.cefr_level
      );
      const enRow = await db.getFirstAsync<{ id: number }>(
        `SELECT id FROM words WHERE language_id=? AND text=?;`,
        langMap.en,
        row.word
      );
      if (!enRow) throw new Error(`Brak wpisu EN: ${row.word}`);
      const srcId = enRow.id;

      // 6b) Tłumaczenia: wstaw / pobierz polskie słowo i powiąż
      for (const plw of row.wordpl.split(/\s*,\s*/)) {
        await db.runAsync(
          `INSERT OR IGNORE INTO words (language_id,text,cefr_level) VALUES (?,?,?);`,
          langMap.pl,
          plw,
          row.cefr_level
        );
        const plRow = await db.getFirstAsync<{ id: number }>(
          `SELECT id FROM words WHERE language_id=? AND text=?;`,
          langMap.pl,
          plw
        );
        if (!plRow) throw new Error(`Brak wpisu PL: ${plw}`);
        const targetId = plRow.id;

        await db.runAsync(
          `INSERT OR IGNORE INTO translations (source_word_id,target_word_id) VALUES (?,?);`,
          srcId,
          targetId
        );
      }
    }

    await db.execAsync("COMMIT;");
    console.log("Import CSV zakończony ✔️");
  } catch (e) {
    await db.execAsync("ROLLBACK;");
    console.error("Błąd podczas importu, wycofuję zmiany:", e);
  }
}

// helper otwierający DB
async function openDB() {
  return await SQLite.openDatabaseAsync('mygame.db');
}

// zwraca losowe słowo angielskie
export async function getRandomEnglishWord(): Promise<string|null> {
  const db = await openDB();
  const row = await db.getFirstAsync<{ text: string }>(
    `SELECT text 
       FROM words 
      WHERE language_id = (
        SELECT id FROM languages WHERE code='en'
      )
   ORDER BY RANDOM()
      LIMIT 1;`
  );
  return row?.text ?? null;
}