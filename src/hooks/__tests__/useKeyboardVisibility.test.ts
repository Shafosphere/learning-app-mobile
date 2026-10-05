import { act, renderHook } from "@testing-library/react-native";
import { Keyboard, type KeyboardEvent } from "react-native";
import { useKeyboardVisibility } from "../useKeyboardVisibility";

const event = (screenY: number): KeyboardEvent => ({
  duration: 0, easing: "keyboard",
  endCoordinates: { screenY, screenX: 0, width: 360, height: 300 },
});

describe("useKeyboardVisibility", () => {
  afterEach(() => jest.restoreAllMocks());

  it("reads an already-open keyboard and tracks changes independently of dock position", () => {
    jest.spyOn(Keyboard, "isVisible").mockReturnValue(true);
    jest.spyOn(Keyboard, "metrics").mockReturnValue(event(340).endCoordinates);
    const listeners = jest.spyOn(Keyboard, "addListener");
    const { result, unmount } = renderHook(useKeyboardVisibility);
    expect(result.current).toEqual({ keyboardVisible: true, keyboardTopInWindow: 340 });
    act(() => listeners.mock.calls.filter(([name]) => name === "keyboardDidChangeFrame").forEach(([, listener]) => listener(event(300))));
    expect(result.current.keyboardTopInWindow).toBe(300);
    act(() => listeners.mock.calls.filter(([name]) => name === "keyboardDidHide").forEach(([, listener]) => listener(event(640))));
    expect(result.current).toEqual({ keyboardVisible: false, keyboardTopInWindow: null });
    unmount();
  });
});
