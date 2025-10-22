import type { BoxesState } from "@/src/types/boxes";
import { useEffect, useRef } from "react";
import { boxOrder } from "./useBoxesPersistenceSnapshot";

type AutoflowParams = {
  enabled: boolean;
  boxes: BoxesState;
  activeBox: keyof BoxesState | null;
  handleSelectBox: (box: keyof BoxesState) => void;
  canSwitch: boolean;
  boxZeroEnabled: boolean;
  downloadMore: () => Promise<void>;
  introBoxLimitReached: boolean;
};

const SWITCH_STICKY_MS = 1500;

const priorityOrder = [...boxOrder].reverse();

function pickPriorityBox(
  boxes: BoxesState,
  boxZeroEnabled: boolean
): keyof BoxesState | null {
  for (const candidate of priorityOrder) {
    if (!boxZeroEnabled && candidate === "boxZero") {
      continue;
    }
    if ((boxes[candidate] ?? []).length >= 10) {
      return candidate;
    }
  }
  return null;
}

export function useFlashcardsAutoflow({
  enabled,
  boxes,
  activeBox,
  handleSelectBox,
  canSwitch,
  boxZeroEnabled,
  downloadMore,
  introBoxLimitReached,
}: AutoflowParams) {
  const switchLockedUntil = useRef(0);
  const fetchInFlight = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (!canSwitch) return;
    const now = Date.now();
    if (now < switchLockedUntil.current) return;

    const candidate = pickPriorityBox(boxes, boxZeroEnabled);
    if (!candidate) return;
    if (candidate === activeBox) return;

    handleSelectBox(candidate);
    switchLockedUntil.current = now + SWITCH_STICKY_MS;
  }, [enabled, canSwitch, boxes, boxZeroEnabled, activeBox, handleSelectBox]);

  useEffect(() => {
    console.log("=== Checking if need to download more ===");
    console.log("enabled:", enabled);
    if (!enabled) return;
    console.log("introBoxLimitReached:", introBoxLimitReached);
    if (introBoxLimitReached) return;
    console.log("fetchInFlight:", fetchInFlight.current);
    if (fetchInFlight.current) return;

    // Pobierz aktualny stan pudełek bezpośrednio przed sprawdzeniem
    const boxZeroCount = boxes.boxZero.length;
    const boxOneCount = boxes.boxOne.length;
    console.log("Current counts - boxZero:", boxZeroCount, "boxOne:", boxOneCount);
    
    // Sprawdź, czy pudełko ma mniej niż 6 kart
    const targetBox = boxZeroEnabled ? boxes.boxZero : boxes.boxOne;
    const targetBoxCount = targetBox.length;
    
    console.log("Target box count:", targetBoxCount);
    
    if (targetBoxCount > 5) {
      console.log("No need to download more cards - target box has enough cards");
      return;
    }

    console.log("=== Downloading more cards ===");
    fetchInFlight.current = true;
    void downloadMore().finally(() => {
      console.log("Download completed");
      fetchInFlight.current = false;
    });
  }, [boxes, boxZeroEnabled, downloadMore, enabled, introBoxLimitReached]);
}
