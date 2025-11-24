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

  // If Box 1 is light, check whether any higher box is "ripe" for a cleanup session.
  const flushCandidate = CLEANUP_BOXES.find(
    (box) => count(box) >= flushThreshold
  );
  if (flushCandidate) {
    return { targetBox: flushCandidate, shouldDownloadNew: false };
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
