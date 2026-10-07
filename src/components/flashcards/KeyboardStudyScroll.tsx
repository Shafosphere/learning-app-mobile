import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Keyboard, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { useNavbarLayoutTransition } from "@/src/contexts/NavbarLayoutContext";
import { logFlashcardsScrollDebug } from "@/src/services/flashcardsScrollDebug";
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
  const hasFocusedRegionRef = useRef(false);
  const userScrolledRef = useRef(false);
  const previousKeyboardVisibleRef = useRef(keyboardVisible);
  const scrollOffsetRef = useRef(0);
  const revealRequestRef = useRef(0);
  const viewportSnapshotRef = useRef(viewport);
  const revealInputRef = useRef(() => {});
  const boundaryRevealRef = useRef<typeof viewport | null>(null);
  const measurementRequestRef = useRef(0);
  const layoutTransition = useNavbarLayoutTransition();
  const debugSnapshotRef = useRef({ testID, keyboardVisible, keyboardTopInWindow, cardHeight, enabled, scrollEnabled, scrollPadding, studyContentHeight });
  debugSnapshotRef.current = { testID, keyboardVisible, keyboardTopInWindow, cardHeight, enabled, scrollEnabled, scrollPadding, studyContentHeight };
  const regionIdsRef = useRef(new WeakMap<View, number>());
  const regionSequenceRef = useRef(0);
  const lastScrollCommandRef = useRef<{ ts: number; y: number; reason: string } | null>(null);
  const logDebug = useCallback((event: string, details: Record<string, unknown> = {}) => {
    const region = focusedRegionRef.current;
    logFlashcardsScrollDebug(event, {
      ...debugSnapshotRef.current,
      viewport: viewportSnapshotRef.current,
      offset: scrollOffsetRef.current,
      userScrolled: userScrolledRef.current,
      focusedRegionId: region ? regionIdsRef.current.get(region) ?? null : null,
      hasFocusedRegion: hasFocusedRegionRef.current,
      transitionRunning: layoutTransition.isRunning(),
      lastScrollCommand: lastScrollCommandRef.current,
      ...details,
    });
  }, [layoutTransition]);
  useEffect(() => {
    logDebug("scroll.mount");
    const subscriptions = (["keyboardWillShow", "keyboardDidShow", "keyboardWillHide", "keyboardDidHide", "keyboardDidChangeFrame"] as const).map((eventName) =>
      Keyboard.addListener(eventName, (event) => logDebug(`keyboard.${eventName}`, {
        duration: event.duration,
        startCoordinates: event.startCoordinates,
        endCoordinates: event.endCoordinates,
      })),
    );
    return () => {
      logDebug("scroll.unmount");
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [logDebug]);
  useEffect(() => {
    logDebug("scroll.state");
  }, [keyboardVisible, keyboardTopInWindow, cardHeight, enabled, scrollEnabled, scrollPadding, studyContentHeight, logDebug]);
  const measureViewport = useCallback((atBoundary = false) => {
    if (layoutTransition.isRunning() && !atBoundary) {
      logDebug("viewport.measure.skip", { reason: "navbar_transition" });
      return;
    }
    const request = ++measurementRequestRef.current;
    logDebug("viewport.measure.request", { request, atBoundary });
    viewportRef.current?.measureInWindow((_x, y, width, height) => {
      if (request !== measurementRequestRef.current || (layoutTransition.isRunning() && !atBoundary)) {
        logDebug("viewport.measure.discard", { request, atBoundary, y, width, height });
        return;
      }
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
      logDebug("viewport.measure.result", { request, atBoundary, y, width, height, visibleHeight });
      if (previous.y === y && previous.height === height && previous.visibleHeight === visibleHeight) {
        boundaryRevealRef.current = atBoundary ? previous : null;
        revealInputRef.current();
        return;
      }
      viewportSnapshotRef.current = { y, height, visibleHeight };
      boundaryRevealRef.current = atBoundary ? viewportSnapshotRef.current : null;
      setViewport(viewportSnapshotRef.current);
    });
  }, [keyboardVisible, keyboardTopInWindow, layoutTransition, logDebug]);
  const measure = useCallback(() => measureViewport(), [measureViewport]);
  const measureViewportRef = useRef(measureViewport);
  measureViewportRef.current = measureViewport;
  useEffect(() => {
    if (previousKeyboardVisibleRef.current !== keyboardVisible) {
      logDebug("scroll.manual_guard.reset", { reason: "keyboard_visibility_change" });
      previousKeyboardVisibleRef.current = keyboardVisible;
      userScrolledRef.current = false;
    }
    // Reveal once when the keyboard changes, then correct final geometry.
    measureViewport(true);
    // The navbar reports completion; no guesses about animation duration.
    const unsubscribe = layoutTransition.subscribe(() => {
      logDebug("navbar.transition.finish");
      measure();
    });
    return () => {
      unsubscribe();
      measurementRequestRef.current += 1;
      revealRequestRef.current += 1;
    };
  }, [keyboardVisible, measureViewport, measure, layoutTransition, logDebug]);
  const revealInput = useCallback(() => {
    const request = ++revealRequestRef.current;
    // Layout/result updates and keyboard dismissal must not reset the user's
    // position. A new focus or keyboard entry may reveal an input again.
    if (!scrollEnabled || !keyboardVisible || userScrolledRef.current) {
      logDebug("input.reveal.skip", { request, reason: !scrollEnabled ? "scroll_disabled" : !keyboardVisible ? "keyboard_hidden" : "user_scrolled" });
      return;
    }
    if ((layoutTransition.isRunning() && boundaryRevealRef.current !== viewport) || viewport.visibleHeight <= 0) {
      logDebug("input.reveal.skip", { request, reason: viewport.visibleHeight <= 0 ? "empty_viewport" : "navbar_transition" });
      return;
    }
    boundaryRevealRef.current = null;
    const region = focusedRegionRef.current;
    if (region) {
      region.measureInWindow((_x, y, _width, height) => {
        if (request !== revealRequestRef.current || focusedRegionRef.current !== region || height <= 0) {
          logDebug("input.measure.discard", { request, y, height });
          return;
        }
        const offset = scrollOffsetRef.current;
        const top = y - viewport.y + offset;
        const bottom = top + height;
        // Move only enough to expose the focused row, including its buttons.
        const nextOffset = top < offset + 8 || height > viewport.visibleHeight - 16
          ? Math.max(0, top - 8)
          : bottom > offset + viewport.visibleHeight - 8
            ? Math.max(0, bottom + 8 - viewport.visibleHeight)
            : offset;
        lastScrollCommandRef.current = { ts: Date.now(), y: nextOffset, reason: "focused_row" };
        logDebug("scroll.command", { request, rowY: y, rowHeight: height, top, bottom, nextOffset });
        scrollRef.current?.scrollTo({ y: nextOffset, animated: false });
      });
      return;
    }
    // Blur/unmount can precede correction focus. Keep the current position
    // during that gap instead of alternating between a row and the card bottom.
    if (hasFocusedRegionRef.current) {
      logDebug("input.reveal.skip", { request, reason: "between_focused_rows" });
      return;
    }
    const nextOffset = Math.max(0, cardHeight + 8 - viewport.visibleHeight);
    lastScrollCommandRef.current = { ts: Date.now(), y: nextOffset, reason: "card_bottom_fallback" };
    logDebug("scroll.command", { request, nextOffset });
    scrollRef.current?.scrollTo({
      y: nextOffset,
      animated: false,
    });
  }, [cardHeight, scrollEnabled, keyboardVisible, viewport, layoutTransition, logDebug]);
  revealInputRef.current = revealInput;
  useEffect(revealInput, [revealInput]);
  const inputReveal = useMemo(() => ({
    focus: (region: View) => {
      if (!regionIdsRef.current.has(region)) regionIdsRef.current.set(region, ++regionSequenceRef.current);
      logDebug("input.focus", { nextRegionId: regionIdsRef.current.get(region) });
      focusedRegionRef.current = region;
      hasFocusedRegionRef.current = true;
      userScrolledRef.current = false;
      // Focus can move while the keyboard is already open.
      measureViewportRef.current(true);
    },
    blur: (region: View) => {
      logDebug("input.blur", { regionId: regionIdsRef.current.get(region) ?? null, wasFocused: focusedRegionRef.current === region });
      if (focusedRegionRef.current === region) {
        focusedRegionRef.current = null;
        revealRequestRef.current += 1;
      }
    },
    refresh: (region: View) => {
      logDebug("input.layout", { regionId: regionIdsRef.current.get(region) ?? null, isFocused: focusedRegionRef.current === region });
      if (focusedRegionRef.current === region) measureViewportRef.current();
    },
  }), [logDebug]);
  return (
    <View ref={viewportRef} onLayout={(event) => {
      logDebug("viewport.layout", { layout: event?.nativeEvent?.layout });
      measure();
    }} style={{ flex: 1 }} collapsable={false}>
      <ScrollView
        ref={scrollRef}
        testID={testID}
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        onContentSizeChange={(_width, height) => {
          logDebug("content.size", { width: _width, height, contentHeightWithoutPadding: Math.max(0, height - scrollPadding) });
          // Exclude our own keyboard padding so automatic scrolling can turn
          // off again when the card shrinks and the study content fits.
          setStudyContentHeight(Math.max(0, height - scrollPadding));
          revealInput();
        }}
        onScrollBeginDrag={() => {
          logDebug("scroll.drag.begin");
          userScrolledRef.current = true;
          revealRequestRef.current += 1;
        }}
        onScroll={(event) => {
          if (event.nativeEvent.contentOffset.y !== scrollOffsetRef.current) {
            logDebug("scroll.native", {
              nextOffset: event.nativeEvent.contentOffset.y,
              delta: event.nativeEvent.contentOffset.y - scrollOffsetRef.current,
              contentSize: event.nativeEvent.contentSize,
              layoutMeasurement: event.nativeEvent.layoutMeasurement,
              contentInset: event.nativeEvent.contentInset,
            });
          }
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
