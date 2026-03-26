import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import { useStyles } from "../card-styles";

const SMALL_CARD_HEIGHT = 120;
const LARGE_CARD_MAX_HEIGHT = 325;
const LARGE_CARD_GAP = 6;
const SHRINK_SETTLE_DELAY_MS = 140;
const LAYOUT_JITTER_TOLERANCE_PX = 1;

type LayoutHandlers = {
  onPromptLayout: (height: number) => void;
  onInputLayout: (height: number) => void;
};

type LargeCardContainerProps = {
  cardStateStyle?: object;
  hasContent: boolean;
  showCorrectionInputs: boolean;
  backgroundColorOverride?: string;
  shrinkImmediately?: boolean;
  contentKey?: string;
  children: (handlers: LayoutHandlers) => React.ReactNode;
};

export default function LargeCardContainer({
  cardStateStyle,
  hasContent,
  showCorrectionInputs: _showCorrectionInputs,
  backgroundColorOverride,
  shrinkImmediately = false,
  contentKey,
  children,
}: LargeCardContainerProps) {
  const styles = useStyles();
  const [promptHeight, setPromptHeight] = useState<number | null>(null);
  const [inputHeight, setInputHeight] = useState<number | null>(null);
  const [isWaitingForFreshLayout, setIsWaitingForFreshLayout] = useState(hasContent);
  const lastStableHeight = useRef<number | null>(null);
  const initialCardHeight =
    hasContent && lastStableHeight.current != null
      ? lastStableHeight.current
      : SMALL_CARD_HEIGHT;
  const [stableTargetHeight, setStableTargetHeight] = useState(initialCardHeight);
  const shrinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emptyAlignmentStyle = useMemo(
    () =>
      hasContent
        ? null
        : {
            alignItems: "center",
            justifyContent: "center",
          },
    [hasContent],
  );
  const animatedCardHeight = useRef(
    new Animated.Value(initialCardHeight)
  ).current;

  const baseCardHeight = useMemo(() => {
    const fallbackHeight = lastStableHeight.current ?? SMALL_CARD_HEIGHT;
    if (!hasContent) {
      return fallbackHeight;
    }
    if (promptHeight == null || inputHeight == null) {
      return fallbackHeight;
    }
    const desired =
      promptHeight + inputHeight + LARGE_CARD_GAP * 2;
    return Math.min(
      LARGE_CARD_MAX_HEIGHT,
      Math.max(SMALL_CARD_HEIGHT, Math.ceil(desired))
    );
  }, [hasContent, inputHeight, promptHeight]);

  const rawTargetCardHeight = useMemo(() => {
    if (!hasContent) {
      return baseCardHeight;
    }
    // Keep card height driven by current measurements so the "correction" state
    // matches the neutral one. Use the last stable value only as a fallback
    // while measurements are being gathered.
    return baseCardHeight ?? SMALL_CARD_HEIGHT;
  }, [baseCardHeight, hasContent]);

  const handlePromptLayout = useCallback((height: number) => {
    const nextHeight = Math.ceil(height);
    setPromptHeight((prev) => {
      if (prev == null) return nextHeight;
      return Math.abs(prev - nextHeight) <= LAYOUT_JITTER_TOLERANCE_PX
        ? prev
        : nextHeight;
    });
  }, []);

  const handleInputLayout = useCallback((height: number) => {
    const nextHeight = Math.ceil(height);
    setInputHeight((prev) => {
      if (prev == null) return nextHeight;
      return Math.abs(prev - nextHeight) <= LAYOUT_JITTER_TOLERANCE_PX
        ? prev
        : nextHeight;
    });
  }, []);

  useEffect(() => {
    setPromptHeight(null);
    setInputHeight(null);
    setIsWaitingForFreshLayout(hasContent);
  }, [contentKey, hasContent]);

  useEffect(() => {
    if (!hasContent) {
      setIsWaitingForFreshLayout(false);
      return;
    }
    if (promptHeight == null || inputHeight == null) {
      return;
    }
    setIsWaitingForFreshLayout(false);
  }, [hasContent, inputHeight, promptHeight]);

  useEffect(() => {
    if (!hasContent) {
      return;
    }
    lastStableHeight.current = baseCardHeight;
  }, [baseCardHeight, hasContent]);

  useEffect(() => {
    return () => {
      if (shrinkTimeoutRef.current) {
        clearTimeout(shrinkTimeoutRef.current);
        shrinkTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!hasContent) {
      if (shrinkTimeoutRef.current) {
        clearTimeout(shrinkTimeoutRef.current);
        shrinkTimeoutRef.current = null;
      }
      setStableTargetHeight(lastStableHeight.current ?? SMALL_CARD_HEIGHT);
      return;
    }

    setStableTargetHeight((prev) => {
      if (rawTargetCardHeight >= prev) {
        if (shrinkTimeoutRef.current) {
          clearTimeout(shrinkTimeoutRef.current);
          shrinkTimeoutRef.current = null;
        }
        return rawTargetCardHeight;
      }

      if (shrinkImmediately) {
        if (shrinkTimeoutRef.current) {
          clearTimeout(shrinkTimeoutRef.current);
          shrinkTimeoutRef.current = null;
        }
        return rawTargetCardHeight;
      }

      if (shrinkTimeoutRef.current) {
        clearTimeout(shrinkTimeoutRef.current);
      }
      shrinkTimeoutRef.current = setTimeout(() => {
        setStableTargetHeight((current) => Math.min(current, rawTargetCardHeight));
        shrinkTimeoutRef.current = null;
      }, SHRINK_SETTLE_DELAY_MS);
      return prev;
    });
  }, [hasContent, rawTargetCardHeight, shrinkImmediately]);

  useEffect(() => {
    animatedCardHeight.stopAnimation();
    Animated.timing(animatedCardHeight, {
      toValue: stableTargetHeight,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animatedCardHeight, stableTargetHeight]);

  const sharedStyle = [
    styles.card,
    styles.cardLarge,
    emptyAlignmentStyle,
    cardStateStyle,
    backgroundColorOverride
      ? { backgroundColor: backgroundColorOverride }
      : null,
  ];

  return (
    <Animated.View
      style={[
        ...sharedStyle,
        isWaitingForFreshLayout
          ? { minHeight: animatedCardHeight }
          : { height: animatedCardHeight },
      ]}
    >
      {children({
        onPromptLayout: handlePromptLayout,
        onInputLayout: handleInputLayout,
      })}
    </Animated.View>
  );
}
