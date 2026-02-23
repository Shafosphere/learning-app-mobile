import {
  getCustomCourses,
  getCustomFlashcards,
  getDB,
  type CustomCourseRecord,
  type CustomFlashcardRecord,
} from "@/src/db/sqlite/db";
import type { SavedBoxesV2 } from "@/src/hooks/useBoxesPersistenceSnapshot";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

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

export type CustomCourseExport = {
  course: CustomCourseRecord;
  flashcards: CustomFlashcardRecord[];
  reviews: CustomReviewExportRow[];
};

export type UserDataExport = {
  version: 1;
  generatedAt: number;
  builtinReviews: BuiltinReviewExportRow[];
  boxesSnapshots: Record<string, SavedBoxesV2>;
  customBoxesSnapshots: Record<string, SavedBoxesV2>;
  customCourses: CustomCourseExport[];
  officialCourses?: CustomCourseExport[];
};

type ExportWriteResult = {
  fileUri: string;
  bytesWritten: number;
  payload: UserDataExport;
};

type ShareResult = {
  sharingSupported: boolean;
  shared: boolean;
  cancelled: boolean;
  shareError?: unknown;
};

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
    } catch (err) {
      console.warn("[exportUserData] Failed to parse AsyncStorage entry", {
        key,
        err,
      });
    }
  }
  return snapshots;
}

export async function buildUserDataExport(): Promise<UserDataExport> {
  const db = await getDB();
  const allCourses = await getCustomCourses();
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

  const customCourses = allCourses.filter((course) => !course.isOfficial);
  const officialCourses = allCourses.filter((course) => course.isOfficial);

  const buildCoursesExport = async (
    courses: CustomCourseRecord[]
  ): Promise<CustomCourseExport[]> => {
    const exports: CustomCourseExport[] = [];
    for (const course of courses) {
      const [flashcards, reviews] = await Promise.all([
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
      ]);
      exports.push({
        course,
        flashcards,
        reviews,
      });
    }
    return exports;
  };

  const [customCoursesExport, officialCoursesExport] = await Promise.all([
    buildCoursesExport(customCourses),
    buildCoursesExport(officialCourses),
  ]);

  const [boxesSnapshots, customBoxesSnapshots] = await Promise.all([
    collectBoxesSnapshots(["boxes:"]),
    collectBoxesSnapshots(["customBoxes:"]),
  ]);

  return {
    version: 1,
    generatedAt: Date.now(),
    builtinReviews,
    boxesSnapshots,
    customBoxesSnapshots,
    customCourses: customCoursesExport,
    officialCourses: officialCoursesExport,
  };
}

function buildExportFileName(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `learning-app-export-${timestamp}.json`;
}

async function writeExportToLocalFile(): Promise<ExportWriteResult> {
  const payload = await buildUserDataExport();
  const json = JSON.stringify(payload, null, 2);
  const fileName = buildExportFileName();
  const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!baseDir) {
    throw new Error("Brak dostępu do katalogu dokumentów.");
  }

  const fileUri = `${baseDir}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const info = await FileSystem.getInfoAsync(fileUri);

  return {
    fileUri,
    bytesWritten: info.exists ? info.size : json.length,
    payload,
  };
}

function isShareCancelledError(error: unknown): boolean {
  if (typeof error === "string") {
    const lower = error.toLowerCase();
    return lower.includes("cancel") || lower.includes("dismiss");
  }
  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    return lower.includes("cancel") || lower.includes("dismiss");
  }
  return false;
}

async function shareJsonFile(
  fileUri: string,
  dialogTitle: string
): Promise<ShareResult> {
  let sharingSupported = false;
  try {
    sharingSupported = await Sharing.isAvailableAsync();
  } catch (error) {
    console.warn("[exportUserData] Sharing availability check failed", error);
  }

  if (!sharingSupported) {
    return {
      sharingSupported: false,
      shared: false,
      cancelled: false,
    };
  }

  try {
    await Sharing.shareAsync(fileUri, {
      mimeType: "application/json",
      UTI: "public.json",
      dialogTitle,
    });

    return {
      sharingSupported: true,
      shared: true,
      cancelled: false,
    };
  } catch (error) {
    if (isShareCancelledError(error)) {
      return {
        sharingSupported: true,
        shared: false,
        cancelled: true,
      };
    }

    console.warn("[exportUserData] Sharing failed", error);
    return {
      sharingSupported: true,
      shared: false,
      cancelled: false,
      shareError: error,
    };
  }
}

export async function exportUserDataToFile(): Promise<{
  fileUri: string;
  bytesWritten: number;
  payload: UserDataExport;
}> {
  const payload = await buildUserDataExport();
  const json = JSON.stringify(payload, null, 2);
  const fileName = buildExportFileName();

  if (Platform.OS === "android") {
    const permissions =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

    if (!permissions.granted) {
      throw new Error("Brak uprawnień do zapisu w wybranym katalogu.");
    }

    const uri = await FileSystem.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      fileName,
      "application/json"
    );

    await FileSystem.writeAsStringAsync(uri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return {
      fileUri: uri,
      bytesWritten: json.length,
      payload,
    };
  } else {
    return writeExportToLocalFile();
  }
}

export async function exportUserDataToGoogleDrive(): Promise<{
  fileUri: string;
  bytesWritten: number;
  payload: UserDataExport;
  sharingSupported: boolean;
  shared: boolean;
  cancelled: boolean;
  shareError?: unknown;
}> {
  try {
    const fileResult = await writeExportToLocalFile();
    const shareResult = await shareJsonFile(
      fileResult.fileUri,
      "Eksportuj do Google Drive"
    );

    return {
      ...fileResult,
      ...shareResult,
    };
  } catch (error) {
    console.error("[exportUserData] Google Drive export failed", error);
    throw error;
  }
}

export async function exportAndShareUserData(): Promise<{
  fileUri: string;
  bytesWritten: number;
  payload: UserDataExport;
  sharingSupported: boolean;
  shared: boolean;
  shareError?: unknown;
}> {
  try {
    // For Android, exportUserDataToFile now handles the "Save As" (SAF) flow directly.
    // For iOS, it saves to a temp file.
    const result = await exportUserDataToFile();

    // If Android, we are done (file is saved).
    if (Platform.OS === "android") {
      return {
        ...result,
        sharingSupported: true,
        shared: true,
      };
    }

    const shareResult = await shareJsonFile(result.fileUri, "Zapisz swój postęp");

    return {
      ...result,
      sharingSupported: shareResult.sharingSupported,
      shared: shareResult.shared,
      shareError: shareResult.shareError,
    };
  } catch (error) {
    console.error("[exportUserData] Export failed", error);
    throw error;
  }
}
