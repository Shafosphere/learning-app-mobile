import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import {
  createBackupZip,
  readBackupArchiveManifest,
  readBackupArchivePackage,
  restoreUserData,
  type BackupArchiveManifest,
  type ImportResult,
} from "@/src/services/userDataBackup";

const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const LEGACY_AUTH_STORAGE_KEY = "googleDriveBackup.auth";
const BACKUP_FILE_QUERY_PREFIX = "memicard-backup-";
const LEGACY_BACKUP_FILENAME = "memicard-drive-backup-latest.zip";
const BACKUP_KIND = "memicard-backup";
const DEFAULT_LIST_LIMIT = 10;

type GoogleDriveExtraConfig = {
  webClientId?: string;
};

type GoogleDriveUser = {
  scopes: string[];
};

type GoogleSigninModule = {
  GoogleSignin: {
    configure: (options?: { webClientId?: string }) => void;
    hasPlayServices: (options: {
      showPlayServicesUpdateDialog: boolean;
    }) => Promise<boolean>;
    signIn: () => Promise<
      | { type: "success"; data: GoogleDriveUser }
      | { type: "cancelled"; data: null }
    >;
    addScopes: (options: { scopes: string[] }) => Promise<
      | { type: "success"; data: GoogleDriveUser }
      | { type: "cancelled"; data: null }
      | null
    >;
    signInSilently: () => Promise<
      | { type: "success"; data: GoogleDriveUser }
      | { type: "noSavedCredentialFound"; data: null }
    >;
    signOut: () => Promise<null>;
    revokeAccess: () => Promise<null>;
    hasPreviousSignIn: () => boolean;
    getCurrentUser: () => GoogleDriveUser | null;
    getTokens: () => Promise<{ accessToken: string; idToken: string }>;
  };
  statusCodes: {
    PLAY_SERVICES_NOT_AVAILABLE: string;
  };
};

export type GoogleDriveBackupMetadata = {
  fileId: string;
  name: string;
  modifiedTime: string | null;
  size: number | null;
};

export type GoogleDriveBackupSnapshot = GoogleDriveBackupMetadata & {
  manifest: BackupArchiveManifest | null;
  isCompatible: boolean;
  compatibilityMessage: string | null;
};

export type ConnectGoogleDriveResult =
  | {
      connected: true;
      cancelled: false;
    }
  | {
      connected: false;
      cancelled: true;
    };

let googleSigninConfigured = false;
let legacyStateCleanupPromise: Promise<void> | null = null;
let googleSigninModuleCache: GoogleSigninModule | null | undefined;
let freshAccessTokenPromise: Promise<string> | null = null;

function getExtraConfig(): GoogleDriveExtraConfig {
  return (Constants.expoConfig?.extra?.googleDriveBackup ??
    {}) as GoogleDriveExtraConfig;
}

function getConfiguredWebClientId(): string | null {
  const webClientId = getExtraConfig().webClientId?.trim();
  return webClientId ? webClientId : null;
}

function startLegacyStateCleanup(): Promise<void> {
  if (!legacyStateCleanupPromise) {
    legacyStateCleanupPromise = AsyncStorage.removeItem(
      LEGACY_AUTH_STORAGE_KEY
    ).catch((error) => {
      console.warn(
        "[googleDriveBackup] Failed to clear legacy OAuth state",
        error
      );
    });
  }

  return legacyStateCleanupPromise;
}

function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

function canUseNativeGoogleSignin(): boolean {
  return Platform.OS === "android" && !isExpoGo();
}

function getGoogleSigninModule(): GoogleSigninModule | null {
  if (googleSigninModuleCache !== undefined) {
    return googleSigninModuleCache;
  }

  if (!canUseNativeGoogleSignin()) {
    googleSigninModuleCache = null;
    return googleSigninModuleCache;
  }

  try {
    googleSigninModuleCache =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("@react-native-google-signin/google-signin") as GoogleSigninModule;
  } catch (error) {
    console.warn("[googleDriveBackup] Google Sign-In native module unavailable", error);
    googleSigninModuleCache = null;
  }

  return googleSigninModuleCache;
}

function getGoogleDriveUnsupportedReason(): string | null {
  if (Platform.OS !== "android") {
    return "Google Drive backup jest obecnie wspierany tylko na Androidzie.";
  }

  if (isExpoGo()) {
    return "Google Drive backup wymaga development builda albo APK i nie działa w Expo Go.";
  }

  if (!getGoogleSigninModule()) {
    return "Ten build Androida nie zawiera natywnego modułu Google Sign-In.";
  }

  return null;
}

function ensureGoogleSigninConfigured(): void {
  if (googleSigninConfigured) {
    return;
  }

  const googleSigninModule = getGoogleSigninModule();
  if (!googleSigninModule) {
    throw new Error(
      getGoogleDriveUnsupportedReason() ??
        "Google Sign-In nie jest dostępny w tym buildzie."
    );
  }

  const webClientId = getConfiguredWebClientId();
  googleSigninModule.GoogleSignin.configure(webClientId ? { webClientId } : {});
  googleSigninConfigured = true;
  void startLegacyStateCleanup();
}

function hasDriveScope(user: GoogleDriveUser | null): boolean {
  return Boolean(user?.scopes?.includes(GOOGLE_DRIVE_SCOPE));
}

function getPlayServicesErrorMessage(error: unknown): string {
  const googleSigninModule = getGoogleSigninModule();
  if (
    googleSigninModule &&
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === googleSigninModule.statusCodes.PLAY_SERVICES_NOT_AVAILABLE
  ) {
    return "Google Play Services są niedostępne albo wymagają aktualizacji.";
  }

  return "Nie udało się uruchomić logowania Google na tym urządzeniu.";
}

function getTokenErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Nie udało się pobrać dostępu do Google Drive. Połącz konto ponownie.";
}

function isGoogleDriveSessionErrorMessage(message: string): boolean {
  return (
    message.includes("getTokens") ||
    message.includes("Google Drive") ||
    message.includes("Google Sign-In") ||
    message.includes("tokenu dostępu") ||
    message.includes("dostępu do Google Drive") ||
    message.includes("Brak połączenia z Google Drive") ||
    message.includes("Brak wymaganego uprawnienia Google Drive")
  );
}

async function requireSignedInUser(): Promise<GoogleDriveUser> {
  ensureGoogleSigninConfigured();
  const googleSigninModule = getGoogleSigninModule();
  if (!googleSigninModule) {
    throw new Error(
      getGoogleDriveUnsupportedReason() ??
        "Google Sign-In nie jest dostępny w tym buildzie."
    );
  }

  const currentUser = googleSigninModule.GoogleSignin.getCurrentUser();
  if (currentUser) {
    return currentUser;
  }

  if (!googleSigninModule.GoogleSignin.hasPreviousSignIn()) {
    throw new Error("Brak połączenia z Google Drive.");
  }

  const result = await googleSigninModule.GoogleSignin.signInSilently();
  if (result.type !== "success") {
    throw new Error("Brak połączenia z Google Drive.");
  }

  return result.data;
}

async function getFreshAccessToken(): Promise<string> {
  const user = await requireSignedInUser();
  if (!hasDriveScope(user)) {
    throw new Error(
      "Brak wymaganego uprawnienia Google Drive. Połącz konto ponownie."
    );
  }

  try {
    if (!freshAccessTokenPromise) {
      freshAccessTokenPromise = (async () => {
        const googleSigninModule = getGoogleSigninModule();
        if (!googleSigninModule) {
          throw new Error(
            getGoogleDriveUnsupportedReason() ??
              "Google Sign-In nie jest dostępny w tym buildzie."
          );
        }

        const tokens = await googleSigninModule.GoogleSignin.getTokens();
        if (!tokens.accessToken) {
          throw new Error("Brak tokenu dostępu Google Drive.");
        }
        return tokens.accessToken;
      })();

      freshAccessTokenPromise.finally(() => {
        if (freshAccessTokenPromise) {
          freshAccessTokenPromise = null;
        }
      });
    }

    return await freshAccessTokenPromise;
  } catch (error) {
    throw new Error(getTokenErrorMessage(error));
  }
}

async function authorizedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const accessToken = await getFreshAccessToken();
  const headers = new Headers(options?.headers ?? {});
  headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(url, {
    ...options,
    headers,
  });
}

function buildSnapshotListQuery(limit: number, pageToken?: string): string {
  const q = encodeURIComponent(
    `'appDataFolder' in parents and trashed=false and mimeType='application/zip'`
  );
  const tokenParam = pageToken
    ? `&pageToken=${encodeURIComponent(pageToken)}`
    : "";
  return `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=appDataFolder&fields=files(id,name,modifiedTime,size),nextPageToken&pageSize=${limit}&orderBy=modifiedTime desc${tokenParam}`;
}

async function createDriveBackupFileMetadata(
  backupName: string,
  manifest: BackupArchiveManifest
): Promise<string> {
  const response = await authorizedFetch(
    "https://www.googleapis.com/drive/v3/files?fields=id",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: backupName,
        parents: ["appDataFolder"],
        mimeType: "application/zip",
        appProperties: {
          kind: BACKUP_KIND,
          schemaVersion: String(manifest.schemaVersion),
          createdAt: manifest.createdAt,
          appVersion: manifest.appVersion,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Nie udało się utworzyć pliku backupu na Google Drive.");
  }

  const body = (await response.json()) as { id: string };
  return body.id;
}

async function uploadZipToDrive(
  zipUri: string,
  fileId: string
): Promise<GoogleDriveBackupMetadata> {
  const accessToken = await getFreshAccessToken();
  const uploadResult = await FileSystem.uploadAsync(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,name,modifiedTime,size`,
    zipUri,
    {
      httpMethod: "PATCH",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/zip",
      },
    }
  );

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error("Nie udało się wysłać backupu na Google Drive.");
  }

  const body = JSON.parse(uploadResult.body) as {
    id: string;
    name: string;
    modifiedTime?: string;
    size?: string;
  };

  return {
    fileId: body.id,
    name: body.name,
    modifiedTime: body.modifiedTime ?? null,
    size: body.size ? Number(body.size) : null,
  };
}

function mapDriveMetadata(body: {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
}): GoogleDriveBackupMetadata {
  return {
    fileId: body.id,
    name: body.name,
    modifiedTime: body.modifiedTime ?? null,
    size: body.size ? Number(body.size) : null,
  };
}

function buildDownloadTargetUri(prefix: string, fileId: string): string {
  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error("Brak katalogu tymczasowego do pobrania backupu.");
  }
  return `${baseDir}${prefix}-${fileId}.zip`;
}

async function downloadBackupFile(fileId: string, prefix: string): Promise<string> {
  const targetUri = buildDownloadTargetUri(prefix, fileId);
  const accessToken = await getFreshAccessToken();
  const download = await FileSystem.downloadAsync(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    targetUri,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (download.status < 200 || download.status >= 300) {
    throw new Error("Nie udało się pobrać backupu z Google Drive.");
  }

  return download.uri;
}

async function enrichSnapshotMetadata(
  metadata: GoogleDriveBackupMetadata
): Promise<GoogleDriveBackupSnapshot> {
  try {
    const fileUri = await downloadBackupFile(metadata.fileId, "google-drive-manifest");
    const manifest = await readBackupArchiveManifest(fileUri);
    return {
      ...metadata,
      manifest,
      isCompatible: true,
      compatibilityMessage: null,
    };
  } catch (error) {
    const compatibilityMessage =
      error instanceof Error
        ? error.message
        : "Nie udało się odczytać manifestu backupu.";

    if (isGoogleDriveSessionErrorMessage(compatibilityMessage)) {
      throw new Error(compatibilityMessage);
    }

    return {
      ...metadata,
      manifest: null,
      isCompatible: false,
      compatibilityMessage,
    };
  }
}

async function deleteDriveFile(fileId: string): Promise<void> {
  const response = await authorizedFetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error("Nie udało się usunąć starego backupu z Google Drive.");
  }
}

export function initializeGoogleDriveBackup(): void {
  if (!canUseNativeGoogleSignin()) {
    return;
  }

  try {
    ensureGoogleSigninConfigured();
  } catch (error) {
    console.warn("[googleDriveBackup] Google Sign-In configure failed", error);
  }
}

export function getGoogleDriveConfigurationError(): string | null {
  return getGoogleDriveUnsupportedReason();
}

export function isGoogleDriveConfigured(): boolean {
  return getGoogleDriveConfigurationError() == null;
}

export async function connectGoogleDrive(): Promise<ConnectGoogleDriveResult> {
  ensureGoogleSigninConfigured();
  await startLegacyStateCleanup();
  const googleSigninModule = getGoogleSigninModule();
  if (!googleSigninModule) {
    throw new Error(
      getGoogleDriveUnsupportedReason() ??
        "Google Sign-In nie jest dostępny w tym buildzie."
    );
  }

  try {
    await googleSigninModule.GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });
  } catch (error) {
    throw new Error(getPlayServicesErrorMessage(error));
  }

  const signInResult = await googleSigninModule.GoogleSignin.signIn();
  if (signInResult.type !== "success") {
    return {
      connected: false,
      cancelled: true,
    };
  }

  const scopeResult = hasDriveScope(signInResult.data)
    ? signInResult
    : await googleSigninModule.GoogleSignin.addScopes({
        scopes: [GOOGLE_DRIVE_SCOPE],
      });

  if (!scopeResult || scopeResult.type !== "success") {
    return {
      connected: false,
      cancelled: true,
    };
  }

  return {
    connected: true,
    cancelled: false,
  };
}

export async function disconnectGoogleDrive(): Promise<void> {
  if (!canUseNativeGoogleSignin()) {
    await startLegacyStateCleanup();
    return;
  }

  ensureGoogleSigninConfigured();
  const googleSigninModule = getGoogleSigninModule();
  if (!googleSigninModule) {
    await startLegacyStateCleanup();
    return;
  }

  try {
    await googleSigninModule.GoogleSignin.revokeAccess();
  } catch (error) {
    console.warn("[googleDriveBackup] Google revokeAccess failed", error);
  }

  try {
    await googleSigninModule.GoogleSignin.signOut();
  } catch (error) {
    console.warn("[googleDriveBackup] Google signOut failed", error);
  }

  await startLegacyStateCleanup();
}

export async function listBackupSnapshots(
  limit = DEFAULT_LIST_LIMIT
): Promise<GoogleDriveBackupMetadata[]> {
  const response = await authorizedFetch(buildSnapshotListQuery(limit));
  if (!response.ok) {
    throw new Error("Nie udało się pobrać listy backupów z Google Drive.");
  }

  const body = (await response.json()) as {
    files?: {
      id: string;
      name: string;
      modifiedTime?: string;
      size?: string;
    }[];
  };

  return (body.files ?? [])
    .filter(
      (file) =>
        typeof file.name === "string" &&
        (file.name.startsWith(BACKUP_FILE_QUERY_PREFIX) ||
          file.name === LEGACY_BACKUP_FILENAME)
    )
    .map(mapDriveMetadata);
}

async function listAllBackupSnapshots(): Promise<GoogleDriveBackupMetadata[]> {
  const snapshots: GoogleDriveBackupMetadata[] = [];
  let nextPageToken: string | undefined;

  do {
    const response = await authorizedFetch(
      buildSnapshotListQuery(DEFAULT_LIST_LIMIT, nextPageToken)
    );
    if (!response.ok) {
      throw new Error("Nie udało się pobrać listy backupów z Google Drive.");
    }

    const body = (await response.json()) as {
      files?: {
        id: string;
        name: string;
        modifiedTime?: string;
        size?: string;
      }[];
      nextPageToken?: string;
    };

    snapshots.push(
      ...(body.files ?? [])
        .filter(
          (file) =>
            typeof file.name === "string" &&
            (file.name.startsWith(BACKUP_FILE_QUERY_PREFIX) ||
              file.name === LEGACY_BACKUP_FILENAME)
        )
        .map(mapDriveMetadata)
    );

    nextPageToken = body.nextPageToken;
  } while (nextPageToken);

  return snapshots;
}

export async function listRecentBackupSnapshots(
  limit = 3
): Promise<GoogleDriveBackupSnapshot[]> {
  const snapshots = await listBackupSnapshots(limit);
  const enrichedSnapshots: GoogleDriveBackupSnapshot[] = [];

  for (const snapshot of snapshots) {
    enrichedSnapshots.push(await enrichSnapshotMetadata(snapshot));
  }

  return enrichedSnapshots;
}

export async function createBackupSnapshot(): Promise<GoogleDriveBackupSnapshot> {
  const backup = await createBackupZip();
  try {
    const fileId = await createDriveBackupFileMetadata(
      backup.fileUri.split("/").pop() ?? `${BACKUP_FILE_QUERY_PREFIX}${Date.now()}.zip`,
      backup.manifest
    );
    const metadata = await uploadZipToDrive(backup.fileUri, fileId);

    return {
      ...metadata,
      manifest: backup.manifest,
      isCompatible: true,
      compatibilityMessage: null,
    };
  } finally {
    await FileSystem.deleteAsync(backup.fileUri, { idempotent: true }).catch(
      (error) => {
        console.warn("[googleDriveBackup] Failed to clean up local temp backup", {
          fileUri: backup.fileUri,
          error,
        });
      }
    );
  }
}

export async function pruneOldBackupSnapshots(keep = 3): Promise<void> {
  const snapshots = await listAllBackupSnapshots();
  const snapshotsToDelete = snapshots.slice(keep);
  await Promise.all(
    snapshotsToDelete.map(async (snapshot) => {
      try {
        await deleteDriveFile(snapshot.fileId);
      } catch (error) {
        console.warn("[googleDriveBackup] Failed to prune old snapshot", {
          fileId: snapshot.fileId,
          error,
        });
      }
    })
  );
}

export async function readBackupManifestFromDrive(
  fileId: string
): Promise<BackupArchiveManifest> {
  const fileUri = await downloadBackupFile(fileId, "google-drive-read");
  return readBackupArchiveManifest(fileUri);
}

export async function restoreBackupFromDrive(
  fileId: string
): Promise<{
  metadata: GoogleDriveBackupSnapshot;
  restoreResult: ImportResult;
}> {
  const snapshots = await listRecentBackupSnapshots(DEFAULT_LIST_LIMIT);
  const metadata = snapshots.find((snapshot) => snapshot.fileId === fileId);
  if (!metadata) {
    throw new Error("Nie znaleziono wybranej kopii na Google Drive.");
  }
  if (!metadata.isCompatible) {
    throw new Error(
      metadata.compatibilityMessage ??
        "Ta kopia została utworzona w nieobsługiwanym formacie i nie może zostać przywrócona automatycznie."
    );
  }

  const downloadUri = await downloadBackupFile(fileId, "google-drive-restore");
  const archivePackage = await readBackupArchivePackage(downloadUri);
  const restoreResult = await restoreUserData(archivePackage.payload, {
    replaceExistingData: true,
  });
  return {
    metadata: {
      ...metadata,
      manifest: archivePackage.manifest,
      isCompatible: true,
      compatibilityMessage: null,
    },
    restoreResult,
  };
}
