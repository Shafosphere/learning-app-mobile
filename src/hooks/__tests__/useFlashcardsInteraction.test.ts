import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useSettings } from "@/src/contexts/SettingsContext";
import { logCustomLearningEvent } from "@/src/db/sqlite/db";
import { useFlashcardsInteraction } from "@/src/hooks/useFlashcardsInteraction";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/src/db/sqlite/db", () => ({
  logCustomLearningEvent: jest.fn(() => Promise.resolve()),
}));

const mockedUseSettings = useSettings as jest.Mock;
const mockedLogCustomLearningEvent = logCustomLearningEvent as jest.Mock;

const checkSpelling = (input: string, expected: string) =>
  input.trim().toLowerCase() === expected.trim().toLowerCase();

function makeWord(
  overrides: Partial<WordWithTranslations> & Pick<WordWithTranslations, "id">
): WordWithTranslations {
  return {
    id: overrides.id,
    text: overrides.text ?? `word-${overrides.id}`,
    translations: overrides.translations ?? [`translation-${overrides.id}`],
    flipped: overrides.flipped ?? false,
    answerOnly: overrides.answerOnly ?? false,
    stage: overrides.stage,
    nextReview: overrides.nextReview,
    hintFront: overrides.hintFront ?? null,
    hintBack: overrides.hintBack ?? null,
    imageFront: overrides.imageFront ?? null,
    imageBack: overrides.imageBack ?? null,
    explanation: overrides.explanation ?? null,
    type: overrides.type ?? "text",
  };
}

function makeBoxesState(
  overrides: Partial<BoxesState> = {}
): BoxesState {
  return {
    boxZero: overrides.boxZero ?? [],
    boxOne: overrides.boxOne ?? [],
    boxTwo: overrides.boxTwo ?? [],
    boxThree: overrides.boxThree ?? [],
    boxFour: overrides.boxFour ?? [],
    boxFive: overrides.boxFive ?? [],
  };
}

type RenderInteractionOptions = {
  boxZeroEnabled?: boolean;
  skipDemotionCorrection?: boolean;
  settingsOverride?: Partial<ReturnType<typeof createMockSettings>>;
};

function createMockSettings() {
  return {
    activeCustomCourseId: null,
    explanationOnlyOnWrong: false,
    ignoreDiacriticsInSpellcheck: false,
    learningRemindersEnabled: false,
    refreshLearningReminderSchedule: jest.fn(),
    showExplanationEnabled: false,
  };
}

function advance(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
}

async function flushAllTimers() {
  await act(async () => {
    while (jest.getTimerCount() > 0) {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    }
  });
}

function getBoxIds(boxes: BoxesState, box: keyof BoxesState) {
  return boxes[box].map((card) => card.id);
}

function getAllBoxIds(boxes: BoxesState) {
  return (
    Object.keys(boxes) as (keyof BoxesState)[]
  ).flatMap((box) => boxes[box].map((card) => card.id));
}

function expectBoxCardInvariants(boxes: BoxesState, expectedIds: number[]) {
  const allIds = getAllBoxIds(boxes);
  const counts = new Map<number, number>();

  for (const id of allIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  expect([...counts.keys()].sort((a, b) => a - b)).toEqual(
    [...expectedIds].sort((a, b) => a - b)
  );

  for (const expectedId of expectedIds) {
    expect(counts.get(expectedId)).toBe(1);
  }
}

function renderInteraction(
  initialBoxes: BoxesState,
  options: RenderInteractionOptions = {}
) {
  const addUsedWordIds = jest.fn();
  const registerKnownWord = jest.fn(() => ({
    wasNewMastered: false,
    nextKnownWordsCount: 0,
  }));
  const onCorrectAnswer = jest.fn();
  const onWordPromotedOut = jest.fn();
  const setBoxesSpy = jest.fn();
  let setBoxesExternal:
    | React.Dispatch<React.SetStateAction<BoxesState>>
    | null = null;
  let latestBoxes = initialBoxes;
  let latestSelectedItemId: number | null = null;
  let latestActiveBox: keyof BoxesState | null = null;
  let currentBoxZeroEnabled = options.boxZeroEnabled ?? true;
  let currentSkipDemotionCorrection = options.skipDemotionCorrection ?? false;
  let currentSettings = {
    ...createMockSettings(),
    ...options.settingsOverride,
  };

  const hook = renderHook(() => {
    const [boxes, setBoxesState] = React.useState(initialBoxes);
    const setBoxes: React.Dispatch<React.SetStateAction<BoxesState>> = (
      updater
    ) => {
      setBoxesSpy(updater);
      setBoxesState((prev) =>
        typeof updater === "function"
          ? (updater as (current: BoxesState) => BoxesState)(prev)
          : updater
      );
    };
    setBoxesExternal = setBoxes;
    mockedUseSettings.mockReturnValue(currentSettings);

    const interaction = useFlashcardsInteraction({
      boxes,
      setBoxes,
      checkSpelling,
      addUsedWordIds,
      registerKnownWord,
      onCorrectAnswer,
      onWordPromotedOut,
      boxZeroEnabled: currentBoxZeroEnabled,
      skipDemotionCorrection: currentSkipDemotionCorrection,
    });

    latestBoxes = boxes;
    latestSelectedItemId = interaction.selectedItem?.id ?? null;
    latestActiveBox = interaction.activeBox;

    return {
      interaction,
      boxes,
    };
  });

  return {
    ...hook,
    addUsedWordIds,
    registerKnownWord,
    onCorrectAnswer,
    onWordPromotedOut,
    setBoxesSpy,
    getLatestBoxes: () => latestBoxes,
    getLatestSelectedItemId: () => latestSelectedItemId,
    getLatestActiveBox: () => latestActiveBox,
    updateBoxes: (updater: React.SetStateAction<BoxesState>) => {
      if (!setBoxesExternal) {
        throw new Error("Boxes setter is not ready");
      }
      setBoxesExternal(updater);
    },
    setSettings: (overrides: Partial<typeof currentSettings>) => {
      currentSettings = {
        ...currentSettings,
        ...overrides,
      };
      mockedUseSettings.mockReturnValue(currentSettings);
      hook.rerender(undefined);
    },
    setBoxZeroEnabled: (value: boolean) => {
      currentBoxZeroEnabled = value;
      hook.rerender(undefined);
    },
    setSkipDemotionCorrection: (value: boolean) => {
      currentSkipDemotionCorrection = value;
      hook.rerender(undefined);
    },
  };
}

describe("useFlashcardsInteraction", () => {
  beforeEach(() => {
    jest.spyOn(Math, "random").mockReturnValue(0.999999);
    jest.spyOn(console, "log").mockImplementation(() => {});
    mockedUseSettings.mockReturnValue(createMockSettings());
    mockedLogCustomLearningEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("creates correction bound to the answered card after wrong answer", async () => {
    const cardA = makeWord({
      id: 101,
      text: "cat",
      translations: ["kot"],
    });
    const cardB = makeWord({
      id: 102,
      text: "dog",
      translations: ["pies"],
    });
    const { result } = renderInteraction(
      makeBoxesState({
        boxOne: [cardA, cardB],
      })
    );

    act(() => {
      result.current.interaction.handleSelectBox("boxOne");
    });

    expect(result.current.interaction.selectedItem?.id).toBe(cardA.id);

    act(() => {
      result.current.interaction.confirm(undefined, "wrong answer");
    });

    await waitFor(() => {
      expect(result.current.interaction.result).toBe(false);
      expect(result.current.interaction.correction).not.toBeNull();
    });

    expect(result.current.interaction.correction).toMatchObject({
      cardId: cardA.id,
      awers: cardA.text,
      rewers: cardA.translations[0],
      promptText: cardA.text,
      word: expect.objectContaining({
        id: cardA.id,
        text: cardA.text,
      }),
    });
  });

  it("reorders translations after a correct non-primary match without mutating the source object", async () => {
    const sourceCard = makeWord({
      id: 1501,
      text: "cat",
      translations: ["kotek", "kot", "kocur"],
    });
    const originalTranslations = [...sourceCard.translations];
    const hook = renderInteraction(
      makeBoxesState({
        boxOne: [sourceCard],
      })
    );

    act(() => {
      hook.result.current.interaction.handleSelectBox("boxOne");
    });

    act(() => {
      hook.result.current.interaction.confirm("kot", "kot");
    });

    expect(sourceCard.translations).toEqual(originalTranslations);
    expect(hook.result.current.interaction.selectedItem?.translations).toEqual([
      "kot",
      "kotek",
      "kocur",
    ]);
    expect(hook.result.current.boxes.boxOne[0]?.translations).toEqual([
      "kot",
      "kotek",
      "kocur",
    ]);
    expect(hook.result.current.boxes.boxOne[0]).not.toBe(sourceCard);
  });

  it("uses the reordered translation as correction front after a later wrong answer", async () => {
    const sourceCard = makeWord({
      id: 1502,
      text: "cat",
      translations: ["kotek", "kot", "kocur"],
    });
    const hook = renderInteraction(
      makeBoxesState({
        boxOne: [sourceCard],
      })
    );

    act(() => {
      hook.result.current.interaction.handleSelectBox("boxOne");
    });

    act(() => {
      hook.result.current.interaction.confirm("kot", "kot");
    });

    expect(hook.result.current.interaction.selectedItem?.translations[0]).toBe("kot");

    act(() => {
      hook.result.current.interaction.setResult(null);
      hook.result.current.interaction.confirm(undefined, "__wrong__");
    });

    await waitFor(() => {
      expect(hook.result.current.interaction.result).toBe(false);
      expect(hook.result.current.interaction.correction).not.toBeNull();
    });

    expect(hook.result.current.interaction.correction).toMatchObject({
      cardId: sourceCard.id,
      rewers: "kot",
    });
    expect(hook.result.current.interaction.correction?.word?.translations).toEqual([
      "kot",
      "kotek",
      "kocur",
    ]);
  });

  it("does not let external selected item changes replace the visible card during demotion correction", async () => {
    const cardA = makeWord({
      id: 201,
      text: "sun",
      translations: ["slonce"],
    });
    const cardB = makeWord({
      id: 202,
      text: "moon",
      translations: ["ksiezyc"],
    });
    const { result } = renderInteraction(
      makeBoxesState({
        boxOne: [cardA, cardB],
      })
    );

    act(() => {
      result.current.interaction.handleSelectBox("boxOne");
    });

    expect(result.current.interaction.selectedItem?.id).toBe(cardA.id);

    act(() => {
      result.current.interaction.confirm(undefined, "incorrect");
    });

    await waitFor(() => {
      expect(result.current.interaction.correction?.cardId).toBe(cardA.id);
    });

    act(() => {
      result.current.interaction.updateSelectedItem(() => cardB);
    });

    expect(result.current.interaction.selectedItem?.id).toBe(cardA.id);
    expect(result.current.interaction.correction).toMatchObject({
      cardId: cardA.id,
      awers: cardA.text,
      rewers: cardA.translations[0],
      promptText: cardA.text,
      word: expect.objectContaining({
        id: cardA.id,
      }),
    });
  });

  it("moves the correction card by correction.cardId after completing correction", async () => {
    const cardA = makeWord({
      id: 301,
      text: "river",
      translations: ["rzeka"],
    });
    const cardB = makeWord({
      id: 302,
      text: "mountain",
      translations: ["gora"],
    });
    const { result } = renderInteraction(
      makeBoxesState({
        boxOne: [cardA, cardB],
      })
    );

    act(() => {
      result.current.interaction.handleSelectBox("boxOne");
    });

    expect(result.current.interaction.selectedItem?.id).toBe(cardA.id);

    act(() => {
      result.current.interaction.confirm(undefined, "incorrect");
    });

    await waitFor(() => {
      expect(result.current.interaction.correction?.cardId).toBe(cardA.id);
    });

    act(() => {
      result.current.interaction.updateSelectedItem(() => cardB);
    });

    act(() => {
      result.current.interaction.wrongInputChange(2, cardA.translations[0]);
    });

    await waitFor(() => {
      expect(result.current.interaction.correction).toBeNull();
      expect(result.current.boxes.boxZero.map((card) => card.id)).toEqual([
        cardA.id,
      ]);
      expect(result.current.boxes.boxOne.map((card) => card.id)).toEqual([
        cardB.id,
      ]);
      expect(result.current.interaction.selectedItem?.id).toBe(cardB.id);
    });
  });

  it("keeps the visible card stable when selected item changes in the same act as confirm", async () => {
    const cardA = makeWord({
      id: 401,
      text: "forest",
      translations: ["las"],
    });
    const cardB = makeWord({
      id: 402,
      text: "desert",
      translations: ["pustynia"],
    });
    const { result } = renderInteraction(
      makeBoxesState({
        boxOne: [cardA, cardB],
      })
    );

    act(() => {
      result.current.interaction.handleSelectBox("boxOne");
    });

    act(() => {
      result.current.interaction.confirm(undefined, "__wrong__");
      result.current.interaction.updateSelectedItem(() => cardB);
    });

    await waitFor(() => {
      expect(result.current.interaction.selectedItem?.id).toBe(cardA.id);
      expect(result.current.interaction.result).toBe(false);
      expect(result.current.interaction.correction).toMatchObject({
        cardId: cardA.id,
        awers: cardA.text,
        rewers: cardA.translations[0],
        promptText: cardA.text,
        word: expect.objectContaining({
          id: cardA.id,
          text: cardA.text,
        }),
      });
    });
  });

  it("keeps the visible card stable when the answered card disappears from the active box", async () => {
    const cardA = makeWord({
      id: 501,
      text: "winter",
      translations: ["zima"],
    });
    const cardB = makeWord({
      id: 502,
      text: "summer",
      translations: ["lato"],
    });
    const { result, updateBoxes } = renderInteraction(
      makeBoxesState({
        boxOne: [cardA, cardB],
      })
    );

    act(() => {
      result.current.interaction.handleSelectBox("boxOne");
    });

    act(() => {
      result.current.interaction.confirm(undefined, "__wrong__");
      updateBoxes((prev) => ({
        ...prev,
        boxOne: [cardB],
      }));
    });

    await waitFor(() => {
      expect(result.current.interaction.selectedItem?.id).toBe(cardA.id);
      expect(result.current.interaction.correction).toMatchObject({
        cardId: cardA.id,
        awers: cardA.text,
        rewers: cardA.translations[0],
        promptText: cardA.text,
        word: expect.objectContaining({
          id: cardA.id,
        }),
      });
      expect(result.current.boxes.boxOne.map((card) => card.id)).toEqual([
        cardB.id,
      ]);
    });
  });

  it("blocks box switching while demotion correction is active", async () => {
    const cardA = makeWord({
      id: 601,
      text: "earth",
      translations: ["ziemia"],
    });
    const cardB = makeWord({
      id: 602,
      text: "mars",
      translations: ["mars"],
    });
    const { result } = renderInteraction(
      makeBoxesState({
        boxOne: [cardA],
        boxTwo: [cardB],
      })
    );

    act(() => {
      result.current.interaction.handleSelectBox("boxOne");
    });

    act(() => {
      result.current.interaction.confirm(undefined, "__wrong__");
      result.current.interaction.handleSelectBox("boxTwo");
    });

    await waitFor(() => {
      expect(result.current.interaction.activeBox).toBe("boxOne");
      expect(result.current.interaction.selectedItem?.id).toBe(cardA.id);
      expect(result.current.interaction.correction).toMatchObject({
        cardId: cardA.id,
        awers: cardA.text,
        rewers: cardA.translations[0],
        promptText: cardA.text,
        word: expect.objectContaining({
          id: cardA.id,
        }),
      });
    });

    expect(result.current.boxes.boxOne.map((card) => card.id)).toEqual([cardA.id]);
    expect(result.current.boxes.boxTwo.map((card) => card.id)).toEqual([cardB.id]);
  });

  it("does not move a correct-answer card after resetInteractionState clears pending timers", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);

    const cardA = makeWord({ id: 701, text: "apple", translations: ["jablko"] });
    const cardB = makeWord({ id: 702, text: "pear", translations: ["gruszka"] });
    const hook = renderInteraction(
      makeBoxesState({
        boxOne: [cardA, cardB],
      })
    );

    act(() => {
      hook.result.current.interaction.handleSelectBox("boxOne");
    });

    act(() => {
      hook.result.current.interaction.confirm(undefined, cardA.translations[0]);
    });

    expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);
    expect(hook.result.current.interaction.result).toBe(true);
    expect(getBoxIds(hook.result.current.boxes, "boxOne")).toEqual([
      cardA.id,
      cardB.id,
    ]);

    const setBoxesCallsBeforeReset = hook.setBoxesSpy.mock.calls.length;

    act(() => {
      hook.result.current.interaction.resetInteractionState();
    });

    expect(hook.result.current.interaction.selectedItem).toBeNull();

    await flushAllTimers();

    expect(getBoxIds(hook.getLatestBoxes(), "boxOne")).toEqual([cardA.id, cardB.id]);
    expect(getBoxIds(hook.getLatestBoxes(), "boxTwo")).toEqual([]);
    expect(hook.getLatestSelectedItemId()).toBeNull();
    expect(hook.setBoxesSpy).toHaveBeenCalledTimes(setBoxesCallsBeforeReset);
  });

  it("does not auto-demote after resetInteractionState clears a wrong-answer timer", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);

    const cardA = makeWord({ id: 711, text: "red", translations: ["czerwony"] });
    const cardB = makeWord({ id: 712, text: "blue", translations: ["niebieski"] });
    const hook = renderInteraction(
      makeBoxesState({
        boxOne: [cardA, cardB],
      }),
      { skipDemotionCorrection: true }
    );

    act(() => {
      hook.result.current.interaction.handleSelectBox("boxOne");
    });

    act(() => {
      hook.result.current.interaction.confirm(undefined, "__wrong__");
    });

    expect(hook.result.current.interaction.result).toBe(false);

    const setBoxesCallsBeforeReset = hook.setBoxesSpy.mock.calls.length;

    act(() => {
      hook.result.current.interaction.resetInteractionState();
    });

    await flushAllTimers();

    expect(getBoxIds(hook.getLatestBoxes(), "boxOne")).toEqual([cardA.id, cardB.id]);
    expect(getBoxIds(hook.getLatestBoxes(), "boxZero")).toEqual([]);
    expect(hook.getLatestSelectedItemId()).toBeNull();
    expect(hook.setBoxesSpy).toHaveBeenCalledTimes(setBoxesCallsBeforeReset);
  });

  it("does not mutate boxes after unmount when a correct-answer timer was pending", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);

    const cardA = makeWord({ id: 721, text: "one", translations: ["jeden"] });
    const cardB = makeWord({ id: 722, text: "two", translations: ["dwa"] });
    const hook = renderInteraction(
      makeBoxesState({
        boxOne: [cardA, cardB],
      })
    );

    act(() => {
      hook.result.current.interaction.handleSelectBox("boxOne");
    });

    act(() => {
      hook.result.current.interaction.confirm(undefined, cardA.translations[0]);
    });

    expect(hook.result.current.interaction.result).toBe(true);
    const setBoxesCallsBeforeUnmount = hook.setBoxesSpy.mock.calls.length;

    hook.unmount();

    await flushAllTimers();

    expect(getBoxIds(hook.getLatestBoxes(), "boxOne")).toEqual([cardA.id, cardB.id]);
    expect(getBoxIds(hook.getLatestBoxes(), "boxTwo")).toEqual([]);
    expect(hook.getLatestSelectedItemId()).toBe(cardA.id);
    expect(hook.setBoxesSpy).toHaveBeenCalledTimes(setBoxesCallsBeforeUnmount);
  });

  it("selects exactly one next card when the timed transition races with external box removal", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);

    const cardA = makeWord({ id: 731, text: "alpha", translations: ["alfa"] });
    const cardB = makeWord({ id: 732, text: "beta", translations: ["beta"] });
    const cardC = makeWord({ id: 733, text: "gamma", translations: ["gamma"] });
    const hook = renderInteraction(
      makeBoxesState({
        boxOne: [cardA, cardB, cardC],
      })
    );

    act(() => {
      hook.result.current.interaction.handleSelectBox("boxOne");
    });

    act(() => {
      hook.result.current.interaction.confirm(undefined, cardA.translations[0]);
    });

    expect(hook.result.current.interaction.result).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1500);
      hook.updateBoxes((prev) => ({
        ...prev,
        boxOne: prev.boxOne.filter((card) => card.id !== cardB.id),
      }));
    });

    await waitFor(() => {
      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardC.id);
    });

    expect(getBoxIds(hook.result.current.boxes, "boxOne")).toEqual([cardC.id]);
    expect(getBoxIds(hook.result.current.boxes, "boxTwo")).toEqual([cardA.id]);
    expect(hook.result.current.interaction.selectedItem?.id).not.toBe(cardB.id);
  });

  it("keeps the manual box switch authoritative when it races with a timed transition", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);

    const cardA = makeWord({ id: 741, text: "spring", translations: ["wiosna"] });
    const cardB = makeWord({ id: 742, text: "summer", translations: ["lato"] });
    const cardC = makeWord({ id: 743, text: "autumn", translations: ["jesien"] });
    const cardD = makeWord({ id: 744, text: "winter", translations: ["zima"] });
    const cardE = makeWord({ id: 745, text: "storm", translations: ["burza"] });
    const hook = renderInteraction(
      makeBoxesState({
        boxOne: [cardA, cardB, cardC],
        boxTwo: [cardD, cardE],
      })
    );

    act(() => {
      hook.result.current.interaction.handleSelectBox("boxOne");
    });

    act(() => {
      hook.result.current.interaction.confirm(undefined, cardA.translations[0]);
    });

    expect(hook.result.current.interaction.result).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1500);
      hook.result.current.interaction.handleSelectBox("boxTwo");
    });

    await waitFor(() => {
      expect(hook.result.current.interaction.activeBox).toBe("boxTwo");
      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardD.id);
    });

    expect(getBoxIds(hook.result.current.boxes, "boxOne")).toEqual([
      cardB.id,
      cardC.id,
    ]);
    expect(getBoxIds(hook.result.current.boxes, "boxTwo")).toEqual([
      cardD.id,
      cardE.id,
      cardA.id,
    ]);

    advance(80);

    act(() => {
      hook.result.current.interaction.handleSelectBox("boxTwo");
    });

    expect(hook.result.current.interaction.selectedItem?.id).toBe(cardE.id);
  });

  it("blocks repeated same-box selects before 80ms and releases them at the boundary", () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);

    const cardA = makeWord({ id: 751, text: "north", translations: ["polnoc"] });
    const cardB = makeWord({ id: 752, text: "south", translations: ["poludnie"] });
    const cardC = makeWord({ id: 753, text: "east", translations: ["wschod"] });
    const hook = renderInteraction(
      makeBoxesState({
        boxOne: [cardA, cardB, cardC],
      })
    );

    act(() => {
      hook.result.current.interaction.handleSelectBox("boxOne");
    });

    expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);

    act(() => {
      hook.result.current.interaction.handleSelectBox("boxOne");
    });

    expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);

    advance(79);

    act(() => {
      hook.result.current.interaction.handleSelectBox("boxOne");
    });

    expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);

    advance(1);

    act(() => {
      hook.result.current.interaction.handleSelectBox("boxOne");
    });

    expect(hook.result.current.interaction.selectedItem?.id).toBe(cardB.id);

    advance(81);

    act(() => {
      hook.result.current.interaction.handleSelectBox("boxOne");
    });

    expect(hook.result.current.interaction.selectedItem?.id).toBe(cardC.id);
  });

  it("allows cross-box rapid switches without double-consuming the original queue", () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);

    const cardA = makeWord({ id: 761, text: "bronze", translations: ["braz"] });
    const cardB = makeWord({ id: 762, text: "silver", translations: ["srebro"] });
    const cardC = makeWord({ id: 763, text: "gold", translations: ["zloto"] });
    const cardD = makeWord({ id: 764, text: "circle", translations: ["kolo"] });
    const cardE = makeWord({ id: 765, text: "square", translations: ["kwadrat"] });
    const hook = renderInteraction(
      makeBoxesState({
        boxOne: [cardA, cardB, cardC],
        boxTwo: [cardD, cardE],
      })
    );

    act(() => {
      hook.result.current.interaction.handleSelectBox("boxOne");
    });

    act(() => {
      hook.result.current.interaction.handleSelectBox("boxOne");
    });

    act(() => {
      hook.result.current.interaction.handleSelectBox("boxTwo");
    });

    act(() => {
      hook.result.current.interaction.handleSelectBox("boxOne");
    });

    expect(hook.result.current.interaction.activeBox).toBe("boxOne");
    expect(hook.result.current.interaction.selectedItem?.id).toBe(cardB.id);

    advance(80);

    act(() => {
      hook.result.current.interaction.handleSelectBox("boxOne");
    });

    expect(hook.result.current.interaction.selectedItem?.id).toBe(cardC.id);
  });

  describe("queue consistency after external box changes", () => {
    it("does not re-serve a card removed from the active box queue", () => {
      jest.useFakeTimers();
      jest.setSystemTime(0);

      const cardA = makeWord({ id: 801, text: "oak", translations: ["dab"] });
      const cardB = makeWord({ id: 802, text: "pine", translations: ["sosna"] });
      const cardC = makeWord({ id: 803, text: "birch", translations: ["brzoza"] });
      const hook = renderInteraction(
        makeBoxesState({
          boxOne: [cardA, cardB, cardC],
        })
      );

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxOne");
      });

      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);

      act(() => {
        hook.updateBoxes((prev) => ({
          ...prev,
          boxOne: prev.boxOne.filter((card) => card.id !== cardB.id),
        }));
      });

      advance(80);

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxOne");
      });

      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardC.id);

      advance(80);

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxOne");
      });

      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);
      expect(getAllBoxIds(hook.result.current.boxes)).not.toContain(cardB.id);
      expectBoxCardInvariants(hook.result.current.boxes, [cardA.id, cardC.id]);
    });

    it("keeps a newly added card reachable exactly once without displacing the current card", () => {
      jest.useFakeTimers();
      jest.setSystemTime(0);

      const cardA = makeWord({ id: 811, text: "iron", translations: ["zelazo"] });
      const cardB = makeWord({ id: 812, text: "copper", translations: ["miedz"] });
      const cardC = makeWord({ id: 813, text: "tin", translations: ["cyna"] });
      const seenIds: number[] = [];
      const hook = renderInteraction(
        makeBoxesState({
          boxOne: [cardA, cardB],
        })
      );

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxOne");
      });

      seenIds.push(hook.result.current.interaction.selectedItem?.id ?? -1);
      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);

      act(() => {
        hook.updateBoxes((prev) => ({
          ...prev,
          boxOne: [...prev.boxOne, cardC],
        }));
      });

      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);

      advance(80);

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxOne");
      });

      seenIds.push(hook.result.current.interaction.selectedItem?.id ?? -1);

      advance(80);

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxOne");
      });

      seenIds.push(hook.result.current.interaction.selectedItem?.id ?? -1);

      advance(80);

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxOne");
      });

      seenIds.push(hook.result.current.interaction.selectedItem?.id ?? -1);

      expect(seenIds[0]).toBe(cardA.id);
      expect(seenIds).toContain(cardB.id);
      expect(seenIds).toContain(cardC.id);
      expect(seenIds.filter((id) => id === cardC.id)).toHaveLength(1);
      expectBoxCardInvariants(hook.result.current.boxes, [
        cardA.id,
        cardB.id,
        cardC.id,
      ]);
    });

    it("keeps a promoted card reachable when the target queue was exhausted", () => {
      jest.useFakeTimers();
      jest.setSystemTime(0);

      const cardA = makeWord({ id: 821, text: "planet", translations: ["planeta"] });
      const cardB = makeWord({ id: 822, text: "star", translations: ["gwiazda"] });
      const hook = renderInteraction(
        makeBoxesState({
          boxOne: [cardA],
          boxTwo: [cardB],
        })
      );

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxTwo");
      });

      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardB.id);

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxOne");
      });

      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);

      act(() => {
        hook.result.current.interaction.moveElement(cardA.id, true);
      });

      expect(getBoxIds(hook.result.current.boxes, "boxOne")).toEqual([]);
      expect(getBoxIds(hook.result.current.boxes, "boxTwo")).toEqual([
        cardB.id,
        cardA.id,
      ]);
      expectBoxCardInvariants(hook.result.current.boxes, [cardA.id, cardB.id]);

      advance(80);

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxTwo");
      });

      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardB.id);

      advance(80);

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxTwo");
      });

      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);
    });

    it("preserves card invariants through mixed external remove add and move operations", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(0);

      const cardA = makeWord({ id: 831, text: "one", translations: ["jeden"] });
      const cardB = makeWord({ id: 832, text: "two", translations: ["dwa"] });
      const cardC = makeWord({ id: 833, text: "three", translations: ["trzy"] });
      const cardD = makeWord({ id: 834, text: "four", translations: ["cztery"] });
      const hook = renderInteraction(
        makeBoxesState({
          boxOne: [cardA, cardB],
          boxTwo: [cardC],
        })
      );

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxOne");
      });

      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);

      act(() => {
        hook.updateBoxes((prev) => ({
          ...prev,
          boxOne: prev.boxOne.filter((card) => card.id !== cardB.id).concat(cardD),
        }));
        hook.result.current.interaction.moveElement(cardA.id, true);
      });

      expectBoxCardInvariants(hook.result.current.boxes, [
        cardA.id,
        cardC.id,
        cardD.id,
      ]);
      expect(getAllBoxIds(hook.result.current.boxes)).not.toContain(cardB.id);

      advance(80);

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxOne");
      });

      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardD.id);

      act(() => {
        hook.result.current.interaction.moveElement(cardD.id, false);
      });

      await waitFor(() => {
        expectBoxCardInvariants(hook.result.current.boxes, [
          cardA.id,
          cardC.id,
          cardD.id,
        ]);
      });

      expect(getAllBoxIds(hook.result.current.boxes)).not.toContain(cardB.id);
    });
  });

  describe("boxZero intro mode lifecycle", () => {
    it("enters intro correction mode when boxZero becomes active", async () => {
      const cardA = makeWord({ id: 901, text: "hello", translations: ["czesc"] });
      const hook = renderInteraction(
        makeBoxesState({
          boxZero: [cardA],
        }),
        { boxZeroEnabled: true }
      );

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxZero");
      });

      await waitFor(() => {
        expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);
        expect(hook.result.current.interaction.correction).toMatchObject({
          cardId: cardA.id,
          mode: "intro",
          awers: cardA.text,
          rewers: cardA.translations[0],
          reversed: false,
        });
      });
    });

    it("preserves intro inputs for the same active card", async () => {
      const cardA = makeWord({
        id: 911,
        text: "green",
        translations: ["zielony", "seledynowy"],
      });
      const hook = renderInteraction(
        makeBoxesState({
          boxZero: [cardA],
        }),
        { boxZeroEnabled: true }
      );

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxZero");
      });

      await waitFor(() => {
        expect(hook.result.current.interaction.correction?.mode).toBe("intro");
      });

      act(() => {
        hook.result.current.interaction.wrongInputChange(1, "typed-awers");
        hook.result.current.interaction.wrongInputChange(2, "typed-rewers");
        hook.result.current.interaction.setCorrectionRewers("seledynowy");
      });

      act(() => {
        hook.result.current.interaction.updateSelectedItem((item) => ({
          ...item,
          explanation: "same-card-refresh",
        }));
      });

      await waitFor(() => {
        expect(hook.result.current.interaction.correction).toMatchObject({
          cardId: cardA.id,
          mode: "intro",
          input1: "typed-awers",
          input2: "typed-rewers",
          rewers: "seledynowy",
          reversed: false,
        });
      });
    });

    it("rebinds intro correction cleanly when the active card changes", async () => {
      const cardA = makeWord({ id: 921, text: "sun", translations: ["slonce"] });
      const cardB = makeWord({ id: 922, text: "moon", translations: ["ksiezyc"] });
      const hook = renderInteraction(
        makeBoxesState({
          boxZero: [cardA, cardB],
        }),
        { boxZeroEnabled: true }
      );

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxZero");
      });

      await waitFor(() => {
        expect(hook.result.current.interaction.correction?.cardId).toBe(cardA.id);
      });

      act(() => {
        hook.result.current.interaction.wrongInputChange(1, "stale-awers");
        hook.result.current.interaction.wrongInputChange(2, "stale-rewers");
        hook.result.current.interaction.setCorrectionRewers("custom-old");
      });

      act(() => {
        hook.result.current.interaction.updateSelectedItem(() => cardB);
      });

      await waitFor(() => {
        expect(hook.result.current.interaction.selectedItem?.id).toBe(cardB.id);
        expect(hook.result.current.interaction.correction).toMatchObject({
          cardId: cardB.id,
          mode: "intro",
          awers: cardB.text,
          rewers: cardB.translations[0],
          input1: "",
          input2: "",
          reversed: false,
        });
      });
    });

    it("clears intro correction when switching away from boxZero", async () => {
      const introCard = makeWord({ id: 931, text: "left", translations: ["lewo"] });
      const regularCard = makeWord({ id: 932, text: "right", translations: ["prawo"] });
      const hook = renderInteraction(
        makeBoxesState({
          boxZero: [introCard],
          boxOne: [regularCard],
        }),
        { boxZeroEnabled: true }
      );

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxZero");
      });

      await waitFor(() => {
        expect(hook.result.current.interaction.correction?.mode).toBe("intro");
      });

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxOne");
      });

      await waitFor(() => {
        expect(hook.result.current.interaction.activeBox).toBe("boxOne");
        expect(hook.result.current.interaction.selectedItem?.id).toBe(regularCard.id);
        expect(hook.result.current.interaction.correction).toBeNull();
      });
    });

    it("clears visible intro state when boxZero gets disabled during an active intro session", async () => {
      const cardA = makeWord({ id: 941, text: "light", translations: ["swiatlo"] });
      const hook = renderInteraction(
        makeBoxesState({
          boxZero: [cardA],
        }),
        {
          boxZeroEnabled: true,
          settingsOverride: {
            showExplanationEnabled: true,
          },
        }
      );

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxZero");
      });

      await waitFor(() => {
        expect(hook.result.current.interaction.correction?.mode).toBe("intro");
      });

      act(() => {
        hook.result.current.interaction.setAnswer("stale answer");
        hook.result.current.interaction.setResult(true);
      });

      hook.setBoxZeroEnabled(false);

      await waitFor(() => {
        expect(hook.result.current.interaction.activeBox).toBeNull();
        expect(hook.result.current.interaction.selectedItem).toBeNull();
        expect(hook.result.current.interaction.correction).toBeNull();
        expect(hook.result.current.interaction.answer).toBe("");
        expect(hook.result.current.interaction.result).toBeNull();
      });
    });
  });

  describe("acknowledgeExplanation behavior", () => {
    it("moves the correct explained card and clears visible state after acknowledge", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(0);

      const cardA = makeWord({
        id: 1001,
        text: "car",
        translations: ["samochod"],
        explanation: "vehicle",
      });
      const cardB = makeWord({
        id: 1002,
        text: "bike",
        translations: ["rower"],
      });
      const hook = renderInteraction(
        makeBoxesState({
          boxOne: [cardA, cardB],
        }),
        {
          settingsOverride: {
            showExplanationEnabled: true,
          },
        }
      );

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxOne");
      });

      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);

      act(() => {
        hook.result.current.interaction.confirm(undefined, cardA.translations[0]);
      });

      expect(getBoxIds(hook.result.current.boxes, "boxTwo")).toEqual([]);
      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);
      expect(hook.result.current.interaction.result).toBe(true);

      advance(80);

      act(() => {
        hook.result.current.interaction.acknowledgeExplanation();
      });

      await waitFor(() => {
        expect(getBoxIds(hook.result.current.boxes, "boxOne")).toEqual([cardB.id]);
        expect(getBoxIds(hook.result.current.boxes, "boxTwo")).toEqual([cardA.id]);
        expect(hook.result.current.interaction.selectedItem?.id).toBe(cardB.id);
        expect(hook.result.current.interaction.result).toBeNull();
        expect(hook.result.current.interaction.correction).toBeNull();
      });
    });

    it("does not move a true false card when acknowledge runs without a demotion condition", () => {
      const cardA = makeWord({
        id: 1011,
        text: "sky is blue",
        translations: ["true"],
        type: "true_false",
      });
      const hook = renderInteraction(
        makeBoxesState({
          boxOne: [cardA],
        })
      );

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxOne");
        hook.result.current.interaction.setResult(true);
      });

      act(() => {
        hook.result.current.interaction.acknowledgeExplanation();
      });

      expect(getBoxIds(hook.result.current.boxes, "boxOne")).toEqual([cardA.id]);
      expect(getBoxIds(hook.result.current.boxes, "boxZero")).toEqual([]);
      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);
    });

    it("demotes a true false card after acknowledging a wrong explained answer", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(0);

      const cardA = makeWord({
        id: 1012,
        text: "earth is flat",
        translations: ["false"],
        explanation: "It is round.",
        type: "true_false",
      });
      const hook = renderInteraction(
        makeBoxesState({
          boxOne: [cardA],
        }),
        {
          settingsOverride: {
            showExplanationEnabled: true,
          },
        }
      );

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxOne");
      });

      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);

      act(() => {
        hook.result.current.interaction.confirm(undefined, "true");
      });

      expect(hook.result.current.interaction.result).toBe(false);
      expect(getBoxIds(hook.result.current.boxes, "boxZero")).toEqual([]);

      advance(80);

      act(() => {
        hook.result.current.interaction.acknowledgeExplanation();
      });

      await waitFor(() => {
        expect(getBoxIds(hook.result.current.boxes, "boxZero")).toEqual([cardA.id]);
        expect(getBoxIds(hook.result.current.boxes, "boxOne")).toEqual([]);
        expect(hook.result.current.interaction.selectedItem).toBeNull();
      });
    });

    it("promotes or demotes know dont know cards according to the final result", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(0);

      const cardA = makeWord({
        id: 1021,
        text: "river",
        translations: ["rzeka"],
        type: "know_dont_know",
      });
      const cardB = makeWord({
        id: 1022,
        text: "mountain",
        translations: ["gora"],
        type: "know_dont_know",
      });

      const promoteHook = renderInteraction(
        makeBoxesState({
          boxOne: [cardA],
        })
      );

      act(() => {
        promoteHook.result.current.interaction.handleSelectBox("boxOne");
      });

      expect(promoteHook.result.current.interaction.selectedItem?.id).toBe(cardA.id);

      act(() => {
        promoteHook.result.current.interaction.confirm(undefined, "true");
      });

      advance(80);

      act(() => {
        promoteHook.result.current.interaction.acknowledgeExplanation();
      });

      await waitFor(() => {
        expect(getBoxIds(promoteHook.result.current.boxes, "boxTwo")).toEqual([
          cardA.id,
        ]);
        expect(getBoxIds(promoteHook.result.current.boxes, "boxOne")).toEqual([]);
      });

      const demoteHook = renderInteraction(
        makeBoxesState({
          boxOne: [cardB],
        })
      );

      act(() => {
        demoteHook.result.current.interaction.handleSelectBox("boxOne");
      });

      expect(demoteHook.result.current.interaction.selectedItem?.id).toBe(cardB.id);

      act(() => {
        demoteHook.result.current.interaction.confirm(undefined, "false");
      });

      advance(80);

      act(() => {
        demoteHook.result.current.interaction.acknowledgeExplanation();
      });

      await waitFor(() => {
        expect(getBoxIds(demoteHook.result.current.boxes, "boxZero")).toEqual([
          cardB.id,
        ]);
        expect(getBoxIds(demoteHook.result.current.boxes, "boxOne")).toEqual([]);
      });
    });

    it("does nothing for know dont know when result is still null", () => {
      const cardA = makeWord({
        id: 1023,
        text: "forest",
        translations: ["las"],
        type: "know_dont_know",
      });
      const hook = renderInteraction(
        makeBoxesState({
          boxOne: [cardA],
        })
      );

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxOne");
      });

      act(() => {
        hook.result.current.interaction.acknowledgeExplanation();
      });

      expect(getBoxIds(hook.result.current.boxes, "boxOne")).toEqual([cardA.id]);
      expect(getBoxIds(hook.result.current.boxes, "boxZero")).toEqual([]);
      expect(getBoxIds(hook.result.current.boxes, "boxTwo")).toEqual([]);
    });

    it("does not move the wrong card if selection changes before acknowledge", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(0);

      const cardA = makeWord({
        id: 1031,
        text: "pen",
        translations: ["dlugopis"],
        explanation: "writing tool",
      });
      const cardB = makeWord({
        id: 1032,
        text: "paper",
        translations: ["papier"],
      });
      const hook = renderInteraction(
        makeBoxesState({
          boxOne: [cardA, cardB],
        }),
        {
          settingsOverride: {
            showExplanationEnabled: true,
          },
        }
      );

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxOne");
      });

      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);

      act(() => {
        hook.result.current.interaction.confirm(undefined, cardA.translations[0]);
      });

      advance(80);

      act(() => {
        hook.result.current.interaction.updateSelectedItem(() => cardB);
      });

      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardB.id);

      act(() => {
        hook.result.current.interaction.acknowledgeExplanation();
      });

      expect(getBoxIds(hook.result.current.boxes, "boxOne")).toEqual([
        cardA.id,
        cardB.id,
      ]);
      expect(getBoxIds(hook.result.current.boxes, "boxTwo")).toEqual([]);
      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardB.id);
    });

    it("is idempotent when acknowledgeExplanation is pressed more than once", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(0);

      const cardA = makeWord({
        id: 1041,
        text: "book",
        translations: ["ksiazka"],
        explanation: "object to read",
      });
      const cardB = makeWord({
        id: 1042,
        text: "chair",
        translations: ["krzeslo"],
      });
      const hook = renderInteraction(
        makeBoxesState({
          boxOne: [cardA, cardB],
        }),
        {
          settingsOverride: {
            showExplanationEnabled: true,
          },
        }
      );

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxOne");
      });

      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);

      act(() => {
        hook.result.current.interaction.confirm(undefined, cardA.translations[0]);
      });

      advance(80);

      act(() => {
        hook.result.current.interaction.acknowledgeExplanation();
      });

      await waitFor(() => {
        expect(getBoxIds(hook.result.current.boxes, "boxOne")).toEqual([cardB.id]);
        expect(getBoxIds(hook.result.current.boxes, "boxTwo")).toEqual([cardA.id]);
      });

      act(() => {
        hook.result.current.interaction.acknowledgeExplanation();
      });

      expect(getBoxIds(hook.result.current.boxes, "boxOne")).toEqual([cardB.id]);
      expect(getBoxIds(hook.result.current.boxes, "boxTwo")).toEqual([cardA.id]);
      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardB.id);
    });

    it("stays single move safe when explanation settings flip during the flow", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(0);

      const cardA = makeWord({
        id: 1051,
        text: "table",
        translations: ["stol"],
        explanation: "piece of furniture",
      });
      const cardB = makeWord({
        id: 1052,
        text: "lamp",
        translations: ["lampa"],
      });
      const hook = renderInteraction(
        makeBoxesState({
          boxOne: [cardA, cardB],
        }),
        {
          settingsOverride: {
            showExplanationEnabled: true,
          },
        }
      );

      act(() => {
        hook.result.current.interaction.handleSelectBox("boxOne");
      });

      expect(hook.result.current.interaction.selectedItem?.id).toBe(cardA.id);

      act(() => {
        hook.result.current.interaction.confirm(undefined, cardA.translations[0]);
      });

      advance(80);

      hook.setSettings({
        showExplanationEnabled: false,
      });

      act(() => {
        hook.result.current.interaction.acknowledgeExplanation();
      });

      await waitFor(() => {
        expect(getBoxIds(hook.result.current.boxes, "boxOne")).toEqual([cardB.id]);
        expect(getBoxIds(hook.result.current.boxes, "boxTwo")).toEqual([cardA.id]);
        expect(hook.result.current.interaction.selectedItem?.id).toBe(cardB.id);
      });

      act(() => {
        hook.result.current.interaction.acknowledgeExplanation();
      });

      expect(getBoxIds(hook.result.current.boxes, "boxOne")).toEqual([cardB.id]);
      expect(getBoxIds(hook.result.current.boxes, "boxTwo")).toEqual([cardA.id]);
    });
  });
});
