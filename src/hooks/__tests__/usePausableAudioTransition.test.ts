import { act, renderHook } from "@testing-library/react-native";
import { scheduleAudioTransition } from "@/Audio/runtime/scheduleAudioTransition";
import { usePausableAudioTransition } from "../usePausableAudioTransition";

jest.mock("@/Audio/runtime/scheduleAudioTransition", () => ({
  scheduleAudioTransition: jest.fn((callback: () => void, delay: number) => {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
  }),
}));

describe("preview pauses study transitions", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("defers a transition scheduled before opening and resumes it exactly once", () => {
    const callback = jest.fn();
    const { result, rerender } = renderHook(({ paused }: { paused: boolean }) => usePausableAudioTransition(paused), {
      initialProps: { paused: false },
    });
    act(() => { result.current(callback, 100); });
    rerender({ paused: true });
    act(() => jest.advanceTimersByTime(1000));
    expect(callback).not.toHaveBeenCalled();
    rerender({ paused: false });
    expect(callback).toHaveBeenCalledTimes(1);
    rerender({ paused: false });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("keeps the original feedback/audio deadline if the preview closes early", () => {
    const callback = jest.fn();
    const { result, rerender } = renderHook(({ paused }: { paused: boolean }) => usePausableAudioTransition(paused), {
      initialProps: { paused: true },
    });
    act(() => { result.current(callback, 1000); });
    rerender({ paused: false });
    expect(callback).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1000));
    expect(callback).toHaveBeenCalledTimes(1);
    expect(scheduleAudioTransition).toHaveBeenCalledWith(expect.any(Function), 1000);
  });

  it.each(["cancel", "unmount"])("discards a deferred transition on %s", (action) => {
    const callback = jest.fn();
    const { result, rerender, unmount } = renderHook(({ paused }: { paused: boolean }) => usePausableAudioTransition(paused), {
      initialProps: { paused: true },
    });
    const cancel = result.current(callback, 10);
    act(() => jest.advanceTimersByTime(100));
    if (action === "cancel") {
      act(cancel);
      rerender({ paused: false });
    } else unmount();
    act(() => jest.runOnlyPendingTimers());
    expect(callback).not.toHaveBeenCalled();
  });
});
