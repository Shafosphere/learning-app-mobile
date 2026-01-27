import { OFFICIAL_PACKS, type OfficialPackCourseSettings } from "@/src/constants/officialPacks";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveImage } from "@/src/services/imageService";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";
import Papa from "papaparse";
import { getDB, notifyDbInitializationListeners, openDatabase } from "./core";
import { ensureOfficialCourse } from "./repositories/courses";
import {
    replaceCustomFlashcardsWithDb,
    type CustomFlashcardInput,
} from "./repositories/flashcards";
import { applySchema, configurePragmas } from "./schema";
import { splitBackTextIntoAnswers } from "./utils";

type CsvRow = {
    front?: string;
    back?: string;
    hint1?: string;
    hint2?: string;
    hint_front?: string;
    hint_back?: string;
    lock?: string | number | boolean;
    answer_only?: string | number | boolean;
    question?: string | number | boolean;
    pytanie?: string | number | boolean;
    is_true?: string | number | boolean;
    isTrue?: string | number | boolean;
    czy_prawda?: string | number | boolean;
    czyPrawda?: string | number | boolean;
};

const TRUE_VALUES = new Set([
    "true",
    "1",
    "yes",
    "y",
    "tak",
    "t",
    "locked",
]);

const parseBooleanValue = (value: unknown): boolean => {
    if (value == null) return false;
    const normalized = value.toString().trim().toLowerCase();
    return TRUE_VALUES.has(normalized);
};
const isBooleanText = (value: string): boolean => {
    const normalized = value.toLowerCase();
    return (
        TRUE_VALUES.has(normalized) ||
        normalized === "false" ||
        normalized === "no" ||
        normalized === "nie" ||
        normalized === "n" ||
        normalized === "unlocked" ||
        value === "0"
    );
};

const extractHint = (primary?: string, secondary?: string): string | null => {
    const value = (primary ?? secondary ?? "").trim();
    return value.length > 0 ? value : null;
};

const resolveImageFromMap = async (
    imageName: string | null,
    imageMap?: Record<string, any>
): Promise<string | null> => {
    if (!imageName || !imageMap) return null;
    const mod = imageMap[imageName];
    if (!mod) return null;
    const asset = Asset.fromModule(mod);
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    if (!uri) return null;
    return saveImage(uri, asset.type);
};

async function readCsvAsset(
    assetModule: any,
    imageMap?: Record<string, any>
): Promise<CustomFlashcardInput[]> {
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
    const { data } = Papa.parse<CsvRow>(csv, {
        header: true,
        skipEmptyLines: true,
    });
    console.log("[DB] readCsvAsset: parsed rows=", data?.length ?? 0);
    const cards = await Promise.all(
        data.map(async (row, idx) => {
            const front = (row.front ?? "").trim();
            const backRaw = (row.back ?? "").trim();
            const trueFalseRaw =
                (row as any).is_true ??
                (row as any).isTrue ??
                (row as any).czy_prawda ??
                (row as any).czyPrawda;
            const hasTrueFalseFlag =
                trueFalseRaw != null &&
                trueFalseRaw.toString().trim().length > 0;
            const answers = hasTrueFalseFlag
                ? [parseBooleanValue(trueFalseRaw) ? "true" : "false"]
                : splitBackTextIntoAnswers(backRaw);
            const isBoolean = hasTrueFalseFlag
                ? true
                : answers.length > 0 && answers.every((a) => isBooleanText(a));
            const imageFrontName = (row as any).image_front ?? (row as any).imageFront ?? null;
            const imageBackName = (row as any).image_back ?? (row as any).imageBack ?? null;
            const hintFront = extractHint(row.hint1, row.hint_front);
            const hintBack = extractHint(row.hint2, row.hint_back);
            const locked = parseBooleanValue(row.lock);
            const answerOnly = parseBooleanValue(
                row.answer_only ?? row.question ?? row.pytanie
            );
            const card: CustomFlashcardInput = {
                frontText: front,
                backText: backRaw,
                answers,
                position: idx,
                flipped: !locked,
                answerOnly,
                hintFront,
                hintBack,
                type: isBoolean ? "true_false" : "text",
                imageFront: imageFrontName
                    ? await resolveImageFromMap(
                        imageFrontName.toString().trim(),
                        imageMap
                    )
                    : null,
                imageBack: imageBackName
                    ? await resolveImageFromMap(
                        imageBackName.toString().trim(),
                        imageMap
                    )
                    : null,
            };
            return card;
        })
    );
    return cards.filter(
        (c) =>
            c.frontText.length > 0 ||
            (c.answers?.length ?? 0) > 0 ||
            c.imageFront != null ||
            c.imageBack != null
    );
}

async function importOfficialPackIfEmpty(
    db: SQLite.SQLiteDatabase,
    courseId: number,
    pack: { csvAsset: any; imageMap?: Record<string, any>; slug: string }
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
    console.log("[DB] importOfficialPackIfEmpty: reading asset", pack.slug);
    const cards = await readCsvAsset(pack.csvAsset, pack.imageMap);
    console.log("[DB] importOfficialPackIfEmpty: cards prepared=", cards.length);
    if (cards.length === 0) return;
    console.log("[DB] importOfficialPackIfEmpty: replacing flashcards");
    await replaceCustomFlashcardsWithDb(db, courseId, cards);
    console.log("[DB] importOfficialPackIfEmpty: replaced flashcards");
}

type OverrideMap<T> = {
    builtin: Record<string, T>;
    custom: Record<string, T>;
};

async function upsertCourseOverride<T>(
    storageKey: string,
    courseId: number,
    value: T
): Promise<void> {
    const raw = await AsyncStorage.getItem(storageKey);
    let parsed: OverrideMap<T>;
    try {
        parsed = raw ? (JSON.parse(raw) as OverrideMap<T>) : { builtin: {}, custom: {} };
    } catch {
        parsed = { builtin: {}, custom: {} };
    }
    if (parsed.custom[courseId] !== undefined) {
        return; // user already has override, don't clobber
    }
    parsed.custom = { ...parsed.custom, [courseId]: value };
    await AsyncStorage.setItem(storageKey, JSON.stringify(parsed));
}

async function applyOfficialCourseSettings(
    _db: SQLite.SQLiteDatabase,
    courseId: number,
    settings: OfficialPackCourseSettings
): Promise<void> {
    const autoflow =
        settings.autoflowEnabled ??
        (settings as any).autoflow ??
        (settings as any).Autoflow;
    const boxZero =
        settings.boxZeroEnabled ??
        (settings as any).boxZero;
    const skipCorrection =
        settings.skipCorrectionEnabled ??
        (settings as any).skipCorrection;

    const tasks: Promise<void>[] = [];
    if (autoflow !== undefined) {
        tasks.push(
            upsertCourseOverride<boolean>(
                "flashcards.courseAutoflowOverrides",
                courseId,
                autoflow
            )
        );
    }
    if (boxZero !== undefined) {
        tasks.push(
            upsertCourseOverride<boolean>(
                "flashcards.courseBoxZeroOverrides",
                courseId,
                boxZero
            )
        );
    }
    if (skipCorrection !== undefined) {
        tasks.push(
            upsertCourseOverride<boolean>(
                "flashcards.courseSkipCorrectionOverrides",
                courseId,
                skipCorrection
            )
        );
    }
    if (settings.cardSize !== undefined) {
        tasks.push(
            upsertCourseOverride<string>(
                "flashcards.courseCardSizeOverrides",
                courseId,
                settings.cardSize
            )
        );
    }
    if (settings.imageSize !== undefined) {
        tasks.push(
            upsertCourseOverride<string>(
                "flashcards.courseImageSizeOverrides",
                courseId,
                settings.imageSize
            )
        );
    }
    await Promise.all(tasks);
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
            if (def.settings) {
                await applyOfficialCourseSettings(db, id, def.settings);
            }
            await importOfficialPackIfEmpty(db, id, def);
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
