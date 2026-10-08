import { createRef } from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { TextInput } from "react-native";
import { KeyboardBridgeInput } from "../KeyboardBridgeInput";

jest.mock("@/src/features/flashcards/study/study.styles", () => ({
  useStyles: () => ({ keyboardBridgeInput: { width: 1, height: 1 } }),
}));

it("exposes native focus ref and forwards optional diagnostics", () => {
  const ref = createRef<TextInput>();
  const onFocus = jest.fn();
  const onBlur = jest.fn();
  const { UNSAFE_getByType, rerender } = render(
    <KeyboardBridgeInput ref={ref} onFocus={onFocus} onBlur={onBlur} />,
  );
  expect(typeof ref.current?.focus).toBe("function");
  const input = UNSAFE_getByType(TextInput);
  expect(input.props).toMatchObject({
    value: "", caretHidden: true, autoCorrect: false, spellCheck: false,
    autoCapitalize: "none", importantForAutofill: "no", textContentType: "none",
  });
  fireEvent(input, "focus", { nativeEvent: {} });
  fireEvent(input, "blur", { nativeEvent: {} });
  expect(onFocus).toHaveBeenCalledTimes(1);
  expect(onBlur).toHaveBeenCalledTimes(1);
  rerender(<KeyboardBridgeInput ref={ref} />);
  expect(UNSAFE_getByType(TextInput).props.onFocus).toBeUndefined();
});
