import React, {
  ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Animated, Easing, Pressable, View } from "react-native";
import type { LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { FOOTER_BASE_PADDING, useStyles } from "./MinigameLayout-styles";
import MyButton from "@/src/components/button/button";
import { MinigameHeading } from "./MinigameHeading";
import { useSettings } from "@/src/contexts/SettingsContext";
import { destroySession } from "@/src/screens/review/minigames/sessionStore";

type FooterResultStatus = "correct" | "incorrect";

const FOOTER_WAVE_DURATION_MS = 600;

type FooterActionConfig = {
  key?: string;
  text: string;
  onPress: () => void;
  disabled?: boolean;
  color?: ComponentProps<typeof MyButton>["color"];
  width?: number;
  accessibilityLabel?: string;
};

type MinigameLayoutProps = {
  children: React.ReactNode;
  footerContent?: React.ReactNode;
  footerActions?: FooterActionConfig[];
  headingTitle?: string;
  heading?: React.ReactNode;
  headingProps?: Omit<ComponentProps<typeof MinigameHeading>, "title">;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  footerContainerStyle?: StyleProp<ViewStyle>;
  footerRowStyle?: StyleProp<ViewStyle>;
  footerResultStatus?: FooterResultStatus | null;
  testID?: string;
};

export function MinigameLayout({
  children,
  footerContent,
  footerActions,
  headingTitle,
  heading,
  headingProps,
  style,
  contentStyle,
  footerContainerStyle,
  footerRowStyle,
  footerResultStatus,
  testID,
}: MinigameLayoutProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const { colors } = useSettings();
  const [footerWidth, setFooterWidth] = useState(0);
  const [activeResult, setActiveResult] = useState<FooterResultStatus | null>(
    null
  );
  const [waveDirection, setWaveDirection] = useState<"ltr" | "rtl">("ltr");
  const waveProgress = useRef(new Animated.Value(0)).current;

  const handleFooterLayout = useCallback((event: LayoutChangeEvent) => {
    setFooterWidth(event.nativeEvent.layout.width);
  }, []);

  useEffect(() => {
    if (footerResultStatus === "correct" || footerResultStatus === "incorrect") {
      setActiveResult(footerResultStatus);
      setWaveDirection(footerResultStatus === "correct" ? "ltr" : "rtl");
      waveProgress.stopAnimation();
      waveProgress.setValue(0);
      Animated.timing(waveProgress, {
        toValue: 1,
        duration: FOOTER_WAVE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } else {
      waveProgress.stopAnimation();
      waveProgress.setValue(0);
      setActiveResult(null);
    }
  }, [footerResultStatus, waveProgress]);

  const waveWidth = useMemo(() => {
    if (footerWidth === 0) {
      return 0;
    }

    return waveProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, footerWidth],
    });
  }, [footerWidth, waveProgress]);

  const highlightColor =
    activeResult === "correct"
      ? colors.my_green
      : activeResult === "incorrect"
      ? colors.my_red
      : null;
  const shouldShowWave =
    activeResult !== null && highlightColor !== null && footerWidth > 0;
  const waveOpacity = activeResult === "incorrect" ? 0.5 : 0.25;

  const resolvedFooterContent =
    footerContent ??
    (footerActions && footerActions.length > 0
      ? footerActions.map((action, index) => (
          <MyButton
            key={action.key ?? `${action.text}-${index}`}
            text={action.text}
            onPress={action.onPress}
            disabled={action.disabled}
            color={action.color}
            width={action.width}
            accessibilityLabel={action.accessibilityLabel}
          />
        ))
      : null);

  const resolvedHeading =
    heading ??
    (headingTitle ? (
      <MinigameHeading title={headingTitle} {...headingProps} />
    ) : null);

  const sessionIdParamRaw = params.sessionId;
  const sessionId =
    typeof sessionIdParamRaw === "string"
      ? sessionIdParamRaw
      : Array.isArray(sessionIdParamRaw)
      ? sessionIdParamRaw[0]
      : null;
  const isSessionMode = Boolean(sessionId);

  const handleAbortSession = useCallback(() => {
    if (!sessionId) {
      return;
    }

    Alert.alert(
      "Zakonczyc sesje?",
      "Czy na pewno chcesz przerwac te sesje minigier? Postep nie zostanie zapisany.",
      [
        { text: "Kontynuuj", style: "cancel" },
        {
          text: "Zakończ",
          style: "destructive",
          onPress: () => {
            destroySession(sessionId);
            router.replace("/review");
          },
        },
      ]
    );
  }, [router, sessionId]);

  const shouldShowTopRow = resolvedHeading != null || isSessionMode;

  const exitButton = (
    <Pressable
      style={({ pressed }) => [
        styles.exitButton,
        pressed && styles.exitButtonPressed,
      ]}
      onPress={handleAbortSession}
      accessibilityRole="button"
      accessibilityLabel="Przerwij sesję minigier i wróć do panelu powtórek"
    >
      <FontAwesome name="close" size={24} color={colors.headline} />
    </Pressable>
  );

  return (
    <View style={[styles.root, style]} testID={testID}>
      <View style={[styles.content, contentStyle]}>
        {shouldShowTopRow ? (
          <View style={styles.topRow}>
            <View style={styles.headingContainer}>{resolvedHeading}</View>
            {isSessionMode ? exitButton : null}
          </View>
        ) : null}
        {children}
      </View>
      {resolvedFooterContent ? (
        <View
          style={[
            styles.footerContainer,
            { paddingBottom: FOOTER_BASE_PADDING + Math.max(insets.bottom, 0) },
            footerContainerStyle,
          ]}
          onLayout={handleFooterLayout}
        >
          {shouldShowWave && highlightColor ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.footerWave,
                {
                  backgroundColor: highlightColor,
                  width: waveWidth,
                  opacity: waveOpacity,
                  left: waveDirection === "ltr" ? 0 : undefined,
                  right: waveDirection === "rtl" ? 0 : undefined,
                },
              ]}
            />
          ) : null}
          <View style={[styles.footerRow, footerRowStyle]}>
            <View style={styles.footerActionsWrapper}>
              {resolvedFooterContent}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default MinigameLayout;
