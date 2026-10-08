import { createRef } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Animated, Text, View } from "react-native";
import { FlashcardsBottomDock } from "../FlashcardsBottomDock";

jest.mock("@edwardloopez/react-native-coachmark", () => ({
  CoachmarkAnchor: ({ children }: { children: React.ReactNode }) => children,
}));

it("forwards layout, filters height jitter and measures the unanimated anchor", () => {
  const onLayout = jest.fn();
  const setHeight = jest.fn();
  const measure = jest.fn();
  const anchorRef = createRef<View>();
  const { getByTestId, getByText } = render(
    <FlashcardsBottomDock
      bottomOffset={12}
      keyboardOffset={new Animated.Value(100)}
      anchorRef={anchorRef}
      setHeight={setHeight}
      measure={measure}
      styles={{ bottomButtonsDock: {}, bottomButtonsWrapper: {} }}
      onLayout={onLayout}
      testID="dock"
      coachmarkId="review-buttons"
    >
      <Text>Actions</Text>
    </FlashcardsBottomDock>,
  );
  const event = { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 80 } } };
  fireEvent(getByTestId("dock"), "layout", event);
  expect(onLayout).toHaveBeenCalledWith(event);
  expect(measure).toHaveBeenCalledTimes(1);
  const updateHeight = setHeight.mock.calls[0][0];
  expect(updateHeight(0)).toBe(80);
  expect(updateHeight(79.5)).toBe(79.5);
  expect(getByTestId("dock").props.collapsable).toBe(false);
  expect(getByText("Actions")).toBeTruthy();
});
