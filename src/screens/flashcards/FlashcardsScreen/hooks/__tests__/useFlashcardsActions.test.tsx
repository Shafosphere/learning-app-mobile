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

  it("requires second submit for empty text answer", () => {
    const onConfirm = jest.fn();
    const hook = renderHook(
      ({ answer }: { answer: string }) =>
        useFlashcardActionBarState({
          selectedItem: makeCard(1),
          selectedItemId: 1,
          answer,
          displayResult: null,
          isBetweenCards: false,
          correction: null,
          courseHasOnlyTrueFalse: false,
          courseHasOnlyKnowDontKnow: false,
          isKnowDontKnow: false,
          shouldShowBoxes: true,
          isExplanationVisible: false,
          isExplanationPending: false,
          setAnswer: jest.fn(),
          onConfirm,
          onOk: jest.fn(),
          t: ((key: string) => key) as never,
        }),
      { initialProps: { answer: "" } },
    );

    act(() => {
      jest.runOnlyPendingTimers();
    });

    act(() => hook.result.current.handleCardConfirm());
    expect(onConfirm).not.toHaveBeenCalled();
    expect(hook.result.current.emptyAnswerSubmitWarning).toBe(true);

    act(() => hook.result.current.handleCardConfirm());
    expect(onConfirm).toHaveBeenCalledTimes(1);

    hook.rerender({ answer: "typed" });
    expect(hook.result.current.emptyAnswerSubmitWarning).toBe(false);
  });

  it("does not consume an empty submit while confirmation is guarded", () => {
    const onConfirm = jest.fn();
    const hook = renderHook(
      ({ isConfirmAllowed }: { isConfirmAllowed: boolean }) =>
        useFlashcardActionBarState({
          selectedItem: makeCard(1),
          selectedItemId: 1,
          answer: "",
          displayResult: null,
          isBetweenCards: false,
          correction: null,
          courseHasOnlyTrueFalse: false,
          courseHasOnlyKnowDontKnow: false,
          isKnowDontKnow: false,
          shouldShowBoxes: true,
          isExplanationVisible: false,
          isExplanationPending: false,
          setAnswer: jest.fn(),
          onConfirm,
          canConfirm: () => isConfirmAllowed,
          onOk: jest.fn(),
          t: ((key: string) => key) as never,
        }),
      { initialProps: { isConfirmAllowed: false } },
    );

    act(() => jest.runOnlyPendingTimers());
    act(() => hook.result.current.handleCardConfirm());
    expect(hook.result.current.emptyAnswerSubmitWarning).toBe(false);
    expect(onConfirm).not.toHaveBeenCalled();

    hook.rerender({ isConfirmAllowed: true });
    act(() => hook.result.current.handleCardConfirm());
    expect(hook.result.current.emptyAnswerSubmitWarning).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();

    act(() => hook.result.current.handleCardConfirm());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("does not consume an empty action-button submit while guarded", () => {
    const onConfirm = jest.fn();
    const hook = renderHook(
      ({ isConfirmAllowed }: { isConfirmAllowed: boolean }) =>
        useFlashcardActionBarState({
          selectedItem: makeCard(1),
          selectedItemId: 1,
          answer: "",
          displayResult: null,
          isBetweenCards: false,
          correction: null,
          courseHasOnlyTrueFalse: false,
          courseHasOnlyKnowDontKnow: false,
          isKnowDontKnow: false,
          shouldShowBoxes: true,
          isExplanationVisible: false,
          isExplanationPending: false,
          setAnswer: jest.fn(),
          onConfirm,
          canConfirm: () => isConfirmAllowed,
          onOk: jest.fn(),
          t: ((key: string) => key) as never,
        }),
      { initialProps: { isConfirmAllowed: false } },
    );

    act(() => jest.runOnlyPendingTimers());
    act(() => hook.result.current.handleCardActionsConfirm());
    expect(hook.result.current.emptyAnswerSubmitWarning).toBe(false);
    expect(onConfirm).not.toHaveBeenCalled();

    hook.rerender({ isConfirmAllowed: true });
    act(() => hook.result.current.handleCardActionsConfirm());
    expect(hook.result.current.emptyAnswerSubmitWarning).toBe(true);
    act(() => hook.result.current.handleCardActionsConfirm());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("treats whitespace-only answers as empty", () => {
    const onConfirm = jest.fn();
    const hook = renderHook(
      ({ answer }: { answer: string }) =>
        useFlashcardActionBarState({
          selectedItem: makeCard(1),
          selectedItemId: 1,
          answer,
          displayResult: null,
          isBetweenCards: false,
          correction: null,
          courseHasOnlyTrueFalse: false,
          courseHasOnlyKnowDontKnow: false,
          isKnowDontKnow: false,
          shouldShowBoxes: true,
          isExplanationVisible: false,
          isExplanationPending: false,
          setAnswer: jest.fn(),
          onConfirm,
          onOk: jest.fn(),
          t: ((key: string) => key) as never,
        }),
      { initialProps: { answer: "   " } },
    );

    act(() => jest.runOnlyPendingTimers());
    act(() => hook.result.current.handleCardConfirm());
    expect(onConfirm).not.toHaveBeenCalled();
    act(() => hook.result.current.handleCardConfirm());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("uses answerOverride for the empty-answer check", () => {
    const onConfirm = jest.fn();
    const hook = renderHook(() =>
      useFlashcardActionBarState({
        selectedItem: makeCard(1),
        selectedItemId: 1,
        answer: "",
        displayResult: null,
        isBetweenCards: false,
        correction: null,
        courseHasOnlyTrueFalse: false,
        courseHasOnlyKnowDontKnow: false,
        isKnowDontKnow: false,
        shouldShowBoxes: true,
        isExplanationVisible: false,
        isExplanationPending: false,
        setAnswer: jest.fn(),
        onConfirm,
        onOk: jest.fn(),
        t: ((key: string) => key) as never,
      }),
    );

    act(() => jest.runOnlyPendingTimers());
    act(() => hook.result.current.handleCardConfirm(undefined, "true"));
    expect(onConfirm).toHaveBeenCalledWith(undefined, "true");
    expect(hook.result.current.emptyAnswerSubmitWarning).toBe(false);
  });

  it("resets the empty-answer warning when the card changes", () => {
    const onConfirm = jest.fn();
    const hook = renderHook(
      (props: { cardId: number; answer: string }) =>
        useFlashcardActionBarState({
          selectedItem: makeCard(props.cardId),
          selectedItemId: props.cardId,
          answer: props.answer,
          displayResult: null,
          isBetweenCards: false,
          correction: null,
          courseHasOnlyTrueFalse: false,
          courseHasOnlyKnowDontKnow: false,
          isKnowDontKnow: false,
          shouldShowBoxes: true,
          isExplanationVisible: false,
          isExplanationPending: false,
          setAnswer: jest.fn(),
          onConfirm,
          onOk: jest.fn(),
          t: ((key: string) => key) as never,
        }),
      { initialProps: { cardId: 1, answer: "" } },
    );

    act(() => jest.runOnlyPendingTimers());
    act(() => hook.result.current.handleCardConfirm());
    expect(hook.result.current.emptyAnswerSubmitWarning).toBe(true);

    hook.rerender({ cardId: 2, answer: "" });
    expect(hook.result.current.emptyAnswerSubmitWarning).toBe(false);
  });

  it("does not require an answer for explanation OK", () => {
    const onOk = jest.fn();
    const onConfirm = jest.fn();
    const hook = renderHook(() =>
      useFlashcardActionBarState({
        selectedItem: makeCard(1),
        selectedItemId: 1,
        answer: "",
        displayResult: false,
        isBetweenCards: false,
        correction: null,
        courseHasOnlyTrueFalse: true,
        courseHasOnlyKnowDontKnow: false,
        isKnowDontKnow: false,
        shouldShowBoxes: true,
        isExplanationVisible: true,
        isExplanationPending: true,
        setAnswer: jest.fn(),
        onConfirm,
        onOk,
        t: ((key: string) => key) as never,
      }),
    );

    act(() => jest.runOnlyPendingTimers());
    act(() => hook.result.current.handleCardActionsConfirm());
    expect(onOk).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(hook.result.current.emptyAnswerSubmitWarning).toBe(false);
  });

  it("does not apply the empty-answer guard to true/false answers", () => {
    const onConfirm = jest.fn();
    const hook = renderHook(() =>
      useFlashcardActionBarState({
        selectedItem: makeCard(1),
        selectedItemId: 1,
        answer: "",
        displayResult: null,
        isBetweenCards: false,
        correction: null,
        courseHasOnlyTrueFalse: true,
        courseHasOnlyKnowDontKnow: false,
        isKnowDontKnow: false,
        shouldShowBoxes: true,
        isExplanationVisible: false,
        isExplanationPending: false,
        setAnswer: jest.fn(),
        onConfirm,
        onOk: jest.fn(),
        t: ((key: string) => key) as never,
      }),
    );

    act(() => hook.result.current.handleTrueFalseAnswer(true));
    expect(onConfirm).not.toHaveBeenCalled();

    act(() => jest.runOnlyPendingTimers());
    act(() => hook.result.current.handleTrueFalseAnswer(true));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(hook.result.current.emptyAnswerSubmitWarning).toBe(false);
  });
});
