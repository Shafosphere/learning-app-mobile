import wordsENGtoPLCsv from "@/assets/data/wordsENGtoPL.csv";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";
import Papa from "papaparse";
import { getDB, notifyDbInitializationListeners, openDatabase } from "./core";
import { ensureOfficialCourse } from "./repositories/courses";
import { seedLanguages } from "./repositories/dictionary";
import { replaceCustomFlashcardsWithDb } from "./repositories/flashcards";
import {
    applySchema,
    configurePragmas,
    DICTIONARY_SCHEMA_ENABLED,
    DICTIONARY_IMPORT_ENABLED,
} from "./schema";
import { splitBackTextIntoAnswers } from "./utils";

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

function resolveLanguageName(code: string): string {
    switch (code) {
        case "en":
            return "English";
        case "pl":
            return "Polski";
        case "fr":
            return "Français";
        case "kr":
            return "Korean";
        default:
            return code.toUpperCase();
    }
}

async function seedLanguagePairsFromOfficialPacks(
    db: SQLite.SQLiteDatabase
): Promise<void> {
    if (!DICTIONARY_SCHEMA_ENABLED) return;

    const pairs = OFFICIAL_PACKS
        .map((pack) => ({
            source: pack.sourceLang,
            target: pack.targetLang,
        }))
        .filter(
            (p): p is { source: string; target: string } =>
                Boolean(p.source) && Boolean(p.target)
        );

    if (pairs.length === 0) {
        console.log("[DB] No language pairs from official packs to seed");
        return;
    }

    const langCodes = Array.from(
        new Set(pairs.flatMap((p) => [p.source, p.target]))
    );

    await db.execAsync("BEGIN TRANSACTION;");
    try {
        for (const code of langCodes) {
            await db.runAsync(
                `INSERT OR IGNORE INTO languages (code, name) VALUES (?, ?);`,
                code,
                resolveLanguageName(code)
            );
        }

        // Reset to avoid legacy pairs that are no longer relevant
        await db.runAsync(`DELETE FROM language_pairs;`);

        for (const { source, target } of pairs) {
            await db.runAsync(
                `INSERT OR IGNORE INTO language_pairs (source_language_id, target_language_id)
                 SELECT s.id, t.id FROM languages s, languages t
                 WHERE s.code = ? AND t.code = ?;`,
                source,
                target
            );
        }

        await db.execAsync("COMMIT;");
        console.log(
            "[DB] Seeded language pairs from official packs:",
            pairs.length
        );
    } catch (error) {
        await db.execAsync("ROLLBACK;");
        console.warn("[DB] Failed to seed language pairs from official packs", error);
    }
}

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
    notifyDbInitializationListeners({ type: "start" });
    const db = await openDatabase();
    console.log("[DB] initializeDatabase: openDatabase done");
    await applySchema(db);
    console.log("[DB] initializeDatabase: applySchema done");
    await configurePragmas(db);
    console.log("[DB] initializeDatabase: configurePragmas done");
    await seedLanguagePairsFromOfficialPacks(db);

    let requiresInitialImport = false;

    if (DICTIONARY_SCHEMA_ENABLED && DICTIONARY_IMPORT_ENABLED) {
        const countRow = await db.getFirstAsync<{ cnt: number }>(
            `SELECT COUNT(*) AS cnt FROM words WHERE language_id = (SELECT id FROM languages WHERE code = 'en');`
        );

        requiresInitialImport = (countRow?.cnt ?? 0) === 0;
    } else {
        console.log("[DB] Dictionary import disabled -> skipping wordsENGtoPL.csv");
    }

    if (DICTIONARY_SCHEMA_ENABLED && DICTIONARY_IMPORT_ENABLED) {
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
