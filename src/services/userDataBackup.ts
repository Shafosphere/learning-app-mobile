import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  deleteAndReinitializeDB,
  getDB,
  type CustomCourseRecord,
  type CustomFlashcardRecord,
} from "@/src/db/sqlite/db";
import { getCustomCourses } from "@/src/db/sqlite/repositories/courses";
import { getCustomFlashcards } from "@/src/db/sqlite/repositories/flashcards";
import {
  deleteImage,
  imagesDir,
  importImageFromZip,
  isManagedImageUri,
  saveImage,
} from "@/src/services/imageService";
import type { SavedBoxesV2 } from "@/src/hooks/useBoxesPersistenceSnapshot";
import * as FileSystem from "expo-file-system/legacy";
import JSZip from "jszip";
import { getUnlockedAchievements } from "@/src/db/sqlite/repositories/achievements";

export type BuiltinReviewExportRow = {
  wordId: number;
  sourceLangId: number;
  targetLangId: number;
  level: string;
  stage: number;
  learnedAt: number;
  nextReview: number;
};

export type CustomReviewExportRow = {
  flashcardId: number;
  courseId: number;
  stage: number;
  learnedAt: number;
  nextReview: number;
};

export type CustomLearningEventExportRow = {
  flashcardId: number;
  courseId: number | null;
  box: string | null;
  result: "ok" | "wrong";
  durationMs: number | null;
  createdAt: number;
};

export type UserAchievementExportRow = {
  id: string;
  unlockedAt: number;
};

export type BackupFlashcardRecord = Omit<
  CustomFlashcardRecord,
  "imageFront" | "imageBack"
> & {
  imageFront: string | null;
  imageBack: string | null;
};

export type CustomCourseExport = {
  course: CustomCourseRecord;
  flashcards: BackupFlashcardRecord[];
  reviews: CustomReviewExportRow[];
  learningEvents: CustomLearningEventExportRow[];
};

export type UserDataExport = {
  version: 2;
  generatedAt: number;
  builtinReviews: BuiltinReviewExportRow[];
  boxesSnapshots: Record<string, SavedBoxesV2>;
  customBoxesSnapshots: Record<string, SavedBoxesV2>;
  customCourses: CustomCourseExport[];
  officialCourses?: CustomCourseExport[];
  achievements: UserAchievementExportRow[];
};

export type LegacyUserDataExport = {
  version: 1;
  generatedAt: number;
  builtinReviews: BuiltinReviewExportRow[];
  boxesSnapshots: Record<string, SavedBoxesV2>;
  customBoxesSnapshots: Record<string, SavedBoxesV2>;
  customCourses: {
    course: CustomCourseRecord;
    flashcards: CustomFlashcardRecord[];
    reviews: CustomReviewExportRow[];
  }[];
  officialCourses?: {
    course: CustomCourseRecord;
    flashcards: CustomFlashcardRecord[];
    reviews: CustomReviewExportRow[];
  }[];
};

export type AnyUserDataExport = UserDataExport | LegacyUserDataExport;

export type ImportResult = {
  success: boolean;
  message?: string;
  stats?: {
    coursesCreated: number;
    flashcardsCreated: number;
    reviewsRestored: number;
    builtinReviewsRestored: number;
    boxesSnapshotsRestored: number;
    officialCoursesProcessed: number;
    officialReviewsRestored: number;
    officialHintsUpdated: number;
    learningEventsRestored: number;
    achievementsRestored: number;
  };
};

export type BackupArchiveResult = {
  fileUri: string;
  bytesWritten: number;
  payload: UserDataExport;
};

type ImportRestoreOptions = {
  replaceExistingData?: boolean;
};

type RestoredCourseStats = {
  flashcardsCreated: number;
  reviewsRestored: number;
  learningEventsRestored: number;
  hintsUpdated: number;
};

async function tableExists(
  db: Awaited<ReturnType<typeof getDB>>,
  tableName: string
): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1;`,
    tableName
  );
  return Boolean(row?.name);
}

async function collectBoxesSnapshots(prefixes: string[]): Promise<
  Record<string, SavedBoxesV2>
> {
  const keys = await AsyncStorage.getAllKeys();
  const relevant = keys.filter((key) =>
    prefixes.some((prefix) => key.startsWith(prefix))
  );
  if (relevant.length === 0) {
    return {};
  }
  const entries = await AsyncStorage.multiGet(relevant);
  const snapshots: Record<string, SavedBoxesV2> = {};
  for (const [key, value] of entries) {
    if (!value) continue;
    try {
      const parsed = JSON.parse(value) as SavedBoxesV2;
      if (parsed?.v === 2) {
        snapshots[key] = parsed;
      }
    } catch (error) {
      console.warn("[userDataBackup] Failed to parse AsyncStorage snapshot", {
        key,
        error,
      });
    }
  }
  return snapshots;
}

async function buildCourseExport(
  course: CustomCourseRecord
): Promise<CustomCourseExport> {
  const db = await getDB();
  const [flashcards, reviews, learningEvents] = await Promise.all([
    getCustomFlashcards(course.id),
    db.getAllAsync<CustomReviewExportRow>(
      `SELECT
         flashcard_id AS flashcardId,
         course_id    AS courseId,
         stage        AS stage,
         learned_at   AS learnedAt,
         next_review  AS nextReview
       FROM custom_reviews
       WHERE course_id = ?
       ORDER BY flashcard_id ASC;`,
      course.id
    ),
    db.getAllAsync<CustomLearningEventExportRow>(
      `SELECT
         flashcard_id AS flashcardId,
         course_id    AS courseId,
         box          AS box,
         result       AS result,
         duration_ms  AS durationMs,
         created_at   AS createdAt
       FROM custom_learning_events
       WHERE course_id = ?
       ORDER BY created_at ASC, id ASC;`,
      course.id
    ),
  ]);

  return {
    course,
    flashcards: flashcards.map((card) => ({
      ...card,
      imageFront: card.imageFront ?? null,
      imageBack: card.imageBack ?? null,
    })),
    reviews,
    learningEvents,
  };
}

export async function buildUserDataExport(): Promise<UserDataExport> {
  const db = await getDB();
  const hasBuiltinReviewsTable = await tableExists(db, "reviews");
  const builtinReviews = hasBuiltinReviewsTable
    ? await db.getAllAsync<BuiltinReviewExportRow>(
        `SELECT
           word_id        AS wordId,
           source_lang_id AS sourceLangId,
           target_lang_id AS targetLangId,
           level          AS level,
           stage          AS stage,
           learned_at     AS learnedAt,
           next_review    AS nextReview
         FROM reviews
         ORDER BY source_lang_id, target_lang_id, level, word_id;`
      )
    : [];

  const allCourses = await getCustomCourses();
  const customCourses = allCourses.filter((course) => !course.isOfficial);
  const officialCourses = allCourses.filter((course) => course.isOfficial);

  const [customCoursesExport, officialCoursesExport, boxesSnapshots, customBoxesSnapshots, achievements] =
    await Promise.all([
      Promise.all(customCourses.map((course) => buildCourseExport(course))),
      Promise.all(officialCourses.map((course) => buildCourseExport(course))),
      collectBoxesSnapshots(["boxes:"]),
      collectBoxesSnapshots(["customBoxes:"]),
      getUnlockedAchievements(),
    ]);

  return {
    version: 2,
    generatedAt: Date.now(),
    builtinReviews,
    boxesSnapshots,
    customBoxesSnapshots,
    customCourses: customCoursesExport,
    officialCourses: officialCoursesExport,
    achievements,
  };
}

function extractExtension(uri?: string | null): string {
  if (!uri) return "jpg";
  const match = /\.([a-z0-9]{2,5})($|\?)/i.exec(uri);
  const ext = match?.[1]?.toLowerCase();
  if (!ext) return "jpg";
  return ext === "jpeg" ? "jpg" : ext;
}

function buildArchiveName(): string {
  return "memicard-drive-backup-latest.zip";
}

function getWritableDir(): string {
  const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!baseDir) {
    throw new Error("Brak katalogu dokumentów do zapisu backupu.");
  }
  return baseDir;
}

async function addImageToArchive(
  zip: JSZip,
  uri: string | null,
  pathPrefix: string,
  side: "front" | "back",
  cache: Map<string, string>
): Promise<string | null> {
  if (!uri) return null;

  if (cache.has(uri)) {
    return cache.get(uri) ?? null;
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || info.isDirectory) {
    return uri;
  }

  const zipPath = `${pathPrefix}-${side}.${extractExtension(uri)}`;
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  zip.file(zipPath, base64, { base64: true });
  cache.set(uri, zipPath);
  return zipPath;
}

export async function createBackupZip(): Promise<BackupArchiveResult> {
  const payload = await buildUserDataExport();
  const zip = new JSZip();
  const imageCache = new Map<string, string>();

  const mapCourseImages = async (
    courses: CustomCourseExport[]
  ): Promise<CustomCourseExport[]> => {
    const mapped: CustomCourseExport[] = [];
    for (const courseExport of courses) {
      const flashcards: BackupFlashcardRecord[] = [];
      for (const card of courseExport.flashcards) {
        const prefix = `images/course-${courseExport.course.id}/card-${card.id}`;
        flashcards.push({
          ...card,
          imageFront: await addImageToArchive(
            zip,
            card.imageFront,
            prefix,
            "front",
            imageCache
          ),
          imageBack: await addImageToArchive(
            zip,
            card.imageBack,
            prefix,
            "back",
            imageCache
          ),
        });
      }

      mapped.push({
        ...courseExport,
        flashcards,
      });
    }

    return mapped;
  };

  const archivePayload: UserDataExport = {
    ...payload,
    customCourses: await mapCourseImages(payload.customCourses),
    officialCourses: payload.officialCourses
      ? await mapCourseImages(payload.officialCourses)
      : [],
  };

  zip.file("manifest.json", JSON.stringify(archivePayload, null, 2));

  const zipBase64 = await zip.generateAsync({ type: "base64" });
  const fileUri = `${getWritableDir()}${buildArchiveName()}`;
  await FileSystem.writeAsStringAsync(fileUri, zipBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const info = await FileSystem.getInfoAsync(fileUri);

  return {
    fileUri,
    bytesWritten: info.exists ? info.size : Math.floor((zipBase64.length * 3) / 4),
    payload,
  };
}

async function materializeZipImages(
  zip: JSZip,
  courses: CustomCourseExport[]
): Promise<CustomCourseExport[]> {
  const extracted = new Map<string, string>();

  const materialize = async (zipPath: string | null): Promise<string | null> => {
    if (!zipPath) return null;
    if (!zipPath.startsWith("images/")) {
      return zipPath;
    }
    if (extracted.has(zipPath)) {
      return extracted.get(zipPath) ?? null;
    }

    const entry = zip.file(zipPath);
    if (!entry) {
      return null;
    }
    const base64 = await entry.async("base64");
    const localUri = await importImageFromZip(
      base64,
      zipPath.split("/").pop() ?? "image.jpg"
    );
    extracted.set(zipPath, localUri);
    return localUri;
  };

  const mapped: CustomCourseExport[] = [];
  for (const courseExport of courses) {
    const flashcards: BackupFlashcardRecord[] = [];
    for (const card of courseExport.flashcards) {
      flashcards.push({
        ...card,
        imageFront: await materialize(card.imageFront),
        imageBack: await materialize(card.imageBack),
      });
    }
    mapped.push({
      ...courseExport,
      flashcards,
    });
  }
  return mapped;
}

function normalizeImportedData(data: AnyUserDataExport): UserDataExport {
  if (data.version === 2) {
    return {
      ...data,
      achievements: data.achievements ?? [],
      officialCourses: data.officialCourses ?? [],
    };
  }

  const mapLegacyCourse = (
    courseExport: LegacyUserDataExport["customCourses"][number]
  ): CustomCourseExport => ({
    course: courseExport.course,
    flashcards: courseExport.flashcards.map((card) => ({
      ...card,
      imageFront: card.imageFront ?? null,
      imageBack: card.imageBack ?? null,
    })),
    reviews: courseExport.reviews,
    learningEvents: [],
  });

  return {
    version: 2,
    generatedAt: data.generatedAt,
    builtinReviews: data.builtinReviews ?? [],
    boxesSnapshots: data.boxesSnapshots ?? {},
    customBoxesSnapshots: data.customBoxesSnapshots ?? {},
    customCourses: (data.customCourses ?? []).map(mapLegacyCourse),
    officialCourses: (data.officialCourses ?? []).map(mapLegacyCourse),
    achievements: [],
  };
}

export async function readBackupArchive(
  fileUri: string
): Promise<UserDataExport> {
  const zipBase64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const zip = await JSZip.loadAsync(zipBase64, { base64: true });
  const manifestEntry = zip.file("manifest.json");
  if (!manifestEntry) {
    throw new Error("Backup ZIP nie zawiera pliku manifest.json.");
  }

  const manifestText = await manifestEntry.async("text");
  const normalized = normalizeImportedData(
    JSON.parse(manifestText) as AnyUserDataExport
  );

  return {
    ...normalized,
    customCourses: await materializeZipImages(zip, normalized.customCourses),
    officialCourses: normalized.officialCourses
      ? await materializeZipImages(zip, normalized.officialCourses)
      : [],
  };
}

async function persistImageIfAvailable(uri?: string | null): Promise<string | null> {
  if (!uri) return null;
  if (isManagedImageUri(uri)) {
    return uri;
  }

  try {
    return await saveImage(uri);
  } catch (error) {
    console.warn("[userDataBackup] Failed to persist image", { uri, error });
    return null;
  }
}

const normalizeImportedType = (
  value?: string | null
): "text" | "true_false" | "know_dont_know" => {
  if (!value) return "text";
  const normalized = value.toString().trim().toLowerCase();
  if (normalized === "true_false" || normalized === "know_dont_know") {
    return normalized;
  }
  return "text";
};

async function restoreCustomCourse(
  db: Awaited<ReturnType<typeof getDB>>,
  courseExport: CustomCourseExport
): Promise<RestoredCourseStats> {
  const { course, flashcards, reviews, learningEvents } = courseExport;
  const now = Date.now();
  const insertCourseResult = await db.runAsync(
    `INSERT INTO custom_courses (name, icon_id, icon_color, color_id, reviews_enabled, created_at, updated_at, is_official, slug, pack_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    course.name,
    course.iconId,
    course.iconColor,
    course.colorId ?? null,
    course.reviewsEnabled ? 1 : 0,
    course.createdAt,
    now,
    course.isOfficial ? 1 : 0,
    course.slug ?? null,
    course.packVersion ?? 1
  );
  const newCourseId = Number(insertCourseResult.lastInsertRowId ?? 0);

  const oldToNewFlashcardId = new Map<number, number>();
  let flashcardsCreated = 0;
  let reviewsRestored = 0;
  let learningEventsRestored = 0;

  for (const card of flashcards) {
    const insertCardResult = await db.runAsync(
      `INSERT INTO custom_flashcards
         (course_id, front_text, back_text, hint_front, hint_back, image_front, image_back, explanation, position, flipped, answer_only, type, external_id, is_official, reset_progress_on_update, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      newCourseId,
      card.frontText,
      card.backText,
      card.hintFront ?? null,
      card.hintBack ?? null,
      await persistImageIfAvailable(card.imageFront),
      await persistImageIfAvailable(card.imageBack),
      card.explanation ?? null,
      card.position,
      card.flipped ? 1 : 0,
      card.answerOnly ? 1 : 0,
      normalizeImportedType(card.type),
      card.externalId ?? null,
      card.isOfficial ? 1 : 0,
      card.resetProgressOnUpdate ? 1 : 0,
      card.createdAt,
      now
    );

    const newFlashcardId = Number(insertCardResult.lastInsertRowId ?? 0);
    oldToNewFlashcardId.set(card.id, newFlashcardId);
    flashcardsCreated++;

    for (const answer of card.answers ?? []) {
      await db.runAsync(
        `INSERT OR IGNORE INTO custom_flashcard_answers
           (flashcard_id, answer_text, created_at)
         VALUES (?, ?, ?);`,
        newFlashcardId,
        answer,
        now
      );
    }
  }

  for (const review of reviews) {
    const newFlashcardId = oldToNewFlashcardId.get(review.flashcardId);
    if (!newFlashcardId) continue;
    await db.runAsync(
      `INSERT OR REPLACE INTO custom_reviews
         (course_id, flashcard_id, learned_at, next_review, stage)
       VALUES (?, ?, ?, ?, ?);`,
      newCourseId,
      newFlashcardId,
      review.learnedAt,
      review.nextReview,
      review.stage
    );
    reviewsRestored++;
  }

  for (const event of learningEvents ?? []) {
    const newFlashcardId = oldToNewFlashcardId.get(event.flashcardId);
    if (!newFlashcardId) continue;
    await db.runAsync(
      `INSERT INTO custom_learning_events
         (flashcard_id, course_id, box, result, duration_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      newFlashcardId,
      newCourseId,
      event.box ?? null,
      event.result,
      event.durationMs ?? null,
      event.createdAt
    );
    learningEventsRestored++;
  }

  return {
    flashcardsCreated,
    reviewsRestored,
    learningEventsRestored,
    hintsUpdated: 0,
  };
}

async function restoreOfficialCourse(
  db: Awaited<ReturnType<typeof getDB>>,
  courseExport: CustomCourseExport
): Promise<RestoredCourseStats> {
  const slug = courseExport.course.slug ?? null;
  let targetCourseId: number | null = null;

  if (slug) {
    const existing = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM custom_courses WHERE slug = ? LIMIT 1;`,
      slug
    );
    if (existing?.id) {
      targetCourseId = existing.id;
      const now = Date.now();
      await db.runAsync(
        `UPDATE custom_courses
           SET name = ?,
               icon_id = ?,
               icon_color = ?,
               color_id = ?,
               reviews_enabled = ?,
               is_official = 1,
               slug = ?,
               pack_version = ?,
               updated_at = ?
         WHERE id = ?;`,
        courseExport.course.name,
        courseExport.course.iconId,
        courseExport.course.iconColor,
        courseExport.course.colorId ?? null,
        courseExport.course.reviewsEnabled ? 1 : 0,
        slug,
        courseExport.course.packVersion ?? 1,
        now,
        targetCourseId
      );
    }
  }

  if (targetCourseId == null) {
    const now = Date.now();
    const inserted = await db.runAsync(
      `INSERT INTO custom_courses (name, icon_id, icon_color, color_id, reviews_enabled, created_at, updated_at, is_official, slug, pack_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
      courseExport.course.name,
      courseExport.course.iconId,
      courseExport.course.iconColor,
      courseExport.course.colorId ?? null,
      courseExport.course.reviewsEnabled ? 1 : 0,
      courseExport.course.createdAt ?? now,
      now,
      slug,
      courseExport.course.packVersion ?? 1
    );
    targetCourseId = Number(inserted.lastInsertRowId ?? 0);
  }

  if (!targetCourseId) {
    throw new Error("Nie udało się odtworzyć kursu oficjalnego.");
  }

  const existingCards = await db.getAllAsync<{
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
    externalId: string | null;
    isOfficial: number;
    resetProgressOnUpdate: number;
    type: string | null;
    createdAt: number;
    updatedAt: number;
    answerText: string | null;
  }>(
    `SELECT
       cf.id            AS id,
       cf.front_text    AS frontText,
       cf.back_text     AS backText,
       cf.hint_front    AS hintFront,
       cf.hint_back     AS hintBack,
       cf.image_front   AS imageFront,
       cf.image_back    AS imageBack,
       cf.explanation   AS explanation,
       cf.position      AS position,
       cf.flipped       AS flipped,
       cf.answer_only   AS answerOnly,
       cf.external_id   AS externalId,
       cf.is_official   AS isOfficial,
       cf.reset_progress_on_update AS resetProgressOnUpdate,
       cf.type          AS type,
       cf.created_at    AS createdAt,
       cf.updated_at    AS updatedAt,
       cfa.answer_text  AS answerText
     FROM custom_flashcards cf
     LEFT JOIN custom_flashcard_answers cfa ON cfa.flashcard_id = cf.id
     WHERE cf.course_id = ?
     ORDER BY cf.position IS NULL,
              cf.position ASC,
              cf.id ASC,
              cfa.id ASC;`,
    targetCourseId
  );

  const existingById = new Map<number, CustomFlashcardRecord>();
  const externalIdMap = new Map<string, CustomFlashcardRecord>();
  const positionMap = new Map<number, CustomFlashcardRecord>();
  const frontBackMap = new Map<string, CustomFlashcardRecord[]>();

  for (const row of existingCards) {
    let record = existingById.get(row.id);
    if (!record) {
      record = {
        id: row.id,
        courseId: targetCourseId,
        frontText: row.frontText,
        backText: row.backText,
        hintFront: row.hintFront,
        hintBack: row.hintBack,
        imageFront: row.imageFront,
        imageBack: row.imageBack,
        explanation: row.explanation,
        answers: [],
        position: row.position,
        flipped: row.flipped === 1,
        answerOnly: row.answerOnly === 1,
        externalId: row.externalId,
        isOfficial: row.isOfficial === 1,
        resetProgressOnUpdate: row.resetProgressOnUpdate === 1,
        type: row.type ?? "text",
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
      existingById.set(row.id, record);
      if (record.externalId) {
        externalIdMap.set(record.externalId, record);
      }
      if (record.position != null) {
        positionMap.set(record.position, record);
      }
      const key = `${record.frontText}|||${record.backText}`;
      const list = frontBackMap.get(key) ?? [];
      list.push(record);
      frontBackMap.set(key, list);
    }
    if (row.answerText) {
      record.answers.push(row.answerText);
    }
  }

  const oldToNewFlashcardId = new Map<number, number>();
  let flashcardsCreated = 0;
  let reviewsRestored = 0;
  let learningEventsRestored = 0;
  let hintsUpdated = 0;
  const now = Date.now();

  const findExistingCard = (
    card: BackupFlashcardRecord
  ): CustomFlashcardRecord | null => {
    if (card.externalId && externalIdMap.has(card.externalId)) {
      return externalIdMap.get(card.externalId) ?? null;
    }
    if (card.position != null && positionMap.has(card.position)) {
      return positionMap.get(card.position) ?? null;
    }
    const key = `${card.frontText}|||${card.backText}`;
    const list = frontBackMap.get(key);
    return list?.[0] ?? null;
  };

  for (const card of courseExport.flashcards) {
    const existing = findExistingCard(card);
    if (existing) {
      oldToNewFlashcardId.set(card.id, existing.id);
      const nextHintFront = card.hintFront ?? null;
      const nextHintBack = card.hintBack ?? null;
      const nextAnswerOnly = card.answerOnly ?? false;
      const nextImageFront = await persistImageIfAvailable(card.imageFront);
      const nextImageBack = await persistImageIfAvailable(card.imageBack);
      const nextType = normalizeImportedType(card.type);
      const nextExternalId = card.externalId ?? null;
      const nextResetProgressOnUpdate = card.resetProgressOnUpdate ?? false;
      const shouldUpdateHints =
        nextHintFront !== (existing.hintFront ?? null) ||
        nextHintBack !== (existing.hintBack ?? null);
      const shouldUpdateAnswerOnly =
        nextAnswerOnly !== (existing.answerOnly ?? false);
      const shouldUpdateImages =
        nextImageFront !== (existing.imageFront ?? null) ||
        nextImageBack !== (existing.imageBack ?? null);
      const shouldUpdateType = nextType !== (existing.type ?? "text");
      const shouldUpdateSyncFields =
        nextExternalId !== (existing.externalId ?? null) ||
        !existing.isOfficial ||
        nextResetProgressOnUpdate !== (existing.resetProgressOnUpdate ?? false);

      if (
        shouldUpdateHints ||
        shouldUpdateAnswerOnly ||
        shouldUpdateImages ||
        shouldUpdateType ||
        shouldUpdateSyncFields
      ) {
        await db.runAsync(
          `UPDATE custom_flashcards
             SET hint_front = ?,
                 hint_back = ?,
                 image_front = ?,
                 image_back = ?,
                 answer_only = ?,
                 type = ?,
                 external_id = ?,
                 is_official = 1,
                 reset_progress_on_update = ?,
                 updated_at = ?
           WHERE id = ?;`,
          nextHintFront,
          nextHintBack,
          nextImageFront,
          nextImageBack,
          nextAnswerOnly ? 1 : 0,
          nextType,
          nextExternalId,
          nextResetProgressOnUpdate ? 1 : 0,
          now,
          existing.id
        );
        if (shouldUpdateImages) {
          if (existing.imageFront && existing.imageFront !== nextImageFront) {
            await deleteImage(existing.imageFront);
          }
          if (existing.imageBack && existing.imageBack !== nextImageBack) {
            await deleteImage(existing.imageBack);
          }
        }
        if (shouldUpdateHints) {
          hintsUpdated++;
        }
      }
      continue;
    }

    const insertCardResult = await db.runAsync(
      `INSERT INTO custom_flashcards
         (course_id, front_text, back_text, hint_front, hint_back, image_front, image_back, explanation, position, flipped, answer_only, type, external_id, is_official, reset_progress_on_update, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      targetCourseId,
      card.frontText,
      card.backText,
      card.hintFront ?? null,
      card.hintBack ?? null,
      await persistImageIfAvailable(card.imageFront),
      await persistImageIfAvailable(card.imageBack),
      card.explanation ?? null,
      card.position,
      card.flipped ? 1 : 0,
      card.answerOnly ? 1 : 0,
      normalizeImportedType(card.type),
      card.externalId ?? null,
      1,
      card.resetProgressOnUpdate ? 1 : 0,
      card.createdAt ?? now,
      now
    );
    const newFlashcardId = Number(insertCardResult.lastInsertRowId ?? 0);
    oldToNewFlashcardId.set(card.id, newFlashcardId);
    flashcardsCreated++;

    for (const answer of card.answers ?? []) {
      await db.runAsync(
        `INSERT OR IGNORE INTO custom_flashcard_answers
           (flashcard_id, answer_text, created_at)
         VALUES (?, ?, ?);`,
        newFlashcardId,
        answer,
        now
      );
    }
  }

  for (const review of courseExport.reviews) {
    const newFlashcardId = oldToNewFlashcardId.get(review.flashcardId);
    if (!newFlashcardId) continue;
    await db.runAsync(
      `INSERT OR REPLACE INTO custom_reviews
         (course_id, flashcard_id, learned_at, next_review, stage)
       VALUES (?, ?, ?, ?, ?);`,
      targetCourseId,
      newFlashcardId,
      review.learnedAt,
      review.nextReview,
      review.stage
    );
    reviewsRestored++;
  }

  for (const event of courseExport.learningEvents ?? []) {
    const newFlashcardId = oldToNewFlashcardId.get(event.flashcardId);
    if (!newFlashcardId) continue;
    await db.runAsync(
      `INSERT INTO custom_learning_events
         (flashcard_id, course_id, box, result, duration_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      newFlashcardId,
      targetCourseId,
      event.box ?? null,
      event.result,
      event.durationMs ?? null,
      event.createdAt
    );
    learningEventsRestored++;
  }

  return {
    flashcardsCreated,
    reviewsRestored,
    learningEventsRestored,
    hintsUpdated,
  };
}

async function clearManagedImages(): Promise<void> {
  try {
    const dir = imagesDir();
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists || !info.isDirectory) {
      return;
    }
    const entries = await FileSystem.readDirectoryAsync(dir);
    await Promise.all(
      entries.map((entry) =>
        FileSystem.deleteAsync(`${dir}${entry}`, { idempotent: true })
      )
    );
  } catch (error) {
    console.warn("[userDataBackup] Failed to clear managed images", error);
  }
}

async function resetReplaceableStorageState(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const boxKeys = keys.filter(
    (key) => key.startsWith("boxes:") || key.startsWith("customBoxes:")
  );
  if (boxKeys.length > 0) {
    await AsyncStorage.multiRemove(boxKeys);
  }

  const customOverrideResets: [string, string][] = [];
  const overrideKeys = [
    "flashcards.courseBoxZeroOverrides",
    "flashcards.courseAutoflowOverrides",
    "flashcards.courseCardSizeOverrides",
    "flashcards.courseImageSizeOverrides",
    "flashcards.courseImageFrameOverrides",
    "flashcards.courseSkipCorrectionOverrides",
    "flashcards.courseTrueFalseButtonsOverrides",
  ];

  for (const key of overrideKeys) {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as { builtin?: object; custom?: object };
      customOverrideResets.push([
        key,
        JSON.stringify({
          builtin: parsed?.builtin ?? {},
          custom: {},
        }),
      ]);
    } catch (error) {
      console.warn("[userDataBackup] Failed to normalize override key", {
        key,
        error,
      });
    }
  }

  if (customOverrideResets.length > 0) {
    await AsyncStorage.multiSet(customOverrideResets);
  }

  await AsyncStorage.multiSet([
    ["activeCustomCourseId", JSON.stringify(null)],
    ["officialPinnedCourseIds", JSON.stringify([])],
  ]);
}

export async function restoreUserData(
  input: AnyUserDataExport,
  options?: ImportRestoreOptions & {
    targetDb?: Awaited<ReturnType<typeof getDB>>;
  }
): Promise<ImportResult> {
  try {
    const normalized = normalizeImportedData(input);

    if (options?.replaceExistingData) {
      await clearManagedImages();
      await resetReplaceableStorageState();
      await deleteAndReinitializeDB();
    }

    const db = options?.targetDb ?? (await getDB());
    const builtinReviewsTableExists = await tableExists(db, "reviews");
    let coursesCreated = 0;
    let flashcardsCreatedTotal = 0;
    let reviewsRestoredTotal = 0;
    let builtinReviewsRestored = 0;
    let officialCoursesProcessed = 0;
    let officialReviewsRestored = 0;
    let officialHintsUpdated = 0;
    let learningEventsRestored = 0;
    let achievementsRestored = 0;

    await db.execAsync("BEGIN TRANSACTION;");
    try {
      if (normalized.builtinReviews && builtinReviewsTableExists) {
        for (const review of normalized.builtinReviews) {
          await db.runAsync(
            `INSERT OR REPLACE INTO reviews
               (word_id, source_lang_id, target_lang_id, level, stage, learned_at, next_review)
             VALUES (?, ?, ?, ?, ?, ?, ?);`,
            review.wordId,
            review.sourceLangId,
            review.targetLangId,
            review.level,
            review.stage,
            review.learnedAt,
            review.nextReview
          );
          builtinReviewsRestored++;
        }
      }

      for (const courseExport of normalized.customCourses ?? []) {
        const stats = await restoreCustomCourse(db, courseExport);
        coursesCreated++;
        flashcardsCreatedTotal += stats.flashcardsCreated;
        reviewsRestoredTotal += stats.reviewsRestored;
        learningEventsRestored += stats.learningEventsRestored;
      }

      for (const achievement of normalized.achievements ?? []) {
        await db.runAsync(
          `INSERT OR REPLACE INTO user_achievements (id, unlocked_at) VALUES (?, ?);`,
          achievement.id,
          achievement.unlockedAt
        );
        achievementsRestored++;
      }

      await db.execAsync("COMMIT;");
    } catch (error) {
      await db.execAsync("ROLLBACK;");
      throw error;
    }

    const officialDb = options?.targetDb ? db : await getDB();
    for (const courseExport of normalized.officialCourses ?? []) {
      const stats = await restoreOfficialCourse(officialDb, courseExport);
      officialCoursesProcessed++;
      flashcardsCreatedTotal += stats.flashcardsCreated;
      officialReviewsRestored += stats.reviewsRestored;
      officialHintsUpdated += stats.hintsUpdated;
      learningEventsRestored += stats.learningEventsRestored;
    }

    const pairs: [string, string][] = [];
    let boxesSnapshotsRestored = 0;
    for (const [key, value] of Object.entries(normalized.boxesSnapshots ?? {})) {
      pairs.push([key, JSON.stringify(value)]);
      boxesSnapshotsRestored++;
    }
    for (const [key, value] of Object.entries(
      normalized.customBoxesSnapshots ?? {}
    )) {
      pairs.push([key, JSON.stringify(value)]);
      boxesSnapshotsRestored++;
    }

    if (pairs.length > 0) {
      await AsyncStorage.multiSet(pairs);
    }

    return {
      success: true,
      stats: {
        coursesCreated,
        flashcardsCreated: flashcardsCreatedTotal,
        reviewsRestored: reviewsRestoredTotal,
        builtinReviewsRestored,
        boxesSnapshotsRestored,
        officialCoursesProcessed,
        officialReviewsRestored,
        officialHintsUpdated,
        learningEventsRestored,
        achievementsRestored,
      },
    };
  } catch (error) {
    console.error("[userDataBackup] Restore failed", error);
    return {
      success: false,
      message: "Wystąpił błąd podczas przywracania danych.",
    };
  }
}
