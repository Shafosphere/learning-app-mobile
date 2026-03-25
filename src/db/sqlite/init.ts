import { OFFICIAL_PACKS, type OfficialPackCourseSettings } from "@/src/constants/officialPacks";
import prebuiltDatabaseAsset from "@/assets/data/sqlite/prebuilt.db";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveImage } from "@/src/services/imageService";
import { Asset } from "expo-asset";
import * as SQLite from "expo-sqlite";
import {
  DATABASE_NAME,
  getDB,
  notifyDbInitializationListeners,
  openDatabase,
} from "./core";
import { ensureOfficialCourse } from "./repositories/courses";
import { applySchema, configurePragmas } from "./schema";

const BUNDLED_SYNC_DATABASE_NAME = "official-sync.db";

type OfficialCourseSnapshot = {
  id: number;
  packVersion: number;
};

type OfficialFlashcardSeedRow = {
  id: number;
  frontText: string;
  backText: string;
  hintFront: string | null;
  hintBack: string | null;
  imageFront: string | null;
  imageBack: string | null;
  explanation: string | null;
  position: number | null;
  flipped: number;
  answerOnly: number;
  externalId: string;
  isOfficial: number;
  resetProgressOnUpdate: number;
  type: string;
  createdAt: number;
  updatedAt: number;
  answerText: string | null;
};

type OfficialFlashcardSeedRecord = Omit<
  OfficialFlashcardSeedRow,
  "answerText"
> & {
  answers: string[];
};

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
    return;
  }
  parsed.custom = { ...parsed.custom, [courseId]: value };
  await AsyncStorage.setItem(storageKey, JSON.stringify(parsed));
}

async function applyOfficialCourseSettings(
  courseId: number,
  settings: OfficialPackCourseSettings
): Promise<void> {
  const autoflow =
    settings.autoflowEnabled ??
    (settings as any).autoflow ??
    (settings as any).Autoflow;
  const boxZero = settings.boxZeroEnabled ?? (settings as any).boxZero;
  const skipCorrection =
    settings.skipCorrectionEnabled ?? (settings as any).skipCorrection;

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
  if (settings.imageFrameEnabled !== undefined) {
    tasks.push(
      upsertCourseOverride<boolean>(
        "flashcards.courseImageFrameOverrides",
        courseId,
        settings.imageFrameEnabled
      )
    );
  }
  await Promise.all(tasks);
}

const isUnresolvedBundledImageRef = (value: string | null): value is string => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith("file://")) return false;
  if (normalized.startsWith("content://")) return false;
  if (normalized.startsWith("http://")) return false;
  if (normalized.startsWith("https://")) return false;
  if (normalized.startsWith("data:")) return false;
  return true;
};

const buildImageLookup = (): Map<string, any> => {
  const lookup = new Map<string, any>();
  for (const pack of OFFICIAL_PACKS) {
    if (!pack.imageMap) continue;
    for (const [name, imageModule] of Object.entries(pack.imageMap)) {
      lookup.set(name, imageModule);
    }
  }
  return lookup;
};

const resolveImageFromMap = async (
  imageName: string,
  imageLookup: Map<string, any>
): Promise<string | null> => {
  const imageModule = imageLookup.get(imageName);
  if (!imageModule) return null;
  const asset = Asset.fromModule(imageModule);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) return null;
  return saveImage(uri, asset.type);
};

async function hydrateBundledImagePaths(db: SQLite.SQLiteDatabase): Promise<void> {
  const imageLookup = buildImageLookup();
  if (imageLookup.size === 0) {
    return;
  }

  const rows = await db.getAllAsync<{
    id: number;
    imageFront: string | null;
    imageBack: string | null;
  }>(
    `SELECT
       id,
       image_front AS imageFront,
       image_back AS imageBack
     FROM custom_flashcards
     WHERE image_front IS NOT NULL OR image_back IS NOT NULL;`
  );

  let updatedRows = 0;
  for (const row of rows) {
    const frontNeedsHydration = isUnresolvedBundledImageRef(row.imageFront);
    const backNeedsHydration = isUnresolvedBundledImageRef(row.imageBack);
    if (!frontNeedsHydration && !backNeedsHydration) {
      continue;
    }

    const resolvedFront = frontNeedsHydration
      ? await resolveImageFromMap(row.imageFront!, imageLookup)
      : row.imageFront;
    const resolvedBack = backNeedsHydration
      ? await resolveImageFromMap(row.imageBack!, imageLookup)
      : row.imageBack;

    const nextFront = resolvedFront ?? row.imageFront;
    const nextBack = resolvedBack ?? row.imageBack;

    if (nextFront === row.imageFront && nextBack === row.imageBack) {
      continue;
    }

    await db.runAsync(
      `UPDATE custom_flashcards
         SET image_front = ?, image_back = ?, updated_at = ?
       WHERE id = ?;`,
      nextFront,
      nextBack,
      Date.now(),
      row.id
    );
    updatedRows += 1;
  }

  if (updatedRows > 0) {
    console.log(`[DB] Hydrated bundled image paths for ${updatedRows} flashcards`);
  }
}

async function ensurePrebuiltDatabaseImported(): Promise<void> {
  try {
    await SQLite.importDatabaseFromAssetAsync(DATABASE_NAME, {
      assetId: prebuiltDatabaseAsset as number,
      forceOverwrite: false,
    });
    console.log("[DB] prebuilt database asset import checked");
  } catch (error) {
    console.warn("[DB] prebuilt database import failed; continuing with regular init", error);
  }
}

async function openBundledSyncDatabase(): Promise<SQLite.SQLiteDatabase> {
  await SQLite.importDatabaseFromAssetAsync(BUNDLED_SYNC_DATABASE_NAME, {
    assetId: prebuiltDatabaseAsset as number,
    forceOverwrite: true,
  });
  return SQLite.openDatabaseAsync(BUNDLED_SYNC_DATABASE_NAME);
}

async function getBundledOfficialCourseSnapshot(
  bundledDb: SQLite.SQLiteDatabase,
  slug: string
): Promise<OfficialCourseSnapshot | null> {
  return bundledDb.getFirstAsync<OfficialCourseSnapshot>(
    `SELECT
       id,
       COALESCE(pack_version, 1) AS packVersion
     FROM custom_courses
     WHERE slug = ?
       AND COALESCE(is_official, 0) = 1
     LIMIT 1;`,
    slug
  );
}

async function getOfficialFlashcardSeedRecords(
  db: SQLite.SQLiteDatabase,
  courseId: number
): Promise<OfficialFlashcardSeedRecord[]> {
  const rows = await db.getAllAsync<OfficialFlashcardSeedRow>(
    `SELECT
       cf.id AS id,
       cf.front_text AS frontText,
       cf.back_text AS backText,
       cf.hint_front AS hintFront,
       cf.hint_back AS hintBack,
       cf.image_front AS imageFront,
       cf.image_back AS imageBack,
       cf.explanation AS explanation,
       cf.position AS position,
       cf.flipped AS flipped,
       cf.answer_only AS answerOnly,
       cf.external_id AS externalId,
       cf.is_official AS isOfficial,
       cf.reset_progress_on_update AS resetProgressOnUpdate,
       cf.type AS type,
       cf.created_at AS createdAt,
       cf.updated_at AS updatedAt,
       cfa.answer_text AS answerText
     FROM custom_flashcards cf
     LEFT JOIN custom_flashcard_answers cfa ON cfa.flashcard_id = cf.id
     WHERE cf.course_id = ?
       AND cf.external_id IS NOT NULL
       AND COALESCE(cf.is_official, 0) = 1
     ORDER BY cf.position IS NULL,
              cf.position ASC,
              cf.id ASC,
              cfa.id ASC;`,
    courseId
  );

  const byId = new Map<number, OfficialFlashcardSeedRecord>();
  const ordered: OfficialFlashcardSeedRecord[] = [];

  for (const row of rows) {
    let record = byId.get(row.id);
    if (!record) {
      record = {
        id: row.id,
        frontText: row.frontText,
        backText: row.backText,
        hintFront: row.hintFront,
        hintBack: row.hintBack,
        imageFront: row.imageFront,
        imageBack: row.imageBack,
        explanation: row.explanation,
        position: row.position,
        flipped: row.flipped,
        answerOnly: row.answerOnly,
        externalId: row.externalId,
        isOfficial: row.isOfficial,
        resetProgressOnUpdate: row.resetProgressOnUpdate,
        type: row.type,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        answers: [],
      };
      byId.set(row.id, record);
      ordered.push(record);
    }
    if (row.answerText) {
      record.answers.push(row.answerText);
    }
  }

  return ordered;
}

// Image URIs are hydrated to managed file:// paths locally, while the bundled
// snapshot keeps stable asset keys. We intentionally exclude image fields from
// reset-progress detection: images should still sync, but image-only updates
// must not clear review state.
const didOfficialCardContentChange = (
  local: OfficialFlashcardSeedRecord,
  bundled: OfficialFlashcardSeedRecord
): boolean =>
  local.frontText !== bundled.frontText ||
  local.backText !== bundled.backText ||
  (local.hintFront ?? null) !== (bundled.hintFront ?? null) ||
  (local.hintBack ?? null) !== (bundled.hintBack ?? null) ||
  (local.explanation ?? null) !== (bundled.explanation ?? null) ||
  (local.position ?? null) !== (bundled.position ?? null) ||
  local.flipped !== bundled.flipped ||
  local.answerOnly !== bundled.answerOnly ||
  local.type !== bundled.type ||
  local.resetProgressOnUpdate !== bundled.resetProgressOnUpdate ||
  local.answers.join("\u0000") !== bundled.answers.join("\u0000");

async function syncOfficialCourseFlashcards(
  localDb: SQLite.SQLiteDatabase,
  bundledDb: SQLite.SQLiteDatabase,
  courseId: number,
  bundledCourseId: number,
  nextPackVersion: number
): Promise<void> {
  const [bundledCards, localCards] = await Promise.all([
    getOfficialFlashcardSeedRecords(bundledDb, bundledCourseId),
    getOfficialFlashcardSeedRecords(localDb, courseId),
  ]);

  const localByExternalId = new Map(
    localCards.map((card) => [card.externalId, card] as const)
  );
  const bundledExternalIds = new Set(bundledCards.map((card) => card.externalId));
  const now = Date.now();

  await localDb.execAsync("BEGIN TRANSACTION;");
  try {
    for (const bundledCard of bundledCards) {
      const existing = localByExternalId.get(bundledCard.externalId);

      if (existing) {
        const contentChanged = didOfficialCardContentChange(existing, bundledCard);
        await localDb.runAsync(
          `UPDATE custom_flashcards
             SET front_text = ?,
                 back_text = ?,
                 hint_front = ?,
                 hint_back = ?,
                 image_front = ?,
                 image_back = ?,
                 explanation = ?,
                 position = ?,
                 flipped = ?,
                 answer_only = ?,
                 type = ?,
                 external_id = ?,
                 is_official = 1,
                 reset_progress_on_update = ?,
                 updated_at = ?
           WHERE id = ?;`,
          bundledCard.frontText,
          bundledCard.backText,
          bundledCard.hintFront,
          bundledCard.hintBack,
          bundledCard.imageFront,
          bundledCard.imageBack,
          bundledCard.explanation,
          bundledCard.position,
          bundledCard.flipped,
          bundledCard.answerOnly,
          bundledCard.type,
          bundledCard.externalId,
          bundledCard.resetProgressOnUpdate,
          now,
          existing.id
        );

        await localDb.runAsync(
          `DELETE FROM custom_flashcard_answers WHERE flashcard_id = ?;`,
          existing.id
        );
        for (const answer of bundledCard.answers) {
          await localDb.runAsync(
            `INSERT OR IGNORE INTO custom_flashcard_answers
               (flashcard_id, answer_text, created_at)
             VALUES (?, ?, ?);`,
            existing.id,
            answer,
            now
          );
        }

        if (contentChanged && bundledCard.resetProgressOnUpdate === 1) {
          await localDb.runAsync(
            `DELETE FROM custom_reviews WHERE flashcard_id = ? AND course_id = ?;`,
            existing.id,
            courseId
          );
        }
        continue;
      }

      const insertResult = await localDb.runAsync(
        `INSERT INTO custom_flashcards
           (course_id, front_text, back_text, hint_front, hint_back, image_front, image_back, explanation, position, flipped, answer_only, type, external_id, is_official, reset_progress_on_update, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?);`,
        courseId,
        bundledCard.frontText,
        bundledCard.backText,
        bundledCard.hintFront,
        bundledCard.hintBack,
        bundledCard.imageFront,
        bundledCard.imageBack,
        bundledCard.explanation,
        bundledCard.position,
        bundledCard.flipped,
        bundledCard.answerOnly,
        bundledCard.type,
        bundledCard.externalId,
        bundledCard.resetProgressOnUpdate,
        bundledCard.createdAt,
        now
      );
      const flashcardId = Number(insertResult.lastInsertRowId ?? 0);

      for (const answer of bundledCard.answers) {
        await localDb.runAsync(
          `INSERT OR IGNORE INTO custom_flashcard_answers
             (flashcard_id, answer_text, created_at)
           VALUES (?, ?, ?);`,
          flashcardId,
          answer,
          now
        );
      }
    }

    const idsToDelete = localCards
      .filter((card) => !bundledExternalIds.has(card.externalId))
      .map((card) => card.id);

    for (const flashcardId of idsToDelete) {
      await localDb.runAsync(
        `DELETE FROM custom_learning_events WHERE flashcard_id = ? AND course_id = ?;`,
        flashcardId,
        courseId
      );
      await localDb.runAsync(
        `DELETE FROM custom_flashcards WHERE id = ?;`,
        flashcardId
      );
    }

    await localDb.runAsync(
      `UPDATE custom_courses
         SET pack_version = ?, updated_at = ?
       WHERE id = ?;`,
      nextPackVersion,
      now,
      courseId
    );

    await localDb.execAsync("COMMIT;");
  } catch (error) {
    await localDb.execAsync("ROLLBACK;");
    throw error;
  }
}

export async function seedOfficialPacksWithDb(
  db: SQLite.SQLiteDatabase
): Promise<void> {
  console.log("[DB] Syncing official packs metadata: start");
  let bundledDb: SQLite.SQLiteDatabase | null = null;
  try {
    bundledDb = await openBundledSyncDatabase();
    for (const def of OFFICIAL_PACKS) {
      try {
        const localCourse = await ensureOfficialCourse(
          db,
          def.slug,
          def.name,
          def.iconId,
          def.iconColor,
          def.reviewsEnabled ?? true
        );
        const bundledCourse = await getBundledOfficialCourseSnapshot(
          bundledDb,
          def.slug
        );

        if (
          bundledCourse &&
          (localCourse.packVersion ?? 0) < (bundledCourse.packVersion ?? 1)
        ) {
          await syncOfficialCourseFlashcards(
            db,
            bundledDb,
            localCourse.id,
            bundledCourse.id,
            bundledCourse.packVersion
          );
        }

        if (def.settings) {
          await applyOfficialCourseSettings(localCourse.id, def.settings);
        }
      } catch (error) {
        console.warn(`[DB] Failed to sync metadata for official pack ${def.slug}`, error);
      }
    }
  } finally {
    await bundledDb?.closeAsync();
  }
  await hydrateBundledImagePaths(db);
  console.log("[DB] Syncing official packs metadata: done");
}

export async function seedOfficialPacks(): Promise<void> {
  const db = await getDB();
  return seedOfficialPacksWithDb(db);
}

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  try {
    notifyDbInitializationListeners({ type: "start" });
    notifyDbInitializationListeners({ type: "import-start" });
    await ensurePrebuiltDatabaseImported();
    notifyDbInitializationListeners({ type: "import-finish" });

    const db = await openDatabase();
    await applySchema(db);
    await configurePragmas(db);

    try {
      await seedOfficialPacksWithDb(db);
    } catch (error) {
      console.warn("[DB] Failed during official metadata sync", error);
    }

    notifyDbInitializationListeners({
      type: "ready",
      initialImport: false,
    });
    return db;
  } catch (error) {
    notifyDbInitializationListeners({ type: "error", error });
    throw error;
  }
}
