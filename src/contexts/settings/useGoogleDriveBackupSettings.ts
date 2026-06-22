import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useRef, useState } from "react";

import {
  connectGoogleDrive,
  createBackupSnapshot,
  disconnectGoogleDrive,
  getGoogleDriveConfigurationError,
  isGoogleDriveConfigured,
  listRecentBackupSnapshots,
  pruneOldBackupSnapshots,
  restoreBackupFromDrive,
  type GoogleDriveBackupSnapshot,
} from "@/src/services/googleDriveBackup";
import type { ImportResult } from "@/src/services/importUserData";
import { setOnboardingCheckpoint } from "@/src/services/onboardingCheckpoint";
import { usePersistedState } from "@/src/hooks/usePersistedState";
import i18n from "@/src/i18n";

import type { CourseSelectionStateToApply } from "./useCourseSelectionSettings";

type UseGoogleDriveBackupSettingsParams = {
  applyCourseSelectionState: (
    state: CourseSelectionStateToApply
  ) => Promise<void>;
  setStatsFireEffectEnabled: (value: boolean) => Promise<void>;
  setStatsBookshelfEnabled: (value: boolean) => Promise<void>;
  markOnboardingDone?: () => Promise<void>;
};

const GOOGLE_DRIVE_NOT_CONFIGURED_MESSAGE =
  "Google Drive backup nie jest skonfigurowany.";

const defaultMarkOnboardingDone = () => setOnboardingCheckpoint("done");

function readBoolean(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "boolean" ? parsed : false;
  } catch {
    return false;
  }
}

export function useGoogleDriveBackupSettings({
  applyCourseSelectionState,
  setStatsFireEffectEnabled,
  setStatsBookshelfEnabled,
  markOnboardingDone = defaultMarkOnboardingDone,
}: UseGoogleDriveBackupSettingsParams) {
  const [googleDriveConnected, setGoogleDriveConnectedState] =
    usePersistedState<boolean>("googleDriveBackup.connected", false);
  const [
    lastSuccessfulGoogleDriveBackupAt,
    setLastSuccessfulGoogleDriveBackupAt,
  ] = usePersistedState<number | null>(
    "googleDriveBackup.lastSuccessfulBackupAt",
    null
  );
  const [lastGoogleDriveBackupAttemptAt, setLastGoogleDriveBackupAttemptAt] =
    usePersistedState<number | null>("googleDriveBackup.lastBackupAttemptAt", null);
  const [googleDriveBackupError, setGoogleDriveBackupError] =
    usePersistedState<string | null>("googleDriveBackup.lastBackupError", null);
  const googleDriveBackupInFlightRef = useRef(false);
  const googleDriveRestoreInFlightRef = useRef(false);
  const googleDriveSnapshotsRefreshInFlightRef = useRef<Promise<void> | null>(
    null
  );
  const [googleDriveBackupSnapshots, setGoogleDriveBackupSnapshots] = useState<
    GoogleDriveBackupSnapshot[]
  >([]);
  const [googleDriveBackupSnapshotsLoading, setGoogleDriveBackupSnapshotsLoading] =
    useState(false);
  const [googleDriveBackupSnapshotsError, setGoogleDriveBackupSnapshotsError] =
    useState<string | null>(null);
  const [googleDriveBackupInProgress, setGoogleDriveBackupInProgress] =
    useState(false);
  const [googleDriveRestoreInProgress, setGoogleDriveRestoreInProgress] =
    useState(false);

  const googleDriveConfigured = isGoogleDriveConfigured();
  const googleDriveConfigurationError = getGoogleDriveConfigurationError();

  const refreshGoogleDriveBackupSnapshotsForConnection = useCallback(
    async (connected: boolean) => {
      if (!googleDriveConfigured || !connected) {
        setGoogleDriveBackupSnapshots([]);
        setGoogleDriveBackupSnapshotsError(null);
        setGoogleDriveBackupSnapshotsLoading(false);
        return;
      }

      if (googleDriveSnapshotsRefreshInFlightRef.current) {
        await googleDriveSnapshotsRefreshInFlightRef.current;
        return;
      }

      const refreshPromise = (async () => {
        setGoogleDriveBackupSnapshotsLoading(true);
        setGoogleDriveBackupSnapshotsError(null);
        try {
          const snapshots = await listRecentBackupSnapshots(3);
          setGoogleDriveBackupSnapshots(snapshots);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : i18n.t(
                  "contexts.settingsContext.message.nieUdaloSiePobracListy"
                );
          setGoogleDriveBackupSnapshots([]);
          setGoogleDriveBackupSnapshotsError(message);
        } finally {
          setGoogleDriveBackupSnapshotsLoading(false);
          googleDriveSnapshotsRefreshInFlightRef.current = null;
        }
      })();

      googleDriveSnapshotsRefreshInFlightRef.current = refreshPromise;
      await refreshPromise;
    },
    [googleDriveConfigured]
  );

  const refreshGoogleDriveBackupSnapshots = useCallback(async () => {
    await refreshGoogleDriveBackupSnapshotsForConnection(googleDriveConnected);
  }, [googleDriveConnected, refreshGoogleDriveBackupSnapshotsForConnection]);

  const connectGoogleDriveBackup = useCallback(async () => {
    if (!googleDriveConfigured) {
      throw new Error(
        googleDriveConfigurationError ?? GOOGLE_DRIVE_NOT_CONFIGURED_MESSAGE
      );
    }

    const result = await connectGoogleDrive();
    if (result.connected) {
      await Promise.all([
        setGoogleDriveConnectedState(true),
        setGoogleDriveBackupError(null),
      ]);
      await refreshGoogleDriveBackupSnapshotsForConnection(true);
    }
    return result;
  }, [
    googleDriveConfigured,
    googleDriveConfigurationError,
    refreshGoogleDriveBackupSnapshotsForConnection,
    setGoogleDriveBackupError,
    setGoogleDriveConnectedState,
  ]);

  const disconnectGoogleDriveBackup = useCallback(async () => {
    await disconnectGoogleDrive();
    await Promise.all([
      setGoogleDriveConnectedState(false),
      setGoogleDriveBackupError(null),
    ]);
    setGoogleDriveBackupSnapshots([]);
    setGoogleDriveBackupSnapshotsError(null);
    setGoogleDriveBackupSnapshotsLoading(false);
  }, [setGoogleDriveBackupError, setGoogleDriveConnectedState]);

  const applyImportedAppState = useCallback(
    async (result: ImportResult) => {
      const restoredState = result.restoredState;
      if (!restoredState) {
        return;
      }

      console.log("[SettingsContext] applyImportedAppState", restoredState);

      if (restoredState.shouldApplySelection) {
        await applyCourseSelectionState({
          pinnedOfficialCourseIds: restoredState.pinnedOfficialCourseIds,
          activeCustomCourseId: restoredState.activeCustomCourseId,
          activeCourseIdx: restoredState.activeCourseIdx,
        });
      }

      if (restoredState.statsUiStateApplied) {
        const [statsFireEffectEnabledRaw, statsBookshelfEnabledRaw] =
          await Promise.all([
            AsyncStorage.getItem("stats.fireEffectEnabled"),
            AsyncStorage.getItem("stats.bookshelfEnabled"),
          ]);

        await Promise.all([
          setStatsFireEffectEnabled(readBoolean(statsFireEffectEnabledRaw)),
          setStatsBookshelfEnabled(readBoolean(statsBookshelfEnabledRaw)),
        ]);
      }

      if (restoredState.shouldMarkOnboardingDone) {
        await markOnboardingDone();
      }
    },
    [
      applyCourseSelectionState,
      markOnboardingDone,
      setStatsBookshelfEnabled,
      setStatsFireEffectEnabled,
    ]
  );

  const backupUserDataToGoogleDriveNow = useCallback(async () => {
    if (!googleDriveConfigured) {
      throw new Error(
        googleDriveConfigurationError ?? GOOGLE_DRIVE_NOT_CONFIGURED_MESSAGE
      );
    }
    if (googleDriveBackupInFlightRef.current) {
      return;
    }
    googleDriveBackupInFlightRef.current = true;
    setGoogleDriveBackupInProgress(true);

    const now = Date.now();
    await Promise.all([
      setLastGoogleDriveBackupAttemptAt(now),
      setGoogleDriveBackupError(null),
    ]);

    try {
      await createBackupSnapshot();
      await Promise.all([
        setGoogleDriveConnectedState(true),
        setLastSuccessfulGoogleDriveBackupAt(now),
        setGoogleDriveBackupError(null),
      ]);

      try {
        const snapshots = await listRecentBackupSnapshots(3);
        setGoogleDriveBackupSnapshots(snapshots);
        setGoogleDriveBackupSnapshotsError(null);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : i18n.t(
                "contexts.settingsContext.message.nieUdaloSiePobracListy"
              );
        setGoogleDriveBackupSnapshotsError(message);
      }

      try {
        await pruneOldBackupSnapshots(3);
        const snapshots = await listRecentBackupSnapshots(3);
        setGoogleDriveBackupSnapshots(snapshots);
        setGoogleDriveBackupSnapshotsError(null);
      } catch (error) {
        console.warn("[SettingsContext] Google Drive prune failed", error);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : i18n.t(
              "contexts.settingsContext.message.nieUdaloSieWyslacBackupu"
            );
      await setGoogleDriveBackupError(message);
      throw error;
    } finally {
      googleDriveBackupInFlightRef.current = false;
      setGoogleDriveBackupInProgress(false);
    }
  }, [
    googleDriveConfigured,
    googleDriveConfigurationError,
    setGoogleDriveBackupError,
    setGoogleDriveConnectedState,
    setLastGoogleDriveBackupAttemptAt,
    setLastSuccessfulGoogleDriveBackupAt,
  ]);

  const restoreUserDataFromGoogleDrive = useCallback(
    async (fileId: string) => {
      if (!googleDriveConfigured) {
        throw new Error(
          googleDriveConfigurationError ?? GOOGLE_DRIVE_NOT_CONFIGURED_MESSAGE
        );
      }
      if (googleDriveRestoreInFlightRef.current) {
        return { success: false };
      }
      googleDriveRestoreInFlightRef.current = true;
      setGoogleDriveRestoreInProgress(true);

      try {
        const result = await restoreBackupFromDrive(fileId);
        await Promise.all([
          setGoogleDriveConnectedState(true),
          setGoogleDriveBackupError(null),
        ]);
        return result.restoreResult;
      } finally {
        googleDriveRestoreInFlightRef.current = false;
        setGoogleDriveRestoreInProgress(false);
      }
    },
    [
      googleDriveConfigured,
      googleDriveConfigurationError,
      setGoogleDriveBackupError,
      setGoogleDriveConnectedState,
    ]
  );

  return {
    googleDriveConfigured,
    googleDriveConfigurationError,
    googleDriveConnected,
    lastSuccessfulGoogleDriveBackupAt,
    lastGoogleDriveBackupAttemptAt,
    googleDriveBackupError,
    googleDriveBackupSnapshots,
    googleDriveBackupSnapshotsLoading,
    googleDriveBackupSnapshotsError,
    googleDriveBackupInProgress,
    googleDriveRestoreInProgress,
    connectGoogleDriveBackup,
    disconnectGoogleDriveBackup,
    backupUserDataToGoogleDriveNow,
    restoreUserDataFromGoogleDrive,
    refreshGoogleDriveBackupSnapshots,
    applyImportedAppState,
  };
}
