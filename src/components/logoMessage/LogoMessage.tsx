import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import {
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useStyles } from "./LogoMessage-styles";

type LogoMessageVariant =
  | "start"
  | "pin"
  | "pinError"
  | "postPin"
  | "activate"
  | "done";

type LogoMessageLayoutVariant = "default" | "centered_intro";

const LOGO_SOURCE = require("@/assets/illustrations/mascot-box/branding/logo.png");

const DEFAULT_COPY: Record<
  LogoMessageVariant,
  { title: string; description: string }
> = {
  start: {
    title: "Witaj w aplikacji do fiszek",
    description: "Dodaj kurs kodem od prowadzącego i odblokuj materiały.",
  },
  pin: {
    title: "Dodaj kurs kodem",
    description: "Wpisz kod kursu, żeby przypiąć go do swojego profilu.",
  },
  pinError: {
    title: "Nie znaleziono kursu",
    description: "Sprawdź kod albo poproś prowadzącego o poprawny.",
  },
  postPin: {
    title: "Kurs dodany",
    description: "Aktywuj go, by pobrać materiały i śledzić postęp.",
  },
  activate: {
    title: "Aktywuj kurs",
    description: "Potwierdź, aby odblokować fiszki i zapisywać postępy.",
  },
  done: {
    title: "Gotowe!",
    description: "Kurs aktywny. Lecimy do fiszek.",
  },
};

type LogoMessageProps = {
  variant?: LogoMessageVariant;
  title?: string;
  description?: string;
  style?: StyleProp<ViewStyle>;
  floating?: boolean;
  offset?: Partial<{
    top: number;
    bottom: number;
    left: number;
    right: number;
  }>;
  maxBodyHeight?: number;
  onLayout?: (event: LayoutChangeEvent) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  previousLabel?: string;
  nextLabel?: string;
  layoutVariant?: LogoMessageLayoutVariant;
};

export default function LogoMessage({
  variant = "pin",
  title,
  description,
  style,
  floating = false,
  offset,
  maxBodyHeight,
  onLayout,
  onPrevious,
  onNext,
  canGoPrevious = true,
  canGoNext = true,
  previousLabel = "Previous message",
  nextLabel = "Next message",
  layoutVariant = "default",
}: LogoMessageProps) {
  const styles = useStyles();
  const copy = DEFAULT_COPY[variant];
  const resolvedTitle = title ?? copy?.title ?? "";
  const resolvedDescription = description ?? copy?.description ?? "";
  const isCenteredIntro = layoutVariant === "centered_intro";
  const hasNavigation = Boolean(onPrevious || onNext);
  const layoutProgress = useSharedValue(isCenteredIntro ? 1 : 0);

  React.useEffect(() => {
    layoutProgress.value = withTiming(isCenteredIntro ? 1 : 0, {
      duration: 280,
    });
  }, [isCenteredIntro, layoutProgress]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    minHeight: interpolate(layoutProgress.value, [0, 1], [0, 152]),
    paddingTop: interpolate(layoutProgress.value, [0, 1], [14, 16]),
    paddingBottom: interpolate(layoutProgress.value, [0, 1], [14, 18]),
    paddingLeft: interpolate(layoutProgress.value, [0, 1], [78, 126]),
    paddingRight: interpolate(layoutProgress.value, [0, 1], [16, 20]),
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    left: interpolate(layoutProgress.value, [0, 1], [-12, -24]),
    bottom: interpolate(layoutProgress.value, [0, 1], [-10, -30]),
    width: interpolate(layoutProgress.value, [0, 1], [68, 141]),
    height: interpolate(layoutProgress.value, [0, 1], [68, 141]),
  }));

  const textWrapperAnimatedStyle = useAnimatedStyle(() => ({
    paddingLeft: interpolate(layoutProgress.value, [0, 1], [0, 6]),
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    fontSize: interpolate(layoutProgress.value, [0, 1], [16, 18]),
    marginBottom: interpolate(layoutProgress.value, [0, 1], [4, 8]),
  }));

  const descriptionAnimatedStyle = useAnimatedStyle(() => ({
    fontSize: interpolate(layoutProgress.value, [0, 1], [14, 15]),
    lineHeight: interpolate(layoutProgress.value, [0, 1], [20, 22]),
  }));

  return (
    <View
      style={[
        styles.messageShell,
        hasNavigation && styles.messageShellWithNavigation,
        floating && styles.floating,
        floating && offset,
        style,
      ]}
      pointerEvents={floating ? "auto" : undefined}
      onLayout={onLayout}
      accessible={false}
    >
      <Animated.View
        style={[
          styles.container,
          containerAnimatedStyle,
        ]}
        accessible
        accessibilityRole="text"
      >
        <Animated.Image
          source={LOGO_SOURCE}
          style={[styles.logo, logoAnimatedStyle]}
        />
        {typeof maxBodyHeight === "number" ? (
          <ScrollView
            style={[
              styles.textWrapper,
              styles.textWrapperCenteredIntro,
              textWrapperAnimatedStyle,
              { maxHeight: maxBodyHeight },
            ]}
            contentContainerStyle={[
              styles.textContent,
              styles.textContentCenteredIntro,
            ]}
            showsVerticalScrollIndicator={false}
          >
            {resolvedTitle ? (
              <Animated.Text
                style={[styles.title, styles.titleCenteredIntro, titleAnimatedStyle]}
              >
                {resolvedTitle}
              </Animated.Text>
            ) : null}
            {resolvedDescription ? (
              <Animated.Text
                style={[
                  styles.description,
                  styles.descriptionCenteredIntro,
                  descriptionAnimatedStyle,
                ]}
              >
                {resolvedDescription}
              </Animated.Text>
            ) : null}
          </ScrollView>
        ) : (
          <Animated.View
            style={[
              styles.textWrapper,
              isCenteredIntro ? styles.textWrapperCenteredIntro : null,
              textWrapperAnimatedStyle,
            ]}
          >
            {resolvedTitle ? (
              <Animated.Text
                style={[
                  styles.title,
                  isCenteredIntro ? styles.titleCenteredIntro : null,
                  titleAnimatedStyle,
                ]}
              >
                {resolvedTitle}
              </Animated.Text>
            ) : null}
            {resolvedDescription ? (
              <Animated.Text
                style={[
                  styles.description,
                  isCenteredIntro ? styles.descriptionCenteredIntro : null,
                  descriptionAnimatedStyle,
                ]}
              >
                {resolvedDescription}
              </Animated.Text>
            ) : null}
          </Animated.View>
        )}
      </Animated.View>
      {hasNavigation ? (
        <View style={styles.navRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={previousLabel}
            accessibilityState={{ disabled: !canGoPrevious }}
            disabled={!canGoPrevious}
            hitSlop={12}
            style={({ pressed }) => [
              styles.navButton,
              styles.navButtonBack,
              !canGoPrevious && styles.navButtonDisabled,
              pressed && canGoPrevious && styles.navButtonPressed,
            ]}
            onPress={onPrevious}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={canGoPrevious ? styles.navIcon.color : styles.navIconDisabled.color}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={nextLabel}
            accessibilityState={{ disabled: !canGoNext }}
            disabled={!canGoNext}
            hitSlop={12}
            style={({ pressed }) => [
              styles.navButton,
              styles.navButtonForward,
              !canGoNext && styles.navButtonDisabled,
              pressed && canGoNext && styles.navButtonPressed,
            ]}
            onPress={onNext}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={canGoNext ? styles.navIcon.color : styles.navIconDisabled.color}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
