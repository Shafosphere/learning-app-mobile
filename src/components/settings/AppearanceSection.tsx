import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/settings/SettingsScreen-styles";
import * as Haptics from "expo-haptics";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Modal,
  PanResponder,
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

type ThickSliderProps = {
  value: number;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  disabled?: boolean;
  onValueChange: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
};

const ThickSlider: React.FC<ThickSliderProps> = ({
  value,
  minimumValue = 0,
  maximumValue = 1,
  step = 0.01,
  disabled = false,
  onValueChange,
  onSlidingComplete,
}) => {
  const styles = useStyles();
  const trackRef = useRef<View | null>(null);
  const [trackLayout, setTrackLayout] = useState<{
    pageX: number;
    width: number;
  } | null>(null);

  const clampToStep = useCallback(
    (input: number) => {
      const clamped = Math.min(Math.max(input, minimumValue), maximumValue);
      if (!step) return clamped;
      const stepped = Math.round(clamped / step) * step;
      return Math.min(Math.max(stepped, minimumValue), maximumValue);
    },
    [minimumValue, maximumValue, step]
  );

  const updateFromPageX = useCallback(
    (pageX: number, finalize = false) => {
      if (!trackLayout) return;
      const relative = pageX - trackLayout.pageX;
      const boundedPx = Math.min(
        Math.max(relative, 0),
        Math.max(trackLayout.width, 1)
      );
      const ratio =
        trackLayout.width === 0 ? 0 : boundedPx / trackLayout.width;
      const raw = minimumValue + ratio * (maximumValue - minimumValue);
      const nextValue = clampToStep(raw);
      onValueChange(nextValue);
      if (finalize && onSlidingComplete) {
        onSlidingComplete(nextValue);
      }
    },
    [
      trackLayout,
      minimumValue,
      maximumValue,
      clampToStep,
      onValueChange,
      onSlidingComplete,
    ]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (evt) => {
          if (disabled) return;
          updateFromPageX(evt.nativeEvent.pageX);
        },
        onPanResponderMove: (evt) => {
          if (disabled) return;
          updateFromPageX(evt.nativeEvent.pageX);
        },
        onPanResponderRelease: (evt) => {
          if (disabled) return;
          updateFromPageX(evt.nativeEvent.pageX, true);
        },
        onPanResponderTerminate: (evt) => {
          if (disabled) return;
          updateFromPageX(evt.nativeEvent.pageX, true);
        },
        onPanResponderTerminationRequest: () => true,
      }),
    [disabled, updateFromPageX]
  );

  const handleLayout = useCallback(() => {
    trackRef.current?.measure((_, __, width, ___, pageX) => {
      if (width) {
        setTrackLayout({ pageX, width });
      }
    });
  }, []);

  const clampedValue = Math.min(Math.max(value, minimumValue), maximumValue);
  const percent =
    maximumValue === minimumValue
      ? 0
      : (clampedValue - minimumValue) / (maximumValue - minimumValue);
  const thumbOffset = (trackLayout?.width ?? 0) * percent;

  return (
    <View
      ref={trackRef}
      onLayout={handleLayout}
      style={[styles.sliderWrapper, disabled && styles.sliderDisabled]}
      {...panResponder.panHandlers}
    >
      <View style={styles.sliderTrack} />
      <View style={[styles.sliderFill, { width: `${percent * 100}%` }]} />
      <View
        style={[
          styles.sliderThumb,
          { transform: [{ translateX: thumbOffset - 14 }] },
        ]}
        pointerEvents="none"
      />
    </View>
  );
};

const AppearanceSection: React.FC = () => {
  const styles = useStyles();
  const { t } = useTranslation();
  const {
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
          <ThickSlider
            value={volumePreview}
            onValueChange={handleVolumePreviewChange}
            onSlidingComplete={handleVolumeCommit}
            minimumValue={0}
            maximumValue={1}
            step={0.01}
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
