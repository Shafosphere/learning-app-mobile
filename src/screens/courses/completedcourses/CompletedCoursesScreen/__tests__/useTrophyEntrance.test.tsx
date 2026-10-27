import { NavigationContext } from "@react-navigation/native";
import { act, renderHook } from "@testing-library/react-native";
import React from "react";
import { cancelAnimation, withSequence } from "react-native-reanimated";
import { useTrophyEntrance } from "../useTrophyEntrance";

let mockReduceMotion = false;
let mockPlayhead: { value: number };

jest.mock("react-native-reanimated", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    ...jest.requireActual("react-native-reanimated/mock"),
    interpolate: jest.requireActual("react-native-reanimated/src/interpolation").interpolate,
    useReducedMotion: () => mockReduceMotion,
    useSharedValue: (value: number) => {
      const shared = React.useRef({ value }).current;
      mockPlayhead = shared;
      return shared;
    },
    cancelAnimation: jest.fn(),
    // Leave playback pending so tests can sample contact and interrupt a fall.
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
  const hook = renderHook(({ ready }: { ready: boolean }) => useTrophyEntrance(ready), {
    wrapper,
    initialProps: { ready },
  });

  return {
    ...hook,
    focus: (next: boolean) => act(() => {
      focused = next;
      listeners.get(next ? "focus" : "blur")?.();
    }),
    sample: (time: number) => {
      mockPlayhead.value = time;
      hook.rerender({ ready });
      return hook.result.current;
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockReduceMotion = false;
});

it("waits for assets and courses, then starts once without restarting on rerenders", () => {
  const hook = setup(false);
  expect(withSequence).not.toHaveBeenCalled();
  expect(hook.result.current.trophyAnimatedStyle.opacity).toBe(0);
  expect(hook.result.current.crackAnimatedStyle.opacity).toBe(0);

  hook.rerender({ ready: true });
  expect(withSequence).toHaveBeenCalledTimes(1);
  mockPlayhead.value = 800;
  hook.rerender({ ready: true });
  expect(withSequence).toHaveBeenCalledTimes(1);
  expect(mockPlayhead.value).toBe(800);
});

it("lands rigidly without bouncing, reveals the crater at impact, then fades it away", () => {
  const hook = setup(true);
  const falling = hook.sample(579);
  expect(falling.crackAnimatedStyle.opacity).toBe(0);
  expect(falling.trophyAnimatedStyle.transform[0]).toEqual({ translateY: expect.any(Number) });
  expect(falling.trophyAnimatedStyle.transform[0].translateY).toBeLessThan(0);

  const contact = hook.sample(580);
  expect(contact.trophyAnimatedStyle.transform[0]).toEqual({ translateY: 0 });
  expect(contact.crackAnimatedStyle).toEqual({ opacity: 1 });
  expect(hook.sample(596).crackAnimatedStyle.opacity).toBe(1);
  for (let time = 580; time <= 1500; time += 20) {
    const landed = hook.sample(time);
    expect(landed.crackAnimatedStyle).toEqual({ opacity: 1 });
    expect(landed.trophyAnimatedStyle.transform[0]).toEqual({ translateY: 0 });
    // Only translation and rotation: a metal trophy must retain its shape.
    expect(landed.trophyAnimatedStyle.transform).toHaveLength(2);
  }
  expect(hook.sample(600).impactAnimatedStyle.transform).toEqual([
    { translateX: -3 }, { translateY: 2 },
  ]);
  expect(hook.sample(840).impactAnimatedStyle.transform).toEqual([
    { translateX: 0 }, { translateY: 0 },
  ]);

  // The fade lasts 5450 ms, four seconds longer, with equal opacity steps.
  expect(hook.sample(1950).crackAnimatedStyle.opacity).toBe(1);
  expect(hook.sample(3312.5).crackAnimatedStyle.opacity).toBeCloseTo(0.75);
  expect(hook.sample(4675).crackAnimatedStyle.opacity).toBeCloseTo(0.5);
  expect(hook.sample(6037.5).crackAnimatedStyle.opacity).toBeCloseTo(0.25);
  const finished = hook.sample(7400);
  expect(finished.crackAnimatedStyle.opacity).toBe(0);
  expect(finished.trophyAnimatedStyle.opacity).toBe(1);
  expect(finished.trophyAnimatedStyle.transform).toEqual([
    { translateY: 0 }, { rotate: "0deg" },
  ]);
});

it("cancels on blur or unmount and restarts the fall on every return", () => {
  const hook = setup(true);
  mockPlayhead.value = 800;
  jest.mocked(cancelAnimation).mockClear();
  hook.focus(false);
  expect(cancelAnimation).toHaveBeenCalledWith(mockPlayhead);
  hook.focus(true);
  expect(withSequence).toHaveBeenCalledTimes(2);
  expect(mockPlayhead.value).toBe(0);
  jest.mocked(cancelAnimation).mockClear();
  hook.unmount();
  expect(cancelAnimation).toHaveBeenCalledWith(mockPlayhead);
});

it("waits for focus when the images finish loading offscreen", () => {
  const hook = setup(false, false);
  hook.rerender({ ready: true });
  expect(withSequence).not.toHaveBeenCalled();
  hook.focus(true);
  expect(withSequence).toHaveBeenCalledTimes(1);
});

it("shows a settled trophy without a crater when reduced motion is enabled", () => {
  mockReduceMotion = true;
  const hook = setup(true);
  expect(hook.result.current.trophyAnimatedStyle.opacity).toBe(1);
  expect(hook.result.current.crackAnimatedStyle.opacity).toBe(0);
  expect(hook.result.current.trophyAnimatedStyle.transform[0]).toEqual({ translateY: 0 });
  hook.focus(false);
  hook.focus(true);
  expect(withSequence).not.toHaveBeenCalled();
  expect(mockPlayhead.value).toBe(7400);
});
