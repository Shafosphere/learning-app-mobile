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
    przod?: string;
    tyl?: string;
    front_text?: string;
    back_text?: string;
    type?: string;
    hint1?: string;
    hint2?: string;
    hint_front?: string;
    hint_back?: string;
    block?: string | number | boolean;
    blokada?: string | number | boolean;
    lock?: string | number | boolean;
    answer_only?: string | number | boolean;
    question?: string | number | boolean;
    pytanie?: string | number | boolean;
    is_true?: string | number | boolean;
    isTrue?: string | number | boolean;
    czy_prawda?: string | number | boolean;
    czyPrawda?: string | number | boolean;
};

const KNOWN_CSV_HEADERS = new Set([
    "front",
    "back",
    "przod",
    "tyl",
    "front_text",
    "back_text",
    "fronttext",
    "backtext",
    "question_text",
    "questiontext",
    "hint1",
    "hint2",
    "hint_front",
    "hint_back",
    "block",
    "blokada",
    "lock",
    "answer_only",
    "question",
    "pytanie",
    "is_true",
    "istrue",
    "czy_prawda",
    "czyprawda",
    "explanation",
    "wyjasnienie",
    "wyjaśnienie",
    "explain",
    "opis",
    "image_front",
    "imagefront",
    "image_back",
    "imageback",
    "type",
]);

const TRUE_VALUES = new Set([
    "true",
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
    // Treat only clear boolean words as true/false answers; avoid 1-letter tokens like "t"/"y"
    // so entries such as Hangul consonant readings ("t", "p") are not converted to true_false cards.
    const normalized = value.trim().toLowerCase();
    return (
        normalized === "true" ||
        normalized === "false" ||
        normalized === "yes" ||
        normalized === "no" ||
        normalized === "tak" ||
        normalized === "nie" ||
        normalized === "locked" ||
        normalized === "unlocked"
    );
};

const extractHint = (primary?: string, secondary?: string): string | null => {
    const value = (primary ?? secondary ?? "").trim();
    return value.length > 0 ? value : null;
};

const parseCardType = (
    value: unknown
): "text" | "image" | "true_false" | "know_dont_know" | null => {
    if (value == null) return null;
    const normalized = value.toString().trim().toLowerCase();
    if (
        normalized === "text" ||
        normalized === "image" ||
        normalized === "true_false" ||
        normalized === "know_dont_know"
    ) {
        return normalized as "text" | "image" | "true_false" | "know_dont_know";
    }
    return null;
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
    const parsedWithHeader = Papa.parse<CsvRow>(csv, {
        header: true,
        skipEmptyLines: true,
    });
    const headerFields = (parsedWithHeader.meta?.fields ?? []).map((field) =>
        field.trim().toLowerCase()
    );
    const hasKnownHeader = headerFields.some((field) =>
        KNOWN_CSV_HEADERS.has(field)
    );
    const headerlessRows = hasKnownHeader
        ? null
        : Papa.parse<string[]>(csv, {
            header: false,
            skipEmptyLines: true,
        }).data;
    const data = headerlessRows ? [] : parsedWithHeader.data;
    console.log(
        "[DB] readCsvAsset: parsed rows=",
        data?.length ?? 0,
        "headerless=",
        Boolean(headerlessRows)
    );
    const cards = headerlessRows
        ? headerlessRows.map((row, idx) => {
            const front = (row?.[0] ?? "").toString().trim();
            const explanationRaw = (row?.[1] ?? "").toString().trim();
            const explanation = explanationRaw.length > 0 ? explanationRaw : null;
            const card: CustomFlashcardInput = {
                frontText: front,
                backText: "",
                answers: [],
                position: idx,
                flipped: false,
                answerOnly: true,
                hintFront: null,
                hintBack: null,
                type: "know_dont_know",
                imageFront: null,
                imageBack: null,
                explanation,
            };
            return card;
        })
        : await Promise.all(
            data.map(async (row, idx) => {
                const explicitType = parseCardType((row as any).type);
                const front = (
                    row.front ??
                    row.przod ??
                    row.front_text ??
                    (row as any).frontText ??
                    (row as any).question_text ??
                    (row as any).questionText ??
                    ""
                ).trim();
                const backRaw = (
                    row.back ??
                    row.tyl ??
                    row.back_text ??
                    (row as any).backText ??
                    ""
                ).trim();
                const trueFalseRaw =
                    (row as any).is_true ??
                    (row as any).isTrue ??
                    (row as any).czy_prawda ??
                    (row as any).czyPrawda;
                const hasTrueFalseFlag =
                    trueFalseRaw != null &&
                    trueFalseRaw.toString().trim().length > 0;
                const imageFrontName = (row as any).image_front ?? (row as any).imageFront ?? null;
                const imageBackName = (row as any).image_back ?? (row as any).imageBack ?? null;
                const imageFront = imageFrontName
                    ? await resolveImageFromMap(
                        imageFrontName.toString().trim(),
                        imageMap
                    )
                    : null;
                const imageBack = imageBackName
                    ? await resolveImageFromMap(
                        imageBackName.toString().trim(),
                        imageMap
                    )
                    : null;
                const hasImages = Boolean(imageFront || imageBack);
                const hintFront = extractHint(row.hint1, row.hint_front);
                const hintBack = extractHint(row.hint2, row.hint_back);
                const explanationRaw =
                    (row as any).explanation ??
                    (row as any).wyjasnienie ??
                    (row as any).wyjaśnienie ??
                    (row as any).explain ??
                    (row as any).opis ??
                    null;
                const explanation =
                    typeof explanationRaw === "string"
                        ? explanationRaw.trim() || null
                        : null;
                const blockRaw =
                    (row as any).blokada ??
                    (row as any).block ??
                    row.answer_only ??
                    row.question ??
                    row.pytanie ??
                    row.lock;
                const answerOnly = parseBooleanValue(blockRaw);
                const locked = answerOnly;
                const inferredAnswers = hasTrueFalseFlag
                    ? [parseBooleanValue(trueFalseRaw) ? "true" : "false"]
                    : splitBackTextIntoAnswers(backRaw);
                const isBoolean = hasTrueFalseFlag
                    ? true
                    : inferredAnswers.length > 0 && inferredAnswers.every((a) => isBooleanText(a));
                const inferredType = isBoolean ? "true_false" : hasImages ? "image" : "text";
                const type = explicitType ?? inferredType;
                const card: CustomFlashcardInput = {
                    frontText: front,
                    backText: backRaw,
                    answers: inferredAnswers,
                    position: idx,
                    flipped: !locked,
                    answerOnly,
                    hintFront,
                    hintBack,
                    type,
                    imageFront,
                    imageBack,
                    explanation,
                };
                if (type === "know_dont_know") {
                    card.answers = [];
                    card.answerOnly = true;
                    card.flipped = false;
                    card.explanation = explanation || backRaw || null;
                } else if (type === "true_false") {
                    card.answers = hasTrueFalseFlag
                        ? [parseBooleanValue(trueFalseRaw) ? "true" : "false"]
                        : inferredAnswers.length > 0
                            ? inferredAnswers.map((value) =>
                                parseBooleanValue(value) ? "true" : "false"
                            )
                            : [];
                }
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

// Collects indexes (position) of rows that contain the unified block/answerOnly flag.
async function getBlockedPositionsFromCsvAsset(assetModule: any): Promise<Set<number>> {
    const asset = Asset.fromModule(assetModule);
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    if (!uri) return new Set();
    const csv = await FileSystem.readAsStringAsync(uri);
    const { data } = Papa.parse<any>(csv, {
        header: true,
        skipEmptyLines: true,
    });
    const blocked = new Set<number>();
    data.forEach((row: any, idx: number) => {
        const flag =
            row?.blokada ??
            row?.block ??
            row?.answer_only ??
            row?.question ??
            row?.pytanie ??
            row?.lock;
        if (parseBooleanValue(flag)) {
            blocked.add(idx);
        }
    });
    return blocked;
}

async function applyBlockFlagFixForOfficialPacks(
    db: SQLite.SQLiteDatabase
): Promise<void> {
    const slugToId = new Map<string, number>();
    const rows = await db.getAllAsync<{ id: number; slug: string | null }>(
        `SELECT id, slug FROM custom_courses WHERE is_official = 1 AND slug IS NOT NULL;`
    );
    rows.forEach((row) => {
        if (row.slug) slugToId.set(row.slug, row.id);
    });

    for (const def of OFFICIAL_PACKS) {
        const courseId = slugToId.get(def.slug);
        if (!courseId) continue;
        try {
            const blocked = await getBlockedPositionsFromCsvAsset(def.csvAsset);
            if (blocked.size === 0) continue;
            const positions = Array.from(blocked.values());
            const placeholders = positions.map(() => "?").join(", ");
            await db.runAsync(
                `UPDATE custom_flashcards
                 SET answer_only = 1, flipped = 0
                 WHERE course_id = ?
                   AND position IN (${placeholders});`,
                [courseId, ...positions]
            );
        } catch (e) {
            console.warn("[DB] applyBlockFlagFixForOfficialPacks failed", def.slug, e);
        }
    }
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

    // Hotfix: older installs imported official packs before the unified "block/answer_only"
    // field existed. Update existing rows in-place so block=true cards stop flipping.
    try {
        await applyBlockFlagFixForOfficialPacks(db);
    } catch (e) {
        console.warn("[DB] applyBlockFlagFixForOfficialPacks failed", e);
    }

    notifyDbInitializationListeners({
        type: "ready",
        initialImport: requiresInitialImport,
    });
    return db;
}
