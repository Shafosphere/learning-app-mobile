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
  PanResponder,
  Image,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const classicPreview = require("@/assets/images/settings/sett_classic.png");
const carouselPreview = require("@/assets/images/settings/sett_caro.png");
const topButtonsPreview = require("@/assets/images/settings/twoHand.png");
const bottomButtonsPreview = require("@/assets/images/settings/onehand.png");

type LayoutOption = {
  key: "classic" | "carousel";
  label: string;
  preview: number;
};

const layoutOptions: LayoutOption[] = [
  { key: "classic", label: "Klasyczny", preview: classicPreview },
  { key: "carousel", label: "Karuzela", preview: carouselPreview },
];

type ActionButtonsOption = {
  key: "top" | "bottom";
  label: string;
  preview: number;
};

const actionButtonsOptions: ActionButtonsOption[] = [
  { key: "top", label: "U góry", preview: topButtonsPreview },
  { key: "bottom", label: "Na dole", preview: bottomButtonsPreview },
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
  const {
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
      <Text style={styles.sectionHeader}>Wygląd</Text>

      <View style={styles.row}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Ciemny motyw</Text>
          <Text style={styles.rowSubtitle}>
            Przełącz interfejs pomiędzy jasnym a ciemnym trybem.
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
          <Text style={styles.rowTitle}>Wibracje</Text>
          <Text style={styles.rowSubtitle}>
            Krótkie wibracje w kluczowych interakcjach aplikacji.
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
          <Text style={styles.rowTitle}>Wyłącz reakcje</Text>
          <Text style={styles.rowSubtitle}>
            Wycisza bąbelki z cytatami/reakcjami w aplikacji. Nie dotyczy powiadomień kursu.
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
          <Text style={styles.rowTitle}>Głośność efektów</Text>
          <Text style={styles.rowSubtitle}>
            Regulacja głośności dźwięków w aplikacji.
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
          <Text style={styles.rowTitle}>Miny pudełek</Text>
          <Text style={styles.rowSubtitle}>
            Uśmiechnięte / smutne pudełka w zależności od statusu.
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
          <Text style={styles.rowTitle}>Wybierz schemat pudełek</Text>
          <Text style={styles.rowSubtitle}>
            Preferowany widok listy fiszek podczas nauki.
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
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.row, { alignItems: "flex-start", marginTop: 6 }]}>
        <View style={styles.rowTextWrapper}>
          <Text style={styles.rowTitle}>Wybierz układ</Text>
          <Text style={styles.rowSubtitle}>
            Wybierz rozmieszczenie przycisków w trybie prawda/fałsz.
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
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

    </View>
  );
};

export default AppearanceSection;
