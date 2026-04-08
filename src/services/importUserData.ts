import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  readBackupArchive,
  restoreUserData,
  type AnyUserDataExport,
  type ImportResult,
} from "@/src/services/userDataBackup";

export type { ImportResult } from "@/src/services/userDataBackup";

function normalizeImportedPayload(
  fileUri: string,
  fileName?: string | null
): Promise<AnyUserDataExport> {
  const lowerName = (fileName ?? fileUri).toLowerCase();
  if (lowerName.endsWith(".zip")) {
    return readBackupArchive(fileUri);
  }

  return FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  }).then((content) => JSON.parse(content) as AnyUserDataExport);
}

export async function importUserData(): Promise<ImportResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/json",
        "application/zip",
        "application/x-zip-compressed",
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return { success: false, message: "Anulowano wybór pliku." };
    }

    const asset = result.assets[0];
    const payload = await normalizeImportedPayload(asset.uri, asset.name);
    return restoreUserData(payload, { replaceExistingData: false });
  } catch (error) {
    console.error("[importUserData] Error", error);
    return {
      success: false,
      message: "Wystąpił błąd podczas importu danych.",
    };
  }
}
