// helpers for generating flashcard batches from SQLite store
import { getDB } from "./db";
import { WordWithTranslations } from "@/src/types/boxes";
import type { CEFRLevel } from "@/src/types/language";

export interface GetRandomWordsBatchParams {
  sourceLangId: number;
  targetLangId: number;
  cefrLevel: CEFRLevel;
  batchSize: number;
  excludeIds?: number[];
}

export async function getRandomWordsBatch({
  sourceLangId,
  targetLangId,
  cefrLevel,
  batchSize,
  excludeIds = [],
}: GetRandomWordsBatchParams): Promise<WordWithTranslations[]> {
  const db = await getDB();

  const params: (number | string)[] = [sourceLangId, cefrLevel];
  let sql = `SELECT id FROM words WHERE language_id = ? AND cefr_level = ?`;
  if (excludeIds.length > 0) {
    const placeholders = excludeIds.map(() => "?").join(",");
    sql += ` AND id NOT IN (${placeholders})`;
    params.push(...excludeIds);
  }
  sql += ` ORDER BY RANDOM() LIMIT ?`;
  params.push(batchSize);

  const rows = await db.getAllAsync<{ id: number }>(sql, params);
  if (!rows || rows.length === 0) return [];
  const wordIds = rows.map((r) => r.id);

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
    id,
    text: wordMap.get(id) ?? "Słowo nieznalezione",
    translations: translationsMap.get(id) || [],
    flipped: true, // oficjalne słowa zawsze mogą być odwracane w boxach 2 i 4
  }));
  return result;
}
