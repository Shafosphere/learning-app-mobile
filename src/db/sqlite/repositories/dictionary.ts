import type { CEFRLevel } from "@/src/types/language";
import * as SQLite from "expo-sqlite";
import { getDB } from "../core";

export type LanguagePair = {
  id: number;
  source_code: string;
  target_code: string;
  source_id: number;
  target_id: number;
};

export async function seedLanguages(
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

export async function getLanguagePairs(): Promise<LanguagePair[]> {
  const db = await getDB();
  return db.getAllAsync<LanguagePair>(`
    SELECT 
      lp.rowid AS id,
      s.code   AS source_code,
      t.code   AS target_code,
      s.id     AS source_id,
      t.id     AS target_id
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

export async function getRandomEnglishWord(): Promise<string | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ text: string }>(
    `SELECT text FROM words WHERE language_id = (SELECT id FROM languages WHERE code = 'en') ORDER BY RANDOM() LIMIT 1;`
  );
  return row?.text ?? null;
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
