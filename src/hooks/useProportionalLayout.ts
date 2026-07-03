import { useCallback, useMemo, useState } from "react";
import type { LayoutChangeEvent } from "react-native";

type ProportionalLayoutOptions = {
  referenceWidth: number;
  referenceHeight: number;
  horizontalInset?: number;
  verticalInsetPercentage?: number;
  initialWidth?: number;
  initialHeight?: number;
};

export type ProportionalLayoutMetrics = {
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  verticalInset: number;
  visualScale: number;
  heightFor: (percentage: number) => number;
};

const LAYOUT_JITTER_TOLERANCE_PX = 1;

export function getProportionalLayoutMetrics({
  width,
  height,
  referenceWidth,
  referenceHeight,
  horizontalInset = 0,
  verticalInsetPercentage = 0,
}: {
  width: number;
  height: number;
  referenceWidth: number;
  referenceHeight: number;
  horizontalInset?: number;
  verticalInsetPercentage?: number;
}): ProportionalLayoutMetrics {
  const viewportWidth = Math.max(0, width);
  const viewportHeight = Math.max(0, height);
  const contentWidth = Math.max(0, viewportWidth - horizontalInset * 2);
  const clampedVerticalInsetPercentage = Math.min(
    50,
    Math.max(0, verticalInsetPercentage),
  );
  const verticalInset =
    (viewportHeight * clampedVerticalInsetPercentage) / 100;
  const contentHeight = Math.max(0, viewportHeight - verticalInset * 2);
  const widthScale =
    referenceWidth > 0 ? contentWidth / referenceWidth : Number.POSITIVE_INFINITY;
  const heightScale =
    referenceHeight > 0
      ? contentHeight / referenceHeight
      : Number.POSITIVE_INFINITY;
  const visualScale = Math.max(0, Math.min(widthScale, heightScale));

  return {
    viewportWidth,
    viewportHeight,
    contentWidth,
    contentHeight,
    verticalInset,
    visualScale: Number.isFinite(visualScale) ? visualScale : 0,
    heightFor: (percentage: number) =>
      Math.max(0, (contentHeight * percentage) / 100),
  };
}

export function useProportionalLayout({
  referenceWidth,
  referenceHeight,
  horizontalInset = 0,
  verticalInsetPercentage = 0,
  initialWidth = referenceWidth + horizontalInset * 2,
  initialHeight = referenceHeight,
}: ProportionalLayoutOptions) {
  const [viewport, setViewport] = useState({
    width: initialWidth,
    height: initialHeight,
  });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.max(0, event.nativeEvent.layout.width);
    const nextHeight = Math.max(0, event.nativeEvent.layout.height);

    setViewport((previous) => {
      const widthUnchanged =
        Math.abs(previous.width - nextWidth) <= LAYOUT_JITTER_TOLERANCE_PX;
      const heightUnchanged =
        Math.abs(previous.height - nextHeight) <= LAYOUT_JITTER_TOLERANCE_PX;

      return widthUnchanged && heightUnchanged
        ? previous
        : { width: nextWidth, height: nextHeight };
    });
  }, []);

  const metrics = useMemo(
    () =>
      getProportionalLayoutMetrics({
        width: viewport.width,
        height: viewport.height,
        referenceWidth,
        referenceHeight,
        horizontalInset,
        verticalInsetPercentage,
      }),
    [
      horizontalInset,
      referenceHeight,
      referenceWidth,
      viewport.height,
      viewport.width,
      verticalInsetPercentage,
    ],
  );

  return {
    ...metrics,
    onLayout,
  };
}
