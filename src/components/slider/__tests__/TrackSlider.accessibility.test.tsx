import { fireEvent, render } from "@testing-library/react-native";
import { TrackSlider } from "../TrackSlider";

it("exposes the volume label and percentage and supports screen reader adjustment", () => {
  const onValueChange = jest.fn();
  const onSlidingComplete = jest.fn();
  const props = { value: 0.5, onValueChange, onSlidingComplete, accessibilityLabel: "Flashcard audio", accessibilityValueText: "50%" };
  const screen = render(<TrackSlider {...props} />);
  const slider = screen.getByRole("adjustable", { name: "Flashcard audio" });
  expect(slider.props.accessibilityValue.text).toBe("50%");
  fireEvent(slider, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
  expect(onSlidingComplete).toHaveBeenLastCalledWith(0.51);
  fireEvent(slider, "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
  expect(onSlidingComplete).toHaveBeenLastCalledWith(0.49);
  screen.rerender(<TrackSlider {...props} disabled />);
  onValueChange.mockClear();
  fireEvent(screen.getByRole("adjustable"), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
  expect(onValueChange).not.toHaveBeenCalled();
});
