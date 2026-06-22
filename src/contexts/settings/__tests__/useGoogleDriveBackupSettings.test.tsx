import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook } from "@testing-library/react-native";

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

import { useGoogleDriveBackupSettings } from "../useGoogleDriveBackupSettings";

const mockPersistedValues = new Map<string, unknown>();
const mockPersistedSetters = new Map<string, jest.Mock>();

jest.mock("@/src/hooks/usePersistedState", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return {
    usePersistedState: jest.fn((key: string, initialValue: unknown) => {
      const [value, setValue] = React.useState(() =>
        mockPersistedValues.has(key) ? mockPersistedValues.get(key) : initialValue
      );
      const setter = mockPersistedSetters.get(key) ?? jest.fn();
      mockPersistedSetters.set(key, setter);
      return [
        value,
        async (nextValue: unknown) => {
          mockPersistedValues.set(key, nextValue);
          setter(nextValue);
          setValue(nextValue);
        },
      ];
    }),
  };
});

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
}));

jest.mock("@/src/i18n", () => ({
  __esModule: true,
  default: {
    t: jest.fn((key: string) => key),
  },
}));

jest.mock("@/src/services/googleDriveBackup", () => ({
  connectGoogleDrive: jest.fn(),
  createBackupSnapshot: jest.fn(),
  disconnectGoogleDrive: jest.fn(),
  getGoogleDriveConfigurationError: jest.fn(),
  isGoogleDriveConfigured: jest.fn(),
  listRecentBackupSnapshots: jest.fn(),
  pruneOldBackupSnapshots: jest.fn(),
  restoreBackupFromDrive: jest.fn(),
}));

jest.mock("@/src/services/onboardingCheckpoint", () => ({
  setOnboardingCheckpoint: jest.fn(),
}));

const mockedConnectGoogleDrive = jest.mocked(connectGoogleDrive);
const mockedCreateBackupSnapshot = jest.mocked(createBackupSnapshot);
const mockedDisconnectGoogleDrive = jest.mocked(disconnectGoogleDrive);
const mockedGetGoogleDriveConfigurationError = jest.mocked(
  getGoogleDriveConfigurationError
);
const mockedIsGoogleDriveConfigured = jest.mocked(isGoogleDriveConfigured);
const mockedListRecentBackupSnapshots = jest.mocked(listRecentBackupSnapshots);
const mockedPruneOldBackupSnapshots = jest.mocked(pruneOldBackupSnapshots);
const mockedRestoreBackupFromDrive = jest.mocked(restoreBackupFromDrive);
const mockedAsyncStorageGetItem = jest.mocked(AsyncStorage.getItem);

const snapshot = {
  fileId: "backup-1",
  name: "backup.zip",
  modifiedTime: "2026-01-10T12:00:00.000Z",
  size: 1024,
  manifest: null,
  isCompatible: true,
  compatibilityMessage: null,
} satisfies GoogleDriveBackupSnapshot;

function setPersistedState(values: Record<string, unknown>) {
  mockPersistedValues.clear();
  for (const [key, value] of Object.entries(values)) {
    mockPersistedValues.set(key, value);
  }
}

function getPersistedSetter(key: string) {
  return mockPersistedSetters.get(key) ?? jest.fn();
}

function renderSettingsHook() {
  const applyCourseSelectionState = jest.fn(async () => {});
  const setStatsFireEffectEnabled = jest.fn(async () => {});
  const setStatsBookshelfEnabled = jest.fn(async () => {});
  const markOnboardingDone = jest.fn(async () => {});
  const hook = renderHook(() =>
    useGoogleDriveBackupSettings({
      applyCourseSelectionState,
      setStatsFireEffectEnabled,
      setStatsBookshelfEnabled,
      markOnboardingDone,
    })
  );

  return {
    ...hook,
    applyCourseSelectionState,
    setStatsFireEffectEnabled,
    setStatsBookshelfEnabled,
    markOnboardingDone,
  };
}

describe("useGoogleDriveBackupSettings", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-10T12:00:00.000Z"));
    jest.clearAllMocks();
    mockPersistedSetters.clear();
    setPersistedState({});
    mockedIsGoogleDriveConfigured.mockReturnValue(true);
    mockedGetGoogleDriveConfigurationError.mockReturnValue(null);
    mockedListRecentBackupSnapshots.mockResolvedValue([snapshot]);
    mockedConnectGoogleDrive.mockResolvedValue({
      connected: true,
      cancelled: false,
    });
    mockedCreateBackupSnapshot.mockResolvedValue(snapshot);
    mockedDisconnectGoogleDrive.mockResolvedValue();
    mockedPruneOldBackupSnapshots.mockResolvedValue();
    mockedRestoreBackupFromDrive.mockResolvedValue({
      metadata: snapshot,
      restoreResult: { success: true },
    });
    mockedAsyncStorageGetItem.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("connects, clears errors, and refreshes snapshots", async () => {
    const { result } = renderSettingsHook();

    let connectResult: Awaited<
      ReturnType<typeof result.current.connectGoogleDriveBackup>
    >;
    await act(async () => {
      connectResult = await result.current.connectGoogleDriveBackup();
    });

    expect(connectResult!).toEqual({ connected: true, cancelled: false });
    expect(getPersistedSetter("googleDriveBackup.connected")).toHaveBeenCalledWith(
      true
    );
    expect(getPersistedSetter("googleDriveBackup.lastBackupError")).toHaveBeenCalledWith(
      null
    );
    expect(mockedListRecentBackupSnapshots).toHaveBeenCalledWith(3);
    expect(result.current.googleDriveBackupSnapshots).toEqual([snapshot]);
  });

  it("clears snapshots when refresh runs while disconnected", async () => {
    setPersistedState({
      "googleDriveBackup.connected": false,
    });
    const { result } = renderSettingsHook();

    await act(async () => {
      await result.current.refreshGoogleDriveBackupSnapshots();
    });

    expect(mockedListRecentBackupSnapshots).not.toHaveBeenCalled();
    expect(result.current.googleDriveBackupSnapshots).toEqual([]);
    expect(result.current.googleDriveBackupSnapshotsError).toBeNull();
    expect(result.current.googleDriveBackupSnapshotsLoading).toBe(false);
  });

  it("clears snapshots when refresh runs while unconfigured", async () => {
    mockedIsGoogleDriveConfigured.mockReturnValue(false);
    mockedGetGoogleDriveConfigurationError.mockReturnValue("missing client id");
    setPersistedState({
      "googleDriveBackup.connected": true,
    });
    const { result } = renderSettingsHook();

    await act(async () => {
      await result.current.refreshGoogleDriveBackupSnapshots();
    });

    expect(mockedListRecentBackupSnapshots).not.toHaveBeenCalled();
    expect(result.current.googleDriveBackupSnapshots).toEqual([]);
    expect(result.current.googleDriveBackupSnapshotsError).toBeNull();
    expect(result.current.googleDriveBackupSnapshotsLoading).toBe(false);
  });

  it("backs up, updates timestamps, marks connected, and refreshes snapshots", async () => {
    const { result } = renderSettingsHook();

    await act(async () => {
      await result.current.backupUserDataToGoogleDriveNow();
    });

    expect(mockedCreateBackupSnapshot).toHaveBeenCalledTimes(1);
    expect(getPersistedSetter("googleDriveBackup.lastBackupAttemptAt")).toHaveBeenCalledWith(
      Date.now()
    );
    expect(getPersistedSetter("googleDriveBackup.connected")).toHaveBeenCalledWith(
      true
    );
    expect(getPersistedSetter("googleDriveBackup.lastSuccessfulBackupAt")).toHaveBeenCalledWith(
      Date.now()
    );
    expect(mockedPruneOldBackupSnapshots).toHaveBeenCalledWith(3);
    expect(mockedListRecentBackupSnapshots).toHaveBeenCalledWith(3);
    expect(result.current.googleDriveBackupSnapshots).toEqual([snapshot]);
  });

  it("stores backup errors and clears in-progress state", async () => {
    const error = new Error("upload failed");
    mockedCreateBackupSnapshot.mockRejectedValue(error);
    const { result } = renderSettingsHook();

    await act(async () => {
      await expect(result.current.backupUserDataToGoogleDriveNow()).rejects.toBe(
        error
      );
    });

    expect(getPersistedSetter("googleDriveBackup.lastBackupError")).toHaveBeenCalledWith(
      "upload failed"
    );
    expect(result.current.googleDriveBackupInProgress).toBe(false);
  });

  it("restores from Drive, marks connected, clears error, and clears in-progress state", async () => {
    const restoreResult: ImportResult = { success: true, message: "ok" };
    mockedRestoreBackupFromDrive.mockResolvedValue({
      metadata: snapshot,
      restoreResult,
    });
    const { result } = renderSettingsHook();

    let resultFromDrive: ImportResult;
    await act(async () => {
      resultFromDrive = await result.current.restoreUserDataFromGoogleDrive(
        "backup-1"
      );
    });

    expect(resultFromDrive!).toBe(restoreResult);
    expect(mockedRestoreBackupFromDrive).toHaveBeenCalledWith("backup-1");
    expect(getPersistedSetter("googleDriveBackup.connected")).toHaveBeenCalledWith(
      true
    );
    expect(getPersistedSetter("googleDriveBackup.lastBackupError")).toHaveBeenCalledWith(
      null
    );
    expect(result.current.googleDriveRestoreInProgress).toBe(false);
  });

  it("applies restored app state through explicit dependencies", async () => {
    mockedAsyncStorageGetItem.mockImplementation(async (key) => {
      if (key === "stats.fireEffectEnabled") return "true";
      if (key === "stats.bookshelfEnabled") return "false";
      return null;
    });
    const {
      result,
      applyCourseSelectionState,
      setStatsFireEffectEnabled,
      setStatsBookshelfEnabled,
      markOnboardingDone,
    } = renderSettingsHook();

    await act(async () => {
      await result.current.applyImportedAppState({
        success: true,
        restoredState: {
          pinnedOfficialCourseIds: [101],
          activeCustomCourseId: null,
          activeCourseIdx: 2,
          shouldApplySelection: true,
          progressStateApplied: true,
          statsUiStateApplied: true,
          shouldMarkOnboardingDone: true,
        },
      });
    });

    expect(applyCourseSelectionState).toHaveBeenCalledWith({
      pinnedOfficialCourseIds: [101],
      activeCustomCourseId: null,
      activeCourseIdx: 2,
    });
    expect(setStatsFireEffectEnabled).toHaveBeenCalledWith(true);
    expect(setStatsBookshelfEnabled).toHaveBeenCalledWith(false);
    expect(markOnboardingDone).toHaveBeenCalledTimes(1);
  });

  it("skips app state dependencies when restored flags are false", async () => {
    const {
      result,
      applyCourseSelectionState,
      setStatsFireEffectEnabled,
      setStatsBookshelfEnabled,
      markOnboardingDone,
    } = renderSettingsHook();

    await act(async () => {
      await result.current.applyImportedAppState({
        success: true,
        restoredState: {
          pinnedOfficialCourseIds: [101],
          activeCustomCourseId: 4,
          activeCourseIdx: null,
          shouldApplySelection: false,
          progressStateApplied: false,
          statsUiStateApplied: false,
          shouldMarkOnboardingDone: false,
        },
      });
    });

    expect(applyCourseSelectionState).not.toHaveBeenCalled();
    expect(setStatsFireEffectEnabled).not.toHaveBeenCalled();
    expect(setStatsBookshelfEnabled).not.toHaveBeenCalled();
    expect(markOnboardingDone).not.toHaveBeenCalled();
  });
});
