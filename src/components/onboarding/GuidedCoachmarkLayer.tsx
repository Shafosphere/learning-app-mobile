import {
  AnimatedMask,
  useCoachmarkContext,
  useTourMeasurement,
} from "@edwardloopez/react-native-coachmark";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import LogoMessage from "@/src/components/logoMessage/LogoMessage";
import { useKeyboardBottomOffset } from "@/src/hooks/useKeyboardBottomOffset";
import type { CoachmarkFlowStep } from "@/src/constants/coachmarkFlows";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useTranslation } from "react-i18next";
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  StatusBar,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Rect = { x: number; y: number; width: number; height: number };
type BubblePlacement = "top" | "bottom";

type BubbleFrame = {
  left: number;
  top: number;
  maxWidth: number;
  placement: BubblePlacement;
};

export type GuidedCoachmarkLayerProps = {
  currentStep: CoachmarkFlowStep | null;
  currentIndex: number;
  totalSteps: number;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void | Promise<void>;
};

const BUBBLE_KEYBOARD_GAP = 12;
const BUBBLE_EDGE_PADDING = 12;
const BUBBLE_CENTERED_PADDING = 18;
const DEFAULT_BUBBLE_HEIGHT = 132;
const CENTERED_INTRO_BUBBLE_HEIGHT = 160;
const BUBBLE_MIN_WIDTH = 240;
const BUBBLE_MAX_WIDTH = 380;
const CENTERED_INTRO_MIN_WIDTH = 280;
const CENTERED_INTRO_MAX_WIDTH = 420;
const BUBBLE_TARGET_GAP = 12;
const BUBBLE_AVOID_GAP = 12;

function clamp(value: number, min: number, max: number): number {
  if (max <= min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function computeOverflow(
  top: number,
  height: number,
  minTop: number,
  maxBottom: number,
): number {
  return Math.max(0, minTop - top) + Math.max(0, top + height - maxBottom);
}

function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && endA > startB;
}

function rectsOverlap(rectA: Rect, rectB: Rect): boolean {
  return (
    rangesOverlap(rectA.x, rectA.x + rectA.width, rectB.x, rectB.x + rectB.width) &&
    rangesOverlap(rectA.y, rectA.y + rectA.height, rectB.y, rectB.y + rectB.height)
  );
}

function getOverlapArea(rectA: Rect, rectB: Rect): number {
  const overlapWidth = Math.max(
    0,
    Math.min(rectA.x + rectA.width, rectB.x + rectB.width) - Math.max(rectA.x, rectB.x),
  );
  const overlapHeight = Math.max(
    0,
    Math.min(rectA.y + rectA.height, rectB.y + rectB.height) - Math.max(rectA.y, rectB.y),
  );

  return overlapWidth * overlapHeight;
}

function expandRect(rect: Rect, gap: number): Rect {
  return {
    x: rect.x - gap,
    y: rect.y - gap,
    width: rect.width + gap * 2,
    height: rect.height + gap * 2,
  };
}

function measureInWindow(ref: any): Promise<Rect> {
  return new Promise((resolve, reject) => {
    if (!ref?.measureInWindow) {
      reject(new Error("Invalid ref or measureInWindow not available"));
      return;
    }

    ref.measureInWindow((x: number, y: number, width: number, height: number) => {
      const statusBarHeight =
        Platform.OS === "android" ? Math.ceil(StatusBar.currentHeight || 0) : 0;

      resolve({
        x,
        y: y + statusBarHeight,
        width,
        height,
      });
    });
  });
}

function computeBubbleFrame({
  rootLayout,
  bubbleHeight,
  localTargetRect,
  localAvoidRects,
  isSpotlightStep,
  layout,
  minTop,
  maxBottom,
}: {
  rootLayout: { width: number; height: number };
  bubbleHeight: number;
  localTargetRect: Rect | null;
  localAvoidRects: Rect[];
  isSpotlightStep: boolean;
  layout?: CoachmarkFlowStep["layout"];
  minTop: number;
  maxBottom: number;
}): BubbleFrame {
  if (layout === "centered_intro") {
    const maxWidth = Math.max(
      CENTERED_INTRO_MIN_WIDTH,
      Math.min(rootLayout.width - BUBBLE_CENTERED_PADDING * 2, CENTERED_INTRO_MAX_WIDTH),
    );

    return {
      left: Math.max(BUBBLE_CENTERED_PADDING, (rootLayout.width - maxWidth) / 2),
      top: Math.max(
        BUBBLE_CENTERED_PADDING,
        (rootLayout.height - CENTERED_INTRO_BUBBLE_HEIGHT) / 2,
      ),
      maxWidth,
      placement: "bottom",
    };
  }

  const maxWidth = Math.max(
    BUBBLE_MIN_WIDTH,
    Math.min(rootLayout.width - BUBBLE_EDGE_PADDING * 2, BUBBLE_MAX_WIDTH),
  );
  const bubbleWidth = maxWidth;
  const maxLeft = Math.max(BUBBLE_EDGE_PADDING, rootLayout.width - bubbleWidth - BUBBLE_EDGE_PADDING);
  const maxTop = Math.max(minTop, maxBottom - bubbleHeight);
  const defaultLeft = clamp(
    (rootLayout.width - maxWidth) / 2,
    BUBBLE_EDGE_PADDING,
    maxLeft,
  );
  const defaultBottomOffset = Math.max(72, rootLayout.height * 0.2);
  const defaultTop = clamp(
    rootLayout.height - defaultBottomOffset - bubbleHeight,
    minTop,
    maxTop,
  );
  const makeBubbleRect = (top: number): Rect => ({
    x: defaultLeft,
    y: top,
    width: bubbleWidth,
    height: bubbleHeight,
  });
  const expandedAvoidRects = localAvoidRects.map((rect) => expandRect(rect, BUBBLE_AVOID_GAP));
  const targetAvoidRect =
    isSpotlightStep && localTargetRect
      ? expandRect(localTargetRect, BUBBLE_TARGET_GAP)
      : null;
  const scoreCandidate = ({
    rawTop,
    top,
  }: {
    rawTop: number;
    top: number;
  }) => {
    const bubbleRect = makeBubbleRect(top);

    return {
      targetOverlap: targetAvoidRect ? getOverlapArea(bubbleRect, targetAvoidRect) : 0,
      avoidOverlap: expandedAvoidRects.reduce(
        (total, avoidRect) => total + getOverlapArea(bubbleRect, avoidRect),
        0,
      ),
      overflow: computeOverflow(rawTop, bubbleHeight, minTop, maxBottom),
      distanceFromDefault: Math.abs(rawTop - defaultTop),
    };
  };
  const resolveCandidate = (
    candidates: {
      placement: BubblePlacement;
      rawTop: number;
      top: number;
    }[],
  ) => {
    return candidates
      .map((candidate) => ({
        ...candidate,
        score: scoreCandidate(candidate),
      }))
      .sort((a, b) => {
        if (a.score.targetOverlap !== b.score.targetOverlap) {
          return a.score.targetOverlap - b.score.targetOverlap;
        }
        if (a.score.avoidOverlap !== b.score.avoidOverlap) {
          return a.score.avoidOverlap - b.score.avoidOverlap;
        }
        if (a.score.overflow !== b.score.overflow) {
          return a.score.overflow - b.score.overflow;
        }

        return a.score.distanceFromDefault - b.score.distanceFromDefault;
      })[0];
  };
  const defaultAndAvoidCandidates = [
    {
      placement: "bottom" as const,
      rawTop: defaultTop,
      top: clamp(defaultTop, minTop, maxTop),
    },
    {
      placement: "top" as const,
      rawTop: minTop,
      top: minTop,
    },
    {
      placement: "bottom" as const,
      rawTop: maxTop,
      top: maxTop,
    },
    ...expandedAvoidRects.flatMap((avoidRect) => [
      {
        placement: "top" as const,
        rawTop: avoidRect.y - bubbleHeight - BUBBLE_AVOID_GAP,
        top: clamp(avoidRect.y - bubbleHeight - BUBBLE_AVOID_GAP, minTop, maxTop),
      },
      {
        placement: "bottom" as const,
        rawTop: avoidRect.y + avoidRect.height + BUBBLE_AVOID_GAP,
        top: clamp(avoidRect.y + avoidRect.height + BUBBLE_AVOID_GAP, minTop, maxTop),
      },
    ]),
  ];

  if (isSpotlightStep && localTargetRect) {
    const targetZoneTop = localTargetRect.y - BUBBLE_TARGET_GAP;
    const targetZoneBottom =
      localTargetRect.y + localTargetRect.height + BUBBLE_TARGET_GAP;
    const defaultOverlapsTarget =
      rectsOverlap(makeBubbleRect(defaultTop), {
        x: localTargetRect.x,
        y: targetZoneTop,
        width: localTargetRect.width,
        height: targetZoneBottom - targetZoneTop,
      });

    if (
      !defaultOverlapsTarget &&
      expandedAvoidRects.every((avoidRect) => !rectsOverlap(makeBubbleRect(defaultTop), avoidRect))
    ) {
      return {
        left: defaultLeft,
        top: defaultTop,
        maxWidth,
        placement: "bottom",
      };
    }

    const targetCandidates = defaultOverlapsTarget
      ? [
          {
            placement: "bottom" as const,
            rawTop: localTargetRect.y + localTargetRect.height + BUBBLE_TARGET_GAP,
            top: clamp(
              localTargetRect.y + localTargetRect.height + BUBBLE_TARGET_GAP,
              minTop,
              maxTop,
            ),
          },
          {
            placement: "top" as const,
            rawTop: localTargetRect.y - bubbleHeight - BUBBLE_TARGET_GAP,
            top: clamp(
              localTargetRect.y - bubbleHeight - BUBBLE_TARGET_GAP,
              minTop,
              maxTop,
            ),
          },
        ]
      : [];
    const candidates = [...defaultAndAvoidCandidates, ...targetCandidates];
    const resolvedCandidate = resolveCandidate(candidates);

    return {
      left: defaultLeft,
      top: resolvedCandidate.top,
      maxWidth,
      placement: resolvedCandidate.placement,
    };
  }

  const resolvedCandidate = resolveCandidate(defaultAndAvoidCandidates);

  return {
    left: defaultLeft,
    top: resolvedCandidate.top,
    maxWidth,
    placement: resolvedCandidate.placement,
  };
}

function isLikelyInvalidSpotlightRect(rect: Rect | null): boolean {
  if (!rect) {
    return false;
  }

  const isTiny = rect.width < 24 || rect.height < 24;
  const isNearOrigin = rect.x < 0 || rect.y < 0;

  return isTiny && isNearOrigin;
}

function getEstimatedBubbleHeight(
  layout: CoachmarkFlowStep["layout"] | undefined,
): number {
  if (layout === "centered_intro") {
    return CENTERED_INTRO_BUBBLE_HEIGHT;
  }

  return DEFAULT_BUBBLE_HEIGHT;
}

export function GuidedCoachmarkLayer({
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
  const insets = useSafeAreaInsets();
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
  const [localAvoidRects, setLocalAvoidRects] = useState<Rect[]>([]);
  const [rootLayout, setRootLayout] = useState({ width: 0, height: 0 });
  const [renderSpotlightLayer, setRenderSpotlightLayer] = useState(false);
  const [isBubbleReady, setIsBubbleReady] = useState(false);
  const [isSpotlightPositionReady, setIsSpotlightPositionReady] = useState(false);
  const overlayRootRef = useRef<View | null>(null);
  const hasInitializedBubbleRef = useRef(false);
  const hasPresentedSpotlightRef = useRef(false);
  const hasPositionedIndicatorRef = useRef(false);
  const spotlightRemeasureAttemptsRef = useRef(0);
  const bubbleLeft = useSharedValue(12);
  const bubbleTop = useSharedValue(12);
  const bubbleWidth = useSharedValue(320);
  const bubbleShakeRotation = useSharedValue(0);
  const indicatorLeft = useSharedValue(0);
  const indicatorTop = useSharedValue(0);
  const introBackdropOpacity = useSharedValue(0);
  const spotlightOpacity = useSharedValue(0);

  const activeStep = state.activeTour?.steps[state.index];

  const { targetRect, remeasure } = useTourMeasurement({
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
    if (!currentStep) {
      return;
    }
    setRootWindowRect({
      x: 0,
      y: 0,
      width: rootLayout.width || windowWidth,
      height: rootLayout.height || windowHeight,
    });
  }, [currentIndex, currentStep, rootLayout.height, rootLayout.width, windowHeight, windowWidth]);

  const localTargetRect = useMemo(() => {
    if (!targetRect || !rootWindowRect) return null;
    return {
      x: targetRect.x - rootWindowRect.x,
      y: targetRect.y - rootWindowRect.y,
      width: targetRect.width,
      height: targetRect.height,
    };
  }, [rootWindowRect, targetRect]);
  const avoidTargetIdsKey = currentStep?.avoidTargetIds?.join("|") ?? "";

  useEffect(() => {
    const avoidTargetIds = currentStep?.avoidTargetIds ?? [];
    if (!rootWindowRect || avoidTargetIds.length === 0) {
      setLocalAvoidRects([]);
      return;
    }

    let mounted = true;
    const measureAvoidTargets = () => {
      void Promise.all(
        avoidTargetIds.map(async (targetId) => {
          const anchor = getAnchor(targetId);
          const ref = anchor?.getRef();
          if (!ref) return null;

          try {
            const rect = await measureInWindow(ref);
            if (rect.width <= 0 || rect.height <= 0) return null;

            return {
              x: rect.x - rootWindowRect.x,
              y: rect.y - rootWindowRect.y,
              width: rect.width,
              height: rect.height,
            };
          } catch {
            return null;
          }
        }),
      ).then((rects) => {
        if (!mounted) return;
        setLocalAvoidRects(rects.filter((rect): rect is Rect => rect != null));
      });
    };
    const frame = requestAnimationFrame(measureAvoidTargets);
    const timers = [120, 280, 520].map((delay) =>
      setTimeout(measureAvoidTargets, delay),
    );

    return () => {
      mounted = false;
      cancelAnimationFrame(frame);
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [
    avoidTargetIdsKey,
    currentIndex,
    currentStep?.avoidTargetIds,
    getAnchor,
    rootLayout.height,
    rootLayout.width,
    rootWindowRect,
  ]);

  const topBoundary = useMemo(() => {
    if (!rootWindowRect) {
      return BUBBLE_EDGE_PADDING;
    }

    const safeAreaTopInLocal = Math.max(
      0,
      insets.top - rootWindowRect.y + BUBBLE_EDGE_PADDING,
    );

    return Math.max(BUBBLE_EDGE_PADDING, safeAreaTopInLocal);
  }, [insets.top, rootWindowRect]);
  const estimatedBubbleHeight = useMemo(
    () => getEstimatedBubbleHeight(currentStep?.layout),
    [currentStep?.layout],
  );
  const nonSpotlightDefaultTop = useMemo(() => {
    const defaultBottomOffset = Math.max(72, rootLayout.height * 0.2);
    const maxTop = Math.max(
      topBoundary,
      rootLayout.height - estimatedBubbleHeight - BUBBLE_EDGE_PADDING,
    );

    return clamp(
      rootLayout.height - defaultBottomOffset - estimatedBubbleHeight,
      topBoundary,
      maxTop,
    );
  }, [estimatedBubbleHeight, rootLayout.height, topBoundary]);
  const {
    keyboardVisible,
    keyboardTopInWindow,
  } = useKeyboardBottomOffset({
    enabled: currentStep?.layout !== "centered_intro",
    gap: BUBBLE_KEYBOARD_GAP,
    targetBottomInWindow:
      currentStep?.spotlight || rootWindowRect == null
        ? null
        : rootWindowRect.y +
          nonSpotlightDefaultTop +
          estimatedBubbleHeight,
    keyboardTopCorrection: 44,
  });
  const bottomBoundary = useMemo(() => {
    const safeBottomLimit = Math.max(
      BUBBLE_EDGE_PADDING,
      rootLayout.height - Math.max(BUBBLE_EDGE_PADDING, insets.bottom + BUBBLE_EDGE_PADDING),
    );

    if (!keyboardVisible || keyboardTopInWindow == null || !rootWindowRect) {
      return safeBottomLimit;
    }

    const keyboardLimit =
      keyboardTopInWindow - rootWindowRect.y - BUBBLE_KEYBOARD_GAP;

    return Math.max(
      BUBBLE_EDGE_PADDING,
      Math.min(safeBottomLimit, keyboardLimit),
    );
  }, [
    insets.bottom,
    keyboardTopInWindow,
    keyboardVisible,
    rootLayout.height,
    rootWindowRect,
  ]);
  const bubbleFrame = useMemo(() => {
    return computeBubbleFrame({
      rootLayout,
      bubbleHeight: estimatedBubbleHeight,
      localTargetRect,
      localAvoidRects,
      isSpotlightStep: Boolean(currentStep?.spotlight),
      layout: currentStep?.layout,
      minTop: topBoundary,
      maxBottom: bottomBoundary,
    });
  }, [
    bottomBoundary,
    currentStep?.layout,
    currentStep?.spotlight,
    estimatedBubbleHeight,
    localAvoidRects,
    localTargetRect,
    rootLayout,
    topBoundary,
  ]);
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
    transform: [{ rotateZ: `${bubbleShakeRotation.value}deg` }],
  }));
  const indicatorAnimatedStyle = useAnimatedStyle(() => ({
    left: indicatorLeft.value,
    top: indicatorTop.value,
  }));
  const introBackdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: introBackdropOpacity.value,
  }));
  const spotlightAnimatedStyle = useAnimatedStyle(() => ({
    opacity: spotlightOpacity.value,
  }));
  const triggerBubbleShake = () => {
    cancelAnimation(bubbleShakeRotation);
    bubbleShakeRotation.value = 0;
    bubbleShakeRotation.value = withSequence(
      withTiming(-7, { duration: 70 }),
      withTiming(7, { duration: 110 }),
      withTiming(-4, { duration: 90 }),
      withTiming(3, { duration: 80 }),
      withTiming(0, { duration: 100 }),
    );
  };

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
  const hasInvalidSpotlightRect = isLikelyInvalidSpotlightRect(localTargetRect);
  const shouldShowSpotlight = Boolean(
    currentStep?.spotlight && localTargetRect && !hasInvalidSpotlightRect,
  );
  const shouldShowFloatingIndicator =
    currentStep?.floatingIndicator === "arrow_u_down_right" && localTargetRect != null;

  useEffect(() => {
    if (!currentStep?.spotlight) {
      spotlightRemeasureAttemptsRef.current = 0;
      return;
    }

    if (!hasInvalidSpotlightRect) {
      spotlightRemeasureAttemptsRef.current = 0;
      return;
    }

    if (!localTargetRect || spotlightRemeasureAttemptsRef.current >= 8) {
      return;
    }

    spotlightRemeasureAttemptsRef.current += 1;

    const timeout = setTimeout(() => {
      void remeasure();
    }, 120);

    return () => clearTimeout(timeout);
  }, [currentStep, hasInvalidSpotlightRect, localTargetRect, remeasure]);

  useLayoutEffect(() => {
    if (!currentStep?.spotlight || !localTargetRect || hasInvalidSpotlightRect) {
      return;
    }

    if (!hasPresentedSpotlightRef.current) {
      hasPresentedSpotlightRef.current = true;
      localHoleX.value = localTargetRect.x;
      localHoleY.value = localTargetRect.y;
      localHoleWidth.value = localTargetRect.width;
      localHoleHeight.value = localTargetRect.height;
      setIsSpotlightPositionReady(true);
      return;
    }

    setIsSpotlightPositionReady(true);
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
    hasInvalidSpotlightRect,
    currentStep?.spotlight,
    localHoleHeight,
    localHoleWidth,
    localHoleX,
    localHoleY,
    localTargetRect,
    theme.motion.durationMs,
  ]);

  useLayoutEffect(() => {
    if (!localTargetRect || currentStep?.floatingIndicator !== "arrow_u_down_right") {
      return;
    }

    const nextLeft = localTargetRect.x - 34;
    const nextTop = Math.max(20, localTargetRect.y - 28);

    if (!hasPositionedIndicatorRef.current) {
      hasPositionedIndicatorRef.current = true;
      indicatorLeft.value = nextLeft;
      indicatorTop.value = nextTop;
      return;
    }

    indicatorLeft.value = withTiming(nextLeft, { duration: theme.motion.durationMs });
    indicatorTop.value = withTiming(nextTop, { duration: theme.motion.durationMs });
  }, [
    currentStep?.floatingIndicator,
    indicatorLeft,
    indicatorTop,
    localTargetRect,
    theme.motion.durationMs,
  ]);

  useEffect(() => {
    if (shouldShowSpotlight) {
      return;
    }

    hasPresentedSpotlightRef.current = false;
    setIsSpotlightPositionReady(false);
  }, [shouldShowSpotlight]);

  useEffect(() => {
    if (shouldShowFloatingIndicator) {
      return;
    }

    hasPositionedIndicatorRef.current = false;
  }, [shouldShowFloatingIndicator]);

  useEffect(() => {
    introBackdropOpacity.value = withTiming(isCenteredIntro ? 0.62 : 0, {
      duration: 340,
    });
  }, [introBackdropOpacity, isCenteredIntro]);

  const shouldBlockOutside =
    Boolean(currentStep?.blockOutside) ||
    (currentStep?.advanceOn !== "manual" && shouldShowSpotlight);
  const shouldBlockSpotlight = Boolean(currentStep?.blockSpotlight && shouldShowSpotlight);
  const shouldRenderFullscreenBlocker = shouldBlockOutside && !shouldShowSpotlight;

  useEffect(() => {
    const duration = 280;

    if (shouldShowSpotlight && isSpotlightPositionReady) {
      setRenderSpotlightLayer(true);
      spotlightOpacity.value = withTiming(1, { duration });
      return;
    }

    spotlightOpacity.value = withTiming(0, { duration });
    const timeout = setTimeout(() => {
      setRenderSpotlightLayer(false);
    }, duration);

    return () => clearTimeout(timeout);
  }, [isSpotlightPositionReady, shouldShowSpotlight, spotlightOpacity]);

  if (!currentStep) return null;

  return (
    <View
      ref={overlayRootRef}
      collapsable={false}
      pointerEvents="box-none"
      style={styles.overlayRoot}
      onLayout={(event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        if (width !== rootLayout.width || height !== rootLayout.height) {
          setRootLayout({ width, height });
        }
        setRootWindowRect({ x: 0, y: 0, width, height });
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
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={triggerBubbleShake}
          />
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
                  onPress={triggerBubbleShake}
                  style={[
                    styles.blocker,
                    {
                      left: 0,
                      top: 0,
                      width: rootLayout.width,
                      height: Math.max(0, localTargetRect.y),
                    },
                  ]}
                />
                <Pressable
                  onPress={triggerBubbleShake}
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
                  onPress={triggerBubbleShake}
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
                  onPress={triggerBubbleShake}
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
                    onPress={triggerBubbleShake}
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

        {shouldShowFloatingIndicator ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.indicatorBubble, indicatorAnimatedStyle]}
          >
            <MaterialCommunityIcons
              name="arrow-u-down-right-bold"
              size={96}
              color={colors.my_green}
            />
          </Animated.View>
        ) : null}

        {isBubbleReady ? (
          <View pointerEvents="box-none" style={styles.bubbleHost}>
            <Animated.View
              style={[
                styles.bubbleWrap,
                bubbleAnimatedStyle,
              ]}
              pointerEvents="box-none"
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
          </View>
        ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  blocker: {
    position: "absolute",
    backgroundColor: "transparent",
  },
  bubbleHost: {
    position: "relative",
  },
  bubbleWrap: {
    position: "absolute",
    zIndex: 50,
  },
  indicatorBubble: {
    position: "absolute",
    zIndex: 45,
  },
  highlight: {
    position: "absolute",
    borderWidth: 3,
    borderRadius: 18,
  },
});
