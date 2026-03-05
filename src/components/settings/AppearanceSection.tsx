import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";
import { TrackSlider } from "@/src/components/slider/TrackSlider";
import * as Haptics from "expo-haptics";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Modal,
  Image,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { UiLanguage } from "@/src/i18n";

const classicPreview = require("@/assets/images/settings/layout-classic.png");
const carouselPreview = require("@/assets/images/settings/layout-carousel.png");
const topButtonsPreview = require("@/assets/images/settings/controls-two-hand.png");
const bottomButtonsPreview = require("@/assets/images/settings/controls-one-hand.png");

type LayoutOption = {
  key: "classic" | "carousel";
  labelKey: string;
  preview: number;
};

const layoutOptions: LayoutOption[] = [
  {
    key: "classic",
    labelKey: "settings.appearance.layoutSelector.classic",
    preview: classicPreview,
  },
  {
    key: "carousel",
    labelKey: "settings.appearance.layoutSelector.carousel",
    preview: carouselPreview,
  },
];

type ActionButtonsOption = {
  key: "top" | "bottom";
  labelKey: string;
  preview: number;
};

const actionButtonsOptions: ActionButtonsOption[] = [
  {
    key: "top",
    labelKey: "settings.appearance.actionsSelector.top",
    preview: topButtonsPreview,
  },
  {
    key: "bottom",
    labelKey: "settings.appearance.actionsSelector.bottom",
    preview: bottomButtonsPreview,
  },
];

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
    return () => {
      if (volumeDebounce.current) {
        clearTimeout(volumeDebounce.current);
        volumeDebounce.current = null;
      }
    };
  }, []);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeader}>{t("settings.appearance.section")}</Text>

      <View style={[styles.row, { alignItems: "flex-start" }]}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>{t("settings.uiLanguage.title")}</Text>
          {/* <Text style={styles.rowSubtitle}>
            {t("settings.uiLanguage.subtitle")}
          </Text> */}
        </View>
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

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>
            {t("settings.appearance.darkTheme.title")}
          </Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.appearance.darkTheme.subtitle")}
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={theme === "dark"}
          onValueChange={handleThemeToggle}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>
            {t("settings.appearance.vibrations.title")}
          </Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.appearance.vibrations.subtitle")}
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={feedbackEnabled}
          onValueChange={handleFeedbackToggle}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>
            {t("settings.appearance.disableReactions.title")}
          </Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.appearance.disableReactions.subtitle")}
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={!quotesEnabled}
          onValueChange={handleQuotesToggle}
        />
      </View>

      <View style={styles.sliderSection}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>
            {t("settings.appearance.effectsVolume.title")}
          </Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.appearance.effectsVolume.subtitle")}
          </Text>
        </View>
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

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>
            {t("settings.appearance.boxFaces.title")}
          </Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.appearance.boxFaces.subtitle")}
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={showBoxFaces}
          onValueChange={handleFacesToggle}
        />
      </View>

      <View style={[styles.row, { alignItems: "flex-start" }]}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>
            {t("settings.appearance.layoutSelector.title")}
          </Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.appearance.layoutSelector.subtitle")}
          </Text>
        </View>
      </View>

      <View style={styles.layoutOptionsRow}>
        {layoutOptions.map((option) => {
          const isActive = boxesLayout === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.7}
              onPress={() => handleLayoutSelect(option.key)}
              style={[
                styles.layoutOption,
                isActive && styles.layoutOptionActive,
              ]}
            >
              <View style={styles.layoutPreviewWrapper}>
                <Image
                  source={option.preview}
                  style={styles.layoutPreview}
                  resizeMode="contain"
                />
              </View>
              <Text
                style={[
                  styles.layoutLabel,
                  isActive && styles.layoutLabelActive,
                ]}
              >
                {t(option.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.row, { alignItems: "flex-start", marginTop: 6 }]}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>
            {t("settings.appearance.actionsSelector.title")}
          </Text>
          <Text style={styles.rowSubtitle}>
            {t("settings.appearance.actionsSelector.subtitle")}
          </Text>
        </View>
      </View>

      <View style={styles.actionOptionsRow}>
        {actionButtonsOptions.map((option) => {
          const isActive = actionButtonsPosition === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.8}
              onPress={() => handleActionButtonsPosition(option.key)}
              style={[
                styles.layoutOption,
                styles.actionOption,
                isActive && styles.layoutOptionActive,
              ]}
            >
              <View style={[styles.layoutPreviewWrapper, styles.actionPreview]}>
                <Image
                  source={option.preview}
                  style={[styles.layoutPreview, styles.actionPreviewImage]}
                  resizeMode="cover"
                />
              </View>
              <Text
                style={[
                  styles.layoutLabel,
                  styles.actionLabel,
                  isActive && styles.layoutLabelActive,
                ]}
              >
                {t(option.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

    </View>
  );
};

export default AppearanceSection;
