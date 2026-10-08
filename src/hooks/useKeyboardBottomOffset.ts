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
  keyboardTopInWindow: number | null;
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
  const [keyboardTopInWindow, setKeyboardTopInWindow] = useState<number | null>(
    null,
  );
  const bottomOffset = useRef(new Animated.Value(0)).current;
  const lastKeyboardTopRef = useRef<number | null>(null);
  const targetOffsetRef = useRef(0);

  const animateTo = useCallback(
    (value: number, duration: number) => {
      // A visibility render or a repeated native event must not restart the lift.
      if (targetOffsetRef.current === value) return;
      targetOffsetRef.current = value;
      if (debug) {
        console.log("[kbd-offset] animateTo", { value, duration });
      }
      Animated.timing(bottomOffset, {
        toValue: value,
        duration,
        easing: Easing.out(Easing.ease),
        // Consumers apply this value to translateY, so keyboard movement can
        // continue on the UI thread while the study screen renders on JS.
        useNativeDriver: true,
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
      // adjustResize may already have removed the keyboard from windowHeight.
      // Subtracting it again would lift the dock above the reported screenY.
      const keyboardTopRaw =
        typeof keyboardTopFromEvent === "number" && keyboardTopFromEvent > 0
          ? keyboardTopFromEvent
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
      setKeyboardTopInWindow(liveTop);
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
      setKeyboardVisible(false);
      setKeyboardTopInWindow(null);
      lastKeyboardTopRef.current = null;
      targetOffsetRef.current = 0;
      bottomOffset.stopAnimation();
      bottomOffset.setValue(0);
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

      lastKeyboardTopRef.current = keyboardTopRaw;
      setKeyboardVisible(true);
      setKeyboardTopInWindow(keyboardTopRaw);
      animateTo(computeTargetOffset(keyboardTopRaw), getDuration(event));
    };

    const handleHide = (event: KeyboardEvent) => {
      if (debug) {
        console.log("[kbd-offset] handleHide", {
          duration: event.duration,
          endCoordinates: event.endCoordinates,
        });
      }

      const hideDuration = getDuration(event);
      setKeyboardVisible(false);
      setKeyboardTopInWindow(null);
      lastKeyboardTopRef.current = null;
      animateTo(0, hideDuration);
    };

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, handleShow);
    const hideSub = Keyboard.addListener(hideEvent, handleHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [
    animateTo,
    bottomOffset,
    computeTargetOffset,
    debug,
    enabled,
    getDuration,
    getKeyboardTopFromCoordinates,
    keyboardTopCorrection,
  ]);

  // Read live metrics only when activating the hook. During hide they can still
  // describe the departing keyboard; native events own visibility thereafter.
  const syncFromLiveKeyboardRef = useRef(syncFromLiveKeyboard);
  syncFromLiveKeyboardRef.current = syncFromLiveKeyboard;
  useEffect(() => {
    if (enabled) syncFromLiveKeyboardRef.current(180);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
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
  ]);

  useEffect(() => () => bottomOffset.stopAnimation(), [bottomOffset]);

  return { keyboardVisible, keyboardTopInWindow, bottomOffset };
}
