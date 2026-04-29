import fs from "fs";
import path from "path";
import Papa from "papaparse";
import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useSettings } from "@/src/contexts/SettingsContext";
import { logCustomLearningEvent } from "@/src/db/sqlite/db";
import { useFlashcardsInteraction } from "@/src/hooks/useFlashcardsInteraction";
import { splitBackTextIntoAnswers } from "@/src/db/sqlite/utils";
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

type CsvRow = {
  external_id?: string;
  front_text?: string;
  back_text?: string;
};

function makeBoxesState(overrides: Partial<BoxesState> = {}): BoxesState {
  return {
    boxZero: overrides.boxZero ?? [],
    boxOne: overrides.boxOne ?? [],
    boxTwo: overrides.boxTwo ?? [],
    boxThree: overrides.boxThree ?? [],
    boxFour: overrides.boxFour ?? [],
    boxFive: overrides.boxFive ?? [],
  };
}

function renderInteraction(initialBoxes: BoxesState) {
  const addUsedWordIds = jest.fn();
  const registerKnownWord = jest.fn(() => ({
    wasNewMastered: false,
    nextKnownWordsCount: 0,
  }));
  const onCorrectAnswer = jest.fn();
  const onWordPromotedOut = jest.fn();
  let setBoxesExternal:
    | React.Dispatch<React.SetStateAction<BoxesState>>
    | null = null;

  const hook = renderHook(() => {
    const [boxes, setBoxesState] = React.useState(initialBoxes);
    const setBoxes: React.Dispatch<React.SetStateAction<BoxesState>> = (
      updater
    ) => {
      setBoxesState((prev) =>
        typeof updater === "function"
          ? (updater as (current: BoxesState) => BoxesState)(prev)
          : updater
      );
    };
    setBoxesExternal = setBoxes;

    const interaction = useFlashcardsInteraction({
      boxes,
      setBoxes,
      checkSpelling,
      addUsedWordIds,
      registerKnownWord,
      onCorrectAnswer,
      onWordPromotedOut,
      boxZeroEnabled: true,
    });

    return {
      interaction,
      boxes,
    };
  });

  return {
    ...hook,
    updateBoxes: (updater: React.SetStateAction<BoxesState>) => {
      if (!setBoxesExternal) {
        throw new Error("Boxes setter is not ready");
      }
      setBoxesExternal(updater);
    },
  };
}

function loadWordsFromCsv(): WordWithTranslations[] {
  const rootCsvPath = path.join(
    process.cwd(),
    "tools",
    "prebuild-data",
    "fiszki_podstawy_EN-PL_slowa.csv"
  );
  const nestedCsvPath = path.join(
    process.cwd(),
    "tools",
    "prebuild-data",
    "pl",
    "fiszki_podstawy_EN-PL_slowa.csv"
  );
  const csvPath = fs.existsSync(rootCsvPath) ? rootCsvPath : nestedCsvPath;
  const csvText = fs.readFileSync(csvPath, "utf8");
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return (parsed.data ?? [])
    .map((row, index) => {
      const text = row.front_text?.trim() ?? "";
      const translations = splitBackTextIntoAnswers(row.back_text);
      const externalId = row.external_id?.trim();
      const numericId = externalId ? Number.parseInt(externalId, 10) : NaN;

      return {
        id: Number.isFinite(numericId) ? numericId : index + 1,
        text,
        translations,
        flipped: false,
        answerOnly: false,
        hintFront: null,
        hintBack: null,
        imageFront: null,
        imageBack: null,
        explanation: null,
        type: "text" as const,
      };
    })
    .filter(
      (word) => word.text.length > 0 && (word.translations?.length ?? 0) > 0
    );
}

const csvWords = loadWordsFromCsv();

function buildScenarioPair(index: number) {
  const testedCard = csvWords[index];
  const helperCard = csvWords[(index + 1) % csvWords.length];
  if (!testedCard || !helperCard) {
    throw new Error(`Missing CSV words for scenario index ${index}`);
  }
  return { testedCard, helperCard };
}

describe("useFlashcardsInteraction mass correction regression", () => {
  beforeAll(() => {
    jest.setTimeout(120000);
  });

  beforeEach(() => {
    jest.spyOn(Math, "random").mockReturnValue(0.999999);
    jest.spyOn(console, "log").mockImplementation(() => {});
    mockedUseSettings.mockReturnValue({
      activeCustomCourseId: null,
      explanationOnlyOnWrong: false,
      ignoreDiacriticsInSpellcheck: false,
      learningRemindersEnabled: false,
      refreshLearningReminderSchedule: jest.fn(),
      showExplanationEnabled: false,
    });
    mockedLogCustomLearningEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("binds correction to the same card for many real csv cards", async () => {
    expect(csvWords.length).toBeGreaterThan(100);

    for (let index = 0; index < csvWords.length; index += 1) {
      const { testedCard, helperCard } = buildScenarioPair(index);
      const hook = renderInteraction(
        makeBoxesState({
          boxOne: [testedCard, helperCard],
        })
      );

      try {
        act(() => {
          hook.result.current.interaction.handleSelectBox("boxOne");
        });

        expect(hook.result.current.interaction.selectedItem?.id).toBe(testedCard.id);

        act(() => {
          hook.result.current.interaction.confirm(undefined, "__wrong_answer__");
        });

        await waitFor(() => {
          expect(hook.result.current.interaction.result).toBe(false);
          expect(hook.result.current.interaction.correction?.cardId).toBe(
            testedCard.id
          );
        });

        expect(hook.result.current.interaction.correction).toMatchObject({
          cardId: testedCard.id,
          awers: testedCard.text,
          rewers: testedCard.translations[0],
          promptText: testedCard.text,
          word: expect.objectContaining({
            id: testedCard.id,
            text: testedCard.text,
          }),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown mass-test failure";
        throw new Error(
          `Normal correction binding failed for card id=${testedCard.id} text="${testedCard.text}" helperId=${helperCard.id}. ${message}`
        );
      } finally {
        hook.unmount();
      }
    }
  });

  it("keeps correction and demotion bound to the original card under forced desync attempts", async () => {
    expect(csvWords.length).toBeGreaterThan(100);

    for (let index = 0; index < csvWords.length; index += 1) {
      const { testedCard, helperCard } = buildScenarioPair(index);
      const hook = renderInteraction(
        makeBoxesState({
          boxOne: [testedCard, helperCard],
        })
      );

      try {
        act(() => {
          hook.result.current.interaction.handleSelectBox("boxOne");
        });

        expect(hook.result.current.interaction.selectedItem?.id).toBe(testedCard.id);

        act(() => {
          hook.result.current.interaction.confirm(undefined, "__wrong_answer__");
        });

        await waitFor(() => {
          expect(hook.result.current.interaction.correction?.cardId).toBe(
            testedCard.id
          );
        });

        act(() => {
          hook.result.current.interaction.updateSelectedItem(() => helperCard);
        });

        expect(hook.result.current.interaction.selectedItem?.id).toBe(
          testedCard.id
        );
        expect(hook.result.current.interaction.correction?.cardId).toBe(
          testedCard.id
        );

        act(() => {
          hook.result.current.interaction.wrongInputChange(
            2,
            testedCard.translations[0]
          );
        });

        await waitFor(() => {
          expect(hook.result.current.interaction.correction).toBeNull();
          expect(hook.result.current.boxes.boxZero.map((card) => card.id)).toEqual([
            testedCard.id,
          ]);
          expect(hook.result.current.boxes.boxOne.map((card) => card.id)).toEqual([
            helperCard.id,
          ]);
          expect(hook.result.current.interaction.selectedItem?.id).toBe(
            helperCard.id
          );
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown desync-test failure";
        throw new Error(
          `Forced desync failed for source card id=${testedCard.id} text="${testedCard.text}" foreignCardId=${helperCard.id} foreignText="${helperCard.text}". ${message}`
        );
      } finally {
        hook.unmount();
      }
    }
  });

  it("survives mixed same-tick desync attempts across many real csv cards", async () => {
    expect(csvWords.length).toBeGreaterThan(100);

    const iterations = Math.min(csvWords.length, 250);

    for (let index = 0; index < iterations; index += 1) {
      const { testedCard, helperCard } = buildScenarioPair(index);
      const extraCard = csvWords[(index + 2) % csvWords.length];
      const scenario = index % 3;
      if (!extraCard) {
        throw new Error(`Missing extra CSV word for scenario index ${index}`);
      }
      const hook = renderInteraction(
        makeBoxesState({
          boxOne: [testedCard, helperCard],
          boxTwo: [extraCard],
        })
      );

      try {
        act(() => {
          hook.result.current.interaction.handleSelectBox("boxOne");
        });

        expect(hook.result.current.interaction.selectedItem?.id).toBe(testedCard.id);

        act(() => {
          hook.result.current.interaction.confirm(undefined, "__wrong_answer__");

          if (scenario === 0) {
            hook.result.current.interaction.updateSelectedItem(() => helperCard);
            return;
          }

          if (scenario === 1) {
            hook.updateBoxes((prev) => ({
              ...prev,
              boxOne: [helperCard],
            }));
            return;
          }

          hook.result.current.interaction.handleSelectBox("boxTwo");
        });

        await waitFor(() => {
          expect(hook.result.current.interaction.correction).toMatchObject({
            cardId: testedCard.id,
            awers: testedCard.text,
            rewers: testedCard.translations[0],
            promptText: testedCard.text,
            word: expect.objectContaining({
              id: testedCard.id,
              text: testedCard.text,
            }),
          });
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown mixed desync failure";
        throw new Error(
          `Mixed desync failed for source card id=${testedCard.id} text="${testedCard.text}" helperId=${helperCard.id} extraId=${extraCard.id} scenario=${scenario}. ${message}`
        );
      } finally {
        hook.unmount();
      }
    }
  });
});
