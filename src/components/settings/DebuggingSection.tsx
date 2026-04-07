import MyButton from "@/src/components/button/button";
import dingWav from "@/assets/audio/ui/ding.wav";
import dongWav from "@/assets/audio/ui/dong.wav";
import drop002Ogg from "@/assets/audio/ui/drop_002.ogg";
import drop003Ogg from "@/assets/audio/ui/drop_003.ogg";
import errorWav from "@/assets/audio/ui/error.wav";
import error005Ogg from "@/assets/audio/ui/error_005.ogg";
import pluck001Ogg from "@/assets/audio/ui/pluck_001.ogg";
import pluck002Ogg from "@/assets/audio/ui/pluck_002.ogg";
import popWav from "@/assets/audio/ui/pop.wav";
import pupWav from "@/assets/audio/ui/pup.wav";
import LogoMessage from "@/src/components/logoMessage/LogoMessage";
import { usePopup } from "@/src/contexts/PopupContext";
import { useQuote } from "@/src/contexts/QuoteContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  addRandomCustomReviews,
} from "@/src/db/sqlite/db";
import { unlockAchievement } from "@/src/db/sqlite/repositories/achievements";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";
import { enableDbInitDebugOverride } from "@/src/services/dbInitDebugOverride";
import { setOnboardingCheckpoint } from "@/src/services/onboardingCheckpoint";
import { triggerStartupScreenPreview } from "@/src/services/startupScreenPreview";
import { playSoundAsset } from "@/src/utils/soundPlayer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import ToggleSwitch from "@/src/components/toggle/ToggleSwitch";

const DEBUG_AUDIO_SAMPLES = [
  {
    key: "debug-audio-drop-002",
    label: "drop_002.ogg",
    asset: drop002Ogg,
  },
  {
    key: "debug-audio-drop-003",
    label: "drop_003.ogg",
    asset: drop003Ogg,
  },
  {
    key: "debug-audio-error-005",
    label: "error_005.ogg",
    asset: error005Ogg,
  },
  {
    key: "debug-audio-pluck-001",
    label: "pluck_001.ogg",
    asset: pluck001Ogg,
  },
  {
    key: "debug-audio-pluck-002",
    label: "pluck_002.ogg",
    asset: pluck002Ogg,
  },
  {
    key: "debug-audio-pop-wav",
    label: "pop.wav",
    asset: popWav,
  },
  {
    key: "debug-audio-pup-wav",
    label: "pup.wav",
    asset: pupWav,
  },
  {
    key: "debug-audio-error-wav",
    label: "error.wav",
    asset: errorWav,
  },
  {
    key: "debug-audio-ding-wav",
    label: "ding.wav",
    asset: dingWav,
  },
  {
    key: "debug-audio-dong-wav",
    label: "dong.wav",
    asset: dongWav,
  },
] as const;

const DebuggingSection: React.FC = () => {
  const styles = useStyles();
  const { t } = useTranslation();
  const router = useRouter();
  const {
    activeCustomCourseId,
    learningRemindersEnabled,
    toggleLearningRemindersEnabled,
    statsBookshelfEnabled,
    toggleStatsBookshelfEnabled,
    statsFireEffectEnabled,
    toggleStatsFireEffectEnabled,
    resetActiveCustomCourseReviews,
  } = useSettings();
  const setPopup = usePopup();
  const { showQuote } = useQuote();
  const [customBusy, setCustomBusy] = useState(false);
  const [showLogoMessage, setShowLogoMessage] = useState(false);
  const [logoFloating, setLogoFloating] = useState(true);
  const [clearingStorage, setClearingStorage] = useState(false);
  const [openingDbErrorScreen, setOpeningDbErrorScreen] = useState(false);
  const [resettingIntro, setResettingIntro] = useState(false);
  const [resettingDb, setResettingDb] = useState(false);

  const handleAddRandomCustom = async () => {
    if (activeCustomCourseId == null) {
      Alert.alert(
        t("settings.debug.alerts.missingCourseTitle"),
        t("settings.debug.alerts.missingCourseMessage")
      );
      return;
    }

    setCustomBusy(true);
    try {
      const inserted = await addRandomCustomReviews(activeCustomCourseId, 10);
      Alert.alert(
        t("settings.debug.alerts.addedTitle"),
        inserted > 0
          ? t("settings.debug.alerts.addedSome", { inserted })
          : t("settings.debug.alerts.addedNone")
      );
    } catch {
      Alert.alert(
        t("settings.debug.alerts.errorTitle"),
        t("settings.debug.alerts.addError")
      );
    } finally {
      setCustomBusy(false);
    }
  };

  const handleTestPopup = () => {
    setPopup({
      message: t("settings.debug.rows.testPopup.message"),
      color: "disoriented",
      duration: 3600,
    });
  };

  const handleResetCustomReviews = async () => {
    setCustomBusy(true);
    try {
      const deleted = await resetActiveCustomCourseReviews();
      Alert.alert(
        t("settings.debug.alerts.resetCustomTitle"),
        deleted > 0
          ? t("settings.debug.alerts.resetCustomSome", { deleted })
          : t("settings.debug.alerts.resetCustomNone")
      );
    } catch {
      Alert.alert(
        t("settings.debug.alerts.errorTitle"),
        t("settings.debug.alerts.resetCustomError")
      );
    } finally {
      setCustomBusy(false);
    }
  };

  const handleClearAsyncStorage = () => {
    Alert.alert(
      t("settings.debug.alerts.clearStorageTitle"),
      t("settings.debug.alerts.clearStorageMessage"),
      [
        { text: t("settings.debug.alerts.cancel"), style: "cancel" },
        {
          text: t("settings.debug.alerts.clearStorageConfirm"),
          style: "destructive",
          onPress: async () => {
            setClearingStorage(true);
            try {
              await AsyncStorage.clear();
              Alert.alert(
                t("settings.debug.alerts.doneTitle"),
                t("settings.debug.alerts.storageCleared")
              );
            } catch {
              Alert.alert(
                t("settings.debug.alerts.errorTitle"),
                t("settings.debug.alerts.storageClearError")
              );
            } finally {
              setClearingStorage(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteDatabase = () => {
    Alert.alert(
      t("settings.debug.alerts.deleteDbTitle"),
      t("settings.debug.alerts.deleteDbMessage"),
      [
        { text: t("settings.debug.alerts.cancel"), style: "cancel" },
        {
          text: t("settings.debug.alerts.deleteDbConfirm"),
          style: "destructive",
          onPress: async () => {
            setResettingDb(true);
            try {
              const dbPath = `${FileSystem.documentDirectory}SQLite/mygame.db`;
              await FileSystem.deleteAsync(dbPath, { idempotent: true });
              Alert.alert(
                t("settings.debug.alerts.doneTitle"),
                t("settings.debug.alerts.dbDeleted")
              );
            } catch {
              Alert.alert(
                t("settings.debug.alerts.errorTitle"),
                t("settings.debug.alerts.dbDeleteError")
              );
            } finally {
              setResettingDb(false);
            }
          },
        },
      ]
    );
  };

  const handleSetOnboarding = async (
    checkpoint:
      | "language_required"
      | "pin_required"
      | "activate_required"
      | "done"
  ) => {
    try {
      await setOnboardingCheckpoint(checkpoint);
      Alert.alert(
        t("settings.debug.alerts.checkpointSet"),
        t("settings.debug.alerts.checkpointValue", { checkpoint })
      );
    } catch {
      Alert.alert(
        t("settings.debug.alerts.errorTitle"),
        t("settings.debug.alerts.checkpointSetError")
      );
    }
  };

  const handleResetIntro = async () => {
    setResettingIntro(true);
    try {
      await AsyncStorage.multiRemove([
        "@course_pin_intro_seen_v1",
        "@course_activate_intro_seen_v1",
        "@flashcards_intro_seen_v1",
        "@review_brain_intro_seen_v1",
        "@review_courses_intro_seen_v1",
      ]);
      await setOnboardingCheckpoint("language_required");
      Alert.alert(
        t("settings.debug.alerts.doneTitle"),
        t("settings.debug.alerts.introResetDone")
      );
    } catch {
      Alert.alert(
        t("settings.debug.alerts.errorTitle"),
        t("settings.debug.alerts.introResetError")
      );
    } finally {
      setResettingIntro(false);
    }
  };

  const handleOpenDbErrorScreen = async () => {
    setOpeningDbErrorScreen(true);
    try {
      await enableDbInitDebugOverride();
      Alert.alert(
        t("settings.debug.alerts.doneTitle"),
        t("settings.debug.alerts.dbErrorScreenOpened")
      );
    } catch {
      Alert.alert(
        t("settings.debug.alerts.errorTitle"),
        t("settings.debug.alerts.dbErrorScreenOpenError")
      );
    } finally {
      setOpeningDbErrorScreen(false);
    }
  };

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeader}>{t("settings.debug.section.tools")}</Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>{t("settings.debug.rows.testPopup.title")}</Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.debug.rows.testPopup.subtitle")}
          </Text>
        </View>
        <MyButton
          text={t("settings.debug.rows.testPopup.button")}
          color="my_yellow"
          onPress={handleTestPopup}
          width={140}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>
            {t("settings.debug.rows.testDbErrorScreen.title")}
          </Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.debug.rows.testDbErrorScreen.subtitle")}
          </Text>
        </View>
        <MyButton
          text={
            openingDbErrorScreen
              ? t("settings.debug.rows.testDbErrorScreen.buttonLoading")
              : t("settings.debug.rows.testDbErrorScreen.button")
          }
          color="my_yellow"
          onPress={handleOpenDbErrorScreen}
          disabled={openingDbErrorScreen}
          width={140}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>{t("settings.debug.rows.testQuotes.title")}</Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.debug.rows.testQuotes.subtitle")}
          </Text>
        </View>
      </View>
      <View style={styles.keyboardActions}>
        <View style={styles.keyboardButtonWrapper}>
          <MyButton
            text={t("settings.debug.rows.testQuotes.win")}
            color="my_green"
            onPress={() => showQuote("win_standard")}
            width={100}
          />
        </View>
        <View style={styles.keyboardButtonWrapper}>
          <MyButton
            text={t("settings.debug.rows.testQuotes.loss")}
            color="my_red"
            onPress={() => showQuote("loss")}
            width={100}
          />
        </View>
        <View style={styles.keyboardButtonWrapper}>
          <MyButton
            text={t("settings.debug.rows.testQuotes.startup")}
            color="my_yellow"
            onPress={() => showQuote("startup_day")}
            width={100}
          />
        </View>
      </View>

      <Text style={styles.sectionHeader}>{t("settings.debug.section.audio")}</Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>{t("settings.debug.rows.audio.title")}</Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.debug.rows.audio.subtitle")}
          </Text>
        </View>
      </View>
      <View style={styles.keyboardActions}>
        {DEBUG_AUDIO_SAMPLES.map((sample) => (
          <View key={sample.key} style={styles.keyboardButtonWrapper}>
            <MyButton
              text={sample.label}
              color="my_yellow"
              onPress={() => {
                void playSoundAsset(sample.key, sample.asset);
              }}
              width={150}
            />
          </View>
        ))}
      </View>

      <Text style={styles.sectionHeader}>{t("settings.debug.section.uiPreview")}</Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>
            {t("settings.debug.rows.startupScreenPreview.title")}
          </Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.debug.rows.startupScreenPreview.subtitle")}
          </Text>
        </View>
        <MyButton
          text={t("settings.debug.rows.startupScreenPreview.button")}
          color="my_yellow"
          onPress={() =>
            triggerStartupScreenPreview({
              messageKey: "app.loading.initializing",
            })
          }
          width={140}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>{t("settings.debug.rows.logo.title")}</Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.debug.rows.logo.subtitle")}
          </Text>
        </View>
        <MyButton
          text={
            showLogoMessage
              ? t("settings.debug.rows.logo.hide")
              : t("settings.debug.rows.logo.show")
          }
          color="my_yellow"
          onPress={() => setShowLogoMessage((prev) => !prev)}
          width={140}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>{t("settings.debug.rows.floating.title")}</Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.debug.rows.floating.subtitle")}
          </Text>
        </View>
        <MyButton
          text={
            logoFloating
              ? t("settings.debug.rows.floating.on")
              : t("settings.debug.rows.floating.off")
          }
          color="my_yellow"
          onPress={() => setLogoFloating((prev) => !prev)}
          width={160}
        />
      </View>

      {showLogoMessage && (
        <View
          style={[
            styles.messagePreview,
            logoFloating && styles.messagePreviewFloating,
          ]}
          pointerEvents={logoFloating ? "box-none" : "auto"}
        >
          <LogoMessage
            variant="pin"
            title={t("settings.debug.rows.logoMessage.title")}
            description={t("settings.debug.rows.logoMessage.description")}
            floating={logoFloating}
            offset={
              logoFloating
                ? {
                  top: 8,
                  left: 8,
                  right: 8,
                }
                : undefined
            }
          />
        </View>
      )}

      <Text style={styles.sectionHeader}>{t("settings.debug.section.seed")}</Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>{t("settings.debug.rows.addCustomReviews.title")}</Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.debug.rows.addCustomReviews.subtitle")}
          </Text>
        </View>
        <MyButton
          text={
            customBusy
              ? t("settings.debug.rows.addCustomReviews.buttonLoading")
              : t("settings.debug.rows.addCustomReviews.button")
          }
          color="my_green"
          disabled={customBusy || activeCustomCourseId == null}
          onPress={handleAddRandomCustom}
          width={140}
        />
      </View>

      {activeCustomCourseId == null && (
        <Text style={styles.infoText}>
          {t("settings.debug.rows.selectCourseInfo")}
        </Text>
      )}

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>{t("settings.debug.rows.resetCustom.title")}</Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.debug.rows.resetCustom.subtitle")}
          </Text>
        </View>
        <MyButton
          text={
            customBusy
              ? t("settings.debug.rows.resetCustom.buttonLoading")
              : t("settings.debug.rows.resetCustom.button")
          }
          color="my_red"
          disabled={customBusy || activeCustomCourseId == null}
          onPress={handleResetCustomReviews}
          width={160}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>{t("settings.debug.rows.addTrophies.title")}</Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.debug.rows.addTrophies.subtitle")}
          </Text>
        </View>
        <MyButton
          text={t("settings.debug.rows.addTrophies.button")}
          color="my_green"
          onPress={async () => {
            await unlockAchievement("debug_" + Math.random().toString().slice(2, 6));
            await unlockAchievement("debug_" + Math.random().toString().slice(2, 6));
            await unlockAchievement("debug_" + Math.random().toString().slice(2, 6));
            Alert.alert(
              t("settings.debug.alerts.doneTitle"),
              t("settings.debug.alerts.trophiesAdded")
            );
          }}
          width={140}
        />
      </View>

      <Text style={styles.sectionHeader}>{t("settings.debug.section.hardReset")}</Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>{t("settings.debug.rows.clearStorage.title")}</Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.debug.rows.clearStorage.subtitle")}
          </Text>
        </View>
        <MyButton
          text={
            clearingStorage
              ? t("settings.debug.rows.clearStorage.buttonLoading")
              : t("settings.debug.rows.clearStorage.button")
          }
          color="my_red"
          onPress={handleClearAsyncStorage}
          disabled={clearingStorage}
          width={140}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>{t("settings.debug.rows.deleteDb.title")}</Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.debug.rows.deleteDb.subtitle")}
          </Text>
        </View>
        <MyButton
          text={
            resettingDb
              ? t("settings.debug.rows.deleteDb.buttonLoading")
              : t("settings.debug.rows.deleteDb.button")
          }
          color="my_red"
          onPress={handleDeleteDatabase}
          disabled={resettingDb}
          width={160}
        />
      </View>

      <Text style={styles.sectionHeader}>{t("settings.debug.section.onboarding")}</Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>
            {t("settings.debug.rows.openLanguageIntro.title")}
          </Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.debug.rows.openLanguageIntro.subtitle")}
          </Text>
        </View>
        <MyButton
          text={t("settings.debug.rows.openLanguageIntro.button")}
          color="my_green"
          onPress={() => router.push("/createprofile")}
          width={170}
        />
      </View>

      <View style={styles.keyboardActions}>
        <View style={styles.keyboardButtonWrapper}>
          <MyButton
            text="language_required"
            color="my_yellow"
            onPress={() => handleSetOnboarding("language_required")}
            width={170}
          />
        </View>
        <View style={styles.keyboardButtonWrapper}>
          <MyButton
            text="pin_required"
            color="my_yellow"
            onPress={() => handleSetOnboarding("pin_required")}
            width={140}
          />
        </View>
        <View style={styles.keyboardButtonWrapper}>
          <MyButton
            text="activate_required"
            color="my_yellow"
            onPress={() => handleSetOnboarding("activate_required")}
            width={140}
          />
        </View>
        <View style={styles.keyboardButtonWrapper}>
          <MyButton
            text="done"
            color="my_green"
            onPress={() => handleSetOnboarding("done")}
            width={120}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>{t("settings.debug.rows.resetIntro.title")}</Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.debug.rows.resetIntro.subtitle")}
          </Text>
        </View>
        <MyButton
          text={
            resettingIntro
              ? t("settings.debug.rows.resetIntro.buttonLoading")
              : t("settings.debug.rows.resetIntro.button")
          }
          color="my_red"
          onPress={handleResetIntro}
          disabled={resettingIntro}
          width={160}
        />
      </View>

      <Text style={styles.sectionHeader}>{t("settings.debug.section.flags")}</Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>
            {t("settings.debug.rows.flags.learningReminders.title")}
          </Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.debug.rows.flags.learningReminders.subtitle")}
          </Text>
        </View>
        <View style={styles.switch}>
          <ToggleSwitch
            value={learningRemindersEnabled}
            onPress={() => void toggleLearningRemindersEnabled()}
            accessibilityLabel={t("settings.debug.rows.flags.learningReminders.title")}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>
            {t("settings.debug.rows.flags.statsFire.title")}
          </Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.debug.rows.flags.statsFire.subtitle")}
          </Text>
        </View>
        <View style={styles.switch}>
          <ToggleSwitch
            value={statsFireEffectEnabled}
            onPress={() => void toggleStatsFireEffectEnabled()}
            accessibilityLabel={t("settings.debug.rows.flags.statsFire.title")}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>
            {t("settings.debug.rows.flags.statsBookshelf.title")}
          </Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.debug.rows.flags.statsBookshelf.subtitle")}
          </Text>
        </View>
        <View style={styles.switch}>
          <ToggleSwitch
            value={statsBookshelfEnabled}
            onPress={() => void toggleStatsBookshelfEnabled()}
            accessibilityLabel={t("settings.debug.rows.flags.statsBookshelf.title")}
          />
        </View>
      </View>
    </View>
  );
};

export default DebuggingSection;
