import { useCallback, useMemo, useState } from "react";
import type { LayoutChangeEvent } from "react-native";

type UseAutoScaleToFitParams = {
  minScale?: number;
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

export function useAutoScaleToFit({
  minScale = DEFAULT_MIN_SCALE,
}: UseAutoScaleToFitParams = {}): UseAutoScaleToFitResult {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const onViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.max(0, Math.ceil(event.nativeEvent.layout.height));
    setViewportHeight((prev) => (prev === nextHeight ? prev : nextHeight));
  }, []);

  const onContentLayout = useCallback((event: LayoutChangeEvent) => {
    // Measure the content container in its natural (unscaled) layout.
    const nextHeight = Math.max(0, Math.ceil(event.nativeEvent.layout.height));
    setContentHeight((prev) => (prev === nextHeight ? prev : nextHeight));
  }, []);

  const ratio =
    viewportHeight > 0 && contentHeight > 0 ? viewportHeight / contentHeight : 1;
  const scale = useMemo(
    () => Math.min(1, Math.max(minScale, ratio)),
    [minScale, ratio],
  );
  const scaledHeight = useMemo(() => {
    if (contentHeight <= 0) return undefined;
    return Math.ceil(contentHeight * scale);
  }, [contentHeight, scale]);
  const scaleOffsetY = useMemo(() => {
    if (contentHeight <= 0) return 0;
    return (contentHeight - contentHeight * scale) / 2;
  }, [contentHeight, scale]);

  const needsScrollFallback =
    viewportHeight > 0 &&
    contentHeight > 0 &&
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
