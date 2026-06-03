import type { CoachmarkFlowStep } from "@/src/constants/coachmarkFlows";

export type Rect = { x: number; y: number; width: number; height: number };
export type BlockerRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};
type BubblePlacement = "top" | "bottom";

type BubbleFrame = {
  left: number;
  top: number;
  maxWidth: number;
  placement: BubblePlacement;
};

export const BUBBLE_KEYBOARD_GAP = 12;
export const BUBBLE_EDGE_PADDING = 12;
export const BUBBLE_NAVIGATION_HEIGHT = 56;

const BUBBLE_CENTERED_PADDING = 18;
const DEFAULT_BUBBLE_HEIGHT = 132;
const CENTERED_INTRO_BUBBLE_HEIGHT = 160;
const BUBBLE_MIN_WIDTH = 240;
const BUBBLE_MAX_WIDTH = 380;
const CENTERED_INTRO_MIN_WIDTH = 280;
const CENTERED_INTRO_MAX_WIDTH = 420;
const BUBBLE_TARGET_GAP = 12;
const BUBBLE_AVOID_GAP = 12;

export function clamp(value: number, min: number, max: number): number {
  if (max <= min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

export function computePassThroughBlockerRects({
  rootLayout,
  passThroughRect,
}: {
  rootLayout: { width: number; height: number };
  passThroughRect: Rect;
}): BlockerRect[] {
  return computeMultiPassThroughBlockerRects({
    rootLayout,
    passThroughRects: [passThroughRect],
  });
}

function isPointInsideRect(point: { x: number; y: number }, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function uniqueSortedNumbers(values: number[]): number[] {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

export function computeMultiPassThroughBlockerRects({
  rootLayout,
  passThroughRects,
}: {
  rootLayout: { width: number; height: number };
  passThroughRects: Rect[];
}): BlockerRect[] {
  if (passThroughRects.length === 0) {
    return [
      {
        left: 0,
        top: 0,
        width: rootLayout.width,
        height: rootLayout.height,
      },
    ];
  }

  if (passThroughRects.length === 1) {
    const passThroughRect = passThroughRects[0];

    return [
      {
        left: 0,
        top: 0,
        width: rootLayout.width,
        height: Math.max(0, passThroughRect.y),
      },
      {
        left: 0,
        top: passThroughRect.y + passThroughRect.height,
        width: rootLayout.width,
        height: Math.max(
          0,
          rootLayout.height - (passThroughRect.y + passThroughRect.height),
        ),
      },
      {
        left: 0,
        top: passThroughRect.y,
        width: Math.max(0, passThroughRect.x),
        height: passThroughRect.height,
      },
      {
        left: passThroughRect.x + passThroughRect.width,
        top: passThroughRect.y,
        width: Math.max(
          0,
          rootLayout.width - (passThroughRect.x + passThroughRect.width),
        ),
        height: passThroughRect.height,
      },
    ];
  }

  const clippedRects = passThroughRects.map((rect) => {
    const x = clamp(rect.x, 0, rootLayout.width);
    const y = clamp(rect.y, 0, rootLayout.height);
    const right = clamp(rect.x + rect.width, 0, rootLayout.width);
    const bottom = clamp(rect.y + rect.height, 0, rootLayout.height);

    return {
      x,
      y,
      width: Math.max(0, right - x),
      height: Math.max(0, bottom - y),
    };
  }).filter((rect) => rect.width > 0 && rect.height > 0);

  const xBoundaries = uniqueSortedNumbers([
    0,
    rootLayout.width,
    ...clippedRects.flatMap((rect) => [rect.x, rect.x + rect.width]),
  ]);
  const yBoundaries = uniqueSortedNumbers([
    0,
    rootLayout.height,
    ...clippedRects.flatMap((rect) => [rect.y, rect.y + rect.height]),
  ]);
  const blockers: BlockerRect[] = [];

  for (let yIndex = 0; yIndex < yBoundaries.length - 1; yIndex += 1) {
    for (let xIndex = 0; xIndex < xBoundaries.length - 1; xIndex += 1) {
      const left = xBoundaries[xIndex];
      const top = yBoundaries[yIndex];
      const width = xBoundaries[xIndex + 1] - left;
      const height = yBoundaries[yIndex + 1] - top;
      if (width <= 0 || height <= 0) continue;

      const center = {
        x: left + width / 2,
        y: top + height / 2,
      };
      if (clippedRects.some((rect) => isPointInsideRect(center, rect))) {
        continue;
      }

      blockers.push({ left, top, width, height });
    }
  }

  return blockers;
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

export function computeBubbleFrame({
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
    const maxTop = Math.max(minTop, maxBottom - bubbleHeight);

    return {
      left: Math.max(BUBBLE_CENTERED_PADDING, (rootLayout.width - maxWidth) / 2),
      top: clamp((rootLayout.height - bubbleHeight) / 2, minTop, maxTop),
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

export function getEstimatedBubbleHeight(
  layout: CoachmarkFlowStep["layout"] | undefined,
  options: { includeNavigation?: boolean } = {},
): number {
  if (layout === "centered_intro") {
    return CENTERED_INTRO_BUBBLE_HEIGHT;
  }

  return DEFAULT_BUBBLE_HEIGHT + (options.includeNavigation === false ? 0 : BUBBLE_NAVIGATION_HEIGHT);
}
