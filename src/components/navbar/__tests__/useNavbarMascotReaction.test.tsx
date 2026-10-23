import React from "react";
import * as reactions from "../navbarMascotFaces";
import { act, render, renderHook } from "@testing-library/react-native";
import { Animated, AppState, type AppStateStatus } from "react-native";
import { useNavbarMascotReaction } from "../useNavbarMascotReaction";
import NavbarMascot from "../NavbarMascot";

let mockReduceMotion = false;
const mockUseQuote = jest.fn();
jest.mock("react-native-reanimated", () => ({ useReducedMotion: () => mockReduceMotion }));
jest.mock("@/src/contexts/QuoteContext", () => ({ useQuote: () => mockUseQuote() }));
jest.mock("@/src/contexts/PopupContext", () => ({ useActivePopup: () => null }));
jest.mock("@/src/components/Box/Skin/BoxSkin", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return function MockBoxSkin({ face }: { face: string }) {
    return React.createElement(View, { testID: "mascot-face", accessibilityLabel: face });
  };
});

type Params = Parameters<typeof useNavbarMascotReaction>[0];
const defaults: Params = {
  popup: null, quote: null, tapReaction: { id: 0, count: 0, rage: false }, reduceMotion: false,
};
let changeAppState: (status: AppStateStatus) => void;
const setup = (props = defaults) => renderHook((params: Params) => useNavbarMascotReaction(params), { initialProps: props });

describe("navbar mascot reaction lifecycle", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReduceMotion = false;
    jest.spyOn(Math, "random").mockReturnValue(0);
    jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
      changeAppState = listener;
      return { remove: jest.fn() };
    });
    mockUseQuote.mockReturnValue({ quote: null, quoteEventId: 0, isVisible: false });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("winks only the eyes for 140ms after 4–8 seconds of idle", () => {
    const { result } = setup();
    expect(result.current.face).toBe("nice");
    act(() => jest.advanceTimersByTime(3999));
    expect(result.current.faceParts).toEqual({ mouth: "happy" });
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.faceParts).toEqual({ mouth: "happy", eyes: "blink" });
    expect(result.current.face).toBe("nice");
    act(() => jest.advanceTimersByTime(140));
    expect(result.current.faceParts).toEqual({ mouth: "happy" });
    act(() => jest.advanceTimersByTime(4000));
    expect(result.current.faceParts).toEqual({ mouth: "happy", eyes: "blink" });
  });

  it("uses the upper end of the random wink interval", () => {
    jest.mocked(Math.random).mockReturnValue(1);
    const { result } = setup();
    act(() => jest.advanceTimersByTime(7999));
    expect(result.current.faceParts).toEqual({ mouth: "happy" });
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.faceParts).toEqual({ mouth: "happy", eyes: "blink" });
  });

  it.each([1, 2])("shows owo then blushed for tap %s", (count) => {
    const { result } = setup({ ...defaults, tapReaction: { id: count, count, rage: false } });
    expect(result.current.face).toBe("owo");
    act(() => jest.advanceTimersByTime(299));
    expect(result.current.face).toBe("owo");
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.face).toBe("blushed");
    act(() => jest.advanceTimersByTime(899));
    expect(result.current.face).toBe("blushed");
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.face).toBe("nice");
  });

  it.each([3, 4, 5, 6])("shows xd for tap %s", (count) => {
    const { result } = setup({ ...defaults, tapReaction: { id: count, count, rage: false } });
    expect(result.current.face).toBe("xd");
    act(() => jest.advanceTimersByTime(1200));
    expect(result.current.face).toBe("nice");
  });

  it("shows anger for 1500ms on the seventh tap", () => {
    const { result } = setup({ ...defaults, tapReaction: { id: 7, count: 7, rage: true } });
    expect(result.current.face).toBe("angry");
    act(() => jest.advanceTimersByTime(1499));
    expect(result.current.face).toBe("angry");
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.face).toBe("nice");
  });

  it("interrupts a wink immediately and cancels stages from an older tap", () => {
    const { result, rerender } = setup();
    act(() => jest.advanceTimersByTime(4000));
    rerender({ ...defaults, tapReaction: { id: 1, count: 1, rage: false } });
    expect(result.current.faceParts).toBeUndefined();
    expect(result.current.face).toBe("owo");
    act(() => jest.advanceTimersByTime(100));
    rerender({ ...defaults, tapReaction: { id: 3, count: 3, rage: false } });
    act(() => jest.advanceTimersByTime(1100));
    expect(result.current.face).toBe("xd");
    act(() => jest.advanceTimersByTime(100));
    expect(result.current.face).toBe("nice");
  });

  it("cancels an active idle wink for a tap and waits a full interval after the reaction", () => {
    const { result, rerender } = setup();
    act(() => jest.advanceTimersByTime(4000));
    expect(result.current.faceParts?.eyes).toBe("blink");
    const tapped = { ...defaults, tapReaction: { id: 1, count: 1, rage: false } };
    rerender(tapped);
    expect(result.current.face).toBe("owo");
    expect(result.current.faceParts?.eyes).not.toBe("blink");
    act(() => jest.advanceTimersByTime(300));
    expect(result.current.face).toBe("blushed");
    expect(result.current.faceParts?.eyes).not.toBe("blink");
    act(() => jest.advanceTimersByTime(900));
    expect(result.current.faceParts).toEqual({ mouth: "happy" });
    act(() => jest.advanceTimersByTime(3999));
    expect(result.current.faceParts?.eyes).not.toBe("blink");
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.faceParts).toEqual({ mouth: "happy", eyes: "blink" });
  });

  it("derives face and animation identity from the same winning event", () => {
    const tapReaction = { id: 1, count: 1, rage: false };
    const quote = { id: "return_0", category: "return", eventId: 11 };
    const { result, rerender } = setup({ ...defaults, tapReaction, quote });
    expect(result.current.face).toBe("sparkle");
    expect(result.current.reactionId).toBe("quote-11-sparkle");
    rerender({ ...defaults, tapReaction, quote, popup: { id: 9, color: "angry" } });
    expect(result.current.face).toBe("sad");
    expect(result.current.reactionId).toBe("popup-9-sad");
    rerender({ ...defaults, tapReaction });
    expect(result.current.face).toBe("owo");
    expect(result.current.reactionId).toBe("tap-1-start-owo");
  });

  it("clears background reactions without replaying the last tap on resume", () => {
    const { result, rerender } = setup({ ...defaults, tapReaction: { id: 1, count: 1, rage: false } });
    act(() => changeAppState("background"));
    expect(result.current.face).toBe("nice");
    expect(jest.getTimerCount()).toBe(0);
    act(() => changeAppState("active"));
    expect(result.current.face).toBe("nice");
    act(() => jest.advanceTimersByTime(1200));
    expect(result.current.face).toBe("nice");
    rerender({ ...defaults, tapReaction: { id: 2, count: 2, rage: false } });
    expect(result.current.face).toBe("owo");
  });

  it("disables automatic winks with Reduced Motion, preserving tap faces", () => {
    const { result, rerender } = setup({ ...defaults, reduceMotion: true });
    expect(jest.getTimerCount()).toBe(0);
    rerender({ ...defaults, reduceMotion: true, tapReaction: { id: 1, count: 1, rage: false } });
    expect(result.current.face).toBe("owo");
    act(() => jest.advanceTimersByTime(1200));
    expect(result.current.face).toBe("nice");
    expect(result.current.faceParts).toEqual({ mouth: "happy" });
    expect(jest.getTimerCount()).toBe(0);
  });

  it("cancels all tap timers when unmounted", () => {
    const { unmount } = setup({ ...defaults, tapReaction: { id: 1, count: 1, rage: false } });
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each([
    ["win_fast_0", "win_fast", 0, [-3, 0]],
    ["win_standard_0", "win_standard", 0, [-3, 0, 1.06, 1]],
    ["win_standard_0", "win_standard", 0.9, [-3, 0, 1.06, 1, 4, 0]],
    ["loss_0", "loss", 0, [3, 0, 0.98, 1, -5, 0]],
    ["easter_2", "easter", 0.9, [5, -5, 0]],
    ["startup_night_0", "startup_night", 0.9, []],
  ] as const)("uses the sampled motion for %s at random value %s", (id, category, random, values) => {
    jest.mocked(Math.random).mockReturnValue(random);
    mockUseQuote.mockReturnValue({ quote: { id, category }, quoteEventId: 1, isVisible: true });
    const timing = jest.spyOn(Animated, "timing");
    const app = render(<NavbarMascot tapReaction={defaults.tapReaction} />);
    expect(timing.mock.calls.map((call) => call[1].toValue)).toEqual(values);
    app.rerender(<NavbarMascot tapReaction={{ ...defaults.tapReaction }} />);
    expect(timing.mock.calls.map((call) => call[1].toValue)).toEqual(values);
  });

  it("keeps faces but starts no motion when Reduced Motion is enabled", () => {
    mockReduceMotion = true;
    const timing = jest.spyOn(Animated, "timing");
    const loop = jest.spyOn(Animated, "loop");
    const screen = render(<NavbarMascot tapReaction={{ id: 1, count: 1, rage: false }} />);
    expect(screen.getByTestId("mascot-face")).toHaveProp("accessibilityLabel", "owo");
    act(() => jest.advanceTimersByTime(300));
    expect(screen.getByTestId("mascot-face")).toHaveProp("accessibilityLabel", "blushed");
    expect(timing).not.toHaveBeenCalled();
    expect(loop).not.toHaveBeenCalled();
  });

  it("ignores a hidden night quote in both the face and reaction identity", () => {
    const loop = jest.spyOn(Animated, "loop");
    mockUseQuote.mockReturnValue({ quote: { id: "startup_night_0", category: "startup_night" }, quoteEventId: 1, isVisible: false });
    const screen = render(<NavbarMascot tapReaction={defaults.tapReaction} />);
    expect(screen.getByTestId("mascot-face")).toHaveProp("accessibilityLabel", "nice");
    expect(loop).toHaveBeenCalledTimes(1);
    mockUseQuote.mockReturnValue({ quote: { id: "return_0", category: "return" }, quoteEventId: 1, isVisible: false });
    screen.rerender(<NavbarMascot tapReaction={defaults.tapReaction} />);
    expect(loop).toHaveBeenCalledTimes(1);
    mockUseQuote.mockReturnValue({ quote: { id: "startup_night_0", category: "startup_night" }, quoteEventId: 1, isVisible: true });
    screen.rerender(<NavbarMascot tapReaction={defaults.tapReaction} />);
    expect(screen.getByTestId("mascot-face")).toHaveProp("accessibilityLabel", "sleep");
    mockUseQuote.mockReturnValue({ quote: { id: "startup_night_0", category: "startup_night" }, quoteEventId: 1, isVisible: false });
    screen.rerender(<NavbarMascot tapReaction={defaults.tapReaction} />);
    expect(screen.getByTestId("mascot-face")).toHaveProp("accessibilityLabel", "nice");
  });
});

describe("weighted reaction stability", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, "random").mockReturnValue(0);
    jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
      changeAppState = listener;
      return { remove: jest.fn() };
    });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const praise = { id: "win_standard_0", category: "win_standard", eventId: 1 };

  it("draws once per event, including repeated occurrences of the same quote text", () => {
    const draw = jest.spyOn(reactions, "pickWeightedNavbarReaction");
    const { result, rerender } = setup({ ...defaults, quote: praise });
    expect(draw).toHaveBeenCalledTimes(1);
    expect(result.current.face).toBe("happy");
    const firstIdentity = result.current.reactionId;
    jest.mocked(Math.random).mockReturnValue(0.9);
    rerender({ ...defaults, quote: { ...praise } });
    rerender({ ...defaults, quote: { ...praise }, reduceMotion: true });
    expect(draw).toHaveBeenCalledTimes(1);
    expect(result.current.reactionId).toBe(firstIdentity);
    expect(result.current.face).toBe("happy");
    rerender({ ...defaults, quote: { ...praise, eventId: 2 } });
    expect(draw).toHaveBeenCalledTimes(2);
    expect(result.current.face).toBe("blushed");
    expect(result.current.motion).toBe("tilt");
    expect(result.current.reactionId).not.toBe(firstIdentity);
  });

  it("keeps the sampled quote and popup variants while higher-priority sources come and go", () => {
    const draw = jest.spyOn(reactions, "pickWeightedNavbarReaction");
    const { result, rerender } = setup({ ...defaults, quote: praise });
    const identity = result.current.reactionId;
    jest.mocked(Math.random).mockReturnValue(0.9);
    const popup = { id: 5, color: "angry" as const };
    rerender({ ...defaults, quote: praise, popup });
    expect(result.current.face).toBe("encouraging");
    expect(draw).toHaveBeenCalledTimes(2);
    rerender({ ...defaults, quote: { ...praise }, popup: { ...popup } });
    expect(draw).toHaveBeenCalledTimes(2);
    rerender({ ...defaults, quote: praise });
    expect(result.current.face).toBe("happy");
    expect(result.current.reactionId).toBe(identity);
    expect(draw).toHaveBeenCalledTimes(2);
  });

  it("does not draw a hidden quote until it gains priority", () => {
    const draw = jest.spyOn(reactions, "pickWeightedNavbarReaction");
    const popup = { id: 5, color: "calm" as const };
    const { result, rerender } = setup({ ...defaults, popup, quote: praise });
    expect(draw).toHaveBeenCalledTimes(1);
    jest.mocked(Math.random).mockReturnValue(0.9);
    rerender({ ...defaults, quote: praise });
    expect(draw).toHaveBeenCalledTimes(2);
    expect(result.current.face).toBe("blushed");
  });

  it("allows consecutive equal outcomes with independent fixed probabilities", () => {
    const draw = jest.spyOn(reactions, "pickWeightedNavbarReaction");
    const { result, rerender } = setup({ ...defaults, quote: praise });
    rerender({ ...defaults, quote: { ...praise, eventId: 2 } });
    expect(result.current.face).toBe("happy");
    expect(draw).toHaveBeenCalledTimes(2);
    expect(draw.mock.calls.map((call) => call[1])).toEqual([0, 0]);
  });

  it("uses the selected warm tap variant for the final 900ms", () => {
    const { result } = setup({ ...defaults, tapReaction: { id: 1, count: 1, rage: false } });
    expect(result.current.face).toBe("owo");
    jest.mocked(Math.random).mockReturnValue(0.5);
    act(() => jest.advanceTimersByTime(300));
    expect(result.current.face).toBe("blushed");
    expect(result.current.motion).toBe("tilt");
    act(() => jest.advanceTimersByTime(899));
    expect(result.current.face).toBe("blushed");
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.face).toBe("nice");
  });

  it("does not delay or sample a tap that expires while covered by a popup", () => {
    const draw = jest.spyOn(reactions, "pickWeightedNavbarReaction");
    const tapReaction = { id: 1, count: 1, rage: false };
    const { result, rerender } = setup({ ...defaults, tapReaction, popup: { id: 1, color: "calm" } });
    act(() => jest.advanceTimersByTime(1200));
    expect(draw).toHaveBeenCalledTimes(1);
    rerender({ ...defaults, tapReaction });
    expect(result.current.isIdle).toBe(true);
    expect(result.current.face).toBe("nice");
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it("preserves the original tap deadline and variant across a popup", () => {
    const tapReaction = { id: 3, count: 3, rage: false };
    const { result, rerender } = setup({ ...defaults, tapReaction });
    const identity = result.current.reactionId;
    act(() => jest.advanceTimersByTime(400));
    rerender({ ...defaults, tapReaction, popup: { id: 9, color: "angry" } });
    act(() => jest.advanceTimersByTime(400));
    rerender({ ...defaults, tapReaction });
    expect(result.current.reactionId).toBe(identity);
    act(() => jest.advanceTimersByTime(400));
    expect(result.current.isIdle).toBe(true);
  });

  it("keeps face layers and motion together for angry and sleepy variants", () => {
    jest.mocked(Math.random).mockReturnValue(0.9);
    const { result, rerender } = setup({ ...defaults, tapReaction: { id: 7, count: 7, rage: true } });
    expect(result.current).toMatchObject({ face: "angry", motion: "shake", faceParts: { eyes: "ez" } });
    rerender({ ...defaults, quote: { id: "startup_night_0", category: "startup_night", eventId: 2 } });
    expect(result.current).toMatchObject({ face: "sleep", motion: "still", faceParts: { mouth: "smile", zzz: false } });
  });

  it("does not draw twice when React repeats effects in StrictMode", () => {
    const draw = jest.spyOn(reactions, "pickWeightedNavbarReaction");
    const wrapper = ({ children }: React.PropsWithChildren) => <React.StrictMode>{children}</React.StrictMode>;
    const { result } = renderHook(() => useNavbarMascotReaction({ ...defaults, quote: praise }), { wrapper });
    expect(result.current.face).toBe("happy");
    expect(draw).toHaveBeenCalledTimes(1);
  });
});
