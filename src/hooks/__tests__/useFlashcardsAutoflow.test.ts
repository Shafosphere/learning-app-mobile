import { pickAutoflowDecision } from "@/src/hooks/useFlashcardsAutoflow";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";

function makeCard(id: number): WordWithTranslations {
  return {
    id,
    text: `word-${id}`,
    translations: [`translation-${id}`],
    flipped: false,
    answerOnly: false,
    hintFront: null,
    hintBack: null,
    imageFront: null,
    imageBack: null,
    explanation: null,
    type: "text",
  };
}

function makeCards(count: number, startId = 1): WordWithTranslations[] {
  return Array.from({ length: count }, (_, index) => makeCard(startId + index));
}

function makeBoxes(overrides: Partial<BoxesState> = {}): BoxesState {
  return {
    boxZero: overrides.boxZero ?? [],
    boxOne: overrides.boxOne ?? [],
    boxTwo: overrides.boxTwo ?? [],
    boxThree: overrides.boxThree ?? [],
    boxFour: overrides.boxFour ?? [],
    boxFive: overrides.boxFive ?? [],
  };
}

describe("pickAutoflowDecision", () => {
  it("keeps the active cleanup box sticky while it stays above the exit threshold", () => {
    const decision = pickAutoflowDecision({
      boxes: makeBoxes({
        boxOne: makeCards(3, 1),
        boxFour: makeCards(10, 100),
      }),
      activeBox: "boxFour",
      boxZeroEnabled: false,
      canDownloadMore: true,
      flushThreshold: 20,
    });

    expect(decision).toEqual({
      targetBox: "boxFour",
      shouldDownloadNew: false,
    });
  });

  it("leaves the active cleanup box once it drops below the exit threshold", () => {
    const decision = pickAutoflowDecision({
      boxes: makeBoxes({
        boxOne: makeCards(6, 1),
        boxFour: makeCards(9, 100),
      }),
      activeBox: "boxFour",
      boxZeroEnabled: false,
      canDownloadMore: true,
      flushThreshold: 20,
    });

    expect(decision).toEqual({
      targetBox: "boxOne",
      shouldDownloadNew: false,
    });
  });

  it("prefers the highest clogged cleanup box when the lower buffer is not critical", () => {
    const decision = pickAutoflowDecision({
      boxes: makeBoxes({
        boxOne: makeCards(5, 1),
        boxThree: makeCards(30, 100),
        boxFour: makeCards(48, 200),
      }),
      activeBox: "boxOne",
      boxZeroEnabled: false,
      canDownloadMore: false,
      flushThreshold: 20,
    });

    expect(decision).toEqual({
      targetBox: "boxFour",
      shouldDownloadNew: false,
    });
  });

  it("interrupts sticky cleanup when the lower buffer becomes critical", () => {
    const decision = pickAutoflowDecision({
      boxes: makeBoxes({
        boxOne: makeCards(25, 1),
        boxFour: makeCards(10, 100),
      }),
      activeBox: "boxFour",
      boxZeroEnabled: false,
      canDownloadMore: true,
      flushThreshold: 20,
    });

    expect(decision).toEqual({
      targetBox: "boxOne",
      shouldDownloadNew: false,
    });
  });

  it("blocks switching into a clogged cleanup box when the lower buffer is critical", () => {
    const decision = pickAutoflowDecision({
      boxes: makeBoxes({
        boxOne: makeCards(25, 1),
        boxFive: makeCards(48, 100),
      }),
      activeBox: "boxOne",
      boxZeroEnabled: false,
      canDownloadMore: true,
      flushThreshold: 20,
    });

    expect(decision).toEqual({
      targetBox: "boxOne",
      shouldDownloadNew: false,
    });
  });

  it("targets the lower buffer when it is above the healthy range but below critical", () => {
    const decision = pickAutoflowDecision({
      boxes: makeBoxes({
        boxOne: makeCards(6, 1),
      }),
      activeBox: "boxThree",
      boxZeroEnabled: false,
      canDownloadMore: true,
      flushThreshold: 20,
    });

    expect(decision).toEqual({
      targetBox: "boxOne",
      shouldDownloadNew: false,
    });
  });

  it("does not request download while any cleanup box is clogged", () => {
    const decision = pickAutoflowDecision({
      boxes: makeBoxes({
        boxOne: makeCards(3, 1),
        boxFour: makeCards(48, 200),
      }),
      activeBox: "boxOne",
      boxZeroEnabled: false,
      canDownloadMore: true,
      flushThreshold: 20,
    });

    expect(decision).toEqual({
      targetBox: "boxFour",
      shouldDownloadNew: false,
    });
  });

  it("does not request download while the lower buffer is above the healthy range", () => {
    const decision = pickAutoflowDecision({
      boxes: makeBoxes({
        boxOne: makeCards(6, 1),
      }),
      activeBox: "boxOne",
      boxZeroEnabled: false,
      canDownloadMore: true,
      flushThreshold: 20,
    });

    expect(decision).toEqual({
      targetBox: "boxOne",
      shouldDownloadNew: false,
    });
  });

  it("allows download when the lower buffer is healthy and cleanup boxes are not clogged", () => {
    const decision = pickAutoflowDecision({
      boxes: makeBoxes({
        boxOne: makeCards(3, 1),
        boxTwo: makeCards(9, 100),
      }),
      activeBox: "boxOne",
      boxZeroEnabled: false,
      canDownloadMore: true,
      flushThreshold: 20,
    });

    expect(decision).toEqual({
      targetBox: "boxOne",
      shouldDownloadNew: true,
    });
  });

  it("counts boxZero and boxOne together as the lower buffer when boxZero is enabled", () => {
    const decision = pickAutoflowDecision({
      boxes: makeBoxes({
        boxZero: makeCards(12, 1),
        boxOne: makeCards(13, 100),
        boxFive: makeCards(48, 200),
      }),
      activeBox: "boxFive",
      boxZeroEnabled: true,
      canDownloadMore: true,
      flushThreshold: 20,
    });

    expect(decision).toEqual({
      targetBox: "boxZero",
      shouldDownloadNew: false,
    });
  });

  it("targets boxOne as the lower buffer when boxZero is enabled but empty", () => {
    const decision = pickAutoflowDecision({
      boxes: makeBoxes({
        boxOne: makeCards(6, 1),
      }),
      activeBox: "boxThree",
      boxZeroEnabled: true,
      canDownloadMore: true,
      flushThreshold: 20,
    });

    expect(decision).toEqual({
      targetBox: "boxOne",
      shouldDownloadNew: false,
    });
  });

  it("targets boxZero before boxOne in normal flow when intro cards are waiting", () => {
    const decision = pickAutoflowDecision({
      boxes: makeBoxes({
        boxZero: makeCards(2, 1),
        boxOne: makeCards(2, 100),
      }),
      activeBox: "boxOne",
      boxZeroEnabled: true,
      canDownloadMore: true,
      flushThreshold: 20,
    });

    expect(decision).toEqual({
      targetBox: "boxZero",
      shouldDownloadNew: false,
    });
  });

  it("does not give boxZero absolute priority when the lower buffer is healthy and cleanup is clogged", () => {
    const decision = pickAutoflowDecision({
      boxes: makeBoxes({
        boxZero: makeCards(2, 1),
        boxOne: makeCards(3, 100),
        boxFour: makeCards(48, 200),
      }),
      activeBox: "boxOne",
      boxZeroEnabled: true,
      canDownloadMore: true,
      flushThreshold: 20,
    });

    expect(decision).toEqual({
      targetBox: "boxFour",
      shouldDownloadNew: false,
    });
  });
});
