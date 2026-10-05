import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { useNavbarLayoutTransition } from "@/src/contexts/NavbarLayoutContext";
import { StudyInputRevealContext } from "./StudyInputRevealContext";
import { StudyViewportContext } from "./StudyViewportContext";

/** Reveal the card's input rows, without scrolling past them into the boxes. */
export function KeyboardStudyScroll({ children, keyboardVisible, keyboardTopInWindow, cardHeight, testID, enabled = true, contentContainerStyle }: {
  children: ReactNode;
  keyboardVisible: boolean;
  keyboardTopInWindow: number | null;
  cardHeight: number;
  testID: string;
  enabled?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const viewportRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [viewport, setViewport] = useState({ y: 0, height: 0, visibleHeight: 0 });
  const [studyViewport, setStudyViewport] = useState<{ width: number; height: number } | null>(null);
  const [studyContentHeight, setStudyContentHeight] = useState(0);
  const scrollEnabled = enabled || (viewport.height > 0 && studyContentHeight > viewport.height + 1);
  const scrollPadding = scrollEnabled ? Math.max(0, viewport.height - viewport.visibleHeight) + 8 : 0;
  const focusedRegionRef = useRef<View | null>(null);
  const scrollOffsetRef = useRef(0);
  const revealRequestRef = useRef(0);
  const viewportSnapshotRef = useRef(viewport);
  const revealInputRef = useRef(() => {});
  const boundaryRevealRef = useRef<typeof viewport | null>(null);
  const measurementRequestRef = useRef(0);
  const layoutTransition = useNavbarLayoutTransition();
  const measureViewport = useCallback((atBoundary = false) => {
    if (layoutTransition.isRunning() && !atBoundary) return;
    const request = ++measurementRequestRef.current;
    viewportRef.current?.measureInWindow((_x, y, width, height) => {
      if (request !== measurementRequestRef.current || (layoutTransition.isRunning() && !atBoundary)) return;
      if (height > 0) {
        setStudyViewport((previous) => {
          // Keyboard entry changes what can be seen, not the size of boxes.
          // Preserve the fitted budget until hide; rotation still remeasures.
          const nextHeight = keyboardVisible && previous?.width === width
            ? previous.height : height;
          return previous?.width === width && previous.height === nextHeight
            ? previous : { width, height: nextHeight };
        });
      }
      const visibleHeight = keyboardVisible && keyboardTopInWindow != null
        ? Math.max(0, Math.min(height, keyboardTopInWindow - y)) : height;
      const previous = viewportSnapshotRef.current;
      if (previous.y === y && previous.height === height && previous.visibleHeight === visibleHeight) {
        boundaryRevealRef.current = atBoundary ? previous : null;
        revealInputRef.current();
        return;
      }
      viewportSnapshotRef.current = { y, height, visibleHeight };
      boundaryRevealRef.current = atBoundary ? viewportSnapshotRef.current : null;
      setViewport(viewportSnapshotRef.current);
    });
  }, [keyboardVisible, keyboardTopInWindow, layoutTransition]);
  const measure = useCallback(() => measureViewport(), [measureViewport]);
  const measureViewportRef = useRef(measureViewport);
  measureViewportRef.current = measureViewport;
  useEffect(() => {
    // Reveal once when the keyboard changes, then correct final geometry.
    measureViewport(true);
    // The navbar reports completion; no guesses about animation duration.
    const unsubscribe = layoutTransition.subscribe(measure);
    return () => {
      unsubscribe();
      measurementRequestRef.current += 1;
      revealRequestRef.current += 1;
    };
  }, [measureViewport, measure, layoutTransition]);
  const revealInput = useCallback(() => {
    const request = ++revealRequestRef.current;
    if ((layoutTransition.isRunning() && boundaryRevealRef.current !== viewport) || viewport.visibleHeight <= 0) return;
    boundaryRevealRef.current = null;
    const region = focusedRegionRef.current;
    if (scrollEnabled && keyboardVisible && region) {
      region.measureInWindow((_x, y, _width, height) => {
        if (request !== revealRequestRef.current || focusedRegionRef.current !== region || height <= 0) return;
        const offset = scrollOffsetRef.current;
        const top = y - viewport.y + offset;
        const bottom = top + height;
        // Move only enough to expose the focused row, including its buttons.
        const nextOffset = top < offset + 8 || height > viewport.visibleHeight - 16
          ? Math.max(0, top - 8)
          : bottom > offset + viewport.visibleHeight - 8
            ? Math.max(0, bottom + 8 - viewport.visibleHeight)
            : offset;
        scrollRef.current?.scrollTo({ y: nextOffset, animated: false });
      });
      return;
    }
    scrollRef.current?.scrollTo({
      y: scrollEnabled && keyboardVisible ? Math.max(0, cardHeight + 8 - viewport.visibleHeight) : 0,
      animated: false,
    });
  }, [cardHeight, scrollEnabled, keyboardVisible, viewport, layoutTransition]);
  revealInputRef.current = revealInput;
  useEffect(revealInput, [revealInput]);
  const inputReveal = useMemo(() => ({
    focus: (region: View) => {
      focusedRegionRef.current = region;
      // Focus can move while the keyboard is already open.
      measureViewportRef.current(true);
    },
    blur: (region: View) => {
      if (focusedRegionRef.current === region) {
        focusedRegionRef.current = null;
        revealRequestRef.current += 1;
      }
    },
    refresh: (region: View) => {
      if (focusedRegionRef.current === region) measureViewportRef.current();
    },
  }), []);
  return (
    <View ref={viewportRef} onLayout={measure} style={{ flex: 1 }} collapsable={false}>
      <ScrollView
        ref={scrollRef}
        testID={testID}
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        onContentSizeChange={(_width, height) => {
          // Exclude our own keyboard padding so automatic scrolling can turn
          // off again when the card shrinks and the study content fits.
          setStudyContentHeight(Math.max(0, height - scrollPadding));
          revealInput();
        }}
        onScroll={(event) => {
          scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
          revealRequestRef.current += 1;
        }}
        scrollEventThrottle={16}
        contentContainerStyle={[
          { flexGrow: 1, paddingBottom: scrollPadding },
          contentContainerStyle,
        ]}
        style={{ flex: 1 }}
      >
        <StudyInputRevealContext.Provider value={inputReveal}>
          <StudyViewportContext.Provider value={studyViewport?.height ?? null}>
            {children}
          </StudyViewportContext.Provider>
        </StudyInputRevealContext.Provider>
      </ScrollView>
    </View>
  );
}
