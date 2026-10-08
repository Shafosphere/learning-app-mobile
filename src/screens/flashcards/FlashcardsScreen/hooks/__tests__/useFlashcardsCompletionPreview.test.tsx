import { act, renderHook } from "@testing-library/react-native";
import { consumeCourseFinishedPreview, subscribeCourseFinishedPreview } from "@/src/services/courseFinishedPreview";
import type { WordWithTranslations } from "@/src/types/boxes";
import { EMPTY_BOXES_STATE } from "../../model/FlashcardsScreen.constants";
import { useFlashcardsCompletionPreview } from "../useFlashcardsCompletionPreview";

jest.mock("@/src/services/courseFinishedPreview", () => ({
  consumeCourseFinishedPreview: jest.fn(),
  subscribeCourseFinishedPreview: jest.fn(),
}));

const consume = jest.mocked(consumeCourseFinishedPreview);
const subscribe = jest.mocked(subscribeCourseFinishedPreview);
const card = (id: number): WordWithTranslations => ({ id, text: "word", translations: ["translation"], flipped: false });

function setup(isFocused = true, isCourseFinishedPreviewEligible = true) {
  const order: string[] = [];
  const actions = {
    resetInteractionState: jest.fn(() => { order.push("reset"); }),
    clearSelection: jest.fn(() => { order.push("clear"); }),
    setBoxes: jest.fn(() => { order.push("boxes"); }),
    addUsedWordIds: jest.fn(() => { order.push("used"); }),
  };
  const hook = renderHook((props: { isFocused: boolean; isCourseFinishedPreviewEligible: boolean; customCards: WordWithTranslations[] }) => useFlashcardsCompletionPreview({ ...actions, ...props }), {
    initialProps: { isFocused, isCourseFinishedPreviewEligible, customCards: [card(1)] },
  });
  return { ...hook, ...actions, order };
}

function emitPreview() {
  act(() => subscribe.mock.calls[subscribe.mock.calls.length - 1][0]());
}

describe("useFlashcardsCompletionPreview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consume.mockReturnValue(false);
    subscribe.mockImplementation(() => jest.fn());
  });

  it("keeps a pending request until focus and course readiness allow consumption", () => {
    const { result, rerender, order, setBoxes, addUsedWordIds } = setup(false, false);
    consume.mockReturnValueOnce(true);
    emitPreview();
    expect(consume).not.toHaveBeenCalled();
    rerender({ isFocused: true, isCourseFinishedPreviewEligible: false, customCards: [card(1)] });
    expect(consume).not.toHaveBeenCalled();
    rerender({ isFocused: true, isCourseFinishedPreviewEligible: true, customCards: [card(2), card(3)] });
    expect(order).toEqual(["reset", "clear", "boxes", "used"]);
    expect(setBoxes).toHaveBeenCalledWith(EMPTY_BOXES_STATE);
    expect(addUsedWordIds).toHaveBeenCalledWith([2, 3]);
    expect(result.current).toBe(true);
  });

  it.each(["focus", "eligibility"])("hides preview after losing %s", (reason) => {
    const { result, rerender } = setup();
    consume.mockReturnValueOnce(true);
    emitPreview();
    expect(result.current).toBe(true);
    rerender({ isFocused: reason !== "focus", isCourseFinishedPreviewEligible: reason !== "eligibility", customCards: [card(1)] });
    expect(result.current).toBe(false);
  });

  it("replaces subscriptions on course data changes and cleans up on unmount", () => {
    const firstUnsubscribe = jest.fn();
    const nextUnsubscribe = jest.fn();
    subscribe.mockReturnValueOnce(firstUnsubscribe).mockReturnValueOnce(nextUnsubscribe);
    const { rerender, unmount, addUsedWordIds } = setup();
    rerender({ isFocused: true, isCourseFinishedPreviewEligible: true, customCards: [card(2)] });
    expect(firstUnsubscribe).toHaveBeenCalledTimes(1);
    consume.mockReturnValueOnce(true);
    emitPreview();
    expect(addUsedWordIds).toHaveBeenCalledWith([2]);
    unmount();
    expect(nextUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
