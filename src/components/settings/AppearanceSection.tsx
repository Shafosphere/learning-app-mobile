import { useSettings } from "@/src/contexts/SettingsContext";
import {
  PreviewOptionSelector,
  type PreviewOptionSelectorOption,
} from "@/src/components/selection/PreviewOptionSelector";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";
import { TrackSlider } from "@/src/components/slider/TrackSlider";
import { Asset } from "expo-asset";
import * as Haptics from "expo-haptics";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { UiLanguage } from "@/src/i18n";
import ToggleSwitch from "@/src/components/toggle/ToggleSwitch";
import { preventWidowsPl } from "@/src/utils/preventWidowsPl";

const classicPreview = require("@/assets/images/settings/layout-classic.png");
const carouselPreview = require("@/assets/images/settings/layout-carousel.png");
const topButtonsPreview = require("@/assets/images/settings/controls-two-hand.png");
const bottomButtonsPreview = require("@/assets/images/settings/controls-one-hand.png");

const uiLanguageOptions: {
  key: UiLanguage;
  labelKey: "settings.uiLanguage.polish" | "settings.uiLanguage.english";
}[] = [
  { key: "pl", labelKey: "settings.uiLanguage.polish" },
  { key: "en", labelKey: "settings.uiLanguage.english" },
];

const AppearanceSection: React.FC = () => {
  const styles = useStyles();
  const { t } = useTranslation();
  const {
    colors,
    uiLanguage,
    setUiLanguage,
    theme,
    toggleTheme,
    feedbackEnabled,
    toggleFeedbackEnabled,
    feedbackVolume,
    setFeedbackVolume,
    quotesEnabled,
    toggleQuotesEnabled,
    showBoxFaces,
    toggleShowBoxFaces,
    boxesLayout,
    setBoxesLayout,
    actionButtonsPosition,
    setActionButtonsPosition,
  } = useSettings();

  const [volumePreview, setVolumePreview] = React.useState(feedbackVolume);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const volumeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setLanguageMenuOpen(false);
  };

  const handleVolumePreviewChange = useCallback((value: number) => {
    setVolumePreview(value);
    if (volumeDebounce.current) {
      clearTimeout(volumeDebounce.current);
    }
    volumeDebounce.current = setTimeout(() => {
      void setFeedbackVolume(value);
    }, 180);
  }, [setFeedbackVolume]);

  const handleVolumeCommit = useCallback(
    (value: number) => {
      setVolumePreview(value);
      if (volumeDebounce.current) {
        clearTimeout(volumeDebounce.current);
      }
      void setFeedbackVolume(value);
    },
    [setFeedbackVolume]
  );

  React.useEffect(() => {
    setVolumePreview(feedbackVolume);
  }, [feedbackVolume]);

  useEffect(() => {
    void Asset.loadAsync([
      classicPreview,
      carouselPreview,
      topButtonsPreview,
      bottomButtonsPreview,
    ]);
  }, []);

  useEffect(() => {
    return () => {
      if (volumeDebounce.current) {
        clearTimeout(volumeDebounce.current);
        volumeDebounce.current = null;
      }
    };
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

      <Text style={styles.appearanceGroupLabel}>JĘZYK</Text>
      <View style={styles.appearanceGroupCard}>
        <View style={styles.appearanceBlockHeader}>
          <Text style={styles.appearanceBlockTitle}>
            {t("settings.uiLanguage.title")}
          </Text>
        </View>
        <View style={styles.languageSegment}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setLanguageMenuOpen(true)}
            style={styles.languageSelectTrigger}
          >
            <Text style={styles.languageSelectTriggerText}>
              {
                t(
                  uiLanguageOptions.find((option) => option.key === uiLanguage)
                    ?.labelKey ?? "settings.uiLanguage.english"
                )
              }
            </Text>
            <Text style={styles.languageSelectChevron}>▾</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.appearanceGroupLabel}>INTERFEJS</Text>
      <View style={styles.appearanceGroupCard}>
        <View style={styles.appearanceGroupRows}>
          <View style={styles.appearanceGroupRow}>
            <View style={styles.appearanceRowText}>
              <Text style={styles.appearanceBlockTitle}>
                {t("settings.appearance.darkTheme.title")}
              </Text>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(t("settings.appearance.darkTheme.subtitle"))}
              </Text>
            </View>
            <View style={styles.switch}>
              <ToggleSwitch
                value={theme === "dark"}
                onPress={() => void handleThemeToggle(theme !== "dark")}
                accessibilityLabel={t("settings.appearance.darkTheme.title")}
              />
            </View>
          </View>

          <View style={styles.appearanceGroupDivider} />

          <View style={styles.appearanceGroupRow}>
            <View style={styles.appearanceRowText}>
              <Text style={styles.appearanceBlockTitle}>
                {t("settings.appearance.vibrations.title")}
              </Text>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(t("settings.appearance.vibrations.subtitle"))}
              </Text>
            </View>
            <View style={styles.switch}>
              <ToggleSwitch
                value={feedbackEnabled}
                onPress={() => void handleFeedbackToggle(!feedbackEnabled)}
                accessibilityLabel={t("settings.appearance.vibrations.title")}
              />
            </View>
          </View>

          <View style={styles.appearanceGroupDivider} />

          <View style={styles.appearanceGroupRow}>
            <View style={styles.appearanceRowText}>
              <Text style={styles.appearanceBlockTitle}>
                {t("settings.appearance.disableReactions.title")}
              </Text>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(t("settings.appearance.disableReactions.subtitle"))}
              </Text>
            </View>
            <View style={styles.switch}>
              <ToggleSwitch
                value={!quotesEnabled}
                onPress={() => void handleQuotesToggle(quotesEnabled)}
                accessibilityLabel={t("settings.appearance.disableReactions.title")}
              />
            </View>
          </View>

          <View style={styles.appearanceGroupDivider} />

          <View style={styles.appearanceGroupRow}>
            <View style={styles.appearanceRowText}>
              <Text style={styles.appearanceBlockTitle}>
                {t("settings.appearance.boxFaces.title")}
              </Text>
              <Text style={styles.appearanceBlockDescription}>
                {preventWidowsPl(t("settings.appearance.boxFaces.subtitle"))}
              </Text>
            </View>
            <View style={styles.switch}>
              <ToggleSwitch
                value={showBoxFaces}
                onPress={() => void handleFacesToggle(!showBoxFaces)}
                accessibilityLabel={t("settings.appearance.boxFaces.title")}
              />
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.appearanceGroupLabel}>DŹWIĘK</Text>
      <View style={styles.appearancePlainBlock}>
        <View style={styles.appearanceBlockHeader}>
          <Text style={styles.appearanceBlockDescription}>
            {preventWidowsPl(t("settings.appearance.effectsVolume.subtitle"))}
          </Text>
        </View>
        <View style={styles.sliderSection}>
          <View style={styles.sliderRow}>
            <TrackSlider
              testID="effects-volume-slider"
              value={volumePreview}
              onValueChange={handleVolumePreviewChange}
              onSlidingComplete={handleVolumeCommit}
              minimumValue={0}
              maximumValue={1}
              step={0.01}
              mode="solid"
              trackHeight={12}
              thumbSize={28}
              thumbBorderWidth={2}
              trackColor={colors.border}
              fillColor={colors.my_green}
              thumbColor={colors.background}
              thumbBorderColor={colors.my_green}
              style={styles.sliderWrapper}
            />

            <Text style={styles.sliderValue}>
              {Math.round(volumePreview * 100)}%
            </Text>
          </View>
        </View>
      </View>

      <PreviewOptionSelector
        options={layoutOptions}
        value={boxesLayout}
        onChange={(key) => void handleLayoutSelect(key)}
        description={preventWidowsPl(t("settings.appearance.layoutSelector.subtitle"))}
        previewAspectRatio={1.18}
        imageFit="contain"
        testIDPrefix="settings-layout-selector"
      />

      <PreviewOptionSelector
        options={actionButtonsOptions}
        value={actionButtonsPosition}
        onChange={(key) => void handleActionButtonsPosition(key)}
        description={preventWidowsPl(t("settings.appearance.actionsSelector.subtitle"))}
        previewAspectRatio={1.02}
        imageFit="cover"
        testIDPrefix="settings-actions-selector"
      />

      <Modal
        animationType="fade"
        transparent
        visible={languageMenuOpen}
        onRequestClose={() => setLanguageMenuOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.languageModalBackdrop}
          onPress={() => setLanguageMenuOpen(false)}
        >
          <View style={styles.languageModalCard}>
            {uiLanguageOptions.map((option) => {
              const isActive = uiLanguage === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.8}
                  style={[
                    styles.languageMenuOption,
                    isActive && styles.languageMenuOptionActive,
                  ]}
                  onPress={() => handleUiLanguageSelect(option.key)}
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
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default AppearanceSection;
