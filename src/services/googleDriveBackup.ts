import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import {
  createBackupZip,
  readBackupArchive,
  restoreUserData,
  type ImportResult,
} from "@/src/services/userDataBackup";

const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const LEGACY_AUTH_STORAGE_KEY = "googleDriveBackup.auth";
const DEFAULT_BACKUP_FILENAME = "memicard-drive-backup-latest.zip";
const STARTUP_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

type GoogleDriveExtraConfig = {
  webClientId?: string;
  backupFileName?: string;
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

export type ConnectGoogleDriveResult =
  | {
      connected: true;
      cancelled: false;
    }
  | {
      connected: false;
      cancelled: true;
    };

export type StartupBackupResult = {
  attempted: boolean;
  skippedReason?: "disabled" | "not_connected" | "not_due";
  fileId?: string;
  backupAt?: number;
};

let googleSigninConfigured = false;
let legacyStateCleanupPromise: Promise<void> | null = null;
let googleSigninModuleCache: GoogleSigninModule | null | undefined;

function getExtraConfig(): GoogleDriveExtraConfig {
  return (Constants.expoConfig?.extra?.googleDriveBackup ??
    {}) as GoogleDriveExtraConfig;
}

function getConfiguredWebClientId(): string | null {
  const webClientId = getExtraConfig().webClientId?.trim();
  return webClientId ? webClientId : null;
}

function getBackupFileName(): string {
  const configured = getExtraConfig().backupFileName?.trim();
  return configured && configured.length > 0
    ? configured
    : DEFAULT_BACKUP_FILENAME;
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

async function resolveBackupFileId(
  preferredFileId?: string | null
): Promise<string | null> {
  if (preferredFileId) {
    const response = await authorizedFetch(
      `https://www.googleapis.com/drive/v3/files/${preferredFileId}?fields=id,name,modifiedTime,size`
    );
    if (response.ok) {
      const body = (await response.json()) as {
        id: string;
      };
      return body.id;
    }
  }

  const q = encodeURIComponent(
    `name='${getBackupFileName()}' and 'appDataFolder' in parents and trashed=false`
  );
  const response = await authorizedFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=appDataFolder&fields=files(id,name,modifiedTime,size)&pageSize=1&orderBy=modifiedTime desc`
  );
  if (!response.ok) {
    throw new Error("Nie udało się odnaleźć pliku backupu na Google Drive.");
  }
  const body = (await response.json()) as {
    files?: { id: string }[];
  };
  return body.files?.[0]?.id ?? null;
}

async function createDriveBackupFileMetadata(): Promise<string> {
  const response = await authorizedFetch(
    "https://www.googleapis.com/drive/v3/files?fields=id",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: getBackupFileName(),
        parents: ["appDataFolder"],
        mimeType: "application/zip",
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

export async function getLatestDriveBackupMetadata(
  preferredFileId?: string | null
): Promise<GoogleDriveBackupMetadata | null> {
  const fileId = await resolveBackupFileId(preferredFileId);
  if (!fileId) return null;

  const response = await authorizedFetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,modifiedTime,size`
  );
  if (!response.ok) {
    throw new Error("Nie udało się pobrać metadanych backupu z Google Drive.");
  }

  const body = (await response.json()) as {
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

export async function uploadLatestBackupToDrive(
  preferredFileId?: string | null
): Promise<GoogleDriveBackupMetadata> {
  const backup = await createBackupZip();
  let fileId = await resolveBackupFileId(preferredFileId);
  if (!fileId) {
    fileId = await createDriveBackupFileMetadata();
  }
  return uploadZipToDrive(backup.fileUri, fileId);
}

export async function restoreBackupFromDrive(
  preferredFileId?: string | null
): Promise<{
  metadata: GoogleDriveBackupMetadata;
  restoreResult: ImportResult;
}> {
  const metadata = await getLatestDriveBackupMetadata(preferredFileId);
  if (!metadata) {
    throw new Error("Nie znaleziono backupu na Google Drive.");
  }

  const targetUri = `${
    FileSystem.cacheDirectory ?? FileSystem.documentDirectory
  }google-drive-restore.zip`;
  if (!targetUri) {
    throw new Error("Brak katalogu tymczasowego do pobrania backupu.");
  }

  const accessToken = await getFreshAccessToken();
  const download = await FileSystem.downloadAsync(
    `https://www.googleapis.com/drive/v3/files/${metadata.fileId}?alt=media`,
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

  const payload = await readBackupArchive(download.uri);
  const restoreResult = await restoreUserData(payload, {
    replaceExistingData: true,
  });
  return {
    metadata,
    restoreResult,
  };
}

export async function maybeRunStartupBackup(params: {
  enabled: boolean;
  connected: boolean;
  lastSuccessfulBackupAt: number | null;
  driveBackupFileId?: string | null;
}): Promise<StartupBackupResult> {
  if (!params.enabled) {
    return {
      attempted: false,
      skippedReason: "disabled",
    };
  }
  if (!params.connected) {
    return {
      attempted: false,
      skippedReason: "not_connected",
    };
  }

  const now = Date.now();
  if (
    params.lastSuccessfulBackupAt &&
    now - params.lastSuccessfulBackupAt < STARTUP_BACKUP_INTERVAL_MS
  ) {
    return {
      attempted: false,
      skippedReason: "not_due",
    };
  }

  const metadata = await uploadLatestBackupToDrive(params.driveBackupFileId);
  return {
    attempted: true,
    fileId: metadata.fileId,
    backupAt: now,
  };
}
