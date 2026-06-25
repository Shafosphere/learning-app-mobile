import { appendDebugEvent } from "@/src/services/debugEvents";
import type { BoxesState } from "@/src/types/boxes";
import { useKeyboardBottomOffset } from "@/src/hooks/useKeyboardBottomOffset";
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, View } from "react-native";
import {
  BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET,
  BOTTOM_BUTTONS_KEYBOARD_DURATION_MS,
  BOTTOM_BUTTONS_MIN_HEIGHT,
  COMPACT_BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET,
  ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS,
} from "../model/FlashcardsScreen.constants";

type KeyboardDebugCorrectionState = {
  cardId?: number;
  mode?: string | null;
};

type UseFlashcardsBottomDockLayoutParams = {
  areButtonsOnTop: boolean;
  shouldShowBoxes: boolean;
  selectedItemId: number | null;
  showCardActions: boolean;
  shouldShowTrueFalseActions: boolean;
  isSmallPhoneLayout: boolean;
  isFocused: boolean;
  debugScreen: "flashcards" | "review";
  debugCategory?: "flashcards" | "review";
  courseId: number | null;
  storageKey?: string | null;
  displayResult: boolean | null;
  activeBox: keyof BoxesState | null;
  correction: KeyboardDebugCorrectionState | null;
  previousKeyboardVisibleRef: React.MutableRefObject<boolean | null>;
};

export function useFlashcardsBottomDockLayout({
  areButtonsOnTop,
  shouldShowBoxes,
  selectedItemId,
  showCardActions,
  shouldShowTrueFalseActions,
  isSmallPhoneLayout,
  isFocused,
  debugScreen,
  debugCategory = debugScreen,
  courseId,
  storageKey,
  displayResult,
  activeBox,
  correction,
  previousKeyboardVisibleRef,
}: UseFlashcardsBottomDockLayoutParams) {
  const bottomButtonsAnchorRef = useRef<View | null>(null);
  const [bottomButtonsHeight, setBottomButtonsHeight] = useState(0);
  const [bottomButtonsBottomInWindow, setBottomButtonsBottomInWindow] =
    useState<number | null>(null);

  const measureBottomButtons = useCallback(() => {
    requestAnimationFrame(() => {
      bottomButtonsAnchorRef.current?.measureInWindow((_x, y, _w, h) => {
        if (h <= 0) return;
        const nextBottom = y + h;
        setBottomButtonsBottomInWindow((prev) => {
          if (prev !== null && Math.abs(prev - nextBottom) < 1) return prev;
          return nextBottom;
        });
      });
    });
  }, []);

  const { keyboardVisible, bottomOffset: bottomButtonsOffset } =
    useKeyboardBottomOffset({
      enabled: !areButtonsOnTop,
      gap: 8,
      targetBottomInWindow: bottomButtonsBottomInWindow,
      keyboardTopCorrection: 44,
      androidDurationMs: BOTTOM_BUTTONS_KEYBOARD_DURATION_MS,
    });

  useEffect(() => {
    if (!isFocused) return;
    if (previousKeyboardVisibleRef.current === keyboardVisible) return;
    previousKeyboardVisibleRef.current = keyboardVisible;

    const payload = {
      screen: debugScreen,
      courseId,
      storageKey: storageKey ?? null,
      keyboardVisible,
      selectedItemId,
      result: displayResult,
      activeBox,
      correctionActive: correction != null,
      correctionCardId: correction?.cardId ?? null,
      correctionMode: correction?.mode ?? null,
    };

    if (ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS) {
      console.log("[keyboard-debug] screen.keyboard.visibility", payload);
    }
    void appendDebugEvent(debugCategory, "keyboard.visibility", payload);
  }, [
    activeBox,
    correction,
    courseId,
    debugCategory,
    debugScreen,
    displayResult,
    isFocused,
    keyboardVisible,
    previousKeyboardVisibleRef,
    selectedItemId,
    storageKey,
  ]);

  useEffect(() => {
    if (!isFocused) return;

    const eventNames = [
      "keyboardWillShow",
      "keyboardDidShow",
      "keyboardWillHide",
      "keyboardDidHide",
    ] as const;
    const subscriptions = eventNames.map((keyboardEventName) =>
      Keyboard.addListener(keyboardEventName, (event) => {
        const payload = {
          screen: debugScreen,
          courseId,
          storageKey: storageKey ?? null,
          selectedItemId,
          result: displayResult,
          activeBox,
          correctionActive: correction != null,
          correctionCardId: correction?.cardId ?? null,
          correctionMode: correction?.mode ?? null,
          duration: event.duration,
          easing: event.easing,
          startCoordinates: event.startCoordinates,
          endCoordinates: event.endCoordinates,
        };

        if (ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS) {
          console.log(
            `[keyboard-debug] screen.${keyboardEventName}`,
            payload,
          );
        }
        void appendDebugEvent(
          debugCategory,
          `keyboard.raw.${keyboardEventName}`,
          payload,
        );
      }),
    );

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [
    activeBox,
    correction,
    courseId,
    debugCategory,
    debugScreen,
    displayResult,
    isFocused,
    selectedItemId,
    storageKey,
  ]);

  useEffect(() => {
    if (areButtonsOnTop || !shouldShowBoxes) return;
    measureBottomButtons();
  }, [
    areButtonsOnTop,
    measureBottomButtons,
    selectedItemId,
    shouldShowBoxes,
    showCardActions,
    shouldShowTrueFalseActions,
  ]);

  useEffect(() => {
    if (areButtonsOnTop || !shouldShowBoxes || !keyboardVisible) return;
    const timers = [0, 120, 280, 520].map((delay) =>
      setTimeout(() => {
        measureBottomButtons();
      }, delay),
    );
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [
    areButtonsOnTop,
    keyboardVisible,
    measureBottomButtons,
    selectedItemId,
    shouldShowBoxes,
  ]);

  const shouldRenderBottomButtons = !areButtonsOnTop && shouldShowBoxes;
  const shouldReserveBottomButtonsSpace = shouldRenderBottomButtons;
  const bottomButtonsDockBottomOffset = isSmallPhoneLayout
    ? COMPACT_BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET
    : BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET;
  const bottomButtonsReservedSpace = shouldRenderBottomButtons
    ? Math.max(bottomButtonsHeight, BOTTOM_BUTTONS_MIN_HEIGHT) +
      bottomButtonsDockBottomOffset
    : 0;

  return {
    bottomButtonsAnchorRef,
    bottomButtonsHeight,
    setBottomButtonsHeight,
    measureBottomButtons,
    keyboardVisible,
    bottomButtonsOffset,
    shouldRenderBottomButtons,
    shouldReserveBottomButtonsSpace,
    bottomButtonsDockBottomOffset,
    bottomButtonsReservedSpace,
  };
}
