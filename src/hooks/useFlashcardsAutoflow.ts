import type { BoxesState } from "@/src/types/boxes";
import { useEffect, useRef } from "react";

type AutoflowParams = {
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

const SWITCH_STICKY_MS = 1500;
const BASE_STACK_TARGET = 5;
const FLUSH_THRESHOLD_DEFAULT = 15;
const FLUSH_THRESHOLD_MIN = 3;
const FLUSH_THRESHOLD_MAX = 15;
const FLUSH_THRESHOLD_RATIO = 0.1;
const CLEANUP_BOXES: Array<keyof BoxesState> = [
  "boxTwo",
  "boxThree",
  "boxFour",
  "boxFive",
];

type AutoflowDecision = {
  targetBox: keyof BoxesState | null;
  shouldDownloadNew: boolean;
};

function pickAutoflowDecision(params: {
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
  const introBox: keyof BoxesState = "boxZero";
  const downloadTarget: keyof BoxesState = boxZeroEnabled ? introBox : baseBox;

  const boxZeroCount = count(introBox);

  // Intro box has absolute priority when enabled and non-empty.
  if (boxZeroEnabled) {
    if (activeBox === introBox && boxZeroCount > 0) {
      return { targetBox: introBox, shouldDownloadNew: false };
    }
    if (boxZeroCount > 0) {
      return { targetBox: introBox, shouldDownloadNew: false };
    }
  }

  // When inside a cleanup session (boxes 2-5), stay there until empty.
  if (activeBox && CLEANUP_BOXES.includes(activeBox)) {
    if (count(activeBox) > 0) {
      return { targetBox: activeBox, shouldDownloadNew: false };
    }
    return { targetBox: baseBox, shouldDownloadNew: false };
  }

  // Box 1 acts as the engine: keep trimming it to BASE_STACK_TARGET.
  const baseCount = count(baseBox);
  if (baseCount > BASE_STACK_TARGET) {
    return { targetBox: baseBox, shouldDownloadNew: false };
  }

  // Backpressure Logic:
  // 1. If Box 2 is NOT full, we must fill it. Priority is Box 1 (and downloading).
  //    We do NOT jump to Box 3, 4, or 5 even if they are full.
  const boxTwo = CLEANUP_BOXES[0];
  if (count(boxTwo) < flushThreshold) {
    // Box 2 isn't full yet -> keep feeding it from Box 1.
    // Fall through to download logic below.
  } else {
    // 2. Box 2 IS full. We need to unclog the system.
    //    Find the highest "blocked" box in the chain [2, 3, 4, 5].
    //    A box is a candidate if it is full.
    //    But if the *next* box is ALSO full, we skip the current one (it's blocked).
    //    We want the highest full box that has room above it (or is the last box).
    for (let i = 0; i < CLEANUP_BOXES.length; i++) {
      const currentBox = CLEANUP_BOXES[i];
      const nextBox = CLEANUP_BOXES[i + 1]; // undefined if i is last

      const currentIsFull = count(currentBox) >= flushThreshold;
      const nextIsFull = nextBox ? count(nextBox) >= flushThreshold : false;

      if (currentIsFull) {
        if (nextIsFull) {
          // Current is full, but Next is also full.
          // We can't move cards from Current to Next effectively (Next is clogged).
          // Skip this one and look higher to unclog Next first.
          continue;
        } else {
          // Current is full, and Next is NOT full (or doesn't exist).
          // This is the bottleneck we should clear.
          return { targetBox: currentBox, shouldDownloadNew: false };
        }
      } else {
        // If we hit a non-full box in the chain while searching up,
        // it means the chain is broken.
        // Actually, since we only enter this 'else' block if Box 2 is full,
        // and we iterate up...
        // If Box 2 is full, Box 3 is empty...
        // i=0: Box 2 full, Box 3 not full -> Return Box 2. Correct.
        break;
      }
    }
  }

  // Nothing urgent above, Box 1 is light -> consider pulling a new batch.
  const downloadCount = count(downloadTarget);
  const shouldDownloadNew = canDownloadMore && downloadCount <= BASE_STACK_TARGET;

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

  const flushThreshold = Math.min(
    FLUSH_THRESHOLD_MAX,
    Math.max(
      FLUSH_THRESHOLD_MIN,
      totalFlashcardsInCourse && totalFlashcardsInCourse > 0
        ? Math.ceil(totalFlashcardsInCourse * FLUSH_THRESHOLD_RATIO)
        : FLUSH_THRESHOLD_DEFAULT
    )
  );

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

    if (!canSwitch) return;
    if (now < switchLockedUntil.current) return;
    if (!decision.targetBox) return;
    if (decision.targetBox === activeBox) return;

    handleSelectBox(decision.targetBox);
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
