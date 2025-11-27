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

  const builtinReviews = await db.getAllAsync<BuiltinReviewExportRow>(
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
  );

  const customCourses = (await getCustomCourses()).filter(
    (course) => !course.isOfficial
  );
  const customCoursesExport: CustomCourseExport[] = [];

  for (const course of customCourses) {
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
    customCoursesExport.push({
      course,
      flashcards,
      reviews,
    });
  }

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
  };
}

export async function exportUserDataToFile(): Promise<{
  fileUri: string;
  bytesWritten: number;
  payload: UserDataExport;
}> {
  const payload = await buildUserDataExport();
  const json = JSON.stringify(payload, null, 2);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `learning-app-export-${timestamp}.json`;

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
    // iOS and others: Save to cache/document first, then share
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

    // iOS: Now share/save the file
    let sharingSupported = false;
    try {
      sharingSupported = await Sharing.isAvailableAsync();
    } catch (error) {
      console.warn("[exportUserData] Sharing availability check failed", error);
    }

    let shared = false;
    let shareError: unknown;
    if (sharingSupported) {
      try {
        await Sharing.shareAsync(result.fileUri, {
          mimeType: "application/json",
          UTI: "public.json", // Important for iOS to recognize as JSON
          dialogTitle: "Zapisz swój postęp",
        });
        shared = true;
      } catch (error) {
        shareError = error;
        console.warn("[exportUserData] Sharing failed", error);
      }
    }

    return {
      ...result,
      sharingSupported,
      shared,
      shareError,
    };
  } catch (error) {
    console.error("[exportUserData] Export failed", error);
    throw error;
  }
}
