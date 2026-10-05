import { act, renderHook } from "@testing-library/react-native";
import { Animated, Keyboard, Platform, type KeyboardEvent } from "react-native";
import { useKeyboardBottomOffset } from "../useKeyboardBottomOffset";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const keyboardEvent: KeyboardEvent = {
  duration: 320,
  easing: "keyboard",
  endCoordinates: { screenX: 0, screenY: 340, width: 360, height: 300 },
};

describe("keyboard dock animation", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Keyboard, "isVisible").mockReturnValue(false);
    jest.spyOn(Keyboard, "metrics").mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function setup() {
    const listeners = new Map<string, (event: KeyboardEvent) => void>();
    jest.spyOn(Keyboard, "addListener").mockImplementation((name, listener) => {
      listeners.set(name, listener);
      return { remove: () => { listeners.delete(name); } } as ReturnType<typeof Keyboard.addListener>;
    });
    const timing = jest.spyOn(Animated, "timing").mockImplementation(() => ({
      start: jest.fn(), stop: jest.fn(), reset: jest.fn(),
    }));
    const hook = renderHook<ReturnType<typeof useKeyboardBottomOffset>, { targetBottomInWindow: number }>(({ targetBottomInWindow }) => useKeyboardBottomOffset({
      targetBottomInWindow, gap: 8, androidDurationMs: 320,
    }), { initialProps: { targetBottomInWindow: 518 } });
    const show = () => act(() => listeners.get(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
    )?.(keyboardEvent));
    const hide = () => act(() => listeners.get(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
    )?.({ ...keyboardEvent, endCoordinates: { ...keyboardEvent.endCoordinates, height: 0 } }));
    return { ...hook, timing, show, hide };
  }

  it("does not restart the lift after a visibility render or duplicate show event", () => {
    const { timing, show } = setup();
    show();
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0][1]).toMatchObject({ toValue: 186, duration: 320 });
    show();
    expect(timing).toHaveBeenCalledTimes(1);
  });

  it("stays lowered after hide even when live metrics still describe the keyboard", () => {
    const { result, timing, show, hide, rerender } = setup();
    show();
    jest.mocked(Keyboard.isVisible).mockReturnValue(true);
    jest.mocked(Keyboard.metrics).mockReturnValue(keyboardEvent.endCoordinates);
    hide();
    // A layout measurement during dismissal must not resurrect stale metrics.
    rerender({ targetBottomInWindow: 520 });
    act(() => jest.advanceTimersByTime(500));
    expect(result.current.keyboardVisible).toBe(false);
    expect(result.current.keyboardTopInWindow).toBeNull();
    expect(timing.mock.calls.map(([, config]) => config.toValue)).toEqual([186, 0]);
    show();
    expect(result.current.keyboardVisible).toBe(true);
    expect(timing.mock.calls.map(([, config]) => config.toValue)).toEqual([186, 0, 188]);
  });

  it("uses native keyboard coordinates when Android has already resized the window", () => {
    jest.spyOn(jest.requireActual<typeof import("react-native")>("react-native"), "useWindowDimensions").mockReturnValue({
      width: 360, height: 340, scale: 2, fontScale: 1,
    });
    const { result, timing, show } = setup();
    show();
    expect(result.current.keyboardTopInWindow).toBe(340);
    expect(timing.mock.calls[0][1].toValue).toBe(186);
  });

  it("recomputes the lift when the untransformed dock geometry changes", () => {
    const { timing, show, rerender } = setup();
    show();
    rerender({ targetBottomInWindow: 530 });
    expect(timing.mock.calls.map(([, config]) => config.toValue)).toEqual([186, 198]);
  });

  it("raises an activated dock when the keyboard is already open", () => {
    jest.mocked(Keyboard.isVisible).mockReturnValue(true);
    jest.mocked(Keyboard.metrics).mockReturnValue(keyboardEvent.endCoordinates);
    const { result, timing } = setup();
    expect(result.current.keyboardVisible).toBe(true);
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0][1].toValue).toBe(186);
  });
});

it("clears a raised keyboard offset immediately when disabled", () => {
  const { result, rerender } = renderHook<ReturnType<typeof useKeyboardBottomOffset>, { enabled: boolean }>(
    ({ enabled }) => useKeyboardBottomOffset({ enabled }),
    { initialProps: { enabled: true } },
  );
  act(() => result.current.bottomOffset.setValue(230));
  rerender({ enabled: false });
  expect((result.current.bottomOffset as unknown as { __getValue: () => number }).__getValue()).toBe(0);
});
