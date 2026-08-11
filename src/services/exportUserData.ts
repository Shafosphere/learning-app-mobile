import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import {
  buildUserDataExport,
  createBackupZip,
  hasUserDataExportImages,
  type UserDataExport,
} from "@/src/services/userDataBackup";

type ShareResult = {
  sharingSupported: boolean;
  shared: boolean;
  cancelled: boolean;
  shareError?: unknown;
};

export type UserDataExportDelivery =
  | "saved_to_selected_folder"
  | "saved_to_app_storage"
  | "shared";

type UserDataExportFileResult = {
  fileUri: string;
  fileName: string;
  bytesWritten: number;
  payload: UserDataExport;
};

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

function buildJsonExportFileName(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `learning-app-export-${timestamp}.json`;
}

async function shareBackupFile(
  fileUri: string,
  isZip: boolean,
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
      mimeType: isZip ? "application/zip" : "application/json",
      UTI: isZip ? "public.zip-archive" : "public.json",
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

export async function exportUserDataToFile(): Promise<UserDataExportFileResult> {
  const payload = await buildUserDataExport();
  const shouldCreateZip = hasUserDataExportImages(payload);
  const archive = shouldCreateZip ? await createBackupZip(payload) : null;
  const fileName = archive
    ? archive.fileUri.split("/").pop() ?? "memicard-backup.zip"
    : buildJsonExportFileName();
  const json = archive ? null : JSON.stringify(payload, null, 2);

  if (Platform.OS === "android") {
    const permissions =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

    if (!permissions.granted) {
      throw new Error("Brak uprawnień do zapisu w wybranym katalogu.");
    }

    const uri = await FileSystem.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      fileName,
      archive ? "application/zip" : "application/json"
    );

    if (archive) {
      const archiveBase64 = await FileSystem.readAsStringAsync(archive.fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.writeAsStringAsync(uri, archiveBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else {
      await FileSystem.writeAsStringAsync(uri, json ?? "", {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }

    return {
      fileUri: uri,
      fileName,
      bytesWritten: archive?.bytesWritten ?? (json?.length ?? 0),
      payload,
    };
  }

  if (!archive) {
    const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
    if (!baseDir) throw new Error("Brak dostępu do katalogu dokumentów.");
    const fileUri = `${baseDir}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, json ?? "", {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const info = await FileSystem.getInfoAsync(fileUri);
    return {
      fileUri,
      fileName,
      bytesWritten: info.exists ? info.size : (json?.length ?? 0),
      payload,
    };
  }

  return {
    fileUri: archive.fileUri,
    fileName,
    bytesWritten: archive.bytesWritten,
    payload,
  };
}

export async function exportAndShareUserData(): Promise<{
  fileUri: string;
  fileName: string;
  bytesWritten: number;
  payload: UserDataExport;
  delivery: UserDataExportDelivery;
  sharingSupported: boolean;
  shared: boolean;
  shareError?: unknown;
}> {
  try {
    const result = await exportUserDataToFile();

    if (Platform.OS === "android") {
      return {
        ...result,
        delivery: "saved_to_selected_folder",
        sharingSupported: false,
        shared: false,
      };
    }

    const shareResult = await shareBackupFile(
      result.fileUri,
      result.fileName.endsWith(".zip"),
      "Zapisz swój postęp"
    );

    return {
      ...result,
      delivery: shareResult.shared ? "shared" : "saved_to_app_storage",
      sharingSupported: shareResult.sharingSupported,
      shared: shareResult.shared,
      shareError: shareResult.shareError,
    };
  } catch (error) {
    console.error("[exportUserData] Export failed", error);
    throw error;
  }
}
