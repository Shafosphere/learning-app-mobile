import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LayoutChangeEvent } from "react-native";

type UseAutoScaleToFitParams = {
  minScale?: number;
  stableContentHeight?: number;
  layoutTransition?: {
    isRunning: () => boolean;
    subscribe: (listener: () => void) => () => void;
  };
};

type UseAutoScaleToFitResult = {
  scale: number;
  scaledHeight: number | undefined;
  scaleOffsetY: number;
  onViewportLayout: (event: LayoutChangeEvent) => void;
  onContentLayout: (event: LayoutChangeEvent) => void;
  needsScrollFallback: boolean;
};

const DEFAULT_MIN_SCALE = 0.72;
const EPSILON = 0.0001;
const LAYOUT_JITTER_TOLERANCE_PX = 1;

export function useAutoScaleToFit({
  minScale = DEFAULT_MIN_SCALE,
  stableContentHeight,
  layoutTransition,
}: UseAutoScaleToFitParams = {}): UseAutoScaleToFitResult {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const pendingViewportHeightRef = useRef<number | null>(null);

  const commitViewportHeight = useCallback(() => {
    const nextHeight = pendingViewportHeightRef.current;
    if (nextHeight === null) return;
    setViewportHeight((prev) => {
      if (prev === null) return nextHeight;
      return Math.abs(prev - nextHeight) <= LAYOUT_JITTER_TOLERANCE_PX
        ? prev
        : nextHeight;
    });
  }, []);

  const onViewportLayout = useCallback((event: LayoutChangeEvent) => {
    pendingViewportHeightRef.current = Math.max(0, Math.ceil(event.nativeEvent.layout.height));
    if (!layoutTransition?.isRunning()) commitViewportHeight();
  }, [layoutTransition, commitViewportHeight]);

  useEffect(() => layoutTransition?.subscribe(commitViewportHeight), [layoutTransition, commitViewportHeight]);

  const onContentLayout = useCallback((event: LayoutChangeEvent) => {
    if (stableContentHeight != null) return;
    // Measure the content container in its natural (unscaled) layout.
    const nextHeight = Math.max(0, Math.ceil(event.nativeEvent.layout.height));
    setContentHeight((prev) => {
      if (prev === 0) return nextHeight;
      return Math.abs(prev - nextHeight) <= LAYOUT_JITTER_TOLERANCE_PX
        ? prev
        : nextHeight;
    });
  }, [stableContentHeight]);

  const measuredContentHeight = contentHeight;
  const effectiveContentHeight = stableContentHeight ?? measuredContentHeight;

  const ratio =
    viewportHeight !== null && effectiveContentHeight > 0
      ? viewportHeight / effectiveContentHeight
      : 1;
  const scale = useMemo(
    () => Math.min(1, Math.max(minScale, ratio)),
    [minScale, ratio],
  );
  const scaledHeight = useMemo(() => {
    if (effectiveContentHeight <= 0) return undefined;
    return Math.ceil(effectiveContentHeight * scale);
  }, [effectiveContentHeight, scale]);
  const scaleOffsetY = useMemo(() => {
    if (effectiveContentHeight <= 0) return 0;
    return (effectiveContentHeight - effectiveContentHeight * scale) / 2;
  }, [effectiveContentHeight, scale]);

  const needsScrollFallback =
    viewportHeight !== null &&
    effectiveContentHeight > 0 &&
    ratio + EPSILON < minScale;

  return {
    scale,
    scaledHeight,
    scaleOffsetY,
    onViewportLayout,
    onContentLayout,
    needsScrollFallback,
  };
}
