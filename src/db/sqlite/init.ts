import { OFFICIAL_PACKS, type OfficialPackCourseSettings } from "@/src/constants/officialPacks";
import prebuiltDatabaseAsset from "@/assets/data/sqlite/prebuilt.db";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  deleteImage,
  prepareImagesDirectory,
  saveImageInDirectory,
} from "@/src/services/imageService";
import { runWithConcurrency } from "@/src/utils/runWithConcurrency";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";
import {
  StartupTimer,
  errorMessage,
  isInitialDatabaseImport,
  logStartupTiming,
  toFileSystemUri,
} from "@/src/services/startupTiming";
import {
  DATABASE_NAME,
  getDB,
  notifyDbInitializationListeners,
  openDatabase,
} from "./core";
import { ensureOfficialCourse } from "./repositories/courses";
import { applySchema, configurePragmas } from "./schema";

const BUNDLED_SYNC_DATABASE_NAME = "official-sync.db";

type ImageHydrationTiming = {
  imageReferences: number;
  hydratedImages: number;
  updatedRows: number;
  assetResolutionWorkerMs: number;
  fileCopyWorkerMs: number;
  databaseUpdateWorkerMs: number;
};

const createImageHydrationTiming = (): ImageHydrationTiming => ({
  imageReferences: 0,
  hydratedImages: 0,
  updatedRows: 0,
  assetResolutionWorkerMs: 0,
  fileCopyWorkerMs: 0,
  databaseUpdateWorkerMs: 0,
});

const IMAGE_COPY_WORKERS = 4;
const IMAGE_HYDRATION_BATCH_SIZE = 32;

const elapsedMs = (startedAt: number): number =>
  Math.max(0, Math.round(performance.now() - startedAt));

async function getDatabaseUserVersion(
  db: SQLite.SQLiteDatabase
): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version;"
  );
  return row?.user_version ?? 0;
}

type OfficialCourseSnapshot = {
  id: number;
  packVersion: number;
  flashcardsCount: number;
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
  isUserEdited: number;
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

type ResolvedBundledImage = {
  uri: string;
  type: string | undefined;
};

type ImageHydrationRow = {
  id: number;
  imageFront: string | null;
  imageBack: string | null;
};

type HydratedImageRow = ImageHydrationRow & {
  nextFront: string | null;
  nextBack: string | null;
};

const resolveBundledImageSource = async (
  imageName: string,
  imageLookup: Map<string, any>,
  timing: ImageHydrationTiming,
): Promise<ResolvedBundledImage | null> => {
  const imageModule = imageLookup.get(imageName);
  if (!imageModule) return null;
  const assetStartedAt = performance.now();
  const asset = Asset.fromModule(imageModule);
  await asset.downloadAsync();
  timing.assetResolutionWorkerMs += elapsedMs(assetStartedAt);
  const uri = asset.localUri ?? asset.uri;
  if (!uri) return null;
  return { uri, type: asset.type };
};

export async function hydrateBundledImagePaths(
  db: SQLite.SQLiteDatabase
): Promise<ImageHydrationTiming> {
  const timing = createImageHydrationTiming();
  const imageLookup = buildImageLookup();
  if (imageLookup.size === 0) {
    return timing;
  }

  const rows = await db.getAllAsync<ImageHydrationRow>(
    `SELECT
       id,
       image_front AS imageFront,
       image_back AS imageBack
     FROM custom_flashcards
     WHERE image_front IS NOT NULL OR image_back IS NOT NULL;`
  );

  const rowsToHydrate = rows.filter((row) => {
    const frontNeedsHydration = isUnresolvedBundledImageRef(row.imageFront);
    const backNeedsHydration = isUnresolvedBundledImageRef(row.imageBack);
    timing.imageReferences += Number(frontNeedsHydration) + Number(backNeedsHydration);
    return frontNeedsHydration || backNeedsHydration;
  });
  if (rowsToHydrate.length === 0) {
    return timing;
  }

  const imageDirectory = await prepareImagesDirectory();
  const sourceCache = new Map<string, Promise<ResolvedBundledImage | null>>();
  const getSource = (imageName: string) => {
    let source = sourceCache.get(imageName);
    if (!source) {
      source = resolveBundledImageSource(imageName, imageLookup, timing);
      sourceCache.set(imageName, source);
    }
    return source;
  };
  const copyImage = async (imageName: string): Promise<string | null> => {
    const source = await getSource(imageName);
    if (!source) return null;
    const copyStartedAt = performance.now();
    const savedUri = await saveImageInDirectory(
      source.uri,
      imageDirectory,
      source.type
    );
    timing.fileCopyWorkerMs += elapsedMs(copyStartedAt);
    timing.hydratedImages += 1;
    return savedUri;
  };

  for (let start = 0; start < rowsToHydrate.length; start += IMAGE_HYDRATION_BATCH_SIZE) {
    const batch = rowsToHydrate.slice(start, start + IMAGE_HYDRATION_BATCH_SIZE);
    const batchCreatedUris: string[] = [];
    try {
      const hydratedRows = await runWithConcurrency(
        batch,
        IMAGE_COPY_WORKERS,
        async (row): Promise<HydratedImageRow> => {
          const copyForBatch = async (imageName: string) => {
            const savedUri = await copyImage(imageName);
            if (savedUri) batchCreatedUris.push(savedUri);
            return savedUri;
          };
          return {
            ...row,
            nextFront: isUnresolvedBundledImageRef(row.imageFront)
              ? (await copyForBatch(row.imageFront)) ?? row.imageFront
              : row.imageFront,
            nextBack: isUnresolvedBundledImageRef(row.imageBack)
              ? (await copyForBatch(row.imageBack)) ?? row.imageBack
              : row.imageBack,
          };
        }
      );
      const rowsToUpdate = hydratedRows.filter(
        (row) => row.nextFront !== row.imageFront || row.nextBack !== row.imageBack
      );
      if (rowsToUpdate.length === 0) continue;

      const updateStartedAt = performance.now();
      await db.execAsync("BEGIN TRANSACTION;");
      try {
        const now = Date.now();
        for (const row of rowsToUpdate) {
          await db.runAsync(
            `UPDATE custom_flashcards
             SET image_front = ?, image_back = ?, updated_at = ?
           WHERE id = ?;`,
            row.nextFront,
            row.nextBack,
            now,
            row.id
          );
        }
        await db.execAsync("COMMIT;");
      } catch (error) {
        await db.execAsync("ROLLBACK;");
        throw error;
      }
      timing.databaseUpdateWorkerMs += elapsedMs(updateStartedAt);
      timing.updatedRows += rowsToUpdate.length;
    } catch (error) {
      await Promise.allSettled(batchCreatedUris.map((uri) => deleteImage(uri)));
      throw error;
    }
  }

  if (timing.updatedRows > 0) {
    console.log(`[DB] Hydrated bundled image paths for ${timing.updatedRows} flashcards`);
  }
  return timing;
}

async function doesDeviceDatabaseExist(): Promise<boolean> {
  const directory = SQLite.defaultDatabaseDirectory as string | undefined;
  if (!directory) {
    return false;
  }
  const separator = directory.endsWith("/") ? "" : "/";
  const info = await FileSystem.getInfoAsync(
    toFileSystemUri(`${directory}${separator}${DATABASE_NAME}`)
  );
  return info.exists;
}

async function ensurePrebuiltDatabaseImported(): Promise<void> {
  await SQLite.importDatabaseFromAssetAsync(DATABASE_NAME, {
    assetId: prebuiltDatabaseAsset as number,
    forceOverwrite: false,
  });
  console.log("[DB] prebuilt database asset import checked");
}

async function openBundledSyncDatabase(
  timer?: StartupTimer
): Promise<SQLite.SQLiteDatabase> {
  const importBundledDatabase = () =>
    SQLite.importDatabaseFromAssetAsync(BUNDLED_SYNC_DATABASE_NAME, {
      assetId: prebuiltDatabaseAsset as number,
      forceOverwrite: true,
    });
  if (timer) {
    await timer.measure("officialSyncDatabaseImport", importBundledDatabase);
  } else {
    await importBundledDatabase();
  }
  const openBundledDatabase = () => SQLite.openDatabaseAsync(BUNDLED_SYNC_DATABASE_NAME);
  const bundledDb = timer
    ? await timer.measure("officialSyncDatabaseOpen", openBundledDatabase)
    : await openBundledDatabase();
  console.log(
    `[DB] Bundled prebuilt database version: ${await getDatabaseUserVersion(bundledDb)}`
  );
  return bundledDb;
}

async function getBundledOfficialCourseSnapshot(
  bundledDb: SQLite.SQLiteDatabase,
  slug: string
): Promise<OfficialCourseSnapshot | null> {
  return bundledDb.getFirstAsync<OfficialCourseSnapshot>(
    `SELECT
       id,
       COALESCE(pack_version, 1) AS packVersion,
       (
         SELECT COUNT(*)
         FROM custom_flashcards cf
         WHERE cf.course_id = custom_courses.id
           AND cf.external_id IS NOT NULL
           AND COALESCE(cf.is_official, 0) = 1
       ) AS flashcardsCount
     FROM custom_courses
     WHERE slug = ?
       AND COALESCE(is_official, 0) = 1
     LIMIT 1;`,
    slug
  );
}

async function getOfficialFlashcardsCount(
  db: SQLite.SQLiteDatabase,
  courseId: number
): Promise<number> {
  const row = await db.getFirstAsync<{ flashcardsCount: number }>(
    `SELECT COUNT(*) AS flashcardsCount
     FROM custom_flashcards
     WHERE course_id = ?
       AND external_id IS NOT NULL
       AND COALESCE(is_official, 0) = 1;`,
    courseId
  );
  return row?.flashcardsCount ?? 0;
}

async function getOfficialFlashcardSeedRecords(
  db: SQLite.SQLiteDatabase,
  courseId: number,
  includeUserEdits = false,
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
       ${includeUserEdits ? "cf.is_user_edited" : "0"} AS isUserEdited,
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
        isUserEdited: row.isUserEdited,
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
    getOfficialFlashcardSeedRecords(localDb, courseId, true),
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
        if (existing.isUserEdited === 1) {
          continue;
        }
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
      .filter(
        (card) =>
          !bundledExternalIds.has(card.externalId) && card.isUserEdited !== 1,
      )
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
  db: SQLite.SQLiteDatabase,
  options: { reportStartupProgress?: boolean; timer?: StartupTimer } = {}
): Promise<ImageHydrationTiming> {
  console.log("[DB] Syncing official packs metadata: start");
  let bundledDb: SQLite.SQLiteDatabase | null = null;
  const totalCourses = OFFICIAL_PACKS.length;
  let completedCourses = 0;
  const reportStartupProgress = options.reportStartupProgress ?? true;
  const timer = options.timer;

  const notifyProgress = (completed: number, percent: number): void => {
    if (!reportStartupProgress) {
      return;
    }

    notifyDbInitializationListeners({
      type: "progress",
      completed,
      total: totalCourses,
      percent,
    });
  };

  notifyProgress(0, 10);

  try {
    bundledDb = await openBundledSyncDatabase(timer);
    for (const def of OFFICIAL_PACKS) {
      try {
        const synchronizeCourse = async () => {
          const localCourse = await ensureOfficialCourse(
            db,
            def.slug,
            def.name,
            def.iconId,
            def.iconColor,
            def.reviewsEnabled ?? true
          );
          const bundledCourse = await getBundledOfficialCourseSnapshot(
            bundledDb!,
            def.slug
          );

          if (bundledCourse) {
            const localFlashcardsCount = await getOfficialFlashcardsCount(
              db,
              localCourse.id
            );
            const shouldSyncFlashcards =
              (localCourse.packVersion ?? 0) < (bundledCourse.packVersion ?? 1) ||
              localFlashcardsCount !== bundledCourse.flashcardsCount;

            if (shouldSyncFlashcards) {
              console.log(
                `[DB] Syncing official pack ${def.slug}: local version=${localCourse.packVersion ?? 0}, bundled version=${bundledCourse.packVersion}; local cards=${localFlashcardsCount}, bundled cards=${bundledCourse.flashcardsCount}`
              );
              await syncOfficialCourseFlashcards(
                db,
                bundledDb!,
                localCourse.id,
                bundledCourse.id,
                bundledCourse.packVersion
              );
            }
          }

          if (def.settings) {
            const applySettings = () =>
              applyOfficialCourseSettings(localCourse.id, def.settings!);
            if (timer) {
              await timer.measure("officialCourseSettings", applySettings);
            } else {
              await applySettings();
            }
          }
        };
        if (timer) {
          await timer.measure("officialCourseSync", synchronizeCourse);
        } else {
          await synchronizeCourse();
        }
      } catch (error) {
        console.warn(`[DB] Failed to sync metadata for official pack ${def.slug}`, error);
      } finally {
        completedCourses += 1;
        notifyProgress(
          completedCourses,
          10 + Math.round((completedCourses / totalCourses) * 80),
        );
      }
    }
  } finally {
    await bundledDb?.closeAsync();
  }
  const imageHydration = timer
    ? await timer.measure("imageHydration", () => hydrateBundledImagePaths(db))
    : await hydrateBundledImagePaths(db);
  notifyProgress(totalCourses, 95);
  console.log("[DB] Syncing official packs metadata: done");
  return imageHydration;
}

export async function seedOfficialPacks(): Promise<void> {
  const db = await getDB();
  await seedOfficialPacksWithDb(db, { reportStartupProgress: false });
}

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  const timer = new StartupTimer();
  let initialImport = false;
  let failedStage: string | undefined;

  try {
    try {
      const databaseExists = await timer.measure(
        "databaseExistenceCheck",
        doesDeviceDatabaseExist
      );
      initialImport = isInitialDatabaseImport(databaseExists);
    } catch (error) {
      failedStage = "databaseExistenceCheck";
      console.warn("[DB] Could not check whether device database exists", error);
    }
    notifyDbInitializationListeners({ type: "start" });
    notifyDbInitializationListeners({
      type: "progress",
      completed: 0,
      total: OFFICIAL_PACKS.length,
      percent: 0,
    });
    notifyDbInitializationListeners({ type: "import-start" });
    try {
      await timer.measure("bundledDatabaseImport", ensurePrebuiltDatabaseImported);
    } catch (error) {
      failedStage ??= "bundledDatabaseImport";
      console.warn("[DB] prebuilt database import failed; continuing with regular init", error);
    }
    notifyDbInitializationListeners({
      type: "progress",
      completed: 0,
      total: OFFICIAL_PACKS.length,
      percent: 5,
    });
    notifyDbInitializationListeners({ type: "import-finish" });

    const db = await timer.measure("databaseOpen", openDatabase);
    await timer.measure("schema", () => applySchema(db));
    await timer.measure("pragmas", () => configurePragmas(db));
    notifyDbInitializationListeners({
      type: "progress",
      completed: 0,
      total: OFFICIAL_PACKS.length,
      percent: 10,
    });
    console.log(
      `[DB] Active device database version: ${await getDatabaseUserVersion(db)}`
    );

    let imageHydration: ImageHydrationTiming | undefined;
    try {
      imageHydration = await timer.measure("officialPackSync", () =>
        seedOfficialPacksWithDb(db, { timer })
      );
    } catch (error) {
      failedStage ??= "officialPackSync";
      console.warn("[DB] Failed during official metadata sync", error);
    }

    const durationMs = timer.elapsedMs();
    const stages = timer.snapshot();
    const reportedFailedStage =
      failedStage ??
      Object.entries(stages).find(([, stage]) => stage.failed)?.[0];
    logStartupTiming({
      event: "db-initialization",
      initialImport,
      totalMs: durationMs,
      ...(reportedFailedStage ? { failedStage: reportedFailedStage } : {}),
      stages,
      ...(imageHydration ? { imageHydration } : {}),
    });
    notifyDbInitializationListeners({
      type: "ready",
      initialImport,
      durationMs,
    });
    return db;
  } catch (error) {
    const stages = timer.snapshot();
    const failedStageName =
      failedStage ??
      Object.entries(stages).find(([, stage]) => stage.failed)?.[0];
    logStartupTiming({
      event: "db-initialization",
      initialImport,
      totalMs: timer.elapsedMs(),
      ...(failedStageName ? { failedStage: failedStageName } : {}),
      error: errorMessage(error),
      stages,
    });
    notifyDbInitializationListeners({ type: "error", error });
    throw error;
  }
}
