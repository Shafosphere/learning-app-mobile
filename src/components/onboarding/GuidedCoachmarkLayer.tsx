import {
  AnimatedMask,
  useCoachmarkContext,
  useTourMeasurement,
} from "@edwardloopez/react-native-coachmark";
import LogoMessage from "@/src/components/logoMessage/LogoMessage";
import type { CoachmarkFlowStep } from "@/src/constants/coachmarkFlows";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useTranslation } from "react-i18next";
import React, { RefObject, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type Rect = { x: number; y: number; width: number; height: number };

type GuidedCoachmarkLayerProps = {
  rootRef: RefObject<View | null>;
  currentStep: CoachmarkFlowStep | null;
  currentIndex: number;
  totalSteps: number;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void | Promise<void>;
};

function measureInWindow(ref: any): Promise<Rect> {
  return new Promise((resolve, reject) => {
    if (!ref || !ref.measureInWindow) {
      reject(new Error("Invalid ref"));
      return;
    }
    ref.measureInWindow((x: number, y: number, width: number, height: number) => {
      const statusBarHeight =
        Platform.OS === "android" ? Math.ceil(StatusBar.currentHeight || 0) : 0;
      resolve({ x, y: y + statusBarHeight, width, height });
    });
  });
}

export function GuidedCoachmarkLayer({
  rootRef,
  currentStep,
  currentIndex,
  totalSteps,
  canGoBack,
  canGoNext,
  onBack,
  onNext,
}: GuidedCoachmarkLayerProps) {
  const { state, getAnchor, setMeasured, next, theme } = useCoachmarkContext();
  const { colors } = useSettings();
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const holeX = useSharedValue(0);
  const holeY = useSharedValue(0);
  const holeWidth = useSharedValue(1);
  const holeHeight = useSharedValue(1);
  const localHoleX = useSharedValue(0);
  const localHoleY = useSharedValue(0);
  const localHoleWidth = useSharedValue(1);
  const localHoleHeight = useSharedValue(1);
  const [rootWindowRect, setRootWindowRect] = useState<Rect | null>(null);
  const [rootLayout, setRootLayout] = useState({ width: 0, height: 0 });
  const [bubbleSize, setBubbleSize] = useState({ width: 0, height: 0 });
  const [renderSpotlightLayer, setRenderSpotlightLayer] = useState(false);
  const [isBubbleReady, setIsBubbleReady] = useState(false);
  const hasInitializedBubbleRef = useRef(false);
  const bubbleLeft = useSharedValue(12);
  const bubbleTop = useSharedValue(12);
  const bubbleWidth = useSharedValue(320);
  const introBackdropOpacity = useSharedValue(0);
  const spotlightOpacity = useSharedValue(0);

  const activeStep = state.activeTour?.steps[state.index];

  const { targetRect } = useTourMeasurement({
    activeStep,
    index: state.index,
    tourKey: state.activeTour?.key,
    getAnchor,
    setMeasured,
    next,
    reduceMotion: false,
    durationMs: theme.motion.durationMs,
    holeX,
    holeY,
    holeWidth,
    holeHeight,
  });

  useEffect(() => {
    if (!currentStep || !rootRef.current) return;
    let cancelled = false;

    const run = async () => {
      try {
        const rect = await measureInWindow(rootRef.current);
        if (!cancelled) setRootWindowRect(rect);
      } catch (error) {
        console.warn("[Coachmark] Failed to measure root", error);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [currentIndex, currentStep, rootRef, windowHeight, windowWidth]);

  const localTargetRect = useMemo(() => {
    if (!currentStep?.spotlight || !targetRect || !rootWindowRect) return null;
    return {
      x: targetRect.x - rootWindowRect.x,
      y: targetRect.y - rootWindowRect.y,
      width: targetRect.width,
      height: targetRect.height,
    };
  }, [currentStep?.spotlight, rootWindowRect, targetRect]);

  const bubbleFrame = useMemo(() => {
    if (currentStep?.layout === "centered_intro") {
      const padding = 18;
      const maxWidth = Math.max(280, Math.min(rootLayout.width - padding * 2, 420));
      const bubbleHeight = 160;
      return {
        left: Math.max(padding, (rootLayout.width - maxWidth) / 2),
        top: Math.max(padding, (rootLayout.height - bubbleHeight) / 2),
        maxWidth,
      };
    }
    const padding = 12;
    const maxWidth = Math.max(240, Math.min(rootLayout.width - padding * 2, 380));
    const defaultHeight = 132;
    const left = Math.min(
      Math.max(padding, (rootLayout.width - maxWidth) / 2),
      Math.max(padding, rootLayout.width - maxWidth - padding)
    );
    const bottomOffset = Math.max(72, rootLayout.height * 0.2);
    const top = Math.max(padding, rootLayout.height - bottomOffset - defaultHeight);

    return { left, top, maxWidth };
  }, [currentStep?.layout, rootLayout.height, rootLayout.width]);
  const highlightAnimatedStyle = useAnimatedStyle(() => ({
    left: localHoleX.value - 2,
    top: localHoleY.value - 2,
    width: localHoleWidth.value + 4,
    height: localHoleHeight.value + 4,
  }));
  const bubbleAnimatedStyle = useAnimatedStyle(() => ({
    left: bubbleLeft.value,
    top: bubbleTop.value,
    width: bubbleWidth.value,
  }));
  const introBackdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: introBackdropOpacity.value,
  }));
  const spotlightAnimatedStyle = useAnimatedStyle(() => ({
    opacity: spotlightOpacity.value,
  }));

  useEffect(() => {
    if (rootLayout.width <= 0 || rootLayout.height <= 0) {
      return;
    }

    if (!hasInitializedBubbleRef.current) {
      hasInitializedBubbleRef.current = true;
      bubbleLeft.value = bubbleFrame.left;
      bubbleTop.value = bubbleFrame.top;
      bubbleWidth.value = bubbleFrame.maxWidth;
      setIsBubbleReady(true);
      return;
    }

    bubbleLeft.value = withTiming(bubbleFrame.left, { duration: 280 });
    bubbleTop.value = withTiming(bubbleFrame.top, { duration: 280 });
    bubbleWidth.value = withTiming(bubbleFrame.maxWidth, { duration: 280 });
  }, [
    bubbleFrame.left,
    bubbleFrame.maxWidth,
    bubbleFrame.top,
    bubbleLeft,
    bubbleTop,
    bubbleWidth,
    rootLayout.height,
    rootLayout.width,
  ]);

  const isCenteredIntro = currentStep?.layout === "centered_intro";

  useEffect(() => {
    if (!localTargetRect) {
      return;
    }

    localHoleX.value = withTiming(localTargetRect.x, {
      duration: theme.motion.durationMs,
    });
    localHoleY.value = withTiming(localTargetRect.y, {
      duration: theme.motion.durationMs,
    });
    localHoleWidth.value = withTiming(localTargetRect.width, {
      duration: theme.motion.durationMs,
    });
    localHoleHeight.value = withTiming(localTargetRect.height, {
      duration: theme.motion.durationMs,
    });
  }, [
    localHoleHeight,
    localHoleWidth,
    localHoleX,
    localHoleY,
    localTargetRect,
    theme.motion.durationMs,
  ]);

  useEffect(() => {
    introBackdropOpacity.value = withTiming(isCenteredIntro ? 0.62 : 0, {
      duration: 340,
    });
  }, [introBackdropOpacity, isCenteredIntro]);

  if (!currentStep) return null;

  const shouldShowSpotlight = Boolean(currentStep.spotlight && localTargetRect);
  const shouldBlockOutside =
    Boolean(currentStep.blockOutside) ||
    (currentStep.advanceOn !== "manual" && shouldShowSpotlight);
  const shouldBlockSpotlight = Boolean(currentStep.blockSpotlight && shouldShowSpotlight);
  const shouldRenderFullscreenBlocker = shouldBlockOutside && !shouldShowSpotlight;

  useEffect(() => {
    const duration = 280;

    if (shouldShowSpotlight) {
      setRenderSpotlightLayer(true);
      spotlightOpacity.value = withTiming(1, { duration });
      return;
    }

    spotlightOpacity.value = withTiming(0, { duration });
    const timeout = setTimeout(() => {
      setRenderSpotlightLayer(false);
    }, duration);

    return () => clearTimeout(timeout);
  }, [shouldShowSpotlight, spotlightOpacity]);
  return (
    <View
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
      onLayout={(event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        if (width !== rootLayout.width || height !== rootLayout.height) {
          setRootLayout({ width, height });
        }
      }}
    >
      {isCenteredIntro ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.darkbg },
            introBackdropAnimatedStyle,
          ]}
        />
      ) : null}
      {shouldRenderFullscreenBlocker ? (
        <Pressable style={StyleSheet.absoluteFill} />
      ) : null}
      {renderSpotlightLayer && localTargetRect ? (
        <Animated.View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFill, spotlightAnimatedStyle]}
        >
          <AnimatedMask
            width={rootLayout.width || windowWidth}
            height={rootLayout.height || windowHeight}
            holes={[
              {
                x: localHoleX,
                y: localHoleY,
                width: localHoleWidth,
                height: localHoleHeight,
                shape: "rect",
                radius: 16,
              },
            ]}
            backdropColor={colors.darkbg}
            backdropOpacity={0.55}
          />
          {shouldBlockOutside ? (
            <>
              <Pressable
                style={[
                  styles.blocker,
                  { left: 0, top: 0, width: rootLayout.width, height: Math.max(0, localTargetRect.y) },
                ]}
              />
              <Pressable
                style={[
                  styles.blocker,
                  {
                    left: 0,
                    top: localTargetRect.y + localTargetRect.height,
                    width: rootLayout.width,
                    height: Math.max(
                      0,
                      rootLayout.height - (localTargetRect.y + localTargetRect.height)
                    ),
                  },
                ]}
              />
              <Pressable
                style={[
                  styles.blocker,
                  {
                    left: 0,
                    top: localTargetRect.y,
                    width: Math.max(0, localTargetRect.x),
                    height: localTargetRect.height,
                  },
                ]}
              />
              <Pressable
                style={[
                  styles.blocker,
                  {
                    left: localTargetRect.x + localTargetRect.width,
                    top: localTargetRect.y,
                    width: Math.max(
                      0,
                      rootLayout.width - (localTargetRect.x + localTargetRect.width)
                    ),
                    height: localTargetRect.height,
                  },
                ]}
              />
              {shouldBlockSpotlight ? (
                <Pressable
                  style={[
                    styles.blocker,
                    {
                      left: localTargetRect.x,
                      top: localTargetRect.y,
                      width: localTargetRect.width,
                      height: localTargetRect.height,
                    },
                  ]}
                />
              ) : null}
            </>
          ) : null}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.highlight,
              highlightAnimatedStyle,
              { borderColor: colors.my_yellow },
            ]}
          />
        </Animated.View>
      ) : null}

      {isBubbleReady ? (
        <Animated.View
          style={[
            styles.bubbleWrap,
            bubbleAnimatedStyle,
          ]}
          pointerEvents="box-none"
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            if (width !== bubbleSize.width || height !== bubbleSize.height) {
              setBubbleSize({ width, height });
            }
          }}
        >
          <LogoMessage
            title={t(currentStep.titleKey)}
            description={t(currentStep.descriptionKey)}
            layoutVariant={isCenteredIntro ? "centered_intro" : "default"}
            onPrevious={onBack}
            onNext={() => {
              void onNext();
            }}
            canGoPrevious={canGoBack}
            canGoNext={canGoNext}
            previousLabel={t("onboarding.previousMessage")}
            nextLabel={t("onboarding.nextMessage")}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  blocker: {
    position: "absolute",
    backgroundColor: "transparent",
  },
  bubbleWrap: {
    position: "absolute",
    zIndex: 50,
  },
  highlight: {
    position: "absolute",
    borderWidth: 3,
    borderRadius: 18,
  },
});
