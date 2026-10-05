import { renderHook } from "@testing-library/react-native";
import { Animated } from "react-native";
import { useKeyboardBottomOffset } from "@/src/hooks/useKeyboardBottomOffset";
import { useFlashcardsBottomDockLayout } from "../useFlashcardsBottomDockLayout";

jest.mock("@/src/hooks/useKeyboardBottomOffset", () => ({
  useKeyboardBottomOffset: jest.fn(),
}));
jest.mock("@/src/services/debugEvents", () => ({ appendDebugEvent: jest.fn() }));

const params = {
  areButtonsOnTop: false,
  shouldShowBoxes: true,
  selectedItemId: 1,
  showCardActions: true,
  shouldShowTrueFalseActions: false,
  isSmallPhoneLayout: true,
  isFocused: false,
  debugScreen: "flashcards" as const,
  courseId: 1,
  displayResult: null,
  activeBox: "boxOne" as const,
  correction: null,
  previousKeyboardVisibleRef: { current: null },
};

function offsetValue(offset: Animated.Value) {
  return (offset as unknown as { __getValue: () => number }).__getValue();
}

describe("useFlashcardsBottomDockLayout inline-action transitions", () => {
  const raisedOffset = new Animated.Value(230);
  beforeEach(() => {
    jest.clearAllMocks();
    (useKeyboardBottomOffset as jest.Mock).mockReturnValue({
      keyboardVisible: true,
      bottomOffset: raisedOffset,
    });
  });

  it("keeps the dock at zero through hiding and restoring inline actions", () => {
    const { result, rerender } = renderHook<ReturnType<typeof useFlashcardsBottomDockLayout>, { hideActions: boolean }>(
      ({ hideActions }) => useFlashcardsBottomDockLayout({
        ...params, keepActionsAtBottom: true, hideActions,
      }),
      { initialProps: { hideActions: true } },
    );
    expect(useKeyboardBottomOffset).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
    expect(result.current.shouldRenderBottomButtons).toBe(false);
    expect(offsetValue(result.current.bottomButtonsOffset)).toBe(0);
    rerender({ hideActions: false });
    expect(result.current.shouldRenderBottomButtons).toBe(true);
    expect(offsetValue(result.current.bottomButtonsOffset)).toBe(0);
    expect(result.current.bottomButtonsOffset).not.toBe(raisedOffset);
  });

  it("retains keyboard lifting for ordinary docks", () => {
    const { result } = renderHook(() => useFlashcardsBottomDockLayout(params));
    expect(useKeyboardBottomOffset).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
    expect(result.current.bottomButtonsOffset).toBe(raisedOffset);
  });
});
