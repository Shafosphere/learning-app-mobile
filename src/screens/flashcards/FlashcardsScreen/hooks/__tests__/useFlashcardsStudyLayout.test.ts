import { act, renderHook } from "@testing-library/react-native";
import { Keyboard, type KeyboardEvent, type LayoutChangeEvent } from "react-native";
import { useFlashcardsStudyLayout } from "../useFlashcardsStudyLayout";
import { createElement, type PropsWithChildren } from "react";
import { createNavbarLayoutTransition, NavbarLayoutTransitionContext } from "@/src/contexts/NavbarLayoutContext";

function layout(height: number): LayoutChangeEvent {
  return { nativeEvent: { layout: { height, width: 375, x: 0, y: 0 } } } as LayoutChangeEvent;
}

function renderLayout(overrides: Partial<Parameters<typeof useFlashcardsStudyLayout>[0]> = {}) {
  return renderHook(() => useFlashcardsStudyLayout({
    isTabletLayout: false,
    boxesLayout: "classic",
    areButtonsOnTop: false,
    ...overrides,
  }));
}

function measureFullLayout(result: ReturnType<typeof renderLayout>["result"], availableHeight: number) {
  act(() => {
    result.current.onStudyLayout(layout(availableHeight));
    result.current.onCardSectionLayout(layout(250));
    result.current.onBoxesNaturalLayout(layout(330));
    result.current.onBottomButtonsLayout(layout(50));
  });
  act(() => jest.advanceTimersByTime(80));
}

describe("useFlashcardsStudyLayout", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });
  it("starts with the full layout until measurements are available", () => {
    const { result } = renderLayout();
    act(() => result.current.onStudyLayout(layout(400)));
    expect(result.current.hasMeasurements).toBe(false);
    expect(result.current.isCompactStudyLayout).toBe(false);
  });

  it("buffers navbar animation measurements and commits only the final height", () => {
    const transition = createNavbarLayoutTransition();
    const { result } = renderHook(() => useFlashcardsStudyLayout({
      isTabletLayout: false, boxesLayout: "classic", areButtonsOnTop: false,
    }), {
      wrapper: ({ children }: PropsWithChildren) => createElement(
        NavbarLayoutTransitionContext.Provider, { value: transition }, children,
      ),
    });
    measureFullLayout(result, 600);
    transition.start();
    for (const height of [610, 620, 650]) {
      act(() => result.current.onStudyLayout(layout(height)));
      expect(result.current.availableStudyHeight).toBe(600);
    }
    act(() => transition.finish());
    expect(result.current.availableStudyHeight).toBe(650);

    transition.start();
    act(() => result.current.onStudyLayout({ nativeEvent: { layout: { width: 411, height: 500 } } } as LayoutChangeEvent));
    expect(result.current.availableStudyHeight).toBe(500);
    act(() => transition.finish());
  });

  it("keeps the full layout on a narrow phone with enough study space", () => {
    const { result } = renderLayout();
    measureFullLayout(result, 600);
    expect(result.current.hasMeasurements).toBe(true);
    expect(result.current.isCompactStudyLayout).toBe(false);
  });

  it("keeps scaled 3+2 boxes before using one row", () => {
    const { result } = renderLayout();
    // 600dp is below the 704dp unscaled requirement, but above the 588dp
    // scaled-grid requirement. Scaling must retain both rows.
    act(() => {
      result.current.onStudyLayout(layout(600));
      result.current.onCardSectionLayout(layout(250));
      result.current.onBoxesNaturalLayout(layout(330));
      result.current.onBottomButtonsLayout(layout(50));
    });
    act(() => jest.advanceTimersByTime(80));
    expect(result.current.horizontalRowHeight).toBeUndefined();
    expect(result.current.isCompactStudyLayout).toBe(false);
  });

  it("recovers dock space to keep a large-image grid when the usual spacing does not fit", () => {
    const { result } = renderLayout();
    act(() => {
      result.current.onStudyLayout({ nativeEvent: { layout: { width: 411.4286, height: 700, x: 0, y: 0 } } } as LayoutChangeEvent);
      result.current.onCardSectionLayout(layout(381));
      result.current.onBottomButtonsLayout(layout(50));
    });
    act(() => jest.advanceTimersByTime(80));
    expect(result.current.minimumGridStudyHeight).toBeGreaterThan(700);
    expect(result.current.tightGridStudyHeight).toBeLessThan(700);
    expect(result.current.horizontalRowHeight).toBeUndefined();
    expect(result.current.isCompactStudyLayout).toBe(false);
    expect(result.current.bottomDockOffset).toBe(39);
  });

  it("returns from one row to the scaled grid as soon as content fits", () => {
    const { result } = renderLayout();
    measureFullLayout(result, 480);
    expect(result.current.horizontalRowHeight).toBeDefined();
    act(() => result.current.onStudyLayout(layout(560)));
    expect(result.current.horizontalRowHeight).toBeUndefined();
    expect(result.current.isCompactStudyLayout).toBe(false);
  });

  it("does not oscillate after compact removes the hint and reduces dock spacing", () => {
    const { result } = renderLayout();
    measureFullLayout(result, 380);
    expect(result.current.isCompactStudyLayout).toBe(true);
    const minimumFullHeight = result.current.minimumFullStudyHeight;
    act(() => result.current.onCardSectionLayout(layout(195)));
    act(() => jest.advanceTimersByTime(80));
    expect(result.current.minimumFullStudyHeight).toBe(minimumFullHeight);
    expect(result.current.isCompactStudyLayout).toBe(true);

    act(() => result.current.onStudyLayout(layout(620)));
    expect(result.current.isCompactStudyLayout).toBe(false);
    act(() => result.current.onCardSectionLayout(layout(250)));
    act(() => jest.advanceTimersByTime(80));
    expect(result.current.isCompactStudyLayout).toBe(false);
  });

  it("preserves compact requirements when inline actions replace the dock", () => {
    const keyboard = jest.spyOn(Keyboard, "isVisible").mockReturnValue(true);
    try {
      const { result } = renderLayout();
      measureFullLayout(result, 380);
      const fullHeight = result.current.fullCardSectionHeight;
      const requirement = result.current.minimumFullStudyHeight;
      act(() => result.current.setActionsHidden(true));
      act(() => result.current.onCardSectionLayout(layout(200)));
      act(() => jest.advanceTimersByTime(80));
      expect(result.current.isCompactStudyLayout).toBe(true);
      expect(result.current.fullCardSectionHeight).toBe(fullHeight);
      expect(result.current.minimumFullStudyHeight).toBe(requirement);
      expect(result.current.visibleCardHeight).toBe(200);
      act(() => result.current.setActionsHidden(false));
      act(() => jest.advanceTimersByTime(80));
      expect(result.current.fullCardSectionHeight).toBe(255);
    } finally {
      keyboard.mockRestore();
    }
  });

  it("includes measured top controls instead of reserving a bottom dock", () => {
    const { result } = renderLayout({ areButtonsOnTop: true });
    act(() => result.current.onTopButtonsLayout(layout(64)));
    measureFullLayout(result, 420);
    expect(result.current.isCompactStudyLayout).toBe(false);
    act(() => result.current.onTopButtonsLayout(layout(100)));
    expect(result.current.isCompactStudyLayout).toBe(true);
  });

  it("keeps single-row boxes stable when keyboard actions move inline but the hint still fits", () => {
    const { result } = renderLayout();
    measureFullLayout(result, 480);
    expect(result.current.isCompactStudyLayout).toBe(false);
    expect(result.current.horizontalRowHeight).toBeDefined();
    const rowHeight = result.current.horizontalRowHeight;
    const gap = result.current.cardBottomGap;
    act(() => result.current.setActionsHidden(true));
    expect(result.current.horizontalRowHeight).toBe(rowHeight);
    expect(result.current.cardBottomGap).toBe(gap);
    act(() => result.current.setActionsHidden(false));
    expect(result.current.horizontalRowHeight).toBe(rowHeight);
  });

  it("keeps normal carousel capacity after rendering compact carousel geometry", () => {
    const { result } = renderLayout({ boxesLayout: "carousel", areButtonsOnTop: true });
    act(() => result.current.onTopButtonsLayout(layout(50)));
    measureFullLayout(result, 360);
    expect(result.current.isCompactStudyLayout).toBe(true);
    const minimumFullHeight = result.current.minimumFullStudyHeight;
    act(() => {
      result.current.onBoxesNaturalLayout(layout(209));
      result.current.onCardSectionLayout(layout(195));
    });
    act(() => jest.advanceTimersByTime(80));
    expect(result.current.minimumFullStudyHeight).toBe(minimumFullHeight);
    expect(result.current.isCompactStudyLayout).toBe(true);
  });

  it("preserves the tablet layout in a short window", () => {
    const { result } = renderLayout({ isTabletLayout: true });
    measureFullLayout(result, 400);
    expect(result.current.isCompactStudyLayout).toBe(false);
  });

  it("can choose compact on initial measurements despite keyboard autofocus", () => {
    const isVisible = jest.spyOn(Keyboard, "isVisible").mockReturnValue(true);
    try {
      const { result, unmount } = renderLayout();
      measureFullLayout(result, 300);
      expect(result.current.keyboardVisible).toBe(true);
      expect(result.current.isCompactStudyLayout).toBe(true);
      unmount();
    } finally {
      isVisible.mockRestore();
    }
  });

  it("handles the reported 360x640 bird card without waiting for boxes measurements", () => {
    const isVisible = jest.spyOn(Keyboard, "isVisible").mockReturnValue(true);
    try {
      const { result, unmount } = renderLayout();
      act(() => {
        result.current.onStudyLayout({
          nativeEvent: { layout: { width: 360, height: 473, x: 0, y: 0 } },
        } as LayoutChangeEvent);
        result.current.onCardSectionLayout(layout(381));
        result.current.onBottomButtonsLayout(layout(50));
      });
      act(() => jest.advanceTimersByTime(80));

      expect(result.current.hasMeasurements).toBe(true);
      expect(result.current.isCompactStudyLayout).toBe(true);
      expect(result.current.classicBoxesNaturalHeight).toBe(326);
      expect(result.current.horizontalRowHeight).toBe(80);
      expect(result.current.needsStudyScroll).toBe(false);

      expect(result.current.fullCardSectionHeight).toBe(381);
      act(() => result.current.onCardSectionLayout(layout(326)));
      act(() => jest.advanceTimersByTime(80));
      expect(result.current.fullCardSectionHeight).toBe(381);
      expect(result.current.horizontalRowHeight).toBe(80);
      expect(result.current.needsStudyScroll).toBe(false);
      expect(result.current.isCompactStudyLayout).toBe(true);
      unmount();
    } finally {
      isVisible.mockRestore();
    }
  });

  it("keeps the hint with the exact Redmi bird measurements using one row", () => {
    const { result } = renderLayout();
    act(() => {
      result.current.onStudyLayout({ nativeEvent: { layout: { width: 375.3846, height: 628.923, x: 0, y: 0 } } } as LayoutChangeEvent);
      result.current.onCardSectionLayout(layout(381));
      result.current.onBoxesNaturalLayout(layout(332));
      result.current.onBottomButtonsLayout(layout(50));
    });
    act(() => jest.advanceTimersByTime(80));
    expect(result.current.isCompactStudyLayout).toBe(false);
    expect(result.current.horizontalRowHeight).toBe(166);
    expect(result.current.needsStudyScroll).toBe(false);
  });

  it("freezes compact box geometry across the reported keyboard open and close heights", () => {
    const listeners = new Map<string, () => void>();
    const originalSubscribe = Keyboard.addListener.bind(Keyboard);
    const subscribe = jest.spyOn(Keyboard, "addListener").mockImplementation((name, listener) => {
      listeners.set(name, () => listener({} as KeyboardEvent));
      return originalSubscribe(name, listener);
    });
    const { result, unmount } = renderLayout();
    const study = (height: number) => ({
      nativeEvent: { layout: { width: 360, height, x: 0, y: 15 } },
    } as LayoutChangeEvent);
    try {
      act(() => {
        result.current.onStudyLayout(study(473.5));
        result.current.onCardSectionLayout(layout(381));
        result.current.onBottomButtonsLayout(layout(50));
      });
      act(() => jest.advanceTimersByTime(80));
      expect(result.current.isCompactStudyLayout).toBe(true);
      expect(result.current.horizontalRowHeight).toBe(80);
      act(() => result.current.onCardSectionLayout(layout(326)));
      act(() => jest.advanceTimersByTime(80));
      act(() => listeners.get("keyboardDidShow")?.());
      for (const height of [475, 483, 499, 515, 523]) {
        act(() => result.current.onStudyLayout(study(height)));
        expect(result.current.horizontalRowHeight).toBe(80);
      }
      act(() => listeners.get("keyboardDidHide")?.());
      for (const height of [520, 513, 490, 477, 473.5]) {
        act(() => result.current.onStudyLayout(study(height)));
        expect(result.current.horizontalRowHeight).toBe(80);
        expect(result.current.isCompactStudyLayout).toBe(true);
      }
      // A genuine increase in usable space still permits the normal layout.
      act(() => result.current.onStudyLayout(study(700)));
      expect(result.current.isCompactStudyLayout).toBe(false);
      expect(result.current.horizontalRowHeight).toBeUndefined();
    } finally {
      unmount();
      subscribe.mockRestore();
    }
  });

  it("uses study scrolling when even one row cannot fit without shrinking the card", () => {
    const { result } = renderLayout();
    measureFullLayout(result, 300);
    expect(result.current.isCompactStudyLayout).toBe(true);
    expect(result.current.horizontalRowHeight).toBe(80);
    expect(result.current.needsStudyScroll).toBe(true);
    expect(result.current.fullCardSectionHeight).toBe(250);
  });

  it("lets image content growth select compact after the keyboard has opened", () => {
    const isVisible = jest.spyOn(Keyboard, "isVisible").mockReturnValue(true);
    try {
      const { result, unmount } = renderLayout();
      measureFullLayout(result, 600);
      expect(result.current.isCompactStudyLayout).toBe(false);
      act(() => result.current.onCardSectionLayout(layout(460)));
      act(() => jest.advanceTimersByTime(80));
      expect(result.current.isCompactStudyLayout).toBe(true);
      unmount();
    } finally {
      isVisible.mockRestore();
    }
  });

  it("enables scrolling for the resized keyboard viewport while keeping the hint available", () => {
    const listeners = new Map<string, () => void>();
    const subscribe = Keyboard.addListener.bind(Keyboard);
    const addListener = jest.spyOn(Keyboard, "addListener").mockImplementation((event, listener) => {
      listeners.set(event, () => listener({} as KeyboardEvent));
      return subscribe(event, listener);
    });
    try {
      const { result, unmount } = renderLayout();
      measureFullLayout(result, 600);
      act(() => listeners.get("keyboardWillShow")?.());
      act(() => result.current.onStudyLayout(layout(300)));
      expect(result.current.isCompactStudyLayout).toBe(false);
      expect(result.current.availableStudyHeight).toBe(600);
      expect(result.current.visibleStudyHeight).toBe(300);
      expect(result.current.needsStudyScroll).toBe(true);
      act(() => {
        result.current.onStudyLayout(layout(600));
        listeners.get("keyboardDidHide")?.();
      });
      expect(result.current.isCompactStudyLayout).toBe(false);
      expect(result.current.visibleStudyHeight).toBe(600);
      expect(result.current.needsStudyScroll).toBe(false);
      unmount();
    } finally {
      addListener.mockRestore();
    }
  });

  it("keeps compact while navbar collapse recovers space, then restores after keyboard hide", () => {
    const listeners = new Map<string, () => void>();
    const originalSubscribe = Keyboard.addListener.bind(Keyboard);
    const subscribe = jest.spyOn(Keyboard, "addListener").mockImplementation((name, listener) => {
      listeners.set(name, () => listener({} as KeyboardEvent));
      return originalSubscribe(name, listener);
    });
    const { result, unmount } = renderLayout();
    try {
      measureFullLayout(result, 380);
      expect(result.current.isCompactStudyLayout).toBe(true);
      act(() => listeners.get("keyboardDidShow")?.());
      act(() => result.current.onStudyLayout(layout(430)));
      expect(result.current.isCompactStudyLayout).toBe(true);
      act(() => listeners.get("keyboardDidHide")?.());
      expect(result.current.isCompactStudyLayout).toBe(false);
    } finally {
      unmount();
      subscribe.mockRestore();
    }
  });
});
