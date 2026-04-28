import {
  pickEarlyGameAutoflowDecision,
  pickEndGameAutoflowDecision,
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
