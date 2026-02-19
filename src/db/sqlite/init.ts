import { OFFICIAL_PACKS, type OfficialPackCourseSettings } from "@/src/constants/officialPacks";
import prebuiltDatabaseAsset from "@/assets/db/prebuilt.db";
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

export async function seedOfficialPacksWithDb(
  db: SQLite.SQLiteDatabase
): Promise<void> {
  console.log("[DB] Syncing official packs metadata: start");
  for (const def of OFFICIAL_PACKS) {
    try {
      const id = await ensureOfficialCourse(
        db,
        def.slug,
        def.name,
        def.iconId,
        def.iconColor,
        def.reviewsEnabled ?? true
      );
      if (def.settings) {
        await applyOfficialCourseSettings(id, def.settings);
      }
    } catch (error) {
      console.warn(`[DB] Failed to sync metadata for official pack ${def.slug}`, error);
    }
  }
  await hydrateBundledImagePaths(db);
  console.log("[DB] Syncing official packs metadata: done");
}

export async function seedOfficialPacks(): Promise<void> {
  const db = await getDB();
  return seedOfficialPacksWithDb(db);
}

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
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
}
