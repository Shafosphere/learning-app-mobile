import { act, renderHook } from "@testing-library/react-native";
import { useFlashcardActionBarState } from "../useFlashcardsActions";
import type { WordWithTranslations } from "@/src/types/boxes";

const makeCard = (id: number): WordWithTranslations =>
  ({
    id,
    text: `card-${id}`,
    translations: ["true"],
    type: "true_false",
  }) as WordWithTranslations;

describe("useFlashcardActionBarState", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("applies action cooldown with its internal ref when the caller does not provide one", () => {
    const onConfirm = jest.fn();
    const setAnswer = jest.fn();
    const firstCard = makeCard(1);
    const secondCard = makeCard(2);
    const hook = renderHook(
      ({ selectedItem }: { selectedItem: WordWithTranslations }) =>
        useFlashcardActionBarState({
          selectedItem,
          selectedItemId: selectedItem.id,
          displayResult: null,
          isBetweenCards: false,
          correction: null,
          courseHasOnlyTrueFalse: false,
          courseHasOnlyKnowDontKnow: false,
          isKnowDontKnow: false,
          shouldShowBoxes: true,
          isExplanationVisible: false,
          isExplanationPending: false,
          setAnswer,
          onConfirm,
          onOk: jest.fn(),
          t: ((key: string) => key) as never,
        }),
      {
        initialProps: { selectedItem: firstCard },
      },
    );

    expect(hook.result.current.trueFalseActionsDisabled).toBe(true);

    act(() => {
      hook.result.current.handleTrueFalseAnswer(true);
    });

    expect(onConfirm).not.toHaveBeenCalled();

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(hook.result.current.trueFalseActionsDisabled).toBe(false);

    act(() => {
      hook.result.current.handleTrueFalseAnswer(true);
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);

    hook.rerender({ selectedItem: secondCard });

    expect(hook.result.current.trueFalseActionsDisabled).toBe(true);

    act(() => {
      hook.result.current.handleTrueFalseAnswer(true);
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(hook.result.current.trueFalseActionsDisabled).toBe(false);
  });
});
