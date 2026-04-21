import MyButton from "@/src/components/button/button";
import { useLearningStats } from "@/src/contexts/LearningStatsContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";
import { exportAndShareUserData } from "@/src/services/exportUserData";
import { importUserData } from "@/src/services/importUserData";
import type { GoogleDriveBackupSnapshot } from "@/src/services/googleDriveBackup";
import { setOnboardingCheckpoint } from "@/src/services/onboardingCheckpoint";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, Text, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";
import { preventWidowsPl } from "@/src/utils/preventWidowsPl";

type DriveAction = "connect" | "backup" | "disconnect" | "refresh" | null;
type SnapshotCardTone = "ok" | "warn" | "bad";

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
  const router = useRouter();
  const { refreshStats } = useLearningStats();
  const { width } = useWindowDimensions();
  const {
    resetLearningSettings,
    resetOnboardingState,
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
  const [resettingIntro, setResettingIntro] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const [driveAction, setDriveAction] = useState<DriveAction>(null);
  const [expandedSnapshotIds, setExpandedSnapshotIds] = useState<string[]>([]);
  const isCompactSnapshotLayout = width < 360;
  const introStorageKeys = [
    "@onboarding_checkpoint_v1",
    "@course_pin_intro_seen_v1",
    "@course_activate_intro_seen_v1",
    "@course_entry_settings_intro_seen_v1",
    "@review_courses_intro_seen_v1",
    "@review_flashcards_intro_seen_v1",
    "@flashcards_intro_seen_v1",
    "flashcards.actionsPositionNudgeSeen",
    "flashcards.actionsPositionNudgeAnswerCount",
  ] as const;

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

  const formatSnapshotSummary = useCallback(
    (snapshot: GoogleDriveBackupSnapshot): string => {
      const manifest = snapshot.manifest;
      if (!manifest) {
        return t("settings.coursesData.googleDrive.snapshotSummaryUnavailable");
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
    },
    [t]
  );

  const getSnapshotPresentation = useCallback(
    (snapshot: GoogleDriveBackupSnapshot): {
      tone: SnapshotCardTone;
      summary: string;
      toggleLabel: string;
      details: string;
    } => {
      const manifestSummary = formatSnapshotSummary(snapshot);

      if (!snapshot.isCompatible) {
        const reason =
          snapshot.compatibilityMessage ??
          t("settings.coursesData.googleDrive.snapshotCard.summaryUnavailable");

        return {
          tone: "bad",
          summary: t("settings.coursesData.googleDrive.snapshotCard.summaryUnavailable"),
          toggleLabel: t("settings.coursesData.googleDrive.snapshotCard.whyButton"),
          details: [
            t("settings.coursesData.googleDrive.snapshotCard.detailsDescription", {
              value: reason,
            }),
          ].join("\n\n"),
        };
      }

      if (!snapshot.manifest) {
        return {
          tone: "warn",
          summary: t("settings.coursesData.googleDrive.snapshotCard.summaryAttention"),
          toggleLabel: t("settings.coursesData.googleDrive.snapshotCard.whyButton"),
          details: [
            t("settings.coursesData.googleDrive.snapshotCard.detailsDescription", {
              value: t(
                "settings.coursesData.googleDrive.snapshotSummaryUnavailable"
              ),
            }),
          ].join("\n\n"),
        };
      }

      return {
        tone: "ok",
        summary: t("settings.coursesData.googleDrive.snapshotCard.summaryReady"),
        toggleLabel: t("settings.coursesData.googleDrive.snapshotCard.detailsButton"),
        details: [
          t("settings.coursesData.googleDrive.snapshotCard.detailsDescription", {
            value: t("settings.coursesData.googleDrive.snapshotCard.summaryReady"),
          }),
          t("settings.coursesData.googleDrive.snapshotCard.detailsStats", {
            value: manifestSummary,
          }),
        ].join("\n\n"),
      };
    },
    [formatSnapshotSummary, t]
  );

  const toggleSnapshotExpanded = useCallback((snapshotId: string) => {
    setExpandedSnapshotIds((current) =>
      current.includes(snapshotId)
        ? current.filter((id) => id !== snapshotId)
        : [...current, snapshotId]
    );
  }, []);

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
                await refreshStats();
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
        await refreshStats();
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

  const handleResetIntro = () => {
    Alert.alert(
      t("settings.coursesData.resetIntroConfirm.title"),
      t("settings.coursesData.resetIntroConfirm.message"),
      [
        { text: t("settings.coursesData.resetIntroConfirm.cancel"), style: "cancel" },
        {
          text: t("settings.coursesData.resetIntroConfirm.confirm"),
          style: "destructive",
          onPress: async () => {
            setResettingIntro(true);
            try {
              await resetOnboardingState();
              await AsyncStorage.multiRemove([...introStorageKeys]);
              await setOnboardingCheckpoint("language_required");
              router.replace("/createprofile");
            } catch {
              Alert.alert(
                t("settings.coursesData.errors.generic"),
                t("settings.coursesData.errors.resetIntro")
              );
            } finally {
              setResettingIntro(false);
            }
          },
        },
      ]
    );
  };

  const connectButtonText =
    driveAction === "connect"
      ? t("settings.coursesData.googleDrive.loadingShort")
      : t("settings.coursesData.googleDrive.connectButton");

  const backupNowButtonText =
    driveAction === "backup" || googleDriveBackupInProgress
      ? t("settings.coursesData.googleDrive.loadingShort")
      : t("settings.coursesData.googleDrive.backupNowButton");

  const refreshButtonText =
    driveAction === "refresh" || googleDriveBackupSnapshotsLoading
      ? t("settings.coursesData.googleDrive.loadingShort")
      : t("settings.coursesData.googleDrive.refreshButton");

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.appearanceSectionHeader}>
        {t("settings.coursesData.section")}
      </Text>

      <View style={styles.settingsGroup}>
        <Text style={styles.appearanceGroupLabel}>
          {t("settings.coursesData.groups.localBackup")}
        </Text>
        <View style={styles.actionCard}>
          <View style={styles.actionCardSections}>
            <View style={styles.actionCardSection}>
              <View style={styles.actionCardHeader}>
                <Text style={styles.actionCardTitle}>
                  {t("settings.coursesData.rows.exportUserData.title")}
                </Text>
                <Text style={styles.actionCardDescription}>
                  {preventWidowsPl(t("settings.coursesData.rows.exportUserData.subtitle"))}
                </Text>
              </View>
              <View style={styles.actionCardButtonRow}>
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
            </View>

            <View style={styles.appearanceGroupDivider} />

            <View style={styles.actionCardSection}>
              <View style={styles.actionCardHeader}>
                <Text style={styles.actionCardTitle}>
                  {t("settings.coursesData.rows.importUserData.title")}
                </Text>
                <Text style={styles.actionCardDescription}>
                  {preventWidowsPl(t("settings.coursesData.rows.importUserData.subtitle"))}
                </Text>
              </View>
              <View style={styles.actionCardButtonRow}>
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
          </View>
        </View>
      </View>

      <View style={styles.settingsDivider} />

      <View style={styles.settingsGroup}>
        <Text style={styles.appearanceGroupLabel}>
          {t("settings.coursesData.groups.googleDrive")}
        </Text>

        <View style={styles.settingsHeroCard}>
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
              (() => {
                const presentation = getSnapshotPresentation(snapshot);
                const isExpanded = expandedSnapshotIds.includes(snapshot.fileId);

                return (
                  <View key={snapshot.fileId} style={styles.snapshotCard}>
                    <View
                      style={[
                        styles.snapshotMain,
                        isCompactSnapshotLayout && styles.snapshotMainCompact,
                      ]}
                    >
                      <View style={styles.snapshotCardText}>
                        <View style={styles.snapshotTopline}>
                          <View
                            style={[
                              styles.snapshotStatusDot,
                              presentation.tone === "ok" && styles.snapshotStatusDotOk,
                              presentation.tone === "warn" &&
                                styles.snapshotStatusDotWarn,
                              presentation.tone === "bad" && styles.snapshotStatusDotBad,
                            ]}
                          />
                          <Text style={styles.snapshotTitle}>
                            {t("settings.coursesData.googleDrive.snapshotTitle", {
                              createdAt: formatDate(
                                snapshot.manifest?.createdAt ?? snapshot.modifiedTime
                              ),
                            })}
                          </Text>
                        </View>
                        <Text style={styles.snapshotSubtitle}>{presentation.summary}</Text>
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
                        width={isCompactSnapshotLayout ? "100%" : 112}
                        style={[
                          styles.snapshotButton,
                          isCompactSnapshotLayout && styles.snapshotButtonCompact,
                        ]}
                        textStyle={styles.snapshotButtonText}
                      />
                    </View>

                    <View style={styles.snapshotFooter}>
                      <Pressable
                        onPress={() => toggleSnapshotExpanded(snapshot.fileId)}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: isExpanded }}
                        style={styles.snapshotDetailsToggle}
                      >
                        <Text style={styles.snapshotDetailsToggleText}>
                          {isExpanded
                            ? t(
                                "settings.coursesData.googleDrive.snapshotCard.hideButton"
                              )
                            : presentation.toggleLabel}
                        </Text>
                      </Pressable>
                    </View>

                    {isExpanded ? (
                      <View style={styles.snapshotDetails}>
                        <Text style={styles.snapshotDetailsTitle}>
                          {t("settings.coursesData.googleDrive.snapshotCard.detailsTitle")}
                        </Text>
                        <Text style={styles.snapshotDetailsText}>
                          {presentation.details}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })()
            ))}
          </View>
        ) : null}

        <View style={styles.actionCard}>
          <View style={styles.actionCardSections}>
            <View style={styles.actionCardSection}>
              <View style={styles.actionCardHeader}>
                <Text style={styles.actionCardTitle}>
                  {t("settings.coursesData.googleDrive.connectTitle")}
                </Text>
                <Text style={styles.actionCardDescription}>
                  {preventWidowsPl(
                    t("settings.coursesData.googleDrive.connectSubtitle")
                  )}
                </Text>
              </View>
              <View style={styles.actionCardButtonRow}>
                <MyButton
                  text={connectButtonText}
                  onPress={handleConnectDrive}
                  color="my_green"
                  disabled={driveAction === "connect"}
                  width={130}
                  accessibilityLabel={t("settings.coursesData.googleDrive.actionButton")}
                  textStyle={styles.driveButtonText}
                />
              </View>
            </View>

            <View style={styles.appearanceGroupDivider} />

            <View style={styles.actionCardSection}>
              <View style={styles.actionCardHeader}>
                <Text style={styles.actionCardTitle}>
                  {t("settings.coursesData.googleDrive.manualBackupTitle")}
                </Text>
                <Text style={styles.actionCardDescription}>
                  {preventWidowsPl(t("settings.coursesData.googleDrive.manualBackupSubtitle"))}
                </Text>
              </View>
              <View style={styles.actionCardButtonRow}>
                <MyButton
                  text={backupNowButtonText}
                  color="my_green"
                  onPress={handleBackupNow}
                  disabled={
                    driveAction === "backup" ||
                    googleDriveBackupInProgress ||
                    !googleDriveConnected
                  }
                  width={130}
                  accessibilityLabel={t("settings.coursesData.googleDrive.backupNowButton")}
                  textStyle={styles.driveButtonText}
                  textLines={2}
                />
              </View>
            </View>

            <View style={styles.appearanceGroupDivider} />

            <View style={styles.actionCardSection}>
              <View style={styles.actionCardHeader}>
                <Text style={styles.actionCardTitle}>
                  {t("settings.coursesData.googleDrive.restoreTitle")}
                </Text>
                <Text style={styles.actionCardDescription}>
                  {preventWidowsPl(t("settings.coursesData.googleDrive.restoreSubtitle"))}
                </Text>
              </View>
              <View style={styles.actionCardButtonRow}>
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
                  textLines={2}
                />
              </View>
            </View>

            <View style={styles.appearanceGroupDivider} />

            <View style={styles.actionCardSection}>
              <View style={styles.actionCardHeader}>
                <Text style={styles.actionCardTitle}>
                  {t("settings.coursesData.googleDrive.disconnectTitle")}
                </Text>
                <Text style={styles.actionCardDescription}>
                  {preventWidowsPl(t("settings.coursesData.googleDrive.disconnectSubtitle"))}
                </Text>
              </View>
              <View style={styles.actionCardButtonRow}>
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
          </View>
        </View>
      </View>

      <View style={styles.settingsDivider} />

      <Text style={styles.appearanceGroupLabel}>RESET</Text>
      <View style={[styles.actionCard, styles.actionCardStandalone]}>
        <View style={styles.actionCardSections}>
          <View style={styles.actionCardSection}>
            <View style={styles.actionCardHeader}>
              <Text style={styles.actionCardTitle}>
                {t("settings.coursesData.rows.resetLearning.title")}
              </Text>
              <Text style={styles.actionCardDescription}>
                {preventWidowsPl(t("settings.coursesData.rows.resetLearning.subtitle"))}
              </Text>
            </View>
            <View style={styles.actionCardButtonRow}>
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
                textLines={2}
              />
            </View>
          </View>

          <View style={styles.appearanceGroupDivider} />

          <View style={styles.actionCardSection}>
            <View style={styles.actionCardHeader}>
              <Text style={styles.actionCardTitle}>
                {t("settings.coursesData.rows.resetIntro.title")}
              </Text>
              <Text style={styles.actionCardDescription}>
                {preventWidowsPl(t("settings.coursesData.rows.resetIntro.subtitle"))}
              </Text>
            </View>
            <View style={styles.actionCardButtonRow}>
              <MyButton
                text={
                  resettingIntro
                    ? t("settings.coursesData.rows.resetIntro.buttonLoading")
                    : t("settings.coursesData.rows.resetIntro.button")
                }
                color="my_yellow"
                onPress={handleResetIntro}
                disabled={resettingIntro}
                width={130}
                textLines={2}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default CoursesDataSection;
