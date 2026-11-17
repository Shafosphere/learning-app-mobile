import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useCoachmarkFlow } from "@/src/hooks/useCoachmarkFlow";
import type { CoachmarkFlowStep } from "@/src/constants/coachmarkFlows";
import React from "react";
import { NavigationContext } from "@react-navigation/native";

let mockPortraitReady = true;
const mockUseTutorialPortrait = jest.fn((required: boolean) => !required || mockPortraitReady);
jest.mock("@/src/contexts/TutorialOrientationContext", () => ({
  useTutorialPortrait: (required: boolean) => mockUseTutorialPortrait(required),
}));

const mockStart = jest.fn(() => Promise.resolve());
const mockNext = jest.fn();
const mockBack = jest.fn();
const mockStop = jest.fn(() => Promise.resolve());
let mockCoachmarkState = {
  isActive: true,
  activeTour: { key: "test-flow" },
  index: 0,
};

jest.mock("@edwardloopez/react-native-coachmark", () => ({
  createTour: jest.fn((key, steps) => ({ key, steps })),
  useCoachmarkContext: jest.fn(() => ({
    start: mockStart,
    next: mockNext,
    back: mockBack,
    stop: mockStop,
    state: mockCoachmarkState,
  })),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

const steps: CoachmarkFlowStep[] = [
  {
    id: "step-1",
    targetId: "target-1",
    titleKey: "title",
    descriptionKey: "description",
    kind: "info",
    advanceOn: "manual",
  },
];

describe("useCoachmarkFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPortraitReady = true;
    mockCoachmarkState = {
      isActive: true,
      activeTour: { key: "test-flow" },
      index: 0,
    };
  });

  it("calls onComplete exactly once when the flow finishes", async () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() =>
      useCoachmarkFlow({
        flowKey: "test-flow",
        storageKey: "@test_flow_seen",
        shouldStart: true,
        steps,
        onComplete,
      }),
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    await act(async () => {
      await result.current.goNext();
      await result.current.goNext();
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    expect(mockStop).toHaveBeenCalledTimes(1);
  });

  it("marks the flow seen and stops it when skipped", async () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() =>
      useCoachmarkFlow({
        flowKey: "test-flow",
        storageKey: "@test_flow_seen",
        shouldStart: true,
        steps,
        onComplete,
      }),
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    await act(async () => {
      await result.current.skipFlow();
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith("@test_flow_seen", "1");
    expect(mockStop).toHaveBeenCalledWith("completed");
    expect(onComplete).not.toHaveBeenCalled();
    expect(mockUseTutorialPortrait).toHaveBeenLastCalledWith(false);
  });

  it("waits for portrait readiness before starting a tour", async () => {
    jest.useFakeTimers();
    try {
      mockCoachmarkState = { isActive: false, activeTour: { key: "other" }, index: 0 };
      mockPortraitReady = false;
      const { rerender } = renderHook(() => useCoachmarkFlow({
        flowKey: "test-flow", storageKey: "@test_flow_seen", shouldStart: true, steps,
      }));
      await act(async () => {});
      act(() => jest.advanceTimersByTime(2000));
      expect(mockStart).not.toHaveBeenCalled();
      mockPortraitReady = true;
      rerender({});
      act(() => jest.advanceTimersByTime(600));
      expect(mockStart).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("pauses automatic progression during rotation and resumes the same step", async () => {
    jest.useFakeTimers();
    try {
      const autoSteps: CoachmarkFlowStep[] = [{ ...steps[0], advanceOn: "pin_course" }];
      const completionState = { pin_course: true };
      const { rerender } = renderHook(() => useCoachmarkFlow({
        flowKey: "test-flow", storageKey: "@test_flow_seen", shouldStart: true,
        steps: autoSteps, completionState,
      }));
      await act(async () => {});
      act(() => jest.advanceTimersByTime(100));
      mockPortraitReady = false;
      rerender({});
      act(() => jest.advanceTimersByTime(1000));
      expect(mockNext).not.toHaveBeenCalled();
      mockPortraitReady = true;
      rerender({});
      act(() => jest.advanceTimersByTime(180));
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockCoachmarkState.index).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it("releases portrait on screen blur and resumes the existing tour on focus", async () => {
    let focused = true;
    const listeners = new Map<string, () => void>();
    const navigation = {
      isFocused: () => focused,
      addListener: (event: string, listener: () => void) => {
        listeners.set(event, listener);
        return () => listeners.delete(event);
      },
    };
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <NavigationContext.Provider value={navigation as any}>{children}</NavigationContext.Provider>
    );
    const { result } = renderHook(() => useCoachmarkFlow({
      flowKey: "test-flow", storageKey: "@test_flow_seen", shouldStart: true, steps,
    }), { wrapper });
    await act(async () => {});
    expect(mockUseTutorialPortrait).toHaveBeenLastCalledWith(true);
    act(() => { focused = false; listeners.get("blur")?.(); });
    expect(mockUseTutorialPortrait).toHaveBeenLastCalledWith(false);
    expect(result.current.isActive).toBe(false);
    await act(async () => { focused = true; listeners.get("focus")?.(); });
    expect(mockUseTutorialPortrait).toHaveBeenLastCalledWith(true);
    expect(result.current.currentStep?.id).toBe("step-1");
  });

  it("reloads visibility after onboarding is reset while the screen stays mounted", async () => {
    mockCoachmarkState = { isActive: false, activeTour: { key: "other" }, index: 0 };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("1");
    let focused = true;
    const listeners = new Map<string, () => void>();
    const navigation = {
      isFocused: () => focused,
      addListener: (event: string, listener: () => void) => {
        listeners.set(event, listener);
        return () => listeners.delete(event);
      },
    };
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <NavigationContext.Provider value={navigation as any}>{children}</NavigationContext.Provider>
    );
    const { result } = renderHook(() => useCoachmarkFlow({
      flowKey: "test-flow", storageKey: "@test_flow_seen", shouldStart: true, steps,
    }), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.hasSeen).toBe(true);
    act(() => { focused = false; listeners.get("blur")?.(); });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    mockPortraitReady = false;
    await act(async () => { focused = true; listeners.get("focus")?.(); });
    expect(result.current.hasSeen).toBe(false);
    expect(result.current.isPendingStart).toBe(true);
    expect(mockUseTutorialPortrait).toHaveBeenLastCalledWith(true);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("does not start a main flow already marked seen by global skip", async () => {
    mockCoachmarkState = {
      isActive: false,
      activeTour: { key: "other-flow" },
      index: 0,
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("1");

    const { result } = renderHook(() =>
      useCoachmarkFlow({
        flowKey: "flashcards-guided",
        storageKey: "@flashcards_intro_seen_v1",
        shouldStart: true,
        steps,
      }),
    );

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
      expect(result.current.hasSeen).toBe(true);
    });
    expect(result.current.isPendingStart).toBe(false);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it.each(["complete", "skip"] as const)("keeps a replay seen after %s and refocus, and accepts a new token", async (action) => {
    jest.useFakeTimers();
    try {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("1");
      let focused = true;
      const listeners = new Map<string, () => void>();
      const navigation = {
        isFocused: () => focused,
        addListener: (event: string, listener: () => void) => {
          listeners.set(event, listener);
          return () => listeners.delete(event);
        },
      };
      const wrapper = ({ children }: React.PropsWithChildren) => (
        <NavigationContext.Provider value={navigation as any}>{children}</NavigationContext.Provider>
      );
      mockCoachmarkState = { isActive: false, activeTour: { key: "test-flow" }, index: 0 };
      const { result, rerender } = renderHook(({ token }: { token: string[] }) => useCoachmarkFlow({
        flowKey: "test-flow", storageKey: "@test_flow_seen", shouldStart: true, steps,
        restartToken: token,
      }), { wrapper, initialProps: { token: ["replay-1"] } });
      await act(async () => {});
      act(() => jest.advanceTimersByTime(600));
      expect(mockStart).toHaveBeenCalledTimes(1);
      mockCoachmarkState = { ...mockCoachmarkState, isActive: true };
      rerender({ token: ["replay-1"] });

      // Stored completion from the previous run must not interrupt an unfinished replay.
      act(() => { focused = false; listeners.get("blur")?.(); });
      await act(async () => { focused = true; listeners.get("focus")?.(); });
      expect(result.current.hasSeen).toBe(false);

      await act(async () => {
        await (action === "complete" ? result.current.goNext() : result.current.skipFlow());
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith("@test_flow_seen", "1");
      expect(result.current.hasSeen).toBe(true);
      mockCoachmarkState = { ...mockCoachmarkState, isActive: false };
      act(() => { focused = false; listeners.get("blur")?.(); });
      mockUseTutorialPortrait.mockClear();
      await act(async () => { focused = true; listeners.get("focus")?.(); });
      rerender({ token: ["replay-1"] });
      await act(async () => {});
      act(() => jest.advanceTimersByTime(600));
      expect(result.current.hasSeen).toBe(true);
      expect(result.current.isPendingStart).toBe(false);
      expect(mockUseTutorialPortrait).not.toHaveBeenCalledWith(true);
      expect(mockStart).toHaveBeenCalledTimes(1);

      rerender({ token: ["replay-2"] });
      await act(async () => {});
      expect(result.current.hasSeen).toBe(false);
      act(() => jest.advanceTimersByTime(600));
      expect(mockStart).toHaveBeenCalledTimes(2);
    } finally {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      jest.useRealTimers();
    }
  });
});
