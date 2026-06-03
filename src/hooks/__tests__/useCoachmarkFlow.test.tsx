import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useCoachmarkFlow } from "@/src/hooks/useCoachmarkFlow";
import type { CoachmarkFlowStep } from "@/src/constants/coachmarkFlows";

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
  });
});
