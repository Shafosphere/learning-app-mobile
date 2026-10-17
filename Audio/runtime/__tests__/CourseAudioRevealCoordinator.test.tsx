import React from "react";
import { act, render } from "@testing-library/react-native";
import * as Reanimated from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { CourseAudioRevealProvider, useCourseAudioRevealTarget } from "../CourseAudioRevealCoordinator";

const mockFocusCallbacks = new Set<() => void>();
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import("react")>("react");
    React.useEffect(() => {
      mockFocusCallbacks.add(effect);
      effect();
      return () => { mockFocusCallbacks.delete(effect); };
    }, [effect]);
  },
}));

jest.mock("react-native-reanimated", () => {
  const mock = jest.requireActual("react-native-reanimated/mock");
  return { ...mock, withTiming: jest.fn(mock.withTiming), runOnUI: jest.fn(mock.runOnUI) };
});

function Panel({ height, target }: { height: SharedValue<number>; target: number }) {
  useCourseAudioRevealTarget(height, target, "test-course");
  return null;
}

describe("coordinated reveal scheduling", () => {
  let microtasks: (() => void)[];
  const timing = jest.mocked(Reanimated.withTiming);
  const dispatch = jest.mocked(Reanimated.runOnUI);
  const height = (value: number) => ({ value }) as SharedValue<number>;
  const flush = () => act(() => { microtasks.splice(0).forEach(task => task()); });

  beforeEach(() => {
    jest.clearAllMocks();
    microtasks = [];
    jest.spyOn(globalThis, "queueMicrotask").mockImplementation(task => { microtasks.push(task); });
  });

  afterEach(() => { jest.restoreAllMocks(); });

  function setup() {
    const heights = [height(100), height(0), height(0)];
    const tree = (active: number, sizes = [100, 140, 180], removed = -1) => (
      <CourseAudioRevealProvider>
        {heights.map((value, index) => index === removed ? null : (
          <Panel key={index} height={value} target={index === active ? sizes[index] : 0} />
        ))}
      </CourseAudioRevealProvider>
    );
    const screen = render(tree(0));
    flush();
    timing.mockClear();
    dispatch.mockClear();
    return { heights, tree, screen };
  }

  it.each([1, 0])("starts opening/closing in one UI task in either list direction (active=%s)", active => {
    const { heights, tree, screen } = setup();
    if (active === 0) {
      screen.rerender(tree(1));
      flush();
      timing.mockClear();
      dispatch.mockClear();
    }
    screen.rerender(tree(active));
    expect(dispatch).not.toHaveBeenCalled();
    expect(timing).not.toHaveBeenCalled();
    expect(microtasks).toHaveLength(1);
    flush();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(timing).toHaveBeenCalledTimes(2);
    expect(heights.map(value => value.value)).toEqual(active === 0 ? [100, 0, 0] : [0, 140, 0]);
    for (const [, config] of timing.mock.calls) {
      expect(config).toEqual({ duration: 260, easing: expect.any(Function) });
    }
  });

  it.each([0, 2])("keeps only latest pending targets across A→B→A/C (final=%s)", active => {
    const { heights, tree, screen } = setup();
    screen.rerender(tree(1));
    screen.rerender(tree(active));
    expect(microtasks).toHaveLength(1);
    flush();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls.some(([target]) => target === 140)).toBe(false);
    expect(heights.map(value => value.value)).toEqual(active === 0 ? [100, 0, 0] : [0, 0, 180]);
  });

  it("retargets from current in-flight heights without resetting them", () => {
    const { heights, tree, screen } = setup();
    screen.rerender(tree(1));
    flush();
    // Stock Jest animations finish immediately. Supply an intermediate native-frame state.
    heights[0].value = 45;
    heights[1].value = 70;
    screen.rerender(tree(0));
    expect(heights.map(value => value.value)).toEqual([45, 70, 0]);
    const starts: number[][] = [];
    timing.mockImplementationOnce(target => {
      starts.push(heights.map(value => value.value));
      return target;
    });
    flush();
    expect(starts).toEqual([[45, 70, 0]]);
    expect(heights.map(value => value.value)).toEqual([100, 0, 0]);
  });

  it("accepts expanded size changes and retains collapsed sizes for reopening", () => {
    const { heights, tree, screen } = setup();
    screen.rerender(tree(0, [130, 160, 180]));
    flush();
    expect(timing.mock.calls.map(([target]) => target)).toEqual([130]);
    timing.mockClear();
    dispatch.mockClear();
    screen.rerender(tree(0, [130, 190, 180]));
    flush();
    expect(dispatch).not.toHaveBeenCalled();
    screen.rerender(tree(1, [130, 190, 180]));
    flush();
    expect(heights.map(value => value.value)).toEqual([0, 190, 0]);
  });

  it("drops removed panels before dispatch and still animates surviving panels", () => {
    const { heights, tree, screen } = setup();
    screen.rerender(tree(1));
    screen.rerender(tree(1, undefined, 0));
    flush();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls.map(([target]) => target)).toEqual([140]);
    expect(heights[0].value).toBe(100);
  });

  it("does not dispatch a pending batch after provider unmount", () => {
    const { tree, screen } = setup();
    screen.rerender(tree(1));
    screen.unmount();
    flush();
    expect(dispatch).not.toHaveBeenCalled();
    expect(timing).not.toHaveBeenCalled();
  });

  it("keeps provider identity stable across unrelated parent renders", () => {
    const { tree, screen } = setup();
    screen.rerender(tree(0));
    flush();
    expect(dispatch).not.toHaveBeenCalled();
    expect(timing).not.toHaveBeenCalled();
  });

  it("restores interrupted native heights on refocus without changing selection or size", () => {
    const { heights, tree, screen } = setup();
    screen.rerender(tree(1));
    flush();
    // Simulate native animation interruption while another screen covers the panel.
    heights[0].value = 45;
    heights[1].value = 0;
    timing.mockClear();
    dispatch.mockClear();

    act(() => { mockFocusCallbacks.forEach(effect => effect()); });
    expect(dispatch).not.toHaveBeenCalled();
    flush();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(heights.map(value => value.value)).toEqual([0, 140, 0]);
  });

  it("restores only mounted panels and keeps the latest target before the focus batch runs", () => {
    const { heights, tree, screen } = setup();
    act(() => { mockFocusCallbacks.forEach(effect => effect()); });
    screen.rerender(tree(2, [100, 140, 210], 0));
    flush();
    expect(heights.map(value => value.value)).toEqual([100, 0, 210]);
    expect(timing.mock.calls.some(([target]) => target === 100)).toBe(false);
  });
});
