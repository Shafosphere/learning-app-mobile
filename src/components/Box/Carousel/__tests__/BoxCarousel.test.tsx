import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Animated, TouchableOpacity } from "react-native";
import type { BoxesState } from "@/src/types/boxes";
import BoxSkin from "../../Skin/BoxSkin";
import BoxCarousel from "../BoxCarousel";

jest.mock("@/src/hooks/useDeviceLayout", () => ({ useDeviceLayout: () => ({ isSmallPhoneLayout: false }) }));
jest.mock("../BoxCarousel.styles", () => ({ useBoxCarouselStyles: () => ({}) }));
jest.mock("@edwardloopez/react-native-coachmark", () => ({
  CoachmarkAnchor: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("../../Skin/BoxSkin", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return function MockBoxSkin() { return React.createElement(View); };
});

const boxes: BoxesState = { boxZero: [], boxOne: [], boxTwo: [], boxThree: [], boxFour: [], boxFive: [] };
const props = { boxes, activeBox: "boxOne" as const, handleSelectBox: jest.fn(), layoutWidth: 375 };

describe("BoxCarousel personalities and manual selection", () => {
  beforeEach(() => jest.clearAllMocks());

  it("preserves personalities through active-box and contents changes", () => {
    const app = render(<BoxCarousel {...props} activeBox="boxZero" />);
    const faces = () => app.UNSAFE_getAllByType(BoxSkin).map((skin) => skin.props.face);
    expect(faces()).toEqual(["owo", "nice", "ez", "cheerful", "sparkle", "sleep"]);
    app.rerender(<BoxCarousel {...props} activeBox="boxThree" />);
    expect(faces()).toEqual(["owo", "nice", "ez", "cheerful", "sparkle", "sleep"]);
    app.rerender(<BoxCarousel {...props} boxes={{ ...boxes, boxFive: [{ id: 1, text: "a", translations: ["b"], flipped: false }] }} />);
    expect(faces()[5]).toBe("love");
  });

  it("honors supplied reactions, and derives sleep from actual contents rather than demo counters", () => {
    const app = render(<BoxCarousel {...props} activeBox="boxZero" countOverrides={{ boxFive: 10 }} />);
    expect(app.UNSAFE_getAllByType(BoxSkin)[5].props).toMatchObject({ wordCount: 10, face: "sleep" });
    app.rerender(<BoxCarousel {...props} faces={{ boxFive: "sad" }} />);
    expect(app.UNSAFE_getAllByType(BoxSkin)[5].props.face).toBe("sad");
  });

  it("notifies once for each tap, including repeated taps on the active box", () => {
    const app = render(<BoxCarousel {...props} hideBoxZero />);
    const boxOne = app.UNSAFE_getAllByType(TouchableOpacity)[0];
    fireEvent.press(boxOne);
    fireEvent.press(boxOne);
    expect(props.handleSelectBox.mock.calls).toEqual([["boxOne"], ["boxOne"]]);
  });

  it("notifies once for a swipe, with no duplicate selection from its momentum event", () => {
    const app = render(<BoxCarousel {...props} hideBoxZero />);
    const list = app.UNSAFE_getByType(Animated.FlatList);
    const event = { nativeEvent: { contentOffset: { x: list.props.snapToInterval, y: 0 } } };
    fireEvent(list, "momentumScrollEnd", event);
    fireEvent(list, "momentumScrollEnd", event);
    expect(props.handleSelectBox.mock.calls).toEqual([["boxTwo"]]);
  });

  it("does not double-notify when momentum follows a box tap, or on programmatic selection", () => {
    const app = render(<BoxCarousel {...props} hideBoxZero />);
    fireEvent.press(app.UNSAFE_getAllByType(TouchableOpacity)[1]);
    const list = app.UNSAFE_getByType(Animated.FlatList);
    fireEvent(list, "momentumScrollEnd", { nativeEvent: { contentOffset: { x: list.props.snapToInterval, y: 0 } } });
    expect(props.handleSelectBox).toHaveBeenCalledTimes(1);
    props.handleSelectBox.mockClear();
    app.rerender(<BoxCarousel {...props} hideBoxZero activeBox="boxThree" />);
    expect(props.handleSelectBox).not.toHaveBeenCalled();
  });

  it("does not select on a disabled press or after a long press", () => {
    const onBoxLongPress = jest.fn();
    const app = render(<BoxCarousel {...props} hideBoxZero onBoxLongPress={onBoxLongPress} />);
    const box = app.UNSAFE_getAllByType(TouchableOpacity)[0];
    fireEvent(box, "pressIn");
    fireEvent(box, "longPress");
    fireEvent.press(box);
    expect(onBoxLongPress).toHaveBeenCalledWith("boxOne");
    expect(props.handleSelectBox).not.toHaveBeenCalled();
    app.rerender(<BoxCarousel {...props} hideBoxZero disabled />);
    fireEvent.press(app.UNSAFE_getAllByType(TouchableOpacity)[0]);
    expect(props.handleSelectBox).not.toHaveBeenCalled();
  });
});
