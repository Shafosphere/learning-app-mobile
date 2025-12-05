import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";
import Papa from "papaparse";
import { getDB, notifyDbInitializationListeners, openDatabase } from "./core";
import { ensureOfficialCourse } from "./repositories/courses";
import { replaceCustomFlashcardsWithDb } from "./repositories/flashcards";
import { applySchema, configurePragmas } from "./schema";
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

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
    notifyDbInitializationListeners({ type: "start" });
    const db = await openDatabase();
    console.log("[DB] initializeDatabase: openDatabase done");
    await applySchema(db);
    console.log("[DB] initializeDatabase: applySchema done");
    await configurePragmas(db);
    console.log("[DB] initializeDatabase: configurePragmas done");

    const requiresInitialImport = false;

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
