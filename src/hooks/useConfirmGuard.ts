import { useCallback, useEffect, useRef } from "react";
import { ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS } from "@/src/screens/flashcards/FlashcardsScreen/model/FlashcardsScreen.constants";

export const CONFIRM_GUARD_MS = 2000;

/**
 * Blocks stale confirmation taps while a card changes or enters correction
 * mode.
 */
export function useConfirmGuard(
  selectedItemId: number | null,
  correctionActive: boolean,
  debugLabel = "ConfirmGuard",
) {
  const blockedUntilRef = useRef(0);
  const previousSelectedItemIdRef = useRef<number | null | undefined>(
    undefined,
  );
  const previousCorrectionActiveRef = useRef<boolean | undefined>(undefined);

  const restartGuard = useCallback(() => {
    blockedUntilRef.current = Date.now() + CONFIRM_GUARD_MS;
    if (__DEV__ && ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS) {
      console.log(`[${debugLabel}] blocked after state change`, {
        cardId: selectedItemId,
        durationMs: CONFIRM_GUARD_MS,
        correctionActive,
      });
    }
  }, [correctionActive, debugLabel, selectedItemId]);

  useEffect(() => {
    const previousSelectedItemId = previousSelectedItemIdRef.current;
    if (previousSelectedItemId === selectedItemId) return;
    previousSelectedItemIdRef.current = selectedItemId;
    if (previousSelectedItemId != null && selectedItemId != null) {
      restartGuard();
    }
  }, [restartGuard, selectedItemId]);

  useEffect(() => {
    const wasCorrectionActive = previousCorrectionActiveRef.current;
    previousCorrectionActiveRef.current = correctionActive;
    if (correctionActive && wasCorrectionActive !== true) {
      restartGuard();
    }
  }, [correctionActive, restartGuard]);

  return useCallback(() => {
    const allowed = Date.now() >= blockedUntilRef.current;
    if (!allowed && __DEV__ && ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS) {
      console.log(`[${debugLabel}] blocked: cooldown active`, {
        cardId: selectedItemId,
        remainingMs: Math.max(0, blockedUntilRef.current - Date.now()),
      });
    }
    return allowed;
  }, [debugLabel, selectedItemId]);
}
