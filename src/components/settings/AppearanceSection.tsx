import { useSettings } from "@/src/contexts/SettingsContext";
import {
  PreviewOptionSelector,
  type PreviewOptionSelectorOption,
} from "@/src/components/selection/PreviewOptionSelector";
import { useStyles } from "@/src/screens/settings/SettingsScreen/SettingsScreen-styles";
import { SoundVolumeControl } from "./SoundVolumeControl";
import { Asset } from "expo-asset";
import * as Haptics from "expo-haptics";
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeLanguage, UiLanguage } from "@/src/i18n";
import ToggleRow from "@/src/components/toggle/ToggleRow";
import { preventWidowsPl } from "@/src/utils/preventWidowsPl";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";

const classicPreview = require("@/assets/ui/settings/previews/layout-classic.png");
const carouselPreview = require("@/assets/ui/settings/previews/layout-carousel.png");
const topButtonsPreview = require("@/assets/ui/settings/previews/controls-two-hand.png");
const bottomButtonsPreview = require("@/assets/ui/settings/previews/controls-one-hand.png");
const SETTINGS_TABLET_PREVIEW_MAX_WIDTH = 360;

const uiLanguageOptions: {
  key: UiLanguage;
  labelKey: "repeats.labels.polish" | "repeats.labels.english";
}[] = [
  { key: "pl", labelKey: "repeats.labels.polish" },
  { key: "en", labelKey: "repeats.labels.english" },
];
const nativeLanguageOptions: {
  key: NativeLanguage;
  labelKey: "repeats.labels.polish" | "repeats.labels.english";
}[] = [
  { key: "pl", labelKey: "repeats.labels.polish" },
  { key: "en", labelKey: "repeats.labels.english" },
];

const AppearanceSection: React.FC = () => {
  const styles = useStyles();
  const { t } = useTranslation();
  const { isTabletLayout, orientation, width } = useDeviceLayout();
  const horizontalPreviews = orientation === "landscape" && width >= 600;
  const useCenteredTabletLayout = isTabletLayout;
  const tabletPreviewMaxWidth = horizontalPreviews
    ? 152
    : useCenteredTabletLayout
    ? SETTINGS_TABLET_PREVIEW_MAX_WIDTH
    : undefined;
  const {
    uiLanguage,
    nativeLanguage,
    setUiLanguage,
    setNativeLanguage,
    theme,
    toggleTheme,
    feedbackEnabled,
    toggleFeedbackEnabled,
    feedbackVolume,
    setFeedbackVolume,
    flashcardAudioVolume,
    setFlashcardAudioVolume,
    flashcardAudioVolumeHydrated,
    quotesEnabled,
    toggleQuotesEnabled,
    showBoxFaces,
    toggleShowBoxFaces,
    boxesLayout,
    setBoxesLayout,
    actionButtonsPosition,
    setActionButtonsPosition,
  } = useSettings();

  const [languageMenuOpen, setLanguageMenuOpen] = useState<
    "ui" | "native" | null
  >(null);

  const triggerHaptics = useCallback(async () => {
    if (!feedbackEnabled) return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // Ignored
    }
  }, [feedbackEnabled]);

  const handleThemeToggle = async (value: boolean) => {
    if ((value && theme !== "dark") || (!value && theme !== "light")) {
      await toggleTheme();
      await triggerHaptics();
    }
  };

  const handleFeedbackToggle = async (value: boolean) => {
    if (value !== feedbackEnabled) {
      if (value) {
        await triggerHaptics();
      }
      await toggleFeedbackEnabled();
    }
  };

  const handleQuotesToggle = async (value: boolean) => {
    // Switch is inverted: ON means mute quotes
    if (value === quotesEnabled) {
      await toggleQuotesEnabled();
      await triggerHaptics();
    }
  };

  const handleFacesToggle = async (value: boolean) => {
    if (value !== showBoxFaces) {
      await toggleShowBoxFaces();
      await triggerHaptics();
    }
  };

  const handleLayoutSelect = async (key: "classic" | "carousel") => {
    if (key !== boxesLayout) {
      await setBoxesLayout(key);
      await triggerHaptics();
    }
  };

  const handleActionButtonsPosition = async (position: "top" | "bottom") => {
    if (position !== actionButtonsPosition) {
      await setActionButtonsPosition(position);
      await triggerHaptics();
    }
  };
  const handleUiLanguageSelect = async (nextLanguage: UiLanguage) => {
    if (nextLanguage !== uiLanguage) {
      await setUiLanguage(nextLanguage);
      await triggerHaptics();
    }
    setLanguageMenuOpen(null);
  };
  const handleNativeLanguageSelect = async (nextLanguage: NativeLanguage) => {
    if (nextLanguage !== nativeLanguage) {
      await setNativeLanguage(nextLanguage);
      await triggerHaptics();
    }
    setLanguageMenuOpen(null);
  };

  useEffect(() => {
    void Asset.loadAsync([
      classicPreview,
      carouselPreview,
      topButtonsPreview,
      bottomButtonsPreview,
    ]);
  }, []);

  const layoutOptions: PreviewOptionSelectorOption<"classic" | "carousel">[] = [
    {
      key: "classic",
      label: t("settings.appearance.layoutSelector.classic"),
      preview: classicPreview,
    },
    {
      key: "carousel",
      label: t("settings.appearance.layoutSelector.carousel"),
      preview: carouselPreview,
    },
  ];

  const actionButtonsOptions: PreviewOptionSelectorOption<"top" | "bottom">[] = [
    {
      key: "top",
      label: t("settings.appearance.actionsSelector.top"),
      preview: topButtonsPreview,
    },
    {
      key: "bottom",
      label: t("settings.appearance.actionsSelector.bottom"),
      preview: bottomButtonsPreview,
    },
  ];

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.appearanceSectionHeader}>
        {t("settings.appearance.section")}
      </Text>

      <Text style={styles.appearanceGroupLabel}>
        {t("settings.appearance.groups.language")}
      </Text>
      <View style={styles.appearanceGroupCard}>
        <View style={styles.appearanceBlockHeader}>
          <Text style={styles.appearanceBlockTitle}>
            {t("settings.uiLanguage.title")}
          </Text>
          <Text style={styles.appearanceBlockDescription}>
            {preventWidowsPl(t("settings.uiLanguage.subtitle"))}
          </Text>
        </View>
        <View style={styles.languageSegment}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setLanguageMenuOpen("ui")}
            style={styles.languageSelectTrigger}
          >
            <Text style={styles.languageSelectTriggerText}>
              {
                t(
                  uiLanguageOptions.find((option) => option.key === uiLanguage)
                    ?.labelKey ?? "repeats.labels.english"
                )
              }
            </Text>
            <Text style={styles.languageSelectChevron}>▾</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.appearanceGroupDivider} />
        <View style={styles.appearanceBlockHeader}>
          <Text style={styles.appearanceBlockTitle}>
            {t("settings.nativeLanguage.title")}
          </Text>
          <Text style={styles.appearanceBlockDescription}>
            {preventWidowsPl(t("settings.nativeLanguage.subtitle"))}
          </Text>
        </View>
        <View style={styles.languageSegment}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setLanguageMenuOpen("native")}
            style={styles.languageSelectTrigger}
          >
            <Text style={styles.languageSelectTriggerText}>
              {
                t(
                  nativeLanguageOptions.find(
                    (option) => option.key === nativeLanguage
                  )?.labelKey ?? "repeats.labels.english"
                )
              }
            </Text>
            <Text style={styles.languageSelectChevron}>▾</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.appearanceGroupLabel}>
        {t("settings.appearance.groups.interface")}
      </Text>
      <View style={styles.appearanceGroupCard}>
        <View style={styles.appearanceGroupRows}>
          <ToggleRow
            style={styles.appearanceGroupRow}
            value={theme === "dark"}
            controlStyle={styles.switch}
            onPress={() => void handleThemeToggle(theme !== "dark")}
            accessibilityLabel={t("settings.appearance.darkTheme.title")}
          >
            <View style={styles.appearanceRowText}>
              <Text style={styles.appearanceBlockTitle}>
                {t("settings.appearance.darkTheme.title")}
              </Text>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(t("settings.appearance.darkTheme.subtitle"))}
              </Text>
            </View>
          </ToggleRow>

          <View style={styles.appearanceGroupDivider} />

          <ToggleRow
            style={styles.appearanceGroupRow}
            value={feedbackEnabled}
            controlStyle={styles.switch}
            onPress={() => void handleFeedbackToggle(!feedbackEnabled)}
            accessibilityLabel={t("settings.appearance.vibrations.title")}
          >
            <View style={styles.appearanceRowText}>
              <Text style={styles.appearanceBlockTitle}>
                {t("settings.appearance.vibrations.title")}
              </Text>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(t("settings.appearance.vibrations.subtitle"))}
              </Text>
            </View>
          </ToggleRow>

          <View style={styles.appearanceGroupDivider} />

          <ToggleRow
            style={styles.appearanceGroupRow}
            value={!quotesEnabled}
            controlStyle={styles.switch}
            onPress={() => void handleQuotesToggle(quotesEnabled)}
            accessibilityLabel={t("settings.appearance.disableReactions.title")}
          >
            <View style={styles.appearanceRowText}>
              <Text style={styles.appearanceBlockTitle}>
                {t("settings.appearance.disableReactions.title")}
              </Text>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(t("settings.appearance.disableReactions.subtitle"))}
              </Text>
            </View>
          </ToggleRow>

          <View style={styles.appearanceGroupDivider} />

          <ToggleRow
            style={styles.appearanceGroupRow}
            value={showBoxFaces}
            controlStyle={styles.switch}
            onPress={() => void handleFacesToggle(!showBoxFaces)}
            accessibilityLabel={t("settings.appearance.boxFaces.title")}
          >
            <View style={styles.appearanceRowText}>
              <Text style={styles.appearanceBlockTitle}>
                {t("settings.appearance.boxFaces.title")}
              </Text>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(t("settings.appearance.boxFaces.subtitle"))}
              </Text>
            </View>
          </ToggleRow>
        </View>
      </View>

      <Text style={styles.appearanceGroupLabel}>
        {t("settings.appearance.groups.sound")}
      </Text>
      <SoundVolumeControl
        title={t("settings.appearance.effectsVolume.title")}
        description={t("settings.appearance.effectsVolume.subtitle")}
        value={feedbackVolume}
        onChange={setFeedbackVolume}
        testID="effects-volume-slider"
      />
      <SoundVolumeControl
        title={t("settings.appearance.flashcardAudioVolume.title")}
        description={t("settings.appearance.flashcardAudioVolume.subtitle")}
        value={flashcardAudioVolume}
        onChange={setFlashcardAudioVolume}
        disabled={!flashcardAudioVolumeHydrated}
        testID="flashcard-audio-volume-slider"
      />

      <View style={horizontalPreviews ? styles.previewSelectorsLandscape : undefined}>
        <View style={horizontalPreviews ? styles.previewSelectorColumn : undefined}>
          <PreviewOptionSelector
            title={horizontalPreviews ? t("settings.appearance.layoutSelector.title") : undefined}
            options={layoutOptions}
            value={boxesLayout}
            onChange={(key) => void handleLayoutSelect(key)}
            description={preventWidowsPl(t("settings.appearance.layoutSelector.subtitle"))}
            previewAspectRatio={horizontalPreviews ? 1 : 1.18}
            compact={horizontalPreviews}
            previewMaxWidth={tabletPreviewMaxWidth}
            imageFit="contain"
            testIDPrefix="settings-layout-selector"
          />
        </View>
        <View style={horizontalPreviews ? styles.previewSelectorColumn : undefined}>
          <PreviewOptionSelector
            title={horizontalPreviews ? t("settings.appearance.actionsSelector.title") : undefined}
            options={actionButtonsOptions}
            value={actionButtonsPosition}
            onChange={(key) => void handleActionButtonsPosition(key)}
            description={preventWidowsPl(t("settings.appearance.actionsSelector.subtitle"))}
            previewAspectRatio={horizontalPreviews ? 1 : 1.02}
            compact={horizontalPreviews}
            previewMaxWidth={tabletPreviewMaxWidth}
            imageFit="cover"
            testIDPrefix="settings-actions-selector"
          />
        </View>
      </View>
      <Modal
        animationType="fade"
        transparent
        visible={languageMenuOpen !== null}
        onRequestClose={() => setLanguageMenuOpen(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.languageModalBackdrop}
          onPress={() => setLanguageMenuOpen(null)}
        >
          <ScrollView
            style={styles.languageModalCard}
            contentContainerStyle={styles.languageModalContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {(languageMenuOpen === "native"
              ? nativeLanguageOptions
              : uiLanguageOptions
            ).map((option) => {
              const isActive =
                languageMenuOpen === "native"
                  ? nativeLanguage === option.key
                  : uiLanguage === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.8}
                  style={[
                    styles.languageMenuOption,
                    isActive && styles.languageMenuOptionActive,
                  ]}
                  onPress={() => {
                    if (languageMenuOpen === "native") {
                      void handleNativeLanguageSelect(option.key);
                      return;
                    }
                    void handleUiLanguageSelect(option.key);
                  }}
                >
                  <Text
                    style={[
                      styles.languageMenuOptionText,
                      isActive && styles.languageMenuOptionTextActive,
                    ]}
                  >
                    {t(option.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default AppearanceSection;
