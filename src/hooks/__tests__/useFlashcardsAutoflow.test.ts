import { act, renderHook } from "@testing-library/react-native";
import {
  pickEarlyGameAutoflowDecision,
  pickEndGameAutoflowDecision,
  useFlashcardsAutoflow,
  SWITCH_STICKY_MS,
} from "@/src/hooks/useFlashcardsAutoflow";
import type { BoxesState } from "@/src/types/boxes";

const makeCards = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    text: `card-${index + 1}`,
    translations: [`translation-${index + 1}`],
    flipped: false,
    answerOnly: false,
    hintFront: null,
    hintBack: null,
    imageFront: null,
    imageBack: null,
    explanation: null,
    type: "text" as const,
  }));

const makeBoxes = (overrides: Partial<BoxesState> = {}): BoxesState => ({
  boxZero: [],
  boxOne: [],
  boxTwo: [],
  boxThree: [],
  boxFour: [],
  boxFive: [],
  ...overrides,
});

describe("useFlashcardsAutoflow transition plan", () => {
  type Params = Parameters<typeof useFlashcardsAutoflow>[0];
  const params = (overrides: Partial<Params> = {}): Params => ({
    enabled: true, canSwitch: true, activeBox: "boxOne", boxZeroEnabled: false,
    boxes: makeBoxes({ boxOne: makeCards(6), boxTwo: makeCards(12) }),
    totalFlashcardsInCourse: 50, isReady: false, introBoxLimitReached: false,
    handleSelectBox: jest.fn(), downloadMore: jest.fn(() => Promise.resolve()),
    ...overrides,
  });

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it.each(["enabled", "canSwitch"] as const)("does not hold or switch when %s is false", (flag) => {
    const input = params({ [flag]: false });
    const { result } = renderHook(() => useFlashcardsAutoflow(input));
    expect(result.current.isSwitchPending).toBe(false);
    expect(input.handleSelectBox).not.toHaveBeenCalled();
  });

  it("respects the sticky interval before announcing and executing another switch", () => {
    const input = params();
    const { result, rerender } = renderHook((current: Params) => useFlashcardsAutoflow(current), {
      initialProps: input,
    });
    expect(result.current.isSwitchPending).toBe(true);
    expect(input.handleSelectBox).toHaveBeenLastCalledWith("boxTwo");
    const returning = { ...input, activeBox: "boxTwo" as const, boxes: makeBoxes({ boxOne: makeCards(6) }) };
    rerender(returning);
    expect(result.current.isSwitchPending).toBe(false);
    expect(input.handleSelectBox).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(SWITCH_STICKY_MS));
    rerender(returning);
    expect(result.current.isSwitchPending).toBe(true);
    expect(input.handleSelectBox).toHaveBeenLastCalledWith("boxOne");
    expect(input.handleSelectBox).toHaveBeenCalledTimes(2);
  });

  it("retains the endgame drain target as lower boxes refill, then drains boxFour", () => {
    const input = params({
      remainingNewFlashcardsCount: 0, canSwitch: false,
      boxes: makeBoxes({ boxOne: makeCards(1), boxFour: makeCards(3), boxFive: makeCards(20) }),
    });
    const { result, rerender } = renderHook((current: Params) => useFlashcardsAutoflow(current), {
      initialProps: input,
    });
    const refilled = { ...input, canSwitch: true, boxes: { ...input.boxes, boxTwo: makeCards(12) } };
    rerender(refilled);
    expect(result.current.isSwitchPending).toBe(true);
    expect(input.handleSelectBox).toHaveBeenLastCalledWith("boxFive");
    rerender({ ...refilled, activeBox: "boxFive" });
    expect(result.current.isSwitchPending).toBe(false);
    expect(input.handleSelectBox).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(SWITCH_STICKY_MS));
    rerender({ ...refilled, activeBox: "boxFive", boxes: { ...refilled.boxes, boxFive: [] } });
    expect(input.handleSelectBox).toHaveBeenLastCalledWith("boxFour");
  });

  it("keeps only one download in flight while switching is blocked", async () => {
    let finishDownload!: () => void;
    const downloadMore = jest.fn(() => new Promise<void>((resolve) => { finishDownload = resolve; }));
    const input = params({
      boxes: makeBoxes({ boxOne: makeCards(1) }), isReady: true, canSwitch: false, downloadMore,
    });
    const { result, rerender } = renderHook((current: Params) => useFlashcardsAutoflow(current), {
      initialProps: input,
    });
    expect(downloadMore).toHaveBeenCalledTimes(1);
    rerender({ ...input, boxes: { ...input.boxes } });
    expect(downloadMore).toHaveBeenCalledTimes(1);
    expect(result.current.isSwitchPending).toBe(false);
    await act(async () => { finishDownload(); });
  });
});

describe("pickAutoflowDecision with boxZero", () => {
  it("keeps active cleanup box before returning to boxZero", () => {
    const decision = pickEarlyGameAutoflowDecision({
      boxes: makeBoxes({
        boxZero: makeCards(8),
        boxTwo: makeCards(3),
      }),
      activeBox: "boxTwo",
      boxZeroEnabled: true,
      canDownloadMore: true,
      flushThreshold: 12,
    });

    expect(decision).toEqual({
      targetBox: "boxTwo",
      shouldDownloadNew: false,
    });
  });

  it("clears clogged boxes before returning to boxZero", () => {
    const decision = pickEarlyGameAutoflowDecision({
      boxes: makeBoxes({
        boxZero: makeCards(8),
        boxTwo: makeCards(12),
      }),
      activeBox: "boxOne",
      boxZeroEnabled: true,
      canDownloadMore: true,
      flushThreshold: 12,
    });

    expect(decision).toEqual({
      targetBox: "boxTwo",
      shouldDownloadNew: false,
    });
  });

  it("still selects boxZero when no cleanup or boxOne work is urgent", () => {
    const decision = pickEarlyGameAutoflowDecision({
      boxes: makeBoxes({
        boxZero: makeCards(2),
        boxOne: makeCards(5),
      }),
      activeBox: "boxOne",
      boxZeroEnabled: true,
      canDownloadMore: true,
      flushThreshold: 12,
    });

    expect(decision).toEqual({
      targetBox: "boxZero",
      shouldDownloadNew: false,
    });
  });

  it("does not let boxZero interrupt a locked endgame drain target", () => {
    const decision = pickEndGameAutoflowDecision({
      boxes: makeBoxes({
        boxZero: makeCards(8),
        boxFive: makeCards(3),
      }),
      activeBox: "boxOne",
      boxZeroEnabled: true,
      canDownloadMore: false,
      flushThreshold: 12,
      remainingNewFlashcardsCount: 0,
      lockedEndGameDrainTarget: "boxFive",
    });

    expect(decision).toEqual({
      targetBox: "boxFive",
      shouldDownloadNew: false,
    });
  });
});
