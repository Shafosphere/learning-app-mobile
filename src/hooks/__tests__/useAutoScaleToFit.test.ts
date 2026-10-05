import { act, renderHook } from "@testing-library/react-native";
import type { LayoutChangeEvent } from "react-native";
import { useAutoScaleToFit } from "../useAutoScaleToFit";
import { createNavbarLayoutTransition } from "@/src/contexts/NavbarLayoutContext";

function layout(height: number): LayoutChangeEvent {
  return { nativeEvent: { layout: { x: 0, y: 0, width: 336, height } } } as LayoutChangeEvent;
}

describe("useAutoScaleToFit", () => {
  it("keeps scale stable during a transition and applies the last viewport measurement", () => {
    const layoutTransition = createNavbarLayoutTransition();
    const { result } = renderHook(() => useAutoScaleToFit({ stableContentHeight: 400, layoutTransition }));
    act(() => result.current.onViewportLayout(layout(300)));
    expect(result.current.scale).toBe(0.75);
    layoutTransition.start();
    for (const height of [320, 350, 380]) {
      act(() => result.current.onViewportLayout(layout(height)));
      expect(result.current.scale).toBe(0.75);
    }
    act(() => layoutTransition.finish());
    expect(result.current.scale).toBe(0.95);
  });
  it("distinguishes an unmeasured viewport from a collapsed viewport", () => {
    const { result } = renderHook(() => useAutoScaleToFit({ minScale: 0.648, stableContentHeight: 326 }));
    expect(result.current.scale).toBe(1);
    expect(result.current.needsScrollFallback).toBe(false);

    act(() => result.current.onViewportLayout(layout(0)));
    expect(result.current.scale).toBe(0.648);
    expect(result.current.needsScrollFallback).toBe(true);

    act(() => result.current.onViewportLayout(layout(212)));
    expect(result.current.needsScrollFallback).toBe(false);
    expect(result.current.scaledHeight).toBe(212);
  });
});
