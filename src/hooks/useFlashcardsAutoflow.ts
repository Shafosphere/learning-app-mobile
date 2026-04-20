import type { BoxesState } from "@/src/types/boxes";
import { useEffect, useRef } from "react";

export type AutoflowParams = {
  enabled: boolean;
  boxes: BoxesState;
  activeBox: keyof BoxesState | null;
  handleSelectBox: (box: keyof BoxesState) => void;
  canSwitch: boolean;
  boxZeroEnabled: boolean;
  isReady: boolean;
  downloadMore: () => Promise<void>;
  introBoxLimitReached: boolean;
  totalFlashcardsInCourse?: number | null;
};

export const SWITCH_STICKY_MS = 1500;
// Minimum time (ms) to stay on a box before allowing another auto-switch.
const BASE_STACK_TARGET = 5;
// Desired number of cards to keep in the main engine stack (boxOne).
const CRITICAL_LOWER_BUFFER_MIN = 25;
// Hard stop for draining cleanup boxes before the lower buffer grows too large.
const FLUSH_THRESHOLD_DEFAULT = 20;
// Default cap for how many cards per box before cleanup kicks in.
const FLUSH_THRESHOLD_MIN = 12;
// Lower bound for flush threshold when computed dynamically.
const FLUSH_THRESHOLD_MAX = 20;
// Upper bound for flush threshold when computed dynamically.
const FLUSH_THRESHOLD_RATIO = 0.1;
// Fraction of total course cards to use when deriving flush threshold.
const CLEANUP_BOXES: readonly (keyof BoxesState)[] = [
  "boxTwo",
  "boxThree",
  "boxFour",
  "boxFive",
];

export type AutoflowDecision = {
  targetBox: keyof BoxesState | null;
  shouldDownloadNew: boolean;
};

export function resolveAutoflowFlushThreshold(
  totalFlashcardsInCourse?: number | null
) {
  return Math.min(
    FLUSH_THRESHOLD_MAX,
    Math.max(
      FLUSH_THRESHOLD_MIN,
      totalFlashcardsInCourse && totalFlashcardsInCourse > 0
        ? Math.ceil(totalFlashcardsInCourse * FLUSH_THRESHOLD_RATIO)
        : FLUSH_THRESHOLD_DEFAULT
    )
  );
}

export function getLowerBufferCount(
  boxes: BoxesState,
  boxZeroEnabled: boolean
) {
  const boxZeroCount = boxes.boxZero?.length ?? 0;
  const boxOneCount = boxes.boxOne?.length ?? 0;
  return boxZeroEnabled ? boxZeroCount + boxOneCount : boxOneCount;
}

export function getPreferredLowerBufferTarget(
  boxes: BoxesState,
  boxZeroEnabled: boolean
): keyof BoxesState {
  if (boxZeroEnabled && (boxes.boxZero?.length ?? 0) > 0) {
    return "boxZero";
  }

  return "boxOne";
}

export function getHighestCloggedCleanupBox(
  boxes: BoxesState,
  cleanupEnterThreshold: number
): keyof BoxesState | null {
  for (let i = CLEANUP_BOXES.length - 1; i >= 0; i -= 1) {
    const cleanupBox = CLEANUP_BOXES[i];
    if ((boxes[cleanupBox]?.length ?? 0) >= cleanupEnterThreshold) {
      return cleanupBox;
    }
  }

  return null;
}

export function pickAutoflowDecision(params: {
  boxes: BoxesState;
  activeBox: keyof BoxesState | null;
  boxZeroEnabled: boolean;
  canDownloadMore: boolean;
  flushThreshold: number;
}): AutoflowDecision {
  const { boxes, activeBox, boxZeroEnabled, canDownloadMore, flushThreshold } =
    params;
  const count = (box: keyof BoxesState) => boxes[box]?.length ?? 0;
  const baseBox: keyof BoxesState = "boxOne";
  const lowerBufferCount = getLowerBufferCount(boxes, boxZeroEnabled);
  const lowerBufferTarget = getPreferredLowerBufferTarget(boxes, boxZeroEnabled);
  const cleanupExitThreshold = Math.ceil(flushThreshold / 2);
  const highestCloggedCleanupBox = getHighestCloggedCleanupBox(
    boxes,
    flushThreshold
  );
  const activeCleanupCount =
    activeBox && CLEANUP_BOXES.includes(activeBox) ? count(activeBox) : 0;

  if (lowerBufferCount >= CRITICAL_LOWER_BUFFER_MIN) {
    return { targetBox: lowerBufferTarget, shouldDownloadNew: false };
  }

  if (
    activeBox &&
    CLEANUP_BOXES.includes(activeBox) &&
    activeCleanupCount >= cleanupExitThreshold
  ) {
    return { targetBox: activeBox, shouldDownloadNew: false };
  }

  // Prioritize the highest clogged cleanup box so the tail of the pipeline is
  // drained before earlier boxes keep pushing more cards forward.
  if (highestCloggedCleanupBox) {
    return { targetBox: highestCloggedCleanupBox, shouldDownloadNew: false };
  }

  // Lower buffer above the healthy range should be drained before downloading.
  if (lowerBufferCount > BASE_STACK_TARGET) {
    return { targetBox: lowerBufferTarget, shouldDownloadNew: false };
  }

  // Nothing urgent above -> consider pulling a new batch.
  const shouldDownloadNew =
    canDownloadMore && lowerBufferCount <= BASE_STACK_TARGET;

  if (boxZeroEnabled && count("boxZero") > 0) {
    return { targetBox: "boxZero", shouldDownloadNew: false };
  }

  if (count(baseBox) > 0) {
    return { targetBox: baseBox, shouldDownloadNew };
  }

  if (activeBox && count(activeBox) > 0) {
    return { targetBox: activeBox, shouldDownloadNew: false };
  }

  return { targetBox: baseBox, shouldDownloadNew };
}

export function useFlashcardsAutoflow({
  enabled,
  boxes,
  activeBox,
  handleSelectBox,
  canSwitch,
  boxZeroEnabled,
  isReady,
  downloadMore,
  introBoxLimitReached,
  totalFlashcardsInCourse,
}: AutoflowParams) {
  const switchLockedUntil = useRef(0);
  const fetchInFlight = useRef(false);

  const flushThreshold = resolveAutoflowFlushThreshold(totalFlashcardsInCourse);

  useEffect(() => {
    if (!enabled) return;
    const now = Date.now();
    const canDownloadMore =
      isReady && !introBoxLimitReached && !fetchInFlight.current;

    const decision = pickAutoflowDecision({
      boxes,
      activeBox,
      boxZeroEnabled,
      canDownloadMore,
      flushThreshold,
    });

    if (decision.shouldDownloadNew && canDownloadMore) {
      fetchInFlight.current = true;
      void downloadMore().finally(() => {
        fetchInFlight.current = false;
      });
    }

    const count = (box: keyof BoxesState) => boxes[box]?.length ?? 0;
    const resolveTargetBox = (): keyof BoxesState | null => {
      // Keep the preferred target if it actually has cards.
      if (decision.targetBox && count(decision.targetBox) > 0) {
        return decision.targetBox;
      }

      // If we're already on a box with cards, don't jump to an empty one.
      if (activeBox && count(activeBox) > 0) {
        return activeBox;
      }

      // Otherwise pick the first non-empty box in priority order.
      const fallbackOrder: (keyof BoxesState)[] = [
        ...(boxZeroEnabled ? (["boxZero"] as const) : []),
        "boxOne",
        ...CLEANUP_BOXES,
      ];

      return fallbackOrder.find((box) => count(box) > 0) ?? null;
    };

    const targetBox = resolveTargetBox();

    if (!canSwitch) return;
    if (now < switchLockedUntil.current) return;
    if (!targetBox) return;
    if (targetBox === activeBox) return;

    handleSelectBox(targetBox);
    switchLockedUntil.current = now + SWITCH_STICKY_MS;
  }, [
    activeBox,
    boxes,
    boxZeroEnabled,
    canSwitch,
    downloadMore,
    enabled,
    handleSelectBox,
    introBoxLimitReached,
    isReady,
    flushThreshold,
    totalFlashcardsInCourse,
  ]);
}
