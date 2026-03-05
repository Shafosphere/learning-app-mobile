import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";
import {
  exportAndShareUserData,
  exportUserDataToGoogleDrive,
} from "@/src/services/exportUserData";
import { importUserData } from "@/src/services/importUserData";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

const CoursesDataSection: React.FC = () => {
  const styles = useStyles();
  const { t } = useTranslation();
  const { resetLearningSettings, colors } = useSettings();
  const [resettingLearning, setResettingLearning] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [exportingToDrive, setExportingToDrive] = useState(false);
  const [importingData, setImportingData] = useState(false);

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

  const handleExportUserDataToDrive = async () => {
    setExportingToDrive(true);
    try {
      const result = await exportUserDataToGoogleDrive();
      const sizeKb = (result.bytesWritten / 1024).toFixed(1);

      if (result.shared) {
        Alert.alert(
          t("settings.coursesData.exportDrive.readyTitle"),
          t("settings.coursesData.exportDrive.readyMessage", {
            fileUri: result.fileUri,
            sizeKb,
          })
        );
        return;
      }

      if (result.cancelled) {
        Alert.alert(
          t("settings.coursesData.exportDrive.cancelTitle"),
          t("settings.coursesData.exportDrive.cancelMessage")
        );
        return;
      }

      if (!result.sharingSupported) {
        Alert.alert(
          t("settings.coursesData.exportDrive.unsupportedTitle"),
          t("settings.coursesData.exportDrive.unsupportedMessage")
        );
        return;
      }

      Alert.alert(
        t("settings.coursesData.exportDrive.incompleteTitle"),
        t("settings.coursesData.exportDrive.incompleteMessage")
      );
    } catch (error) {
      console.error("[CoursesDataSection] google drive export error", error);
      Alert.alert(
        t("settings.coursesData.errors.generic"),
        t("settings.coursesData.errors.exportGoogleDrive")
      );
    } finally {
      setExportingToDrive(false);
    }
  };

  const handleImportUserData = async () => {
    setImportingData(true);
    try {
      const result = await importUserData();
      if (result.success) {
        const stats = result.stats;
        Alert.alert(
          t("settings.coursesData.importDone.title"),
          t("settings.coursesData.importDone.message", {
            coursesCreated: stats?.coursesCreated,
            flashcardsCreated: stats?.flashcardsCreated,
            reviewsRestored: stats?.reviewsRestored,
            officialCoursesProcessed: stats?.officialCoursesProcessed,
            officialReviewsRestored: stats?.officialReviewsRestored,
            builtinReviewsRestored: stats?.builtinReviewsRestored,
            officialHintsUpdated: stats?.officialHintsUpdated,
            boxesSnapshotsRestored: stats?.boxesSnapshotsRestored,
          })
        );
      } else {
        if (result.message !== "Anulowano wybór pliku.") {
          Alert.alert(t("settings.coursesData.errors.importTitle"), result.message);
        }
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

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeader}>{t("settings.coursesData.section")}</Text>

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
            {t("settings.coursesData.rows.exportGoogleDrive.title")}
          </Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.coursesData.rows.exportGoogleDrive.subtitle")}
          </Text>
        </View>
        <MyButton
          onPress={handleExportUserDataToDrive}
          color="my_green"
          disabled={exportingToDrive}
          width={64}
          accessibilityLabel={t("settings.coursesData.rows.exportGoogleDrive.accessibilityLabel")}
        >
          {exportingToDrive ? (
            <Text style={[styles.driveButtonText, { color: colors.headline }]}>
              {t("settings.coursesData.rows.exportGoogleDrive.buttonLoading")}
            </Text>
          ) : (
            <View style={styles.driveButtonContent}>
              <MaterialCommunityIcons
                name="google-drive"
                size={22}
                color={colors.headline}
              />
            </View>
          )}
        </MyButton>
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
