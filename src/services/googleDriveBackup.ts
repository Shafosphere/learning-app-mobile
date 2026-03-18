import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import {
  AuthRequest,
  ResponseType,
  exchangeCodeAsync,
  makeRedirectUri,
  refreshAsync,
  revokeAsync,
} from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createBackupZip,
  readBackupArchive,
  restoreUserData,
  type ImportResult,
} from "@/src/services/userDataBackup";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
};

const AUTH_STORAGE_KEY = "googleDriveBackup.auth";
const DEFAULT_BACKUP_FILENAME = "memicard-drive-backup-latest.zip";
const STARTUP_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

type StoredGoogleDriveAuth = {
  clientId: string;
  redirectUri: string;
  token: {
    accessToken: string;
    tokenType: string;
    expiresIn?: number;
    refreshToken?: string;
    scope?: string;
    state?: string;
    idToken?: string;
    issuedAt: number;
  };
};

type GoogleDriveExtraConfig = {
  androidClientId?: string;
  iosClientId?: string;
  webClientId?: string;
  backupFileName?: string;
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

function getExtraConfig(): GoogleDriveExtraConfig {
  return (Constants.expoConfig?.extra?.googleDriveBackup ??
    {}) as GoogleDriveExtraConfig;
}

function getConfiguredClientId(): string | null {
  const config = getExtraConfig();
  if (Platform.OS === "android") {
    return config.androidClientId ?? null;
  }
  if (Platform.OS === "ios") {
    return config.iosClientId ?? null;
  }
  return config.webClientId ?? null;
}

export function getGoogleDriveConfigurationError(): string | null {
  const clientId = getConfiguredClientId();
  if (!clientId) {
    return "Brak skonfigurowanego Google OAuth client ID dla tej platformy.";
  }
  return null;
}

export function isGoogleDriveConfigured(): boolean {
  return getGoogleDriveConfigurationError() == null;
}

function getBackupFileName(): string {
  const configured = getExtraConfig().backupFileName?.trim();
  return configured && configured.length > 0
    ? configured
    : DEFAULT_BACKUP_FILENAME;
}

function getRedirectUri(): string {
  const schemeConfig = Constants.expoConfig?.scheme;
  const scheme = Array.isArray(schemeConfig) ? schemeConfig[0] : schemeConfig;
  return makeRedirectUri({
    scheme: scheme ?? "memicard",
    path: "oauthredirect",
  });
}

async function saveStoredAuth(auth: StoredGoogleDriveAuth): Promise<void> {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

async function loadStoredAuth(): Promise<StoredGoogleDriveAuth | null> {
  const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredGoogleDriveAuth;
  } catch (error) {
    console.warn("[googleDriveBackup] Failed to parse auth state", error);
    return null;
  }
}

async function clearStoredAuth(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
}

async function getFreshToken(): Promise<StoredGoogleDriveAuth> {
  const stored = await loadStoredAuth();
  if (!stored) {
    throw new Error("Brak połączenia z Google Drive.");
  }

  const token = stored.token;
  const expiresAt =
    typeof token.expiresIn === "number"
      ? token.issuedAt + token.expiresIn
      : Number.POSITIVE_INFINITY;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const isStillFresh = expiresAt - nowSeconds > 60;

  if (isStillFresh || !token.refreshToken) {
    return stored;
  }

  const refreshed = await refreshAsync(
    {
      clientId: stored.clientId,
      refreshToken: token.refreshToken,
      scopes: [GOOGLE_DRIVE_SCOPE],
    },
    GOOGLE_DISCOVERY
  );

  const refreshedStored: StoredGoogleDriveAuth = {
    ...stored,
    token: {
      accessToken: refreshed.accessToken,
      tokenType: refreshed.tokenType,
      expiresIn: refreshed.expiresIn,
      refreshToken: refreshed.refreshToken ?? token.refreshToken,
      scope: refreshed.scope,
      state: refreshed.state,
      idToken: refreshed.idToken,
      issuedAt: refreshed.issuedAt,
    },
  };
  await saveStoredAuth(refreshedStored);
  return refreshedStored;
}

async function authorizedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const auth = await getFreshToken();
  const headers = new Headers(options?.headers ?? {});
  headers.set("Authorization", `Bearer ${auth.token.accessToken}`);
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
  const auth = await getFreshToken();
  const uploadResult = await FileSystem.uploadAsync(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,name,modifiedTime,size`,
    zipUri,
    {
      httpMethod: "PATCH",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${auth.token.accessToken}`,
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

export async function connectGoogleDrive(): Promise<ConnectGoogleDriveResult> {
  const clientId = getConfiguredClientId();
  if (!clientId) {
    throw new Error(getGoogleDriveConfigurationError() ?? "Brak client ID.");
  }

  const redirectUri = getRedirectUri();
  const request = new AuthRequest({
    clientId,
    redirectUri,
    scopes: [GOOGLE_DRIVE_SCOPE],
    responseType: ResponseType.Code,
    usePKCE: true,
    extraParams: {
      access_type: "offline",
      prompt: "consent",
    },
  });

  const result = await request.promptAsync(GOOGLE_DISCOVERY);
  if (result.type !== "success" || !result.params.code) {
    return {
      connected: false,
      cancelled: true,
    };
  }

  const token = await exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri,
      extraParams: {
        code_verifier: request.codeVerifier ?? "",
      },
    },
    GOOGLE_DISCOVERY
  );

  await saveStoredAuth({
    clientId,
    redirectUri,
    token: {
      accessToken: token.accessToken,
      tokenType: token.tokenType,
      expiresIn: token.expiresIn,
      refreshToken: token.refreshToken,
      scope: token.scope,
      state: token.state,
      idToken: token.idToken,
      issuedAt: token.issuedAt,
    },
  });

  return {
    connected: true,
    cancelled: false,
  };
}

export async function disconnectGoogleDrive(): Promise<void> {
  const stored = await loadStoredAuth();
  if (stored?.token?.refreshToken) {
    try {
      await revokeAsync(
        {
          token: stored.token.refreshToken,
          clientId: stored.clientId,
        },
        GOOGLE_DISCOVERY
      );
    } catch (error) {
      console.warn("[googleDriveBackup] Refresh token revoke failed", error);
    }
  } else if (stored?.token?.accessToken) {
    try {
      await revokeAsync(
        {
          token: stored.token.accessToken,
          clientId: stored.clientId,
        },
        GOOGLE_DISCOVERY
      );
    } catch (error) {
      console.warn("[googleDriveBackup] Access token revoke failed", error);
    }
  }

  await clearStoredAuth();
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

  const auth = await getFreshToken();
  const download = await FileSystem.downloadAsync(
    `https://www.googleapis.com/drive/v3/files/${metadata.fileId}?alt=media`,
    targetUri,
    {
      headers: {
        Authorization: `Bearer ${auth.token.accessToken}`,
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
