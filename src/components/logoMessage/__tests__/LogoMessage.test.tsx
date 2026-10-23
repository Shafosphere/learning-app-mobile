import React from "react";
import { render } from "@testing-library/react-native";
import { cancelAnimation, useAnimatedStyle, withSequence, withTiming } from "react-native-reanimated";
import LogoMessage from "../LogoMessage";

let mockReduceMotion = false;
const mockSharedValues: { value: number }[] = [];

jest.mock("react-native-reanimated", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    ...jest.requireActual("react-native-reanimated/mock"),
    // Reanimated's default Jest interpolate is a no-op.
    interpolate: (value: number, input: number[], output: number[]) =>
      output[0] + (value - input[0]) / (input[1] - input[0]) * (output[1] - output[0]),
    useReducedMotion: () => mockReduceMotion,
    useSharedValue: (value: number) => {
      const shared = React.useRef({ value }).current;
      if (!mockSharedValues.includes(shared)) mockSharedValues.push(shared);
      return shared;
    },
    useAnimatedStyle: jest.fn((callback: () => object) => callback()),
    cancelAnimation: jest.fn(),
    withTiming: jest.fn((value: number) => value),
    withSequence: jest.fn((...values: number[]) => values[values.length - 1]),
  };
});
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock("../LogoMessage-styles", () => ({ useStyles: () => ({}) }));
jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("@/src/components/Box/Skin/BoxSkin", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return function MockBoxSkin({ face }: { face: string }) {
    return React.createElement(View, { testID: "mascot", accessibilityLabel: face });
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockReduceMotion = false;
  mockSharedValues.length = 0;
});

it.each([
  ["centered_intro", "default", 1, 0],
  ["default", "centered_intro", 0, 1],
] as const)("keeps the anchor continuous from %s to %s, including a mid-transition reversal", (from, to, start, end) => {
  const mascotStyle = () => jest.mocked(useAnimatedStyle).mock.results
    .map((result) => result.value)
    .filter((style) => "bottom" in style)
    .pop();
  const screen = render(<LogoMessage layoutVariant={from} />);
  const progress = mockSharedValues[0];
  const beforeSwitch = mascotStyle();

  // The first frame after changing props must still use the previous position.
  screen.rerender(<LogoMessage layoutVariant={to} />);
  expect(mascotStyle()).toEqual(beforeSwitch);
  expect(beforeSwitch).toMatchObject(start === 1
    ? { bottom: "0%", marginBottom: -20, height: 141 }
    : { bottom: "50%", marginBottom: -34, height: 68 });

  // Drive the UI-thread animation manually: the Jest mock completes it instantly.
  progress.value = 0.5;
  screen.rerender(<LogoMessage layoutVariant={to} title="Mid-transition" />);
  expect(mascotStyle()).toMatchObject({ bottom: "25%", marginBottom: -27, height: 104.5 });
  const midway = mascotStyle();
  screen.rerender(<LogoMessage layoutVariant={from} />);
  expect(mascotStyle()).toEqual(midway);

  progress.value = end;
  screen.rerender(<LogoMessage layoutVariant={to} />);
  expect(mascotStyle()).toMatchObject(end === 1
    ? { bottom: "0%", marginBottom: -20, height: 141 }
    : { bottom: "50%", marginBottom: -34, height: 68 });
});

it("keeps happy as the standalone default and updates the configured face", () => {
  const screen = render(<LogoMessage />);
  expect(screen.getByTestId("mascot")).toHaveProp("accessibilityLabel", "happy");
  screen.rerender(<LogoMessage mascotFace="sleep" mascotReactionKey="waiting" />);
  expect(screen.getByTestId("mascot")).toHaveProp("accessibilityLabel", "sleep");
  screen.rerender(<LogoMessage mascotFace="nice" mascotReactionKey="explanation" />);
  expect(screen.getByTestId("mascot")).toHaveProp("accessibilityLabel", "nice");
  expect(withSequence).not.toHaveBeenCalled();
});

it.each([
  ["hop", -3],
  ["tilt", -4],
] as const)("plays %s once per step entry and again after returning", (motion, peak) => {
  const screen = render(<LogoMessage mascotMotion={motion} mascotReactionKey="success" />);
  expect(withTiming).toHaveBeenCalledWith(peak, { duration: 140 });
  expect(withTiming).toHaveBeenCalledWith(0, { duration: 220 });
  expect(withSequence).toHaveBeenCalledTimes(1);

  screen.rerender(<LogoMessage title="Updated text" mascotMotion={motion} mascotReactionKey="success" />);
  expect(withSequence).toHaveBeenCalledTimes(1);

  screen.rerender(<LogoMessage mascotReactionKey="explanation" />);
  expect(withSequence).toHaveBeenCalledTimes(1);
  screen.rerender(<LogoMessage mascotMotion={motion} mascotReactionKey="success" />);
  expect(withSequence).toHaveBeenCalledTimes(2);
});

it("cancels and resets both transforms on step change and unmount", () => {
  const screen = render(<LogoMessage mascotMotion="hop" mascotReactionKey="success" />);
  const translateY = jest.mocked(cancelAnimation).mock.calls[0][0];
  const rotation = jest.mocked(cancelAnimation).mock.calls[1][0];
  // Simulate interruption halfway through the animation.
  translateY.value = -2;
  rotation.value = -2;
  jest.mocked(cancelAnimation).mockClear();
  screen.rerender(<LogoMessage mascotReactionKey="explanation" />);
  expect(cancelAnimation).toHaveBeenCalledWith(translateY);
  expect(cancelAnimation).toHaveBeenCalledWith(rotation);
  expect(translateY.value).toBe(0);
  expect(rotation.value).toBe(0);
  jest.mocked(cancelAnimation).mockClear();
  screen.unmount();
  expect(cancelAnimation).toHaveBeenCalledTimes(2);
});

it("shows the emotion without extra movement when reduced motion is enabled", () => {
  mockReduceMotion = true;
  const screen = render(<LogoMessage mascotFace="sparkle" mascotMotion="hop" mascotReactionKey="success" />);
  expect(screen.getByTestId("mascot")).toHaveProp("accessibilityLabel", "sparkle");
  expect(withSequence).not.toHaveBeenCalled();
});
