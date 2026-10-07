import { renderHook } from "@testing-library/react-native";
import type { CardProps } from "@/src/components/card/card-types";
import { useFlashcardsAutoflow } from "@/src/hooks/useFlashcardsAutoflow";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { useStableFlashcardPresentation } from "../useStableFlashcardPresentation";

function word(id: number, text: string): WordWithTranslations {
  return {
    id, text, translations: [text], type: "text", flipped: false,
    answerOnly: false, hintFront: null, hintBack: null,
    imageFront: `file:///${text}.webp`, imageBack: null, explanation: null,
  };
}

function props(selectedItem: WordWithTranslations, overrides: Partial<CardProps> = {}): CardProps {
  return {
    selectedItem, activeBox: "boxOne", answer: "", result: null, correction: null,
    setAnswer: jest.fn(), setResult: jest.fn(), confirm: jest.fn(), wrongInputChange: jest.fn(),
    ...overrides,
  };
}

it("never presents the intermediate card when the real autoflow switches boxes", () => {
  const dog = word(16, "dog");
  const apple = word(29, "apple");
  const nose = word(27, "nose");
  const boxes: BoxesState = {
    boxZero: [], boxOne: [apple],
    boxTwo: [nose, ...Array.from({ length: 11 }, (_, index) => word(100 + index, `other-${index}`))],
    boxThree: [], boxFour: [], boxFive: [],
  };
  const originalBoxes = JSON.stringify(boxes);
  const handleSelectBox = jest.fn();
  const downloadMore = jest.fn(() => Promise.resolve());
  const presentedIds: (number | undefined)[] = [];
  const dogProps = props(dog, { result: true });
  const { result, rerender } = renderHook(({ next, canSwitch }: { next: CardProps; canSwitch: boolean }) => {
    const autoflow = useFlashcardsAutoflow({
      enabled: true, boxes, activeBox: next.activeBox ?? null, canSwitch,
      handleSelectBox, downloadMore, boxZeroEnabled: false,
      isReady: false, introBoxLimitReached: false, totalFlashcardsInCourse: 50,
    });
    const presentation = useStableFlashcardPresentation(
      next, Boolean(next.isBetweenCards || autoflow.isSwitchPending), 7,
    );
    presentedIds.push(presentation.cardProps.selectedItem?.id);
    return presentation;
  }, { initialProps: { next: dogProps, canSwitch: false } });

  rerender({ next: { ...dogProps, isBetweenCards: true }, canSwitch: false });
  rerender({ next: props(apple), canSwitch: true });
  expect(result.current.cardProps).toBe(dogProps);
  expect(result.current.isHeld).toBe(true);
  expect(handleSelectBox.mock.calls).toEqual([["boxTwo"]]);

  const noseProps = props(nose, { activeBox: "boxTwo", reversed: true });
  rerender({ next: noseProps, canSwitch: true });
  expect(result.current.cardProps).toBe(noseProps);
  expect(result.current.isHeld).toBe(false);
  expect(presentedIds).not.toContain(apple.id);
  expect(presentedIds.at(-1)).toBe(nose.id);
  expect(handleSelectBox).toHaveBeenCalledTimes(1);
  expect(downloadMore).not.toHaveBeenCalled();
  expect(JSON.stringify(boxes)).toBe(originalBoxes);
});

it("does not retain a previous course's card during a transition", () => {
  const oldProps = props(word(1, "old"));
  const nextProps = props(word(2, "new"));
  const { result, rerender } = renderHook(({ next, courseId, hold }: {
    next: CardProps; courseId: number; hold: boolean;
  }) =>
    useStableFlashcardPresentation(next, hold, courseId), {
    initialProps: { next: oldProps, courseId: 7, hold: false },
  });
  rerender({ next: nextProps, courseId: 8, hold: true });
  expect(result.current.cardProps).toBe(nextProps);
  expect(result.current.isHeld).toBe(false);
});

it("releases a normal next card immediately when no box switch is pending", () => {
  const oldProps = props(word(1, "old"));
  const nextProps = props(word(2, "next"));
  const { result, rerender } = renderHook(({ next, hold }: { next: CardProps; hold: boolean }) =>
    useStableFlashcardPresentation(next, hold, 7), {
    initialProps: { next: oldProps, hold: false },
  });
  rerender({ next: { ...oldProps, isBetweenCards: true }, hold: true });
  expect(result.current.cardProps).toBe(oldProps);
  rerender({ next: nextProps, hold: false });
  expect(result.current.cardProps).toBe(nextProps);
  expect(result.current.isHeld).toBe(false);
});
