import { act, renderHook } from "@testing-library/react-native";
import { Animated, Keyboard, type KeyboardEvent, type LayoutChangeEvent } from "react-native";
import { useFlashcardsStudyLayout } from "../useFlashcardsStudyLayout";
import { useFlashcardsStudyCoordinator } from "../useFlashcardsStudyCoordinator";
import { useKeyboardBottomOffset } from "@/src/hooks/useKeyboardBottomOffset";

jest.mock("@/src/hooks/useKeyboardBottomOffset", () => ({ useKeyboardBottomOffset: jest.fn() }));
jest.mock("@/src/services/debugEvents", () => ({ appendDebugEvent: jest.fn() }));

function layout(height: number): LayoutChangeEvent {
  return { nativeEvent: { layout: { height, width: 375, x: 0, y: 0 } } } as LayoutChangeEvent;
}

function renderStudy() {
  return renderHook(({ eligible }: { eligible: boolean }) => {
    const studyLayout = useFlashcardsStudyLayout({
      isTabletLayout: false, boxesLayout: "classic", areButtonsOnTop: false,
    });
    return useFlashcardsStudyCoordinator({
      studyLayout,
      isTabletLayout: false,
      boxesLayout: "classic",
      areButtonsOnTop: false,
      shouldShowBoxes: true,
      selectedItemId: 1,
      showCardActions: true,
      shouldShowTrueFalseActions: false,
      inlineCardActionEligible: eligible,
      shouldAnimateScreenLayout: true,
      isFocused: true,
      debugScreen: "flashcards",
      courseId: 1,
      displayResult: null,
      activeBox: "boxOne",
      correction: null,
      previousKeyboardVisibleRef: { current: null },
    });
  }, { initialProps: { eligible: true } });
}

function measure(result: ReturnType<typeof renderStudy>["result"], height: number) {
  act(() => {
    result.current.studyLayout.onStudyLayout(layout(height));
    result.current.studyLayout.onCardSectionLayout(layout(250));
    result.current.boxesLayoutProps.onBoxesContentLayout(layout(330));
    result.current.studyLayout.onBottomButtonsLayout(layout(50));
  });
  act(() => jest.advanceTimersByTime(80));
}

describe("shared study coordination", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (useKeyboardBottomOffset as jest.Mock).mockReturnValue({
      keyboardVisible: false, bottomOffset: new Animated.Value(0),
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("keeps compact requirements and row geometry when actions move into and out of the card", () => {
    jest.spyOn(Keyboard, "isVisible").mockReturnValue(true);
    const { result, rerender, unmount } = renderStudy();
    measure(result, 380);
    const requirement = result.current.studyLayout.minimumFullStudyHeight;
    expect(result.current.useInlineCardAction).toBe(true);
    expect(result.current.dock.bottomButtonsReservedSpace).toBe(0);
    expect(result.current.boxesLayoutProps).toMatchObject({
      horizontalRowHeight: 80, boxesScale: 1, boxesScaledHeight: 80,
      boxesScaleOffsetY: 0, boxesNeedScrollFallback: false,
    });
    act(() => result.current.studyLayout.onCardSectionLayout(layout(195)));
    act(() => jest.advanceTimersByTime(80));
    expect(result.current.studyLayout.minimumFullStudyHeight).toBe(requirement);
    for (const eligible of [false, true, false]) {
      rerender({ eligible });
      expect(result.current.useInlineCardAction).toBe(eligible);
      expect(result.current.dock.shouldRenderBottomButtons).toBe(!eligible);
      expect(result.current.studyLayout.isCompactStudyLayout).toBe(true);
      expect(result.current.studyLayout.minimumFullStudyHeight).toBe(requirement);
      expect(result.current.boxesLayoutProps.horizontalRowHeight).toBe(80);
    }
    unmount();
  });

  it("preserves normal single-row geometry across keyboard resizing and restores the dock", () => {
    const listeners = new Map<string, ((event: KeyboardEvent) => void)[]>();
    jest.spyOn(Keyboard, "isVisible").mockReturnValue(false);
    const subscribe = Keyboard.addListener.bind(Keyboard);
    jest.spyOn(Keyboard, "addListener").mockImplementation((name, listener) => {
      listeners.set(name, [...(listeners.get(name) ?? []), listener]);
      return subscribe(name, listener);
    });
    const emit = (name: string) => act(() => {
      listeners.get(name)?.forEach(listener => listener({} as KeyboardEvent));
    });
    const { result, unmount } = renderStudy();
    measure(result, 480);
    const rowHeight = result.current.boxesLayoutProps.horizontalRowHeight;
    expect(rowHeight).toBeDefined();
    expect(result.current.studyLayout.isCompactStudyLayout).toBe(false);
    expect(result.current.dock.shouldRenderBottomButtons).toBe(true);
    emit("keyboardDidShow");
    expect(result.current.useInlineCardAction).toBe(true);
    for (const height of [350, 300, 280]) {
      act(() => result.current.studyLayout.onStudyLayout(layout(height)));
      expect(result.current.boxesLayoutProps.horizontalRowHeight).toBe(rowHeight);
      expect(result.current.studyLayout.isCompactStudyLayout).toBe(false);
      expect(result.current.studyScrollEnabled).toBe(true);
    }
    act(() => result.current.studyLayout.onStudyLayout(layout(480)));
    emit("keyboardDidHide");
    expect(result.current.useInlineCardAction).toBe(false);
    expect(result.current.dock.shouldRenderBottomButtons).toBe(true);
    expect(result.current.boxesLayoutProps.horizontalRowHeight).toBe(rowHeight);
    unmount();
  });
});
