import { getBoxCarouselNaturalHeight } from "@/src/components/Box/Carousel/BoxCarousel.metrics";
import { act, renderHook } from "@testing-library/react-native";
import { Animated, Keyboard, type KeyboardEvent, type LayoutChangeEvent } from "react-native";
import { useFlashcardsStudyLayout } from "../useFlashcardsStudyLayout";
import { useFlashcardsStudyCoordinator } from "../useFlashcardsStudyCoordinator";
import { useKeyboardBottomOffset } from "@/src/hooks/useKeyboardBottomOffset";
import React from "react";
import { QuoteSuppressionContext } from "@/src/contexts/QuoteSuppressionContext";

jest.mock("@/src/hooks/useKeyboardBottomOffset", () => ({ useKeyboardBottomOffset: jest.fn() }));
jest.mock("@/src/services/debugEvents", () => ({ appendDebugEvent: jest.fn() }));

let mockOrientation = "portrait";
jest.mock("@/src/hooks/useDeviceLayout", () => ({
  useDeviceLayout: () => ({ orientation: mockOrientation }),
}));

function layout(height: number): LayoutChangeEvent {
  return { nativeEvent: { layout: { height, width: 375, x: 0, y: 0 } } } as LayoutChangeEvent;
}

function renderStudy(suppressQuotes = () => () => {}, tablet = false, boxesLayout = "classic") {
  const wrapper = ({ children }: React.PropsWithChildren) => React.createElement(
    QuoteSuppressionContext.Provider, { value: suppressQuotes }, children,
  );
  return renderHook(({ eligible, focused = true }: { eligible: boolean; focused?: boolean }) => {
    const studyLayout = useFlashcardsStudyLayout({
      isTabletLayout: tablet, boxesLayout, areButtonsOnTop: false,
    });
    return useFlashcardsStudyCoordinator({
      studyLayout,
      isTabletLayout: tablet,
      boxesLayout,
      areButtonsOnTop: false,
      shouldShowBoxes: true,
      selectedItemId: 1,
      showCardActions: true,
      shouldShowTrueFalseActions: false,
      inlineCardActionEligible: eligible,
      shouldAnimateScreenLayout: true,
      isFocused: focused,
      debugScreen: "flashcards",
      courseId: 1,
      displayResult: null,
      activeBox: "boxOne",
      correction: null,
      previousKeyboardVisibleRef: { current: null },
    });
  }, { wrapper, initialProps: { eligible: true, focused: true } });
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
    mockOrientation = "portrait";
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

  it("fits a landscape carousel to a row without scaling its scroll viewport, and restores portrait", () => {
    jest.spyOn(Keyboard, "isVisible").mockReturnValue(false);
    mockOrientation = "landscape";
    const { result, rerender } = renderStudy(undefined, true, "carousel");
    measure(result, 463);
    const expectCarouselGeometry = (viewportHeight: number, compact: boolean) => {
      act(() => result.current.boxesLayoutProps.onBoxesViewportLayout(layout(viewportHeight)));
      const props = result.current.boxesLayoutProps;
      expect(props.isCompactStudyLayout).toBe(compact);
      if (compact) {
        expect(props.horizontalRowHeight).toBeGreaterThanOrEqual(80);
        expect(props.boxesScaledHeight).toBe(props.horizontalRowHeight);
        expect(props.boxesScale).toBe(1);
        expect(props.boxesScaleOffsetY).toBe(0);
        expect(props.carouselBottomClearance).toBe(0);
        expect(props.boxesNeedScrollFallback).toBe(false);
        return;
      }
      expect(props.horizontalRowHeight).toBeUndefined();
      const naturalHeight = getBoxCarouselNaturalHeight({
        isSmallPhoneLayout: compact, bottomClearance: props.carouselBottomClearance,
      });
      const expectedScale = Math.min(1, Math.max(0.3, viewportHeight / naturalHeight));
      expect(props.boxesScale).toBeCloseTo(expectedScale);
      expect(props.boxesScaleOffsetY).toBeCloseTo(naturalHeight * (1 - expectedScale) / 2);
    };
    expectCarouselGeometry(160, true);
    expectCarouselGeometry(120, true);
    expectCarouselGeometry(160, true);
    mockOrientation = "portrait";
    rerender({ eligible: true, focused: true });
    expectCarouselGeometry(260, false);
    mockOrientation = "landscape";
    rerender({ eligible: true, focused: true });
    expectCarouselGeometry(160, true);
  });

  it("keeps tablet section transitions disabled through repeated rotation", () => {
    const { result, rerender } = renderStudy(undefined, true);
    measure(result, 800);
    for (const orientation of ["portrait", "landscape", "portrait", "landscape"]) {
      mockOrientation = orientation;
      rerender({ eligible: true, focused: true });
      expect(result.current.screenSectionLayout).toBeUndefined();
      expect(result.current.isLandscapeStudy).toBe(orientation === "landscape");
    }
  });

  it("automatically uses landscape on tablets and restores portrait", () => {
    mockOrientation = "landscape";
    const { result, rerender } = renderStudy(undefined, true);
    measure(result, 800);
    expect(result.current.isLandscapeStudy).toBe(true);
    expect(result.current.boxesLayoutProps.horizontalRowHeight).toBeGreaterThan(0);
    mockOrientation = "portrait";
    rerender({ eligible: true, focused: true });
    expect(result.current.isLandscapeStudy).toBe(false);
    expect(result.current.boxesLayoutProps.horizontalRowHeight).toBeUndefined();
  });

  it("does not enable the tablet landscape layout on a rotated phone", () => {
    mockOrientation = "landscape";
    const { result } = renderStudy();
    expect(result.current.isLandscapeStudy).toBe(false);
  });

  it("preserves section transitions on phones", () => {
    const { result } = renderStudy();
    expect(result.current.screenSectionLayout).toBeDefined();
  });

  it("moves tablet confirmation into the card in cramped landscape and restores portrait", () => {
    jest.spyOn(Keyboard, "isVisible").mockReturnValue(true);
    const { result, rerender } = renderStudy(undefined, true);
    measure(result, 380);
    expect(result.current.useInlineCardAction).toBe(false);
    mockOrientation = "landscape";
    rerender({ eligible: true, focused: true });
    expect(result.current.isLandscapeStudy).toBe(true);
    expect(result.current.useInlineCardAction).toBe(true);
    expect(result.current.dock.bottomButtonsReservedSpace).toBe(0);
    expect(result.current.boxesLayoutProps.horizontalRowHeight).toBeGreaterThan(0);
    mockOrientation = "portrait";
    rerender({ eligible: true, focused: true });
    expect(result.current.useInlineCardAction).toBe(false);
    expect(result.current.boxesLayoutProps.horizontalRowHeight).toBeUndefined();
  });

  it.each(["classic", "carousel"])("keeps %s boxes and normal actions when landscape has room above the keyboard", (boxesLayout) => {
    jest.spyOn(Keyboard, "isVisible").mockReturnValue(true);
    mockOrientation = "landscape";
    const { result } = renderStudy(undefined, true, boxesLayout);
    measure(result, 800);
    expect(result.current.needsLandscapeKeyboardFocus).toBe(false);
    expect(result.current.useInlineCardAction).toBe(false);
    expect(result.current.dock.shouldRenderBottomButtons).toBe(true);
    act(() => result.current.studyLayout.onStudyLayout(layout(600)));
    expect(result.current.needsLandscapeKeyboardFocus).toBe(false);
    act(() => result.current.studyLayout.onStudyLayout(layout(350)));
    expect(result.current.needsLandscapeKeyboardFocus).toBe(true);
    expect(result.current.useInlineCardAction).toBe(true);
  });

  it("keeps focus mode stable when navbar collapse recovers space, then restores on keyboard hide", () => {
    const listeners = new Map<string, ((event: KeyboardEvent) => void)[]>();
    jest.spyOn(Keyboard, "isVisible").mockReturnValue(false);
    const subscribe = Keyboard.addListener.bind(Keyboard);
    jest.spyOn(Keyboard, "addListener").mockImplementation((name, listener) => {
      listeners.set(name, [...(listeners.get(name) ?? []), listener]);
      return subscribe(name, listener);
    });
    mockOrientation = "landscape";
    const { result } = renderStudy(undefined, true);
    let viewportTop = 100;
    result.current.studyLayout.studyViewportRef.current = {
      measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => callback(0, viewportTop, 375, 800),
    } as any;
    measure(result, 800);
    act(() => listeners.get("keyboardDidShow")?.forEach(listener => listener({
      endCoordinates: { screenY: 500 },
    } as KeyboardEvent)));
    act(() => result.current.studyLayout.onStudyLayout(layout(400)));
    expect(result.current.needsLandscapeKeyboardFocus).toBe(true);
    viewportTop = 0;
    act(() => result.current.studyLayout.onStudyLayout(layout(500)));
    expect(result.current.studyLayout.studyTopInWindow).toBe(100);
    expect(result.current.needsLandscapeKeyboardFocus).toBe(true);
    act(() => listeners.get("keyboardDidHide")?.forEach(listener => listener({} as KeyboardEvent)));
    expect(result.current.needsLandscapeKeyboardFocus).toBe(false);
    expect(result.current.dock.shouldRenderBottomButtons).toBe(true);
  });

  it("suppresses reactions only for a focused compact screen and releases on recovery, blur and unmount", () => {
    jest.spyOn(Keyboard, "isVisible").mockReturnValue(false);
    const release = jest.fn();
    const suppressQuotes = jest.fn(() => release);
    const { result, rerender, unmount } = renderStudy(suppressQuotes);
    measure(result, 800);
    expect(suppressQuotes).not.toHaveBeenCalled();

    measure(result, 380);
    expect(result.current.studyLayout.isCompactStudyLayout).toBe(true);
    expect(suppressQuotes).toHaveBeenCalledTimes(1);
    rerender({ eligible: true, focused: false });
    expect(release).toHaveBeenCalledTimes(1);
    rerender({ eligible: true, focused: true });
    expect(suppressQuotes).toHaveBeenCalledTimes(2);

    measure(result, 800);
    expect(result.current.studyLayout.isCompactStudyLayout).toBe(false);
    expect(release).toHaveBeenCalledTimes(2);
    measure(result, 380);
    expect(suppressQuotes).toHaveBeenCalledTimes(3);
    unmount();
    expect(release).toHaveBeenCalledTimes(3);
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
