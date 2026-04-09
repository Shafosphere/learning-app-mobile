import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";
import { exportAndShareUserData } from "@/src/services/exportUserData";
import { importUserData } from "@/src/services/importUserData";
import type { GoogleDriveBackupSnapshot } from "@/src/services/googleDriveBackup";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

type DriveAction = "connect" | "backup" | "disconnect" | "refresh" | null;

type ImportStatsLike = {
  coursesCreated?: number;
  flashcardsCreated?: number;
  reviewsRestored?: number;
  officialPinnedCoursesRestored?: number;
  officialActiveCourseRestored?: number;
  officialReviewsRestored?: number;
  boxSnapshotsRestored?: number;
  learningEventsRestored?: number;
};

const CoursesDataSection: React.FC = () => {
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  const {
    resetLearningSettings,
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
  } = useSettings();
  const [resettingLearning, setResettingLearning] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const [driveAction, setDriveAction] = useState<DriveAction>(null);

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [i18n.language]
  );

  const formatDate = useCallback(
    (value?: string | number | null): string => {
      if (!value) {
        return t("settings.coursesData.googleDrive.status.never");
      }

      const date = typeof value === "number" ? new Date(value) : new Date(value);
      if (Number.isNaN(date.getTime())) {
        return t("settings.coursesData.googleDrive.status.unknownDate");
      }

      return formatter.format(date);
    },
    [formatter, t]
  );

  const buildImportDoneMessage = (stats?: ImportStatsLike) => {
    const statLines: [string, number][] = [
      ["customCourses", stats?.coursesCreated ?? 0],
      ["customFlashcards", stats?.flashcardsCreated ?? 0],
      ["boxSnapshots", stats?.boxSnapshotsRestored ?? 0],
      ["customReviews", stats?.reviewsRestored ?? 0],
      ["officialReviews", stats?.officialReviewsRestored ?? 0],
      ["officialPinnedCourses", stats?.officialPinnedCoursesRestored ?? 0],
      ["officialActiveCourse", stats?.officialActiveCourseRestored ?? 0],
      ["learningEvents", stats?.learningEventsRestored ?? 0],
    ];

    const lines = statLines
      .filter(([, value]) => value > 0)
      .map(
        ([labelKey, value]) =>
          `${t(
            `settings.coursesData.importDone.labels.${labelKey}`
          )}: ${value}`
      );

    if (lines.length === 0) {
      return t("settings.coursesData.importDone.message");
    }

    return `${t("settings.coursesData.importDone.message")}\n\n${lines.join(
      "\n"
    )}`;
  };

  const formatSnapshotSummary = (snapshot: GoogleDriveBackupSnapshot): string => {
    const manifest = snapshot.manifest;
    if (!manifest) {
      return snapshot.compatibilityMessage ?? t("settings.coursesData.googleDrive.snapshotSummaryUnavailable");
    }

    const details = [
      `${t("settings.coursesData.googleDrive.snapshotLabels.customCourses")}: ${manifest.contentSummary.customCoursesCount}`,
      `${t("settings.coursesData.googleDrive.snapshotLabels.flashcards")}: ${manifest.contentSummary.customFlashcardsCount}`,
      `${t("settings.coursesData.googleDrive.snapshotLabels.reviews")}: ${manifest.contentSummary.reviewEntriesCount}`,
      `${t("settings.coursesData.googleDrive.snapshotLabels.events")}: ${manifest.contentSummary.learningEventsCount}`,
    ];

    return `${details.join(" • ")}\n${t(
      "settings.coursesData.googleDrive.snapshotMeta",
      {
        appVersion: manifest.appVersion,
        backupSource: manifest.backupSource,
      }
    )}`;
  };

  const driveStatusText = useMemo(() => {
    if (!googleDriveConfigured) {
      return t("settings.coursesData.googleDrive.status.notConfigured", {
        reason:
          googleDriveConfigurationError ??
          t("settings.coursesData.googleDrive.status.notConfiguredFallback"),
      });
    }
    if (!googleDriveConnected) {
      return t("settings.coursesData.googleDrive.status.disconnected");
    }
    if (googleDriveBackupSnapshotsLoading && googleDriveBackupSnapshots.length === 0) {
      return t("settings.coursesData.googleDrive.status.loadingList");
    }
    if (googleDriveBackupSnapshotsError) {
      return t("settings.coursesData.googleDrive.status.listError", {
        error: googleDriveBackupSnapshotsError,
      });
    }
    if (googleDriveBackupSnapshots.length === 0) {
      return t("settings.coursesData.googleDrive.status.noBackups", {
        lastSuccess: formatDate(lastSuccessfulGoogleDriveBackupAt),
        lastAttempt: formatDate(lastGoogleDriveBackupAttemptAt),
        error:
          googleDriveBackupError ??
          t("settings.coursesData.googleDrive.status.noErrors"),
      });
    }

    const newestSnapshot = googleDriveBackupSnapshots[0];
    const backupDate =
      newestSnapshot.manifest?.createdAt ?? newestSnapshot.modifiedTime ?? null;

    return t("settings.coursesData.googleDrive.status.connected", {
      count: googleDriveBackupSnapshots.length,
      latest: formatDate(backupDate),
      lastSuccess: formatDate(lastSuccessfulGoogleDriveBackupAt),
      lastAttempt: formatDate(lastGoogleDriveBackupAttemptAt),
      error:
        googleDriveBackupError ??
        t("settings.coursesData.googleDrive.status.noErrors"),
    });
  }, [
    formatDate,
    googleDriveBackupError,
    googleDriveBackupSnapshots,
    googleDriveBackupSnapshotsError,
    googleDriveBackupSnapshotsLoading,
    googleDriveConfigurationError,
    googleDriveConfigured,
    googleDriveConnected,
    lastGoogleDriveBackupAttemptAt,
    lastSuccessfulGoogleDriveBackupAt,
    t,
  ]);

  const handleExportUserData = async () => {
    setExportingData(true);
    try {
      const result = await exportAndShareUserData();
      const sizeKb = (result.bytesWritten / 1024).toFixed(1);
      const shareNote = result.sharingSupported
        ? t("settings.coursesData.exportFile.shareSupported")
        : t("settings.coursesData.exportFile.shareUnsupported");
      Alert.alert(
        t("settings.coursesData.exportFile.title"),
        t("settings.coursesData.exportFile.message", {
          fileUri: result.fileUri,
          sizeKb,
          shareNote,
        })
      );
    } catch (error) {
      console.error("[CoursesDataSection] export error", error);
      Alert.alert(
        t("settings.coursesData.errors.generic"),
        t("settings.coursesData.errors.exportUserData")
      );
    } finally {
      setExportingData(false);
    }
  };

  const handleConnectDrive = async () => {
    setDriveAction("connect");
    try {
      const result = await connectGoogleDriveBackup();
      if (result.connected) {
        Alert.alert(
          t("settings.coursesData.googleDrive.connectDone.title"),
          t("settings.coursesData.googleDrive.connectDone.message")
        );
      }
    } catch (error) {
      console.error("[CoursesDataSection] Google Drive connect error", error);
      Alert.alert(
        t("settings.coursesData.errors.generic"),
        error instanceof Error
          ? error.message
          : t("settings.coursesData.errors.exportGoogleDrive")
      );
    } finally {
      setDriveAction(null);
    }
  };

  const handleBackupNow = async () => {
    setDriveAction("backup");
    try {
      await backupUserDataToGoogleDriveNow();
      Alert.alert(
        t("settings.coursesData.googleDrive.backupDone.title"),
        t("settings.coursesData.googleDrive.backupDone.message")
      );
    } catch (error) {
      console.error("[CoursesDataSection] Google Drive backup error", error);
      Alert.alert(
        t("settings.coursesData.errors.generic"),
        error instanceof Error
          ? error.message
          : t("settings.coursesData.errors.exportGoogleDrive")
      );
    } finally {
      setDriveAction(null);
    }
  };

  const handleRefreshSnapshots = async () => {
    setDriveAction("refresh");
    try {
      await refreshGoogleDriveBackupSnapshots();
    } catch (error) {
      console.error("[CoursesDataSection] Google Drive refresh error", error);
    } finally {
      setDriveAction(null);
    }
  };

  const handleRestoreSnapshot = (snapshot: GoogleDriveBackupSnapshot) => {
    Alert.alert(
      t("settings.coursesData.googleDrive.restoreConfirm.title"),
      t("settings.coursesData.googleDrive.restoreConfirm.message", {
        createdAt: formatDate(snapshot.manifest?.createdAt ?? snapshot.modifiedTime),
      }),
      [
        {
          text: t("settings.coursesData.resetLearningConfirm.cancel"),
          style: "cancel",
        },
        {
          text: t("settings.coursesData.googleDrive.restoreConfirm.confirm"),
          style: "destructive",
          onPress: async () => {
            try {
              const result = await restoreUserDataFromGoogleDrive(snapshot.fileId);
              if (result.success) {
                await applyImportedAppState(result);
                Alert.alert(
                  t("settings.coursesData.importDone.title"),
                  buildImportDoneMessage(result.stats)
                );
              } else if (result.message) {
                Alert.alert(
                  t("settings.coursesData.errors.importTitle"),
                  result.message
                );
              }
            } catch (error) {
              console.error("[CoursesDataSection] Google Drive restore error", error);
              Alert.alert(
                t("settings.coursesData.errors.generic"),
                error instanceof Error
                  ? error.message
                  : t("settings.coursesData.errors.import")
              );
            }
          },
        },
      ]
    );
  };

  const handleDisconnectDrive = async () => {
    setDriveAction("disconnect");
    try {
      await disconnectGoogleDriveBackup();
      Alert.alert(
        t("settings.coursesData.googleDrive.disconnectDone.title"),
        t("settings.coursesData.googleDrive.disconnectDone.message")
      );
    } catch (error) {
      console.error("[CoursesDataSection] Google Drive disconnect error", error);
      Alert.alert(
        t("settings.coursesData.errors.generic"),
        error instanceof Error
          ? error.message
          : t("settings.coursesData.errors.exportGoogleDrive")
      );
    } finally {
      setDriveAction(null);
    }
  };

  const handleImportUserData = async () => {
    setImportingData(true);
    try {
      const result = await importUserData();
      if (result.success) {
        await applyImportedAppState(result);
        Alert.alert(
          t("settings.coursesData.importDone.title"),
          buildImportDoneMessage(result.stats)
        );
      } else if (result.message !== "Anulowano wybór pliku.") {
        Alert.alert(t("settings.coursesData.errors.importTitle"), result.message);
      }
    } catch (error) {
      console.error("[CoursesDataSection] import error", error);
      Alert.alert(
        t("settings.coursesData.errors.generic"),
        t("settings.coursesData.errors.import")
      );
    } finally {
      setImportingData(false);
    }
  };

  const handleResetLearningSettings = () => {
    Alert.alert(
      t("settings.coursesData.resetLearningConfirm.title"),
      t("settings.coursesData.resetLearningConfirm.message"),
      [
        { text: t("settings.coursesData.resetLearningConfirm.cancel"), style: "cancel" },
        {
          text: t("settings.coursesData.resetLearningConfirm.confirm"),
          style: "default",
          onPress: async () => {
            setResettingLearning(true);
            try {
              await resetLearningSettings();
              Alert.alert(
                t("settings.coursesData.resetLearningDone.title"),
                t("settings.coursesData.resetLearningDone.message")
              );
            } catch {
              Alert.alert(
                t("settings.coursesData.errors.generic"),
                t("settings.coursesData.errors.resetLearning")
              );
            } finally {
              setResettingLearning(false);
            }
          },
        },
      ]
    );
  };

  const driveActionButtonText =
    driveAction === "connect" || driveAction === "backup" || googleDriveBackupInProgress
      ? t("settings.coursesData.googleDrive.loadingShort")
      : googleDriveConnected
        ? t("settings.coursesData.googleDrive.backupNowButton")
        : t("settings.coursesData.googleDrive.connectButton");

  const refreshButtonText =
    driveAction === "refresh" || googleDriveBackupSnapshotsLoading
      ? t("settings.coursesData.googleDrive.loadingShort")
      : t("settings.coursesData.googleDrive.refreshButton");

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeader}>{t("settings.coursesData.section")}</Text>

      <View style={styles.settingsGroup}>
        <Text style={styles.settingsGroupTitle}>
          {t("settings.coursesData.groups.localBackup")}
        </Text>

        <View style={styles.row}>
          <View style={styles.rowTextWrapper}>
            <Text style={styles.rowTitle}>
              {t("settings.coursesData.rows.exportUserData.title")}
            </Text>
            <Text style={styles.rowSubtitle}>
              {t("settings.coursesData.rows.exportUserData.subtitle")}
            </Text>
          </View>
          <MyButton
            text={
              exportingData
                ? t("settings.coursesData.rows.exportUserData.buttonLoading")
                : t("settings.coursesData.rows.exportUserData.button")
            }
            color="my_green"
            onPress={handleExportUserData}
            disabled={exportingData}
            width={130}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowTextWrapper}>
            <Text style={styles.rowTitle}>
              {t("settings.coursesData.rows.importUserData.title")}
            </Text>
            <Text style={styles.rowSubtitle}>
              {t("settings.coursesData.rows.importUserData.subtitle")}
            </Text>
          </View>
          <MyButton
            text={
              importingData
                ? t("settings.coursesData.rows.importUserData.buttonLoading")
                : t("settings.coursesData.rows.importUserData.button")
            }
            color="my_green"
            onPress={handleImportUserData}
            disabled={importingData}
            width={130}
          />
        </View>
      </View>

      <View style={styles.settingsDivider} />

      <View style={styles.settingsGroup}>
        <Text style={styles.settingsGroupTitle}>
          {t("settings.coursesData.groups.googleDrive")}
        </Text>

        <View style={styles.statusCard}>
          <View style={styles.statusTitleRow}>
            <MaterialCommunityIcons
              name="google-drive"
              size={20}
              style={styles.statusTitleIcon}
            />
            <Text style={styles.statusTitle}>
              {t("settings.coursesData.googleDrive.sectionTitle")}
            </Text>
          </View>
          <Text style={styles.rowSubtitle}>{driveStatusText}</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.rowTextWrapper}>
            <Text style={styles.rowTitle}>
              {googleDriveConnected
                ? t("settings.coursesData.googleDrive.manualBackupTitle")
                : t("settings.coursesData.googleDrive.connectTitle")}
            </Text>
            <Text style={styles.rowSubtitle}>
              {googleDriveConnected
                ? t("settings.coursesData.googleDrive.manualBackupSubtitle")
                : t("settings.coursesData.googleDrive.connectSubtitle")}
            </Text>
          </View>
          <MyButton
            text={driveActionButtonText}
            onPress={googleDriveConnected ? handleBackupNow : handleConnectDrive}
            color="my_green"
            disabled={
              driveAction === "connect" ||
              driveAction === "backup" ||
              googleDriveBackupInProgress
            }
            width={130}
            accessibilityLabel={t("settings.coursesData.googleDrive.actionButton")}
            textStyle={styles.driveButtonText}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowTextWrapper}>
            <Text style={styles.rowTitle}>
              {t("settings.coursesData.googleDrive.restoreTitle")}
            </Text>
            <Text style={styles.rowSubtitle}>
              {t("settings.coursesData.googleDrive.restoreSubtitle")}
            </Text>
          </View>
          <MyButton
            text={refreshButtonText}
            color="my_green"
            onPress={handleRefreshSnapshots}
            disabled={
              !googleDriveConnected ||
              driveAction === "refresh" ||
              googleDriveBackupSnapshotsLoading
            }
            width={130}
          />
        </View>

        {googleDriveConnected ? (
          <View style={styles.snapshotList}>
            {googleDriveBackupSnapshotsLoading && googleDriveBackupSnapshots.length === 0 ? (
              <Text style={styles.snapshotEmptyText}>
                {t("settings.coursesData.googleDrive.snapshotStates.loading")}
              </Text>
            ) : null}

            {!googleDriveBackupSnapshotsLoading &&
            googleDriveBackupSnapshotsError ? (
              <Text style={styles.snapshotEmptyText}>
                {t("settings.coursesData.googleDrive.snapshotStates.error", {
                  error: googleDriveBackupSnapshotsError,
                })}
              </Text>
            ) : null}

            {!googleDriveBackupSnapshotsLoading &&
            !googleDriveBackupSnapshotsError &&
            googleDriveBackupSnapshots.length === 0 ? (
              <Text style={styles.snapshotEmptyText}>
                {t("settings.coursesData.googleDrive.snapshotStates.empty")}
              </Text>
            ) : null}

            {googleDriveBackupSnapshots.map((snapshot) => (
              <View key={snapshot.fileId} style={styles.snapshotCard}>
                <View style={styles.snapshotCardText}>
                  <Text style={styles.snapshotTitle}>
                    {t("settings.coursesData.googleDrive.snapshotTitle", {
                      createdAt: formatDate(
                        snapshot.manifest?.createdAt ?? snapshot.modifiedTime
                      ),
                    })}
                  </Text>
                  <Text style={styles.snapshotSubtitle}>
                    {formatSnapshotSummary(snapshot)}
                  </Text>
                  {!snapshot.isCompatible && snapshot.compatibilityMessage ? (
                    <Text style={styles.snapshotWarning}>
                      {snapshot.compatibilityMessage}
                    </Text>
                  ) : null}
                </View>
                <MyButton
                  text={t("settings.coursesData.googleDrive.restoreButton")}
                  color="my_green"
                  onPress={() => handleRestoreSnapshot(snapshot)}
                  disabled={!snapshot.isCompatible || googleDriveRestoreInProgress}
                  width={118}
                />
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.row}>
          <View style={styles.rowTextWrapper}>
            <Text style={styles.rowTitle}>
              {t("settings.coursesData.googleDrive.disconnectTitle")}
            </Text>
            <Text style={styles.rowSubtitle}>
              {t("settings.coursesData.googleDrive.disconnectSubtitle")}
            </Text>
          </View>
          <MyButton
            text={
              driveAction === "disconnect"
                ? t("settings.coursesData.googleDrive.disconnectLoading")
                : t("settings.coursesData.googleDrive.disconnectButton")
            }
            color="my_yellow"
            onPress={handleDisconnectDrive}
            disabled={!googleDriveConnected || driveAction === "disconnect"}
            width={130}
          />
        </View>
      </View>

      <View style={styles.settingsDivider} />

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>
            {t("settings.coursesData.rows.resetLearning.title")}
          </Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.coursesData.rows.resetLearning.subtitle")}
          </Text>
        </View>
        <MyButton
          text={
            resettingLearning
              ? t("settings.coursesData.rows.resetLearning.buttonLoading")
              : t("settings.coursesData.rows.resetLearning.button")
          }
          color="my_yellow"
          onPress={handleResetLearningSettings}
          disabled={resettingLearning}
          width={130}
        />
      </View>
    </View>
  );
};

export default CoursesDataSection;
