import * as SQLite from "expo-sqlite";

/**
 * Parametry wywołania generatora paczek.
 */
export interface PatchGenParams {
  /** Kod języka źródłowego (np. 'en') */
  srcCode: string;
  /** Kod języka docelowego (np. 'pl') */
  tgtCode: string;
  /** Nazwa pliku bazy SQLite (domyślnie 'mygame.db') */
  dbName?: string;
  /** Rozmiar pojedynczej paczki (domyślnie 30) */
  batchSize?: number;
  /** Lista poziomów CEFR, dla których generujemy paczki */
  levels?: readonly ["A1" | "A2" | "B1" | "B2" | "C1" | "C2", ...string[]];
}

/** Alias na listę parametrów przekazywanych do SQLite (string | number | null) */
type SQLParams = (string | number | null)[];

/**
 * Regeneruje wszystkie paczki (patches_json) dla zadanej pary języków.
 *
 * 1. Tworzy tabelę patches_json, jeśli jeszcze nie istnieje.
 * 2. Czyści poprzednie paczki dla podanej pary językowej.
 * 3. Dla każdego poziomu CEFR losuje słowa, dzieli na porcje
 *    i zapisuje listę ID w kolumnie word_ids (format JSON).
 */
export async function regeneratePatches({
  srcCode,
  tgtCode,
  dbName = "mygame.db",
  batchSize = 30,
  levels = ["A1", "A2", "B1", "B2", "C1", "C2"],
}: PatchGenParams): Promise<void> {
  /** Otwieramy bazę w trybie asynchronicznym (Turbo Module). */
  const db = await SQLite.openDatabaseAsync(dbName);

  /** Helper – SELECT zwracający wszystkie rekordy jako tablicę obiektów. */
  const selectAll = async <T>(
    sql: string,
    params: SQLParams = []
  ): Promise<T[]> => {
    const stmt = await db.prepareAsync(sql);
    const res = await stmt.executeAsync(params);
    const rows = (await res.getAllAsync()) as T[];
    await stmt.finalizeAsync();
    return rows;
  };

  /** Helper – wykonywanie INSERT/UPDATE/DELETE/DDL. Zwraca lastInsertRowId. */
  const run = async (sql: string, params: SQLParams = []): Promise<number> => {
    const { lastInsertRowId } = await db.runAsync(sql, params);
    return lastInsertRowId ?? 0;
  };

  // ------------------------------------------------------------
  // 1) Pobierz identyfikatory języków
  // ------------------------------------------------------------
  const [{ id: srcId }] = await selectAll<{ id: number }>(
    "SELECT id FROM languages WHERE code = ? LIMIT 1",
    [srcCode]
  );
  const [{ id: tgtId }] = await selectAll<{ id: number }>(
    "SELECT id FROM languages WHERE code = ? LIMIT 1",
    [tgtCode]
  );

  // ------------------------------------------------------------
  // 2) Upewnij się, że istnieje tabela patches_json
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // 3) Usuń wcześniejsze paczki tej pary językowej
  // ------------------------------------------------------------
  await run(
    "DELETE FROM patches_json WHERE source_language_id = ? AND target_language_id = ?",
    [srcId, tgtId]
  );

  // ------------------------------------------------------------
  // 4) Generuj paczki dla każdego poziomu CEFR
  // ------------------------------------------------------------
  for (const level of levels) {
    // a) Wylosuj ID słów dla poziomu
    const rows = await selectAll<{ id: number }>(
      `SELECT id FROM words
       WHERE language_id = ? AND cefr_level = ?
       ORDER BY RANDOM()`,
      [srcId, level]
    );

    if (rows.length === 0) continue; // brak słów – pomijamy dany poziom

    const ids = rows.map((r) => r.id);

    // b) Podziel na porcje po batchSize i zapisz
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

  await db.closeAsync(); // zamykamy po zakończeniu
}

/* -------------------------------------------------------------------------
 * PRZYKŁADOWE UŻYCIE
 * -------------------------------------------------------------------------
 * await regeneratePatches({
 *   srcCode: 'en',
 *   tgtCode: 'pl',
 *   batchSize: 30,
 * });
 * ------------------------------------------------------------------------- */

export async function logGeneratedTableContents() {
  const db = await SQLite.openDatabaseAsync("mygame.db");
  const patches = await db.getAllAsync("SELECT * FROM patches_json");
  console.log("Patches:");
  console.log(patches);
  await db.closeAsync();
}

export interface GetPatchParams {
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  srcCode: string;
  tgtCode: string;
  patchNumber: number;
  wordsList: number[];
}

export async function getPatchData<T>(
  sql: string,
  params: SQLParams = []
): Promise<T[]> {
  const db = await SQLite.openDatabaseAsync("mygame.db");
  const stmt = await db.prepareAsync(sql);
  const res = await stmt.executeAsync(params);
  const rows = (await res.getAllAsync()) as T[];
  await stmt.finalizeAsync();
  await db.closeAsync();
  return rows;
}

export async function getPatch({
  level,
  srcCode,
  tgtCode,
  patchNumber,
}: GetPatchParams): Promise<number[]> {
  const db = await SQLite.openDatabaseAsync("mygame.db");

  const rows = await getPatchData<{ word_ids: string }>(
    `SELECT word_ids
       FROM patches_json
      WHERE cefr_level = ?
        AND source_language_id = ?
        AND target_language_id = ?
        AND batch_index = ?`,
    [level, srcCode, tgtCode, patchNumber]
  );

  await db.closeAsync();

  if (rows.length === 0) return [];

  return JSON.parse(rows[0].word_ids) as number[];
}

export async function getWordsByID({
  wordsList, tgtCode
}: GetPatchParams): Promise<string[]> {
  const db = await SQLite.openDatabaseAsync("mygame.db");
  const data = wordsList.map((index)=>{
    try {
      'SELECT text FROM words WHERE '
    } catch (error) { console.log(error)}
  })

  await db.closeAsync();
}

// [
//   {
//     "id": id_FROM_words,
//     "text": text_FROM_words,
//     "translation_text_TABLE": [..translation_text_FROM],
//   }
// ]