import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import {
  buildUserDataExport,
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

function buildExportFileName(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `learning-app-export-${timestamp}.json`;
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

async function writeExportToLocalFile(): Promise<UserDataExportFileResult> {
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
    fileName,
    bytesWritten: info.exists ? info.size : json.length,
    payload,
  };
}

export async function exportUserDataToFile(): Promise<UserDataExportFileResult> {
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
      fileName,
      bytesWritten: json.length,
      payload,
    };
  }

  return writeExportToLocalFile();
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

    const shareResult = await shareJsonFile(result.fileUri, "Zapisz swój postęp");

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
