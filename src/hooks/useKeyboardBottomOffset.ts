import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardEvent,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type UseKeyboardBottomOffsetOptions = {
  enabled?: boolean;
  gap?: number;
  baseInset?: number;
  androidDurationMs?: number;
  targetBottomInWindow?: number | null;
  keyboardTopCorrection?: number;
  debug?: boolean;
};

type UseKeyboardBottomOffsetResult = {
  keyboardVisible: boolean;
  bottomOffset: Animated.Value;
};

type KeyboardCoords = {
  screenY?: number;
  height?: number;
};

type KeyboardMetricsLike = {
  screenY?: number;
  height?: number;
  endCoordinates?: KeyboardCoords;
};

export function useKeyboardBottomOffset({
  enabled = true,
  gap = 12,
  baseInset = 0,
  androidDurationMs = 240,
  targetBottomInWindow = null,
  keyboardTopCorrection = 0,
  debug = false,
}: UseKeyboardBottomOffsetOptions = {}): UseKeyboardBottomOffsetResult {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const keyboardApi = Keyboard as typeof Keyboard & {
    metrics?: () => KeyboardMetricsLike | undefined;
    isVisible?: () => boolean;
  };

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const bottomOffset = useRef(new Animated.Value(0)).current;
  const lastKeyboardTopRef = useRef<number | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingHide = useCallback(() => {
    if (!hideTimerRef.current) return;
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  const animateTo = useCallback(
    (value: number, duration: number) => {
      if (debug) {
        console.log("[kbd-offset] animateTo", { value, duration });
      }
      Animated.timing(bottomOffset, {
        toValue: value,
        duration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    },
    [bottomOffset, debug],
  );

  const normalizeCoordinates = useCallback((coords?: KeyboardMetricsLike) => {
    if (!coords) return undefined;
    if (coords.endCoordinates) return coords.endCoordinates;
    return { screenY: coords.screenY, height: coords.height };
  }, []);

  const getKeyboardTopFromCoordinates = useCallback(
    (raw?: KeyboardMetricsLike | KeyboardCoords) => {
      const coords = normalizeCoordinates(raw as KeyboardMetricsLike | undefined);
      const keyboardHeight = coords?.height ?? 0;
      if (keyboardHeight <= 0) {
        if (debug) {
          console.log("[kbd-offset] getTop: no height", { raw, coords });
        }
        return null;
      }

      const keyboardTopFromEvent = coords?.screenY;
      const fallbackKeyboardTop = windowHeight - keyboardHeight;
      const keyboardTopRaw =
        typeof keyboardTopFromEvent === "number" && keyboardTopFromEvent > 0
          ? Math.min(keyboardTopFromEvent, fallbackKeyboardTop)
          : fallbackKeyboardTop;

      if (debug) {
        console.log("[kbd-offset] getTop", {
          raw,
          coords,
          keyboardTopFromEvent,
          keyboardHeight,
          fallbackKeyboardTop,
          keyboardTopRaw,
        });
      }

      return keyboardTopRaw;
    },
    [debug, normalizeCoordinates, windowHeight],
  );

  const computeTargetOffset = useCallback(
    (keyboardTopRaw: number) => {
      const keyboardTop = Math.max(0, keyboardTopRaw - keyboardTopCorrection);

      const targetOffset =
        typeof targetBottomInWindow === "number" && targetBottomInWindow > 0
          ? Math.max(0, targetBottomInWindow + gap - keyboardTop)
          : Math.max(
              0,
              Math.max(0, windowHeight - keyboardTop) - (insets.bottom + baseInset),
            ) + gap;

      if (debug) {
        console.log("[kbd-offset] computeTargetOffset", {
          keyboardTopRaw,
          keyboardTopCorrection,
          keyboardTop,
          targetBottomInWindow,
          gap,
          baseInset,
          insetsBottom: insets.bottom,
          windowHeight,
          targetOffset,
        });
      }

      return targetOffset;
    },
    [
      baseInset,
      debug,
      gap,
      insets.bottom,
      keyboardTopCorrection,
      targetBottomInWindow,
      windowHeight,
    ],
  );

  const syncFromLiveKeyboard = useCallback(
    (duration: number) => {
      const metrics = keyboardApi.metrics?.();
      const keyboardVisibleByApi = keyboardApi.isVisible?.();
      const liveTop = getKeyboardTopFromCoordinates(metrics);

      if (debug) {
        console.log("[kbd-offset] syncFromLiveKeyboard", {
          metrics,
          keyboardVisibleByApi,
          liveTop,
        });
      }

      if (liveTop == null) return false;
      if (keyboardVisibleByApi === false) return false;

      lastKeyboardTopRef.current = liveTop;
      setKeyboardVisible(true);
      animateTo(computeTargetOffset(liveTop), duration);
      return true;
    },
    [
      animateTo,
      computeTargetOffset,
      debug,
      getKeyboardTopFromCoordinates,
      keyboardApi,
    ],
  );

  const getDuration = useCallback(
    (event?: KeyboardEvent) =>
      Platform.OS === "ios"
        ? Math.max(180, event?.duration ?? androidDurationMs)
        : androidDurationMs,
    [androidDurationMs],
  );

  useEffect(() => {
    if (!enabled) {
      clearPendingHide();
      setKeyboardVisible(false);
      lastKeyboardTopRef.current = null;
      animateTo(0, 120);
      return;
    }

    const handleShow = (event: KeyboardEvent) => {
      if (debug) {
        console.log("[kbd-offset] handleShow", {
          duration: event.duration,
          endCoordinates: event.endCoordinates,
        });
      }

      const keyboardTopRaw = getKeyboardTopFromCoordinates(event.endCoordinates);
      if (keyboardTopRaw == null) return;

      const keyboardTop = Math.max(0, keyboardTopRaw - keyboardTopCorrection);
      if (keyboardTop <= 0) return;

      clearPendingHide();
      lastKeyboardTopRef.current = keyboardTopRaw;
      setKeyboardVisible(true);
      animateTo(computeTargetOffset(keyboardTopRaw), getDuration(event));
    };

    const handleHide = (event: KeyboardEvent) => {
      if (debug) {
        console.log("[kbd-offset] handleHide", {
          duration: event.duration,
          endCoordinates: event.endCoordinates,
        });
      }

      clearPendingHide();
      const hideDuration = getDuration(event);
      hideTimerRef.current = setTimeout(() => {
        hideTimerRef.current = null;
        if (syncFromLiveKeyboard(120)) {
          return;
        }
        setKeyboardVisible(false);
        lastKeyboardTopRef.current = null;
        animateTo(0, hideDuration);
      }, 110);
    };

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, handleShow);
    const hideSub = Keyboard.addListener(hideEvent, handleHide);

    return () => {
      clearPendingHide();
      showSub.remove();
      hideSub.remove();
    };
  }, [
    animateTo,
    clearPendingHide,
    computeTargetOffset,
    debug,
    enabled,
    getDuration,
    getKeyboardTopFromCoordinates,
    keyboardTopCorrection,
    syncFromLiveKeyboard,
  ]);

  useEffect(() => {
    if (!enabled) return;

    if (syncFromLiveKeyboard(180)) {
      return;
    }

    if (!keyboardVisible) return;
    if (lastKeyboardTopRef.current == null) return;

    if (debug) {
      console.log("[kbd-offset] fallback recompute", {
        lastKeyboardTopRef: lastKeyboardTopRef.current,
      });
    }

    animateTo(computeTargetOffset(lastKeyboardTopRef.current), 180);
  }, [
    animateTo,
    computeTargetOffset,
    debug,
    enabled,
    keyboardVisible,
    syncFromLiveKeyboard,
  ]);

  return { keyboardVisible, bottomOffset };
}
