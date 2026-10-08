import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardStudyScroll } from "../KeyboardStudyScroll";
import { useStudyInputReveal } from "../StudyInputRevealContext";
import { createNavbarLayoutTransition, NavbarLayoutTransitionContext } from "@/src/contexts/NavbarLayoutContext";
import { FlashcardsBoxesSection } from "@/src/features/flashcards/study/components/FlashcardsBoxesSection";
import { useAutoScaleToFit } from "@/src/hooks/useAutoScaleToFit";

jest.mock("@/src/components/Box/List/BoxList", () => function MockBoxes() { return null; });
jest.mock("@/src/components/Box/Carousel/BoxCarousel", () => function MockCarousel() { return null; });
jest.mock("@edwardloopez/react-native-coachmark", () => ({
  CoachmarkAnchor: ({ children }: { children: React.ReactNode }) => children,
}));

const mockScrollTo = jest.fn();
let mockViewport: { y: number; height: number; width?: number } = { y: 80, height: 560 };
const mockRegions: Record<string, { y: number; height: number }> = {};

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  const React = jest.requireActual("react");
  const mocked = Object.create(actual);
  Object.defineProperty(mocked, "View", { value: React.forwardRef(function MockView(props: any, ref: any) {
      React.useImperativeHandle(ref, () => ({
        measureInWindow: (callback: any) => {
          const region = mockRegions[props.testID] ?? mockViewport;
          callback(0, region.y, mockViewport.width ?? 360, region.height);
        },
      }), [props.testID]);
      return <actual.View {...props} />;
    }) });
  Object.defineProperty(mocked, "ScrollView", { value: React.forwardRef(function MockScrollView(props: any, ref: any) {
      React.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
      return <actual.View {...props} />;
    }) });
  return mocked;
});

function scene(keyboardVisible: boolean, cardHeight = 350, enabled = true) {
  return <KeyboardStudyScroll testID="study-scroll" enabled={enabled} keyboardVisible={keyboardVisible} keyboardTopInWindow={keyboardVisible ? 340 : null} cardHeight={cardHeight}><Text>Study</Text></KeyboardStudyScroll>;
}

function bottomPadding(screen: ReturnType<typeof render>) {
  return StyleSheet.flatten(screen.getByTestId("study-scroll").props.contentContainerStyle).paddingBottom;
}

function Editor({ name }: { name: string }) {
  const reveal = useStudyInputReveal();
  return (
    <View testID={`${name}-row`} ref={reveal.ref} onLayout={reveal.onLayout} collapsable={false}>
      <TextInput testID={name} onFocus={reveal.onFocus} onBlur={reveal.onBlur} />
      <Text>Save</Text>
    </View>
  );
}

function BudgetBoxes({ onScale, tablet = false, rowHeight, buttonsOnTop = true, layout = "classic", naturalHeight = 330 }: {
  onScale: (scale: number) => void;
  tablet?: boolean;
  rowHeight?: number;
  buttonsOnTop?: boolean;
  layout?: "classic" | "carousel";
  naturalHeight?: number;
}) {
  const geometry = useAutoScaleToFit({ stableContentHeight: naturalHeight, minScale: 0.648 });
  onScale(geometry.scale);
  type Props = React.ComponentProps<typeof FlashcardsBoxesSection>;
  return (
    <FlashcardsBoxesSection
      styles={{
        boxesWrapper: { flex: 1 }, boxesViewport: { flex: 1 },
        boxesScrollViewport: { flex: 1 }, boxesScaledContent: { width: "100%" },
        boxesViewportScrollContent: {}, boxesWrapperWithBottomButtons: {},
        tabletCompactBoxesScrollViewport: {}, tabletCompactBoxesViewport: {},
        tabletCompactBoxesWrapper: {},
      }}
      screenSectionLayout={undefined}
      boxes={{ boxZero: [], boxOne: [], boxTwo: [], boxThree: [], boxFour: [], boxFive: [] }}
      activeBox="boxOne"
      boxZeroEnabled={false}
      boxFaces={{}}
      handleSelectBox={jest.fn()}
      handleBoxLongPress={jest.fn()}
      effectiveBoxesLayout={layout}
      boxSelectionLocked={false}
      isTabletLayout={tablet}
      isTabletCompactBoxesLayout={tablet && buttonsOnTop}
      areButtonsOnTop={buttonsOnTop}
      flashcardsContentWidth={undefined}
      horizontalRowHeight={rowHeight}
      boxesScale={geometry.scale}
      boxesScaledHeight={geometry.scaledHeight}
      boxesScaleOffsetY={geometry.scaleOffsetY}
      boxesNeedScrollFallback={geometry.needsScrollFallback}
      onBoxesViewportLayout={geometry.onViewportLayout}
      onBoxesContentLayout={geometry.onContentLayout}
      t={((key: string) => key) as Props["t"]}
    />
  );
}

describe("KeyboardStudyScroll", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockScrollTo.mockClear();
    mockViewport = { y: 80, height: 560 };
    Object.keys(mockRegions).forEach((key) => delete mockRegions[key]);
  });

  it("preserves manual scrolling through answer layout changes and keyboard hide", () => {
    const transition = createNavbarLayoutTransition();
    const compactScene = (visible: boolean, cardHeight = 350) => (
      <NavbarLayoutTransitionContext.Provider value={transition}>
        {scene(visible, cardHeight)}
      </NavbarLayoutTransitionContext.Provider>
    );
    const screen = render(compactScene(false));
    fireEvent(screen.getByTestId("study-scroll"), "scrollBeginDrag");
    fireEvent(screen.getByTestId("study-scroll"), "scroll", { nativeEvent: { contentOffset: { y: 24 } } });
    mockScrollTo.mockClear();
    fireEvent(screen.getByTestId("study-scroll"), "contentSizeChange", 360, 650);
    screen.rerender(compactScene(false, 380));
    expect(mockScrollTo).not.toHaveBeenCalled();

    screen.rerender(compactScene(true, 380));
    fireEvent(screen.getByTestId("study-scroll"), "scrollBeginDrag");
    fireEvent(screen.getByTestId("study-scroll"), "scroll", { nativeEvent: { contentOffset: { y: 48 } } });
    mockScrollTo.mockClear();
    transition.start();
    screen.rerender(compactScene(false, 380));
    fireEvent(screen.getByTestId("study-scroll"), "contentSizeChange", 360, 650);
    act(() => transition.finish());
    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it("does not fall back to the card bottom between answer blur and correction focus", () => {
    mockRegions["answer-row"] = { y: 180, height: 60 };
    mockRegions["correction-row"] = { y: 520, height: 60 };
    const screen = render(
      <KeyboardStudyScroll testID="study-scroll" keyboardVisible keyboardTopInWindow={340} cardHeight={520}>
        <Editor name="answer" />
        <Editor name="correction" />
      </KeyboardStudyScroll>,
    );
    fireEvent(screen.getByTestId("answer"), "focus");
    fireEvent(screen.getByTestId("study-scroll"), "scroll", { nativeEvent: { contentOffset: { y: 24 } } });
    fireEvent(screen.getByTestId("answer"), "blur");
    mockScrollTo.mockClear();
    fireEvent(screen.getByTestId("study-scroll"), "contentSizeChange", 360, 650);
    expect(mockScrollTo).not.toHaveBeenCalled();

    fireEvent(screen.getByTestId("correction"), "focus");
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 272, animated: false });
  });

  it("keeps the user's position when a focused answer row is laid out again", () => {
    mockRegions["answer-row"] = { y: 180, height: 60 };
    const screen = render(
      <KeyboardStudyScroll testID="study-scroll" keyboardVisible keyboardTopInWindow={340} cardHeight={350}>
        <Editor name="answer" />
      </KeyboardStudyScroll>,
    );
    fireEvent(screen.getByTestId("answer"), "focus");
    fireEvent(screen.getByTestId("study-scroll"), "scrollBeginDrag");
    fireEvent(screen.getByTestId("study-scroll"), "scroll", { nativeEvent: { contentOffset: { y: 112 } } });
    mockRegions["answer-row"] = { y: 68, height: 60 };
    mockScrollTo.mockClear();
    fireEvent(screen.getByTestId("answer-row"), "layout");
    fireEvent(screen.getByTestId("study-scroll"), "contentSizeChange", 360, 650);
    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it("keeps the focused hint and Save row visible on a tall card and switches to the answer without reopening the keyboard", () => {
    mockRegions["hint-row"] = { y: 100, height: 60 };
    mockRegions["answer-row"] = { y: 520, height: 60 };
    const editingScene = (visible: boolean) => (
      <KeyboardStudyScroll testID="study-scroll" keyboardVisible={visible} keyboardTopInWindow={visible ? 340 : null} cardHeight={520}>
        <Editor name="hint" />
        <Editor name="answer" />
      </KeyboardStudyScroll>
    );
    const screen = render(editingScene(false));
    fireEvent(screen.getByTestId("hint"), "focus");
    screen.rerender(editingScene(true));
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 0, animated: false });
    fireEvent(screen.getByTestId("study-scroll"), "contentSizeChange", 360, 600);
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 0, animated: false });

    fireEvent(screen.getByTestId("hint"), "blur");
    fireEvent(screen.getByTestId("answer"), "focus");
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 248, animated: false });
    fireEvent(screen.getByTestId("study-scroll"), "contentSizeChange", 360, 600);
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 248, animated: false });
    // Native window coordinates now include the scroll offset.
    fireEvent(screen.getByTestId("study-scroll"), "scroll", { nativeEvent: { contentOffset: { y: 248 } } });
    mockRegions["hint-row"] = { y: -148, height: 60 };
    fireEvent(screen.getByTestId("answer"), "blur");
    fireEvent(screen.getByTestId("hint"), "focus");
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 12, animated: false });
  });

  it("reveals the entire editing row after Android resizes and ignores navbar animation frames", () => {
    const transition = createNavbarLayoutTransition();
    mockRegions["hint-row"] = { y: 300, height: 60 };
    const editingScene = (visible: boolean) => (
      <NavbarLayoutTransitionContext.Provider value={transition}>
        <KeyboardStudyScroll testID="study-scroll" keyboardVisible={visible} keyboardTopInWindow={visible ? 340 : null} cardHeight={520}>
          <Editor name="hint" />
        </KeyboardStudyScroll>
      </NavbarLayoutTransitionContext.Provider>
    );
    const screen = render(editingScene(false));
    fireEvent(screen.getByTestId("hint"), "focus");
    transition.start();
    mockViewport = { y: 80, height: 260 };
    screen.rerender(editingScene(true));
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 28, animated: false });
    expect(bottomPadding(screen)).toBe(8);
    // Repeated measurement before native scrolling completes must not add the offset twice.
    fireEvent(screen.getByTestId("study-scroll"), "contentSizeChange", 360, 600);
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 28, animated: false });
    fireEvent(screen.getByTestId("study-scroll"), "scroll", { nativeEvent: { contentOffset: { y: 28 } } });
    mockScrollTo.mockClear();
    fireEvent(screen.getByTestId("hint-row"), "layout");
    expect(mockScrollTo).not.toHaveBeenCalled();
    mockRegions["hint-row"] = { y: 272, height: 60 };
    act(() => transition.finish());
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 28, animated: false });
    mockScrollTo.mockClear();
    screen.rerender(editingScene(false));
    expect(mockScrollTo).not.toHaveBeenCalled();
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it.each([
    { tablet: false, buttonsOnTop: true },
    { tablet: false, buttonsOnTop: false },
    { tablet: true, buttonsOnTop: false },
  ])("bounds flexible grids: tablet=$tablet, buttonsOnTop=$buttonsOnTop", ({ tablet, buttonsOnTop }) => {
    mockViewport = { y: 80, height: 494 };
    const onScale = jest.fn();
    const gridScene = (keyboardVisible: boolean) => (
      <KeyboardStudyScroll testID="study-scroll" enabled={keyboardVisible} keyboardVisible={keyboardVisible} keyboardTopInWindow={keyboardVisible ? 340 : null} cardHeight={250}>
        <BudgetBoxes onScale={onScale} tablet={tablet} buttonsOnTop={buttonsOnTop} />
      </KeyboardStudyScroll>
    );
    const screen = render(gridScene(false));
    fireEvent(screen.getByTestId("flashcards-boxes-wrapper"), "layout", {
      nativeEvent: { layout: { x: 0, y: 270, width: 360, height: 330 } },
    });
    const height = () => StyleSheet.flatten(screen.getByTestId("flashcards-boxes-wrapper").props.style).height;
    // The old unbounded layout needed 270 + 330 = 600dp inside 494dp.
    expect(height()).toBe(224);
    expect(StyleSheet.flatten(screen.getByTestId("flashcards-boxes-viewport").props.style).height).toBe(224);
    fireEvent(screen.getByTestId("flashcards-boxes-viewport"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 360, height: height() } },
    });
    expect(onScale).toHaveBeenLastCalledWith(224 / 330);
    expect(screen.getByTestId("study-scroll").props.scrollEnabled).toBe(false);

    mockViewport = { y: 80, height: 260 };
    screen.rerender(gridScene(true));
    expect(height()).toBe(224);
    expect(StyleSheet.flatten(screen.getByTestId("flashcards-boxes-viewport").props.style).height).toBe(224);
    fireEvent(screen.getByTestId("flashcards-boxes-viewport"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 360, height: height() } },
    });
    expect(onScale).toHaveBeenLastCalledWith(224 / 330);
    expect(screen.getByTestId("study-scroll").props.scrollEnabled).toBe(true);

    mockViewport = { y: 80, height: 700 };
    screen.rerender(gridScene(false));
    expect(height()).toBe(430);
  });

  it("keeps fitted classic rows stable during keyboard resize and overlap", () => {
    mockViewport = { y: 80, height: 494 };
    const onScale = jest.fn();
    const gridScene = (keyboardVisible: boolean) => (
      <KeyboardStudyScroll testID="study-scroll" keyboardVisible={keyboardVisible} keyboardTopInWindow={keyboardVisible ? 574 : null} cardHeight={250}>
        <BudgetBoxes onScale={onScale} />
      </KeyboardStudyScroll>
    );
    const screen = render(gridScene(false));
    fireEvent(screen.getByTestId("flashcards-boxes-wrapper"), "layout", {
      nativeEvent: { layout: { x: 0, y: 170, width: 360, height: 330 } },
    });
    const height = () => StyleSheet.flatten(screen.getByTestId("flashcards-boxes-wrapper").props.style).height;
    const measureBoxes = () => fireEvent(screen.getByTestId("flashcards-boxes-viewport"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 360, height: height() } },
    });
    expect(height()).toBe(324);
    measureBoxes();
    expect(onScale).toHaveBeenLastCalledWith(324 / 330);

    mockViewport = { y: 80, height: 394 };
    screen.rerender(gridScene(true));
    expect(height()).toBe(324);
    measureBoxes();
    expect(onScale).toHaveBeenLastCalledWith(324 / 330);
    expect(screen.getByTestId("flashcards-boxes-viewport").props.nestedScrollEnabled).toBeUndefined();

    // A real increase with the keyboard closed updates the fitting budget;
    // overlapping it with the keyboard must not reduce that budget again.
    mockViewport = { y: 80, height: 700 };
    screen.rerender(gridScene(false));
    screen.rerender(gridScene(true));
    expect(height()).toBe(530);
  });

  it("does not shrink larger-phone boxes by 5 percent when keyboard entry reduces the viewport", () => {
    mockViewport = { y: 80, height: 620, width: 412 };
    const onScale = jest.fn();
    const gridScene = (keyboardVisible: boolean) => (
      <KeyboardStudyScroll testID="study-scroll" keyboardVisible={keyboardVisible} keyboardTopInWindow={keyboardVisible ? 600 : null} cardHeight={250}>
        <BudgetBoxes onScale={onScale} />
      </KeyboardStudyScroll>
    );
    const screen = render(gridScene(false));
    fireEvent(screen.getByTestId("flashcards-boxes-wrapper"), "layout", {
      nativeEvent: { layout: { x: 0, y: 274, width: 412, height: 330 } },
    });
    const innerHeight = () => StyleSheet.flatten(screen.getByTestId("flashcards-boxes-viewport").props.style).height;
    const measureInner = () => fireEvent(screen.getByTestId("flashcards-boxes-viewport"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 388, height: innerHeight() } },
    });
    expect(innerHeight()).toBe(346);
    measureInner();
    expect(onScale).toHaveBeenLastCalledWith(1);

    mockViewport = { y: 80, height: 590, width: 412 };
    screen.rerender(gridScene(true));
    expect(innerHeight()).toBe(346);
    measureInner();
    expect(onScale).toHaveBeenLastCalledWith(1);
    expect(screen.getByTestId("study-scroll").props.scrollEnabled).toBe(true);

    // Navbar recovery during entry must not enlarge the boxes either.
    mockViewport = { y: 20, height: 650, width: 412 };
    fireEvent(screen.getByTestId("study-scroll").parent!, "layout");
    expect(innerHeight()).toBe(346);

    // Rotation is a real layout change and must still update the budget.
    mockViewport = { y: 20, height: 420, width: 800 };
    fireEvent(screen.getByTestId("study-scroll").parent!, "layout");
    expect(innerHeight()).toBe(146);
  });

  it("constrains the inner viewport to the reported 216dp budget instead of retaining its 326dp natural layout", () => {
    mockViewport = { y: 65, height: 405 };
    const onScale = jest.fn();
    const gridScene = (keyboardVisible: boolean) => (
      <KeyboardStudyScroll testID="study-scroll" keyboardVisible={keyboardVisible} keyboardTopInWindow={keyboardVisible ? 341 : null} cardHeight={175}>
        <BudgetBoxes onScale={onScale} buttonsOnTop={false} naturalHeight={332} />
      </KeyboardStudyScroll>
    );
    const screen = render(gridScene(false));
    const measureInnerViewport = (height: number) => fireEvent(screen.getByTestId("flashcards-boxes-viewport"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 336, height } },
    });
    // These are the values reported by the 360x640 phone before the fix.
    measureInnerViewport(326);
    expect(onScale).toHaveBeenLastCalledWith(326 / 332);
    fireEvent(screen.getByTestId("flashcards-boxes-wrapper"), "layout", {
      nativeEvent: { layout: { x: 0, y: 189, width: 360, height: 326 } },
    });
    const innerHeight = () => StyleSheet.flatten(screen.getByTestId("flashcards-boxes-viewport").props.style).height;
    expect(innerHeight()).toBe(216);
    measureInnerViewport(innerHeight());
    expect(onScale).toHaveBeenLastCalledWith(216 / 332);
    expect(screen.getByTestId("flashcards-boxes-viewport").props.nestedScrollEnabled).toBeUndefined();

    // Preserve the corrected small-phone fit during keyboard entry too.
    screen.rerender(gridScene(true));
    expect(innerHeight()).toBe(216);
    measureInnerViewport(innerHeight());
    expect(onScale).toHaveBeenLastCalledWith(216 / 332);
    expect(screen.getByTestId("study-scroll").props.scrollEnabled).toBe(true);
    screen.rerender(gridScene(false));
    expect(innerHeight()).toBe(216);
    measureInnerViewport(innerHeight());
    expect(onScale).toHaveBeenLastCalledWith(216 / 332);
  });

  it.each([
    { tablet: false, layout: "classic" as const },
    { tablet: false, layout: "carousel" as const },
    { tablet: true, layout: "classic" as const },
    { tablet: true, layout: "carousel" as const },
  ])("keeps boxes reachable below tall cards: tablet=$tablet, layout=$layout", ({ tablet, layout }) => {
    mockViewport = { y: 80, height: 494 };
    const onScale = jest.fn();
    const screen = render(
      <KeyboardStudyScroll testID="study-scroll" enabled={false} keyboardVisible={false} keyboardTopInWindow={null} cardHeight={650}>
        <BudgetBoxes onScale={onScale} tablet={tablet} buttonsOnTop={false} layout={layout} />
      </KeyboardStudyScroll>,
    );
    const placeBoxes = (top: number) => {
      fireEvent(screen.getByTestId("flashcards-boxes-wrapper"), "layout", {
        nativeEvent: { layout: { x: 0, y: top, width: 360, height: 330 } },
      });
      const height = StyleSheet.flatten(screen.getByTestId("flashcards-boxes-wrapper").props.style).height;
      fireEvent(screen.getByTestId("flashcards-boxes-viewport"), "layout", {
        nativeEvent: { layout: { x: 0, y: 0, width: 360, height } },
      });
      return height;
    };
    expect(placeBoxes(650)).toBe(80);
    expect(onScale).toHaveBeenLastCalledWith(0.648);
    expect(screen.getByTestId("flashcards-boxes-viewport").props.showsVerticalScrollIndicator).toBe(false);
    expect(screen.getByTestId("flashcards-boxes-viewport").props.nestedScrollEnabled).toBe(true);
    fireEvent(screen.getByTestId("study-scroll"), "contentSizeChange", 360, 730);
    expect(screen.getByTestId("study-scroll").props.scrollEnabled).toBe(true);

    // Growing into a small remaining space must keep the boxes usable too.
    expect(placeBoxes(470)).toBe(80);
    // Recover normal scaling and turn off automatic scrolling after shrinkage.
    expect(placeBoxes(270)).toBe(224);
    expect(onScale).toHaveBeenLastCalledWith(224 / 330);
    expect(screen.getByTestId("flashcards-boxes-viewport").props.showsVerticalScrollIndicator).toBeUndefined();
    fireEvent(screen.getByTestId("study-scroll"), "contentSizeChange", 360, 502);
    expect(screen.getByTestId("study-scroll").props.scrollEnabled).toBe(false);
  });

  it("preserves explicit single-row heights and lets tablet boxes grow naturally", () => {
    const gridScene = (tablet: boolean, rowHeight?: number) => (
      <KeyboardStudyScroll testID="study-scroll" keyboardVisible={false} keyboardTopInWindow={null} cardHeight={250}>
        <BudgetBoxes onScale={jest.fn()} tablet={tablet} rowHeight={rowHeight} />
      </KeyboardStudyScroll>
    );
    const screen = render(gridScene(false, 80));
    fireEvent(screen.getByTestId("flashcards-boxes-wrapper"), "layout", {
      nativeEvent: { layout: { x: 0, y: 270, width: 360, height: 80 } },
    });
    expect(StyleSheet.flatten(screen.getByTestId("flashcards-boxes-wrapper").props.style).height).toBe(80);
    screen.rerender(gridScene(true));
    expect(StyleSheet.flatten(screen.getByTestId("flashcards-boxes-wrapper").props.style).height).toBeUndefined();
  });

  it("preserves an unfinished draft when scrolling is enabled and disabled", () => {
    const mounted = jest.fn();
    const unmounted = jest.fn();
    function Draft() {
      const [draft, setDraft] = React.useState("");
      React.useEffect(() => {
        mounted();
        return unmounted;
      }, []);
      return <TextInput testID="draft" value={draft} onChangeText={setDraft} />;
    }
    const draftScene = (enabled: boolean) => (
      <KeyboardStudyScroll testID="study-scroll" enabled={enabled} keyboardVisible keyboardTopInWindow={340} cardHeight={350}>
        <Draft />
      </KeyboardStudyScroll>
    );
    const screen = render(draftScene(false));
    fireEvent.changeText(screen.getByTestId("draft"), "unfinished hint");
    expect(bottomPadding(screen)).toBe(0);
    expect(mockScrollTo).not.toHaveBeenCalled();
    screen.rerender(draftScene(true));
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 98, animated: false });
    screen.rerender(draftScene(false));
    expect(screen.getByTestId("draft").props.value).toBe("unfinished hint");
    expect(screen.getByTestId("study-scroll").props.scrollEnabled).toBe(false);
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();
  });

  it("reveals the card bottom and reserves only actual keyboard overlap", () => {
    const screen = render(scene(true));
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 98, animated: false });
    expect(bottomPadding(screen)).toBe(308);
    expect(screen.getByTestId("study-scroll").props.keyboardShouldPersistTaps).toBe("handled");
    screen.rerender(scene(true, 420));
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 168, animated: false });
    mockScrollTo.mockClear();
    screen.rerender(scene(false, 420));
    expect(mockScrollTo).not.toHaveBeenCalled();
    expect(bottomPadding(screen)).toBe(8);
  });

  it("does not double reserve keyboard space after Android resizes the window", () => {
    mockViewport = { y: 80, height: 260 };
    const screen = render(scene(true));
    expect(bottomPadding(screen)).toBe(8);
    act(() => jest.advanceTimersByTime(450));
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 98, animated: false });
  });

  it("reveals at keyboard boundaries and ignores intermediate navbar layouts", () => {
    const transition = createNavbarLayoutTransition();
    const wrappedScene = (visible: boolean) => (
      <NavbarLayoutTransitionContext.Provider value={transition}>
        {scene(visible)}
      </NavbarLayoutTransitionContext.Provider>
    );
    const screen = render(wrappedScene(false));
    mockScrollTo.mockClear();
    transition.start();
    screen.rerender(wrappedScene(true));
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 98, animated: false });
    mockScrollTo.mockClear();
    for (const y of [65, 40, 15]) {
      mockViewport = { y, height: 560 };
      fireEvent(screen.getByTestId("study-scroll").parent!, "layout", { nativeEvent: { layout: { y, height: 560 } } });
      expect(mockScrollTo).not.toHaveBeenCalled();
      expect(bottomPadding(screen)).toBe(308);
    }
    act(() => transition.finish());
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 33, animated: false });
    expect(bottomPadding(screen)).toBe(243);

    mockScrollTo.mockClear();
    transition.start();
    screen.rerender(wrappedScene(false));
    expect(mockScrollTo).not.toHaveBeenCalled();
    mockScrollTo.mockClear();
    mockViewport = { y: 80, height: 560 };
    expect(mockScrollTo).not.toHaveBeenCalled();
    act(() => transition.finish());
    expect(mockScrollTo).not.toHaveBeenCalled();
    expect(bottomPadding(screen)).toBe(8);
  });
});
