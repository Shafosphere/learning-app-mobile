import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  deleteAndReinitializeDB,
  getDB,
  type CustomCourseRecord,
  type CustomFlashcardRecord,
} from "@/src/db/sqlite/db";
import { getCustomCourses } from "@/src/db/sqlite/repositories/courses";
import { getCustomFlashcards } from "@/src/db/sqlite/repositories/flashcards";
import { mapCustomCardToWord } from "@/src/utils/flashcardsMapper";
import {
  imagesDir,
  importImageFromZip,
  isManagedImageUri,
  saveImage,
} from "@/src/services/imageService";
import type { SavedBoxesV2 } from "@/src/hooks/useBoxesPersistenceSnapshot";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import JSZip from "jszip";
import { Platform } from "react-native";

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

export type BackupFlashcardRecord = Omit<
  CustomFlashcardRecord,
  "imageFront" | "imageBack"
> & {
  imageFront: string | null;
  imageBack: string | null;
};

export type OfficialFlashcardIdentityExport = {
  externalId: string | null;
  position: number | null;
  frontText: string;
  backText: string;
};

export type OfficialCourseReviewExportRow = OfficialFlashcardIdentityExport & {
  stage: number;
  learnedAt: number;
  nextReview: number;
};

export type OfficialCourseLearningEventExportRow =
  OfficialFlashcardIdentityExport & {
    box: string | null;
    result: "ok" | "wrong";
    durationMs: number | null;
    createdAt: number;
  };

export type OfficialCourseHintExportRow = OfficialFlashcardIdentityExport & {
  hintFront: string | null;
  hintBack: string | null;
};

export type OfficialCourseSnapshotExport = {
  slug: string;
  reviews: OfficialCourseReviewExportRow[];
  learningEvents: OfficialCourseLearningEventExportRow[];
  hints: OfficialCourseHintExportRow[];
};

export type OfficialCourseStateExport = {
  pinnedOfficialCourseSlugs: string[];
  lastActiveOfficialCourseSlug: string | null;
  boxSnapshots: Record<string, SavedBoxesV2>;
  courses: OfficialCourseSnapshotExport[];
};

export type CustomCourseExport = {
  backupCourseKey: string;
  course: CustomCourseRecord;
  flashcards: BackupFlashcardRecord[];
  reviews: CustomReviewExportRow[];
  learningEvents: CustomLearningEventExportRow[];
};

export type UserDataExport = {
  version: 3;
  generatedAt: number;
  builtinReviews: BuiltinReviewExportRow[];
  boxesSnapshots: Record<string, SavedBoxesV2>;
  customCourseBoxSnapshots: Record<string, SavedBoxesV2>;
  customCourses: CustomCourseExport[];
  officialCourseState: OfficialCourseStateExport;
};

export type BackupContentSummary = {
  customCoursesCount: number;
  customFlashcardsCount: number;
  reviewEntriesCount: number;
  learningEventsCount: number;
  officialCoursesCount: number;
};

export type BackupArchiveManifest = {
  schemaVersion: 1;
  appVersion: string;
  createdAt: string;
  backupSource: string;
  contentSummary: BackupContentSummary;
};

export type BackupArchivePackage = {
  manifest: BackupArchiveManifest;
  payload: UserDataExport;
};

export type ImportResult = {
  success: boolean;
  message?: string;
  restoredState?: {
    pinnedOfficialCourseIds: number[];
    activeCustomCourseId: number | null;
    activeCourseIdx: number | null;
    shouldApplySelection: boolean;
    shouldMarkOnboardingDone: boolean;
  };
  stats?: {
    coursesCreated: number;
    flashcardsCreated: number;
    reviewsRestored: number;
    builtinReviewsRestored: number;
    officialPinnedCoursesRestored: number;
    officialActiveCourseRestored: number;
    boxSnapshotsRestored: number;
    officialReviewsRestored: number;
    officialCoursesSkipped: number;
    learningEventsRestored: number;
  };
};

export type BackupArchiveResult = {
  fileUri: string;
  bytesWritten: number;
  manifest: BackupArchiveManifest;
  payload: UserDataExport;
};

type ImportRestoreOptions = {
  replaceExistingData?: boolean;
};

type RestoredCourseStats = {
  backupCourseKey: string;
  courseId: number;
  flashcardsCreated: number;
  reviewsRestored: number;
  learningEventsRestored: number;
  hintsUpdated: number;
};

type LegacyUserAchievementExportRow = {
  id: string;
  unlockedAt: number;
};

type LegacyUserDataExport = UserDataExport & {
  achievements?: LegacyUserAchievementExportRow[];
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

function makeCustomCourseBackupKey(courseId: number): string {
  return `custom-course:${courseId}`;
}

function buildCustomRuntimeSnapshotKey(courseId: number): string {
  return `customBoxes:${courseId}-${courseId}-custom-${courseId}`;
}

function parseCustomCourseIdFromSnapshot(
  storageKey: string,
  snapshot: SavedBoxesV2
): number | null {
  const keyMatch = /^customBoxes:(\d+)-(\d+)-custom-(\d+)$/.exec(storageKey);
  if (keyMatch) {
    const [, sourceId, targetId, levelId] = keyMatch;
    if (sourceId === targetId && targetId === levelId) {
      return Number(levelId);
    }
  }

  const levelMatch = /^custom-(\d+)$/.exec(snapshot.level);
  if (levelMatch) {
    return Number(levelMatch[1]);
  }

  if (
    snapshot.sourceLangId === snapshot.targetLangId &&
    snapshot.sourceLangId > 0
  ) {
    return snapshot.sourceLangId;
  }

  return null;
}

function remapSnapshotToCourseId(
  snapshot: SavedBoxesV2,
  courseId: number
): SavedBoxesV2 {
  return {
    ...snapshot,
    courseId: `${courseId}-${courseId}-custom-${courseId}`,
    sourceLangId: courseId,
    targetLangId: courseId,
    level: `custom-${courseId}`,
  };
}

function buildWordIdentityKey(
  item: Pick<CustomFlashcardRecord, "frontText" | "backText" | "answers"> | {
    text: string;
    translations: string[];
  }
): string {
  if ("frontText" in item) {
    const answers = (item.answers ?? [])
      .map((answer) => answer.trim())
      .filter((answer) => answer.length > 0);
    const backValues =
      answers.length > 0
        ? answers
        : (item.backText ?? "")
            .split(/[;,\n]/)
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0);
    return `${item.frontText.trim()}|||${backValues.join("|")}`;
  }

  return `${item.text.trim()}|||${(item.translations ?? [])
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .join("|")}`;
}

async function rehydrateOfficialSnapshot(
  courseId: number,
  snapshot: SavedBoxesV2
): Promise<SavedBoxesV2> {
  const currentCards = await getCustomFlashcards(courseId);
  const currentWords = currentCards.map(mapCustomCardToWord);
  const currentByIdentity = new Map(
    currentCards.map((card, index) => [
      buildWordIdentityKey(card),
      currentWords[index],
    ])
  );

  const remapBox = (items: SavedBoxesV2["flashcards"]["boxZero"]) =>
    items.map((item) => {
      const current = currentByIdentity.get(buildWordIdentityKey(item));
      if (!current) {
        return {
          ...item,
          id: item.id,
          imageFront: null,
          imageBack: null,
        };
      }

      return {
        ...item,
        id: current.id,
        text: current.text,
        translations: current.translations,
        flipped: current.flipped,
        answerOnly: current.answerOnly,
        hintFront: current.hintFront,
        hintBack: current.hintBack,
        imageFront: current.imageFront ?? null,
        imageBack: current.imageBack ?? null,
        explanation: current.explanation ?? null,
        type: current.type ?? "text",
      };
    });

  console.log("[userDataBackup] rehydrate official snapshot", {
    courseId,
    currentCardsCount: currentCards.length,
    boxCounts: {
      boxZero: snapshot.flashcards.boxZero.length,
      boxOne: snapshot.flashcards.boxOne.length,
      boxTwo: snapshot.flashcards.boxTwo.length,
      boxThree: snapshot.flashcards.boxThree.length,
      boxFour: snapshot.flashcards.boxFour.length,
      boxFive: snapshot.flashcards.boxFive.length,
    },
  });

  return {
    ...snapshot,
    flashcards: {
      boxZero: remapBox(snapshot.flashcards.boxZero),
      boxOne: remapBox(snapshot.flashcards.boxOne),
      boxTwo: remapBox(snapshot.flashcards.boxTwo),
      boxThree: remapBox(snapshot.flashcards.boxThree),
      boxFour: remapBox(snapshot.flashcards.boxFour),
      boxFive: remapBox(snapshot.flashcards.boxFive),
    },
  };
}

function toOfficialFlashcardIdentity(
  card: BackupFlashcardRecord
): OfficialFlashcardIdentityExport {
  return {
    externalId: card.externalId ?? null,
    position: card.position ?? null,
    frontText: card.frontText,
    backText: card.backText,
  };
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
    backupCourseKey: makeCustomCourseBackupKey(course.id),
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

function buildOfficialCourseStateExport(
  courseExport: CustomCourseExport
): OfficialCourseSnapshotExport | null {
  const slug = courseExport.course.slug?.trim();
  if (!slug) {
    return null;
  }

  const flashcardsById = new Map<number, BackupFlashcardRecord>();
  const hints: OfficialCourseHintExportRow[] = [];
  for (const card of courseExport.flashcards) {
    flashcardsById.set(card.id, card);
    if (card.hintFront != null || card.hintBack != null) {
      hints.push({
        ...toOfficialFlashcardIdentity(card),
        hintFront: card.hintFront ?? null,
        hintBack: card.hintBack ?? null,
      });
    }
  }

  const reviews = courseExport.reviews
    .map<OfficialCourseReviewExportRow | null>((review) => {
      const card = flashcardsById.get(review.flashcardId);
      if (!card) return null;
      return {
        ...toOfficialFlashcardIdentity(card),
        stage: review.stage,
        learnedAt: review.learnedAt,
        nextReview: review.nextReview,
      };
    })
    .filter((entry): entry is OfficialCourseReviewExportRow => entry != null);

  const learningEvents = courseExport.learningEvents
    .map<OfficialCourseLearningEventExportRow | null>((event) => {
      const card = flashcardsById.get(event.flashcardId);
      if (!card) return null;
      return {
        ...toOfficialFlashcardIdentity(card),
        box: event.box ?? null,
        result: event.result,
        durationMs: event.durationMs ?? null,
        createdAt: event.createdAt,
      };
    })
    .filter(
      (entry): entry is OfficialCourseLearningEventExportRow => entry != null
    );

  return {
    slug,
    reviews,
    learningEvents,
    hints,
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

  const [
    customCoursesExport,
    officialCoursesExport,
    boxesSnapshots,
    customBoxesSnapshots,
    pinnedOfficialCourseIdsRaw,
    activeCustomCourseIdRaw,
  ] = await Promise.all([
    Promise.all(customCourses.map((course) => buildCourseExport(course))),
    Promise.all(officialCourses.map((course) => buildCourseExport(course))),
    collectBoxesSnapshots(["boxes:"]),
    collectBoxesSnapshots(["customBoxes:"]),
    AsyncStorage.getItem("officialPinnedCourseIds"),
    AsyncStorage.getItem("activeCustomCourseId"),
  ]);

  const officialCoursesById = new Map<number, CustomCourseRecord>(
    officialCourses.map((course) => [course.id, course])
  );
  const customCoursesById = new Map<number, CustomCourseExport>(
    customCoursesExport.map((courseExport) => [courseExport.course.id, courseExport])
  );

  const customCourseBoxSnapshots: Record<string, SavedBoxesV2> = {};
  const officialBoxSnapshots: Record<string, SavedBoxesV2> = {};
  for (const [storageKey, snapshot] of Object.entries(customBoxesSnapshots)) {
    const courseId = parseCustomCourseIdFromSnapshot(storageKey, snapshot);
    if (courseId == null) {
      continue;
    }

    const officialCourse = officialCoursesById.get(courseId);
    if (officialCourse?.slug) {
      officialBoxSnapshots[officialCourse.slug] = snapshot;
      continue;
    }

    const customCourse = customCoursesById.get(courseId);
    if (customCourse) {
      customCourseBoxSnapshots[customCourse.backupCourseKey] = snapshot;
    }
  }

  const pinnedIds = (() => {
    if (!pinnedOfficialCourseIdsRaw) return [] as number[];
    try {
      const parsed = JSON.parse(pinnedOfficialCourseIdsRaw) as number[];
      return Array.isArray(parsed)
        ? parsed.filter((value) => Number.isInteger(value))
        : [];
    } catch {
      return [];
    }
  })();
  const pinnedOfficialCourseSlugs = pinnedIds
    .map((id) => officialCoursesById.get(id)?.slug ?? null)
    .filter((slug): slug is string => Boolean(slug));

  const lastActiveOfficialCourseSlug = (() => {
    if (!activeCustomCourseIdRaw) return null;
    try {
      const parsed = JSON.parse(activeCustomCourseIdRaw) as number | null;
      if (typeof parsed !== "number") {
        return null;
      }
      return officialCoursesById.get(parsed)?.slug ?? null;
    } catch {
      return null;
    }
  })();

  const officialCourseState: OfficialCourseStateExport = {
    pinnedOfficialCourseSlugs,
    lastActiveOfficialCourseSlug,
    boxSnapshots: officialBoxSnapshots,
    courses: officialCoursesExport
      .map((courseExport) => buildOfficialCourseStateExport(courseExport))
      .filter((entry): entry is OfficialCourseSnapshotExport => entry != null),
  };

  return {
    version: 3,
    generatedAt: Date.now(),
    builtinReviews,
    boxesSnapshots,
    customCourseBoxSnapshots,
    customCourses: customCoursesExport,
    officialCourseState,
  };
}

function extractExtension(uri?: string | null): string {
  if (!uri) return "jpg";
  const match = /\.([a-z0-9]{2,5})($|\?)/i.exec(uri);
  const ext = match?.[1]?.toLowerCase();
  if (!ext) return "jpg";
  return ext === "jpeg" ? "jpg" : ext;
}

function buildArchiveName(createdAtIso: string): string {
  const timestamp = createdAtIso.replace(/[:.]/g, "-");
  return `memicard-backup-${timestamp}.zip`;
}

function buildBackupContentSummary(payload: UserDataExport): BackupContentSummary {
  const customFlashcardsCount = payload.customCourses.reduce(
    (sum, courseExport) => sum + courseExport.flashcards.length,
    0
  );
  const reviewEntriesCount =
    payload.builtinReviews.length +
    payload.customCourses.reduce(
      (sum, courseExport) => sum + courseExport.reviews.length,
      0
    ) +
    payload.officialCourseState.courses.reduce(
      (sum, courseExport) => sum + courseExport.reviews.length,
      0
    );
  const learningEventsCount =
    payload.customCourses.reduce(
      (sum, courseExport) => sum + (courseExport.learningEvents?.length ?? 0),
      0
    ) +
    payload.officialCourseState.courses.reduce(
      (sum, courseExport) => sum + (courseExport.learningEvents?.length ?? 0),
      0
    );

  return {
    customCoursesCount: payload.customCourses.length,
    customFlashcardsCount,
    reviewEntriesCount,
    learningEventsCount,
    officialCoursesCount: payload.officialCourseState.courses.length,
  };
}

function buildBackupSource(): string {
  const appVersion =
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    "unknown-version";
  return `memicard/${Platform.OS}/${appVersion}`;
}

function buildBackupManifest(payload: UserDataExport): BackupArchiveManifest {
  return {
    schemaVersion: 1,
    appVersion:
      Constants.expoConfig?.version ??
      Constants.nativeAppVersion ??
      "unknown-version",
    createdAt: new Date(payload.generatedAt).toISOString(),
    backupSource: buildBackupSource(),
    contentSummary: buildBackupContentSummary(payload),
  };
}

function normalizeManifest(input: unknown): BackupArchiveManifest {
  if (typeof input !== "object" || input == null) {
    throw new Error("Backup ZIP zawiera nieprawidłowy manifest.");
  }

  const typed = input as Partial<BackupArchiveManifest>;
  if (typed.schemaVersion !== 1) {
    throw new Error(
      "Ta kopia została utworzona w nieobsługiwanym formacie i nie może zostać przywrócona automatycznie."
    );
  }
  if (typeof typed.createdAt !== "string" || Number.isNaN(Date.parse(typed.createdAt))) {
    throw new Error("Backup ZIP zawiera nieprawidłową datę utworzenia.");
  }
  if (typeof typed.appVersion !== "string" || typed.appVersion.trim().length === 0) {
    throw new Error("Backup ZIP nie zawiera wersji aplikacji.");
  }
  if (
    typeof typed.backupSource !== "string" ||
    typed.backupSource.trim().length === 0
  ) {
    throw new Error("Backup ZIP nie zawiera źródła kopii.");
  }

  const contentSummary = typed.contentSummary;
  if (typeof contentSummary !== "object" || contentSummary == null) {
    throw new Error("Backup ZIP zawiera nieprawidłowe podsumowanie danych.");
  }

  return {
    schemaVersion: 1,
    appVersion: typed.appVersion,
    createdAt: typed.createdAt,
    backupSource: typed.backupSource,
    contentSummary: {
      customCoursesCount:
        typeof contentSummary.customCoursesCount === "number"
          ? contentSummary.customCoursesCount
          : 0,
      customFlashcardsCount:
        typeof contentSummary.customFlashcardsCount === "number"
          ? contentSummary.customFlashcardsCount
          : 0,
      reviewEntriesCount:
        typeof contentSummary.reviewEntriesCount === "number"
          ? contentSummary.reviewEntriesCount
          : 0,
      learningEventsCount:
        typeof contentSummary.learningEventsCount === "number"
          ? contentSummary.learningEventsCount
          : 0,
      officialCoursesCount:
        typeof contentSummary.officialCoursesCount === "number"
          ? contentSummary.officialCoursesCount
          : 0,
    },
  };
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
  };
  const manifest = buildBackupManifest(archivePayload);

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("data.json", JSON.stringify(archivePayload, null, 2));

  const zipBase64 = await zip.generateAsync({ type: "base64" });
  const fileUri = `${getWritableDir()}${buildArchiveName(manifest.createdAt)}`;
  await FileSystem.writeAsStringAsync(fileUri, zipBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const info = await FileSystem.getInfoAsync(fileUri);

  return {
    fileUri,
    bytesWritten: info.exists ? info.size : Math.floor((zipBase64.length * 3) / 4),
    manifest,
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

function normalizeImportedData(data: unknown): UserDataExport {
  if (typeof data !== "object" || data == null || !("version" in data)) {
    throw new Error("Backup ma nieprawidłowy format.");
  }

  if ((data as { version?: number }).version !== 3) {
    throw new Error(
      "Ten backup pochodzi ze starej wersji aplikacji i nie jest już wspierany."
    );
  }

  const typed = data as LegacyUserDataExport;
  return {
    version: 3,
    generatedAt: typed.generatedAt,
    builtinReviews: typed.builtinReviews ?? [],
    boxesSnapshots: typed.boxesSnapshots ?? {},
    customCourseBoxSnapshots: typed.customCourseBoxSnapshots ?? {},
    customCourses: (typed.customCourses ?? []).map((courseExport) => ({
      backupCourseKey:
        courseExport.backupCourseKey ??
        makeCustomCourseBackupKey(courseExport.course.id),
      course: courseExport.course,
      flashcards: courseExport.flashcards.map((card) => ({
        ...card,
        imageFront: card.imageFront ?? null,
        imageBack: card.imageBack ?? null,
      })),
      reviews: courseExport.reviews ?? [],
      learningEvents: courseExport.learningEvents ?? [],
    })),
    officialCourseState: {
      pinnedOfficialCourseSlugs:
        typed.officialCourseState?.pinnedOfficialCourseSlugs ?? [],
      lastActiveOfficialCourseSlug:
        typed.officialCourseState?.lastActiveOfficialCourseSlug ?? null,
      boxSnapshots: typed.officialCourseState?.boxSnapshots ?? {},
      courses: typed.officialCourseState?.courses ?? [],
    },
  };
}

export async function readBackupArchivePackage(
  fileUri: string
): Promise<BackupArchivePackage> {
  const zipBase64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const zip = await JSZip.loadAsync(zipBase64, { base64: true });
  const manifestEntry = zip.file("manifest.json");
  if (!manifestEntry) {
    throw new Error("Backup ZIP nie zawiera pliku manifest.json.");
  }
  const dataEntry = zip.file("data.json");
  if (!dataEntry) {
    throw new Error("Backup ZIP nie zawiera pliku data.json.");
  }

  const manifestText = await manifestEntry.async("text");
  const manifest = normalizeManifest(JSON.parse(manifestText) as unknown);
  const dataText = await dataEntry.async("text");
  const normalized = normalizeImportedData(JSON.parse(dataText) as unknown);

  return {
    manifest,
    payload: {
      ...normalized,
      customCourses: await materializeZipImages(zip, normalized.customCourses),
    },
  };
}

export async function readBackupArchiveManifest(
  fileUri: string
): Promise<BackupArchiveManifest> {
  const zipBase64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const zip = await JSZip.loadAsync(zipBase64, { base64: true });
  const manifestEntry = zip.file("manifest.json");
  if (!manifestEntry) {
    throw new Error("Backup ZIP nie zawiera pliku manifest.json.");
  }

  const manifestText = await manifestEntry.async("text");
  return normalizeManifest(JSON.parse(manifestText) as unknown);
}

export async function readBackupArchive(
  fileUri: string
): Promise<UserDataExport> {
  const archivePackage = await readBackupArchivePackage(fileUri);
  return archivePackage.payload;
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
  const { backupCourseKey, course, flashcards, reviews, learningEvents } =
    courseExport;
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
    backupCourseKey,
    courseId: newCourseId,
    flashcardsCreated,
    reviewsRestored,
    learningEventsRestored,
    hintsUpdated: 0,
  };
}

async function restoreOfficialCourseState(
  db: Awaited<ReturnType<typeof getDB>>,
  targetCourseId: number,
  courseState: OfficialCourseSnapshotExport
): Promise<{
  reviewsRestored: number;
  learningEventsRestored: number;
  hintsUpdated: number;
}> {
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

  let reviewsRestored = 0;
  let learningEventsRestored = 0;
  let hintsUpdated = 0;
  const now = Date.now();

  const findExistingCard = (
    identity: OfficialFlashcardIdentityExport
  ): CustomFlashcardRecord | null => {
    if (identity.externalId && externalIdMap.has(identity.externalId)) {
      return externalIdMap.get(identity.externalId) ?? null;
    }
    if (identity.position != null && positionMap.has(identity.position)) {
      return positionMap.get(identity.position) ?? null;
    }
    const key = `${identity.frontText}|||${identity.backText}`;
    const list = frontBackMap.get(key);
    return list?.[0] ?? null;
  };

  for (const hint of courseState.hints) {
    const existing = findExistingCard(hint);
    if (!existing) continue;
    const nextHintFront = hint.hintFront ?? null;
    const nextHintBack = hint.hintBack ?? null;
    const shouldUpdateHints =
      nextHintFront !== (existing.hintFront ?? null) ||
      nextHintBack !== (existing.hintBack ?? null);

    if (!shouldUpdateHints) continue;

    await db.runAsync(
      `UPDATE custom_flashcards
         SET hint_front = ?,
             hint_back = ?,
             updated_at = ?
       WHERE id = ?;`,
      nextHintFront,
      nextHintBack,
      now,
      existing.id
    );
    hintsUpdated++;
  }

  for (const review of courseState.reviews) {
    const existing = findExistingCard(review);
    if (!existing) continue;
    await db.runAsync(
      `INSERT OR REPLACE INTO custom_reviews
         (course_id, flashcard_id, learned_at, next_review, stage)
       VALUES (?, ?, ?, ?, ?);`,
      targetCourseId,
      existing.id,
      review.learnedAt,
      review.nextReview,
      review.stage
    );
    reviewsRestored++;
  }

  for (const event of courseState.learningEvents) {
    const existing = findExistingCard(event);
    if (!existing) continue;
    await db.runAsync(
      `INSERT INTO custom_learning_events
         (flashcard_id, course_id, box, result, duration_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      existing.id,
      targetCourseId,
      event.box ?? null,
      event.result,
      event.durationMs ?? null,
      event.createdAt
    );
    learningEventsRestored++;
  }

  return {
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
    ["flashcards.customCourseEntrySettingsSeen", JSON.stringify({})],
    ["officialPinnedCourseIds", JSON.stringify([])],
  ]);
}

export async function restoreUserData(
  input: UserDataExport,
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
    let officialPinnedCoursesRestored = 0;
    let officialActiveCourseRestored = 0;
    let boxSnapshotsRestored = 0;
    let officialReviewsRestored = 0;
    const skippedOfficialCourseSlugs = new Set<string>();
    let learningEventsRestored = 0;
    const restoredCustomCourseIdsByBackupKey = new Map<string, number>();

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
        restoredCustomCourseIdsByBackupKey.set(stats.backupCourseKey, stats.courseId);
        flashcardsCreatedTotal += stats.flashcardsCreated;
        reviewsRestoredTotal += stats.reviewsRestored;
        learningEventsRestored += stats.learningEventsRestored;
      }

      await db.execAsync("COMMIT;");
    } catch (error) {
      await db.execAsync("ROLLBACK;");
      throw error;
    }

    const officialDb = options?.targetDb ? db : await getDB();
    const officialCourseRows = await officialDb.getAllAsync<{
      id: number;
      slug: string | null;
    }>(
      `SELECT id, slug
         FROM custom_courses
        WHERE COALESCE(is_official, 0) = 1
          AND slug IS NOT NULL;`
    );
    const officialCourseIdsBySlug = new Map<string, number>();
    officialCourseRows.forEach((row) => {
      const slug = row.slug?.trim();
      if (slug) {
        officialCourseIdsBySlug.set(slug, row.id);
      }
    });

    for (const courseState of normalized.officialCourseState.courses ?? []) {
      const targetCourseId = officialCourseIdsBySlug.get(courseState.slug);
      if (!targetCourseId) {
        skippedOfficialCourseSlugs.add(courseState.slug);
        continue;
      }
      const stats = await restoreOfficialCourseState(
        officialDb,
        targetCourseId,
        courseState
      );
      officialReviewsRestored += stats.reviewsRestored;
      learningEventsRestored += stats.learningEventsRestored;
    }

    const pairs: [string, string][] = [];
    for (const [key, value] of Object.entries(normalized.boxesSnapshots ?? {})) {
      pairs.push([key, JSON.stringify(value)]);
      boxSnapshotsRestored++;
    }

    for (const [backupCourseKey, value] of Object.entries(
      normalized.customCourseBoxSnapshots ?? {}
    )) {
      const restoredCourseId = restoredCustomCourseIdsByBackupKey.get(backupCourseKey);
      if (!restoredCourseId) {
        continue;
      }
      pairs.push([
        buildCustomRuntimeSnapshotKey(restoredCourseId),
        JSON.stringify(remapSnapshotToCourseId(value, restoredCourseId)),
      ]);
      boxSnapshotsRestored++;
    }

    for (const [slug, value] of Object.entries(
      normalized.officialCourseState.boxSnapshots ?? {}
    )) {
      const restoredCourseId = officialCourseIdsBySlug.get(slug);
      if (!restoredCourseId) {
        skippedOfficialCourseSlugs.add(slug);
        continue;
      }
      const rehydratedSnapshot = await rehydrateOfficialSnapshot(
        restoredCourseId,
        value
      );
      pairs.push([
        buildCustomRuntimeSnapshotKey(restoredCourseId),
        JSON.stringify(
          remapSnapshotToCourseId(rehydratedSnapshot, restoredCourseId)
        ),
      ]);
      boxSnapshotsRestored++;
    }

    const restoredPinnedOfficialIds = normalized.officialCourseState.pinnedOfficialCourseSlugs
      .map((slug) => officialCourseIdsBySlug.get(slug) ?? null)
      .filter((id): id is number => id != null);
    officialPinnedCoursesRestored = restoredPinnedOfficialIds.length;

    const requestedActiveOfficialId =
      normalized.officialCourseState.lastActiveOfficialCourseSlug
        ? officialCourseIdsBySlug.get(
            normalized.officialCourseState.lastActiveOfficialCourseSlug
          ) ?? null
        : null;
    const restoredActiveOfficialId = requestedActiveOfficialId;
    officialActiveCourseRestored = restoredActiveOfficialId != null ? 1 : 0;

    const [currentPinnedOfficialIdsRaw, currentActiveCustomCourseIdRaw, currentActiveCourseIdxRaw] =
      await Promise.all([
        AsyncStorage.getItem("officialPinnedCourseIds"),
        AsyncStorage.getItem("activeCustomCourseId"),
        AsyncStorage.getItem("activeCourseIdx"),
      ]);

    const currentPinnedOfficialIds = (() => {
      if (!currentPinnedOfficialIdsRaw) return [] as number[];
      try {
        const parsed = JSON.parse(currentPinnedOfficialIdsRaw) as number[];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();

    const currentActiveCustomCourseId = (() => {
      if (!currentActiveCustomCourseIdRaw) return null;
      try {
        const parsed = JSON.parse(currentActiveCustomCourseIdRaw) as number | null;
        return typeof parsed === "number" ? parsed : null;
      } catch {
        return null;
      }
    })();

    const currentActiveCourseIdx = (() => {
      if (!currentActiveCourseIdxRaw) return null;
      try {
        const parsed = JSON.parse(currentActiveCourseIdxRaw) as number | null;
        return typeof parsed === "number" ? parsed : null;
      } catch {
        return null;
      }
    })();

    const shouldRestoreCourseSelection =
      options?.replaceExistingData === true ||
      (currentPinnedOfficialIds.length === 0 &&
        currentActiveCustomCourseId == null &&
        currentActiveCourseIdx == null);

    console.log("[userDataBackup] restore selection decision", {
      replaceExistingData: options?.replaceExistingData === true,
      currentPinnedOfficialIdsCount: currentPinnedOfficialIds.length,
      currentActiveCustomCourseId,
      currentActiveCourseIdx,
      restoredPinnedOfficialIdsCount: restoredPinnedOfficialIds.length,
      restoredActiveOfficialId,
      shouldRestoreCourseSelection,
    });

    if (shouldRestoreCourseSelection) {
      pairs.push([
        "officialPinnedCourseIds",
        JSON.stringify(restoredPinnedOfficialIds),
      ]);
      pairs.push([
        "activeCustomCourseId",
        JSON.stringify(restoredActiveOfficialId),
      ]);
      pairs.push(["activeCourseIdx", JSON.stringify(null)]);
    }

    if (pairs.length > 0) {
      await AsyncStorage.multiSet(pairs);
    }

    return {
      success: true,
      restoredState: {
        pinnedOfficialCourseIds: restoredPinnedOfficialIds,
        activeCustomCourseId: restoredActiveOfficialId,
        activeCourseIdx: null,
        shouldApplySelection: shouldRestoreCourseSelection,
        shouldMarkOnboardingDone:
          coursesCreated > 0 ||
          flashcardsCreatedTotal > 0 ||
          reviewsRestoredTotal > 0 ||
          builtinReviewsRestored > 0 ||
          restoredPinnedOfficialIds.length > 0 ||
          restoredActiveOfficialId != null ||
          boxSnapshotsRestored > 0 ||
          officialReviewsRestored > 0 ||
          learningEventsRestored > 0,
      },
      stats: {
        coursesCreated,
        flashcardsCreated: flashcardsCreatedTotal,
        reviewsRestored: reviewsRestoredTotal,
        builtinReviewsRestored,
        officialPinnedCoursesRestored,
        officialActiveCourseRestored,
        boxSnapshotsRestored,
        officialReviewsRestored,
        officialCoursesSkipped: skippedOfficialCourseSlugs.size,
        learningEventsRestored,
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
