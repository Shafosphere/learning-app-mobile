// src/components/db/dbGenerator.ts

import { getDB } from "./db"; // WAŻNE: Importuj getDB
import * as SQLite from "expo-sqlite";

// ... interfejsy zostają bez zmian ...

export interface PatchGenParams {
  srcCode: string;
  tgtCode: string;
  dbName?: string;
  batchSize?: number;
  levels?: readonly ["A1" | "A2" | "B1" | "B2" | "C1" | "C2", ...string[]];
}

export interface GetWordsFromPatchParams {
  sourceLangId: number;
  targetLangId: number;
  cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  batchIndex: number;
  dbName?: string;
}

export interface WordWithTranslations {
  id: number;
  text: string;
  translations: string[];
}

type SQLParams = (string | number | null)[];

export async function regeneratePatches({
  srcCode,
  tgtCode,
  batchSize = 30,
  levels = ["A1", "A2", "B1", "B2", "C1", "C2"],
}: PatchGenParams): Promise<void> {
  const db = await getDB();

  const selectAll = async <T>(
    sql: string,
    params: SQLParams = []
  ): Promise<T[]> => {
    return db.getAllAsync<T>(sql, params);
  };

  const run = async (sql: string, params: SQLParams = []): Promise<number> => {
    const { lastInsertRowId } = await db.runAsync(sql, params);
    return lastInsertRowId ?? 0;
  };

  const [{ id: srcId }] = await selectAll<{ id: number }>(
    "SELECT id FROM languages WHERE code = ? LIMIT 1",
    [srcCode]
  );
  const [{ id: tgtId }] = await selectAll<{ id: number }>(
    "SELECT id FROM languages WHERE code = ? LIMIT 1",
    [tgtCode]
  );

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS patches_json (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      source_language_id INTEGER NOT NULL,
      target_language_id INTEGER NOT NULL,
      cefr_level         TEXT    NOT NULL,
      batch_index        INTEGER NOT NULL,
      word_ids           TEXT    NOT NULL,
      UNIQUE (source_language_id, target_language_id, cefr_level, batch_index)
    );
  `);

  await run(
    "DELETE FROM patches_json WHERE source_language_id = ? AND target_language_id = ?",
    [srcId, tgtId]
  );

  for (const level of levels) {
    const rows = await selectAll<{ id: number }>(
      `SELECT id FROM words
       WHERE language_id = ? AND cefr_level = ?
       ORDER BY RANDOM()`,
      [srcId, level]
    );

    if (rows.length === 0) continue;

    const ids = rows.map((r) => r.id);

    for (let i = 0; i < ids.length; i += batchSize) {
      const chunk = ids.slice(i, i + batchSize);
      await run(
        `INSERT INTO patches_json
           (source_language_id, target_language_id, cefr_level, batch_index, word_ids)
         VALUES (?, ?, ?, ?, ?)`,
        [srcId, tgtId, level, Math.floor(i / batchSize), JSON.stringify(chunk)]
      );
    }
  }

  // NIE ZAMYKAJ POŁĄCZENIA!
  // await db.closeAsync();
}

export async function logGeneratedTableContents() {
  const db = await getDB();
  const patches = await db.getAllAsync("SELECT * FROM patches_json");
  console.log("Patches:");
  console.log(patches);
  // NIE ZAMYKAJ POŁĄCZENIA!
  // await db.closeAsync();
}

export async function getWordsFromPatch({
  sourceLangId,
  targetLangId,
  cefrLevel,
  batchIndex,
}: GetWordsFromPatchParams): Promise<WordWithTranslations[]> {
  const db = await getDB();

  const patchRow = await db.getFirstAsync<{ word_ids: string }>(
    `SELECT word_ids FROM patches_json
     WHERE source_language_id = ? AND target_language_id = ?
       AND cefr_level = ? AND batch_index = ?`,
    [sourceLangId, targetLangId, cefrLevel, batchIndex]
  );

  if (!patchRow) {
    console.warn("Nie znaleziono paczki dla podanych parametrów.");
    return [];
  }

  const wordIds: number[] = JSON.parse(patchRow.word_ids);
  if (wordIds.length === 0) {
    return [];
  }

  const placeholders = wordIds.map(() => "?").join(",");

  const wordsData = await db.getAllAsync<{ id: number; text: string }>(
    `SELECT id, text FROM words WHERE id IN (${placeholders})`,
    wordIds
  );

  const translationsData = await db.getAllAsync<{
    source_word_id: number;
    translation_text: string;
  }>(
    `SELECT source_word_id, translation_text FROM translations
     WHERE source_word_id IN (${placeholders}) AND target_language_id = ?`,
    [...wordIds, targetLangId]
  );

  const wordMap = new Map(wordsData.map((w) => [w.id, w.text]));
  const translationsMap = new Map<number, string[]>();

  for (const t of translationsData) {
    if (!translationsMap.has(t.source_word_id)) {
      translationsMap.set(t.source_word_id, []);
    }
    translationsMap.get(t.source_word_id)!.push(t.translation_text);
  }

  const result: WordWithTranslations[] = wordIds.map((id) => ({
    id: id,
    text: wordMap.get(id) ?? "Słowo nieznalezione",
    translations: translationsMap.get(id) || [],
  }));

  // NIE ZAMYKAJ POŁĄCZENIA!
  // await db.closeAsync();
  return result;
}
