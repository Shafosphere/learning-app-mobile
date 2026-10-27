import { NavigationContext } from "@react-navigation/native";
import { act, renderHook } from "@testing-library/react-native";
import React from "react";
import { cancelAnimation, withSequence } from "react-native-reanimated";
import { useReviewEmptyEntrance } from "../useReviewEmptyEntrance";

let mockReduceMotion = false;
let mockPlayhead: { value: number };

jest.mock("react-native-reanimated", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    ...jest.requireActual("react-native-reanimated/mock"),
    useReducedMotion: () => mockReduceMotion,
    useSharedValue: (value: number) => {
      const shared = React.useRef({ value }).current;
      mockPlayhead = shared;
      return shared;
    },
    cancelAnimation: jest.fn(),
    // Keep playback pending so the tests can interrupt it like a real entrance.
    withSequence: jest.fn(() => 0),
  };
});

function setup(ready: boolean, initiallyFocused = true) {
  let focused = initiallyFocused;
  const listeners = new Map<string, () => void>();
  const navigation = {
    isFocused: () => focused,
    addListener: (event: string, listener: () => void) => {
      listeners.set(event, listener);
      return () => { listeners.delete(event); };
    },
  };
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NavigationContext.Provider value={navigation as React.ContextType<typeof NavigationContext>}>
      {children}
    </NavigationContext.Provider>
  );
  const hook = renderHook(({ ready }: { ready: boolean }) => useReviewEmptyEntrance(ready), {
    wrapper,
    initialProps: { ready },
  });

  return {
    ...hook,
    focus: (next: boolean) => act(() => {
      focused = next;
      listeners.get(next ? "focus" : "blur")?.();
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockReduceMotion = false;
});

it("waits for the asset and layout, then plays once despite caption or layout rerenders", () => {
  const hook = setup(false);
  expect(withSequence).not.toHaveBeenCalled();
  expect(mockPlayhead.value).toBe(0);

  hook.rerender({ ready: true });
  expect(withSequence).toHaveBeenCalledTimes(1);
  mockPlayhead.value = 600;
  hook.rerender({ ready: true });
  expect(withSequence).toHaveBeenCalledTimes(1);
  expect(mockPlayhead.value).toBe(600);
});

it("cancels a mid-entrance blur and replays from the beginning on each return", () => {
  const hook = setup(true);
  mockPlayhead.value = 600;
  jest.mocked(cancelAnimation).mockClear();
  hook.focus(false);
  expect(cancelAnimation).toHaveBeenCalledWith(mockPlayhead);

  hook.focus(true);
  expect(withSequence).toHaveBeenCalledTimes(2);
  expect(mockPlayhead.value).toBe(0);

  mockPlayhead.value = 900;
  jest.mocked(cancelAnimation).mockClear();
  hook.unmount();
  expect(cancelAnimation).toHaveBeenCalledWith(mockPlayhead);
});

it("does not start while an offscreen image finishes loading", () => {
  const hook = setup(false, false);
  hook.rerender({ ready: true });
  expect(withSequence).not.toHaveBeenCalled();
  hook.focus(true);
  expect(withSequence).toHaveBeenCalledTimes(1);
});

it("shows the final pose immediately with reduced motion, including after refocus", () => {
  mockReduceMotion = true;
  const hook = setup(false);
  const finalPose = mockPlayhead.value;
  expect(finalPose).toBeGreaterThan(0);
  hook.rerender({ ready: true });
  hook.focus(false);
  hook.focus(true);
  expect(mockPlayhead.value).toBe(finalPose);
  expect(withSequence).not.toHaveBeenCalled();
});
